import type { FarmCostEntry, FarmSaleRecord, Feeding, GrowthMeasurement, Tank } from "@/lib/farm-store";

export type EconomicsSummary = {
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  marginPercent: number | null;
  costPerKgSold: number | null;
  salesKg: number;
  topCostCategory: string;
};

export type ManagementAlertSeverity = "normal" | "watch" | "danger";

export type ManagementAlert = {
  id: string;
  severity: ManagementAlertSeverity;
  title: string;
  reason: string;
  action: string;
};

export type FeedEfficiencyProfitAlert = {
  severity: ManagementAlertSeverity;
  title: string;
  summary: string;
  fcr: number | null;
  totalFeedKg: number;
  biomassGainKg: number | null;
  marginPercent: number | null;
  feedCostSharePercent: number | null;
  fishCountUsed: number | null;
  alerts: ManagementAlert[];
  limitation: string;
};

export type MonthlyEconomicsTrendPoint = {
  month: string;
  label: string;
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  marginPercent: number | null;
  fcr: number | null;
  totalFeedKg: number;
  biomassGainKg: number | null;
  salesKg: number;
};

export type TankProfitabilityRank = {
  rank: number;
  tankId: string;
  tankName: string;
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  marginPercent: number | null;
  costPerKgSold: number | null;
  salesKg: number;
  fcr: number | null;
  severity: ManagementAlertSeverity;
};

export type ImprovementChecklistItem = {
  id: string;
  alertId: string;
  priority: ManagementAlertSeverity;
  title: string;
  detail: string;
};

export function calculateEconomicsSummary(costs: FarmCostEntry[], sales: FarmSaleRecord[]): EconomicsSummary {
  const totalCost = costs.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const totalSales = sales.reduce((sum, item) => sum + safeNumber(item.totalAmount), 0);
  const salesKg = sales.reduce((sum, item) => sum + safeNumber(item.quantityKg), 0);
  const grossProfit = totalSales - totalCost;
  const categoryTotals = costs.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + safeNumber(item.amount);
    return acc;
  }, {});
  const topCostCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    totalCost,
    totalSales,
    grossProfit,
    marginPercent: totalSales > 0 ? (grossProfit / totalSales) * 100 : null,
    costPerKgSold: salesKg > 0 ? totalCost / salesKg : null,
    salesKg,
    topCostCategory,
  };
}

export function assessFeedEfficiencyProfitRisk(input: {
  costs: FarmCostEntry[];
  sales: FarmSaleRecord[];
  feedings: Feeding[];
  growthMeasurements: GrowthMeasurement[];
}): FeedEfficiencyProfitAlert {
  const summary = calculateEconomicsSummary(input.costs, input.sales);
  const totalFeedKg = input.feedings.reduce((sum, item) => sum + safeNumber(item.feedAmountKg), 0);
  const fishCountUsed = getLatestFishCount(input.feedings);
  const biomassGainKg = estimateBiomassGainKg(input.growthMeasurements, fishCountUsed);
  const fcr = biomassGainKg !== null && biomassGainKg > 0 ? totalFeedKg / biomassGainKg : null;
  const feedCost = input.costs.filter((item) => item.category === "feed").reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const feedCostSharePercent = summary.totalCost > 0 ? (feedCost / summary.totalCost) * 100 : null;
  const alerts: ManagementAlert[] = [];

  if (fcr === null) {
    alerts.push({
      id: "fcr_missing_growth",
      severity: "watch",
      title: "FCR cannot be estimated yet",
      reason: "FCR can be estimated as feed input kg divided by biomass gain kg after feed amount, multiple average-weight records, and estimated fish count are available.",
      action: "Keep recording average weight, fish count, and feed amount regularly for the same tank.",
    });
  } else if (fcr >= 3) {
    alerts.push({
      id: "fcr_danger",
      severity: "danger",
      title: "Feed efficiency is seriously worsening",
      reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Feed input is high relative to biomass gain. Leftover feed, water temperature, dissolved oxygen, disease, or delayed grading may be involved.`,
      action: "Temporarily reduce feeding and check leftover feed, appetite, dissolved oxygen, ammonia, and fish appearance.",
    });
  } else if (fcr >= 2.2) {
    alerts.push({
      id: "fcr_watch",
      severity: "watch",
      title: "Feed efficiency needs attention",
      reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Even when margin is acceptable, worsening feed efficiency can reduce profitability in later batches.`,
      action: "Review feeding time, pellet size, protein level, leftover feed, and size variation.",
    });
  }

  if (summary.marginPercent === null) {
    alerts.push({
      id: "margin_missing_sales",
      severity: "watch",
      title: "Margin cannot be calculated yet",
      reason: "There are no sales records, so gross margin against sales cannot be calculated.",
      action: "Enter sales kg, unit price per kg, and buyer, then compare them against costs for the same tank or batch.",
    });
  } else if (summary.marginPercent < 0) {
    alerts.push({
      id: "margin_danger",
      severity: "danger",
      title: "Gross profit is negative",
      reason: `Gross margin is ${formatNumber(summary.marginPercent, 1)}%. Input cost is higher than sales value.`,
      action: "Separate feed, power, water, labor, and sale price, then review the next harvest conditions and feeding plan.",
    });
  } else if (summary.marginPercent < 15) {
    alerts.push({
      id: "margin_watch",
      severity: "watch",
      title: "Margin is low",
      reason: `Gross margin is ${formatNumber(summary.marginPercent, 1)}%. Unexpected mortality, slow growth, or higher feed cost could easily turn this batch negative.`,
      action: "Check unit-price negotiation, harvest size, feed cost, power cost, and water cost reduction opportunities.",
    });
  }

  if (feedCostSharePercent !== null && feedCostSharePercent >= 55) {
    alerts.push({
      id: "feed_cost_share_watch",
      severity: feedCostSharePercent >= 70 ? "danger" : "watch",
      title: "Feed cost share is high",
      reason: `Feed cost is ${formatNumber(feedCostSharePercent, 1)}% of total cost. If it occurs together with worsening FCR, margin can fall sharply.`,
      action: "Review brand, pellet size, feeding rate, storage condition, and leftover feed to see whether the same growth can be achieved with less input.",
    });
  }

  if (fcr !== null && summary.marginPercent !== null && fcr >= 2.2 && summary.marginPercent < 15) {
    alerts.push({
      id: "combined_feed_profit_danger",
      severity: "danger",
      title: "Worse FCR and low margin are occurring together",
      reason: `Estimated FCR ${formatNumber(fcr, 2)} and gross margin ${formatNumber(summary.marginPercent, 1)}% are worsening together. Both growth efficiency and sales profitability need attention.`,
      action: "Set the next feeding conservatively and check water quality, grading, disease signs, sale price, and fixed-cost allocation on the same day.",
    });
  }

  const highestSeverity = summarizeManagementSeverity(alerts);
  return {
    severity: highestSeverity,
    title: highestSeverity === "danger" ? "High business risk" : highestSeverity === "watch" ? "Business watch" : "Profitability and feed efficiency are stable",
    summary: buildManagementSummary(highestSeverity, fcr, summary.marginPercent, feedCostSharePercent),
    fcr: fcr === null ? null : Number(fcr.toFixed(2)),
    totalFeedKg,
    biomassGainKg: biomassGainKg === null ? null : Number(biomassGainKg.toFixed(2)),
    marginPercent: summary.marginPercent === null ? null : Number(summary.marginPercent.toFixed(1)),
    feedCostSharePercent: feedCostSharePercent === null ? null : Number(feedCostSharePercent.toFixed(1)),
    fishCountUsed,
    alerts: alerts.length > 0 ? alerts : [{
      id: "management_normal",
      severity: "normal",
      title: "No major business alert",
      reason: "Based on entered data, estimated FCR, gross margin, and feed cost share do not show strong worsening signs.",
      action: "Continue recording under the same conditions and verify with actual harvest accounts after sale.",
    }],
    limitation: "FCR is a simplified estimate based on entered feed amount, average weight, and estimated fish count. Mortality, grading, sample bias, unrecorded feed, and standing-stock error can shift the value. Always combine this app with field measurements and farm records for business decisions.",
  };
}

export function buildMonthlyTrend(costs: FarmCostEntry[], sales: FarmSaleRecord[], feedings: Feeding[], growthMeasurements: GrowthMeasurement[]): MonthlyEconomicsTrendPoint[] {
  const months = new Set<string>();
  [...costs, ...sales, ...feedings, ...growthMeasurements].forEach((item) => {
    const month = toMonthKey(item.createdAt);
    if (month) months.add(month);
  });

  return [...months]
    .sort()
    .map((month) => {
      const monthCosts = costs.filter((item) => toMonthKey(item.createdAt) === month);
      const monthSales = sales.filter((item) => toMonthKey(item.createdAt) === month);
      const monthFeedings = feedings.filter((item) => toMonthKey(item.createdAt) === month);
      const monthGrowth = growthMeasurements.filter((item) => toMonthKey(item.createdAt) === month);
      const summary = calculateEconomicsSummary(monthCosts, monthSales);
      const totalFeedKg = monthFeedings.reduce((sum, item) => sum + safeNumber(item.feedAmountKg), 0);
      const fishCountUsed = getLatestFishCount(monthFeedings);
      const biomassGainKg = estimateBiomassGainKg(monthGrowth, fishCountUsed);
      const fcr = biomassGainKg !== null && biomassGainKg > 0 ? totalFeedKg / biomassGainKg : null;

      return {
        month,
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${month}-01T00:00:00.000Z`)),
        totalCost: summary.totalCost,
        totalSales: summary.totalSales,
        grossProfit: summary.grossProfit,
        marginPercent: summary.marginPercent === null ? null : Number(summary.marginPercent.toFixed(1)),
        fcr: fcr === null ? null : Number(fcr.toFixed(2)),
        totalFeedKg,
        biomassGainKg: biomassGainKg === null ? null : Number(biomassGainKg.toFixed(2)),
        salesKg: summary.salesKg,
      };
    });
}

export function rankTanksByProfitability(tanks: Tank[], costs: FarmCostEntry[], sales: FarmSaleRecord[], feedings: Feeding[], growthMeasurements: GrowthMeasurement[]): TankProfitabilityRank[] {
  return tanks
    .map((tank) => {
      const tankCosts = costs.filter((item) => item.tankId === tank.id);
      const tankSales = sales.filter((item) => item.tankId === tank.id);
      const tankFeedings = feedings.filter((item) => item.tankId === tank.id);
      const tankGrowth = growthMeasurements.filter((item) => item.tankId === tank.id);
      const summary = calculateEconomicsSummary(tankCosts, tankSales);
      const alert = assessFeedEfficiencyProfitRisk({ costs: tankCosts, sales: tankSales, feedings: tankFeedings, growthMeasurements: tankGrowth });
      return {
        rank: 0,
        tankId: tank.id,
        tankName: tank.name,
        totalCost: summary.totalCost,
        totalSales: summary.totalSales,
        grossProfit: summary.grossProfit,
        marginPercent: summary.marginPercent === null ? null : Number(summary.marginPercent.toFixed(1)),
        costPerKgSold: summary.costPerKgSold === null ? null : Number(summary.costPerKgSold.toFixed(0)),
        salesKg: summary.salesKg,
        fcr: alert.fcr,
        severity: alert.severity,
      } satisfies TankProfitabilityRank;
    })
    .sort((a, b) => {
      const aHasSales = a.marginPercent !== null ? 1 : 0;
      const bHasSales = b.marginPercent !== null ? 1 : 0;
      if (aHasSales !== bHasSales) return bHasSales - aHasSales;
      if (a.marginPercent !== b.marginPercent) return (b.marginPercent ?? -Infinity) - (a.marginPercent ?? -Infinity);
      if (a.grossProfit !== b.grossProfit) return b.grossProfit - a.grossProfit;
      return a.tankName.localeCompare(b.tankName);
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function buildImprovementChecklist(alerts: ManagementAlert[]): ImprovementChecklistItem[] {
  const items: ImprovementChecklistItem[] = [];
  const add = (alert: ManagementAlert, suffix: string, title: string, detail: string) => {
    if (items.some((item) => item.id === `${alert.id}_${suffix}`)) return;
    items.push({ id: `${alert.id}_${suffix}`, alertId: alert.id, priority: alert.severity, title, detail });
  };

  alerts.filter((alert) => alert.severity !== "normal").forEach((alert) => {
    if (alert.id.includes("combined_feed_profit")) {
      add(alert, "same_day_review", "Review feeding, water quality, and sales terms on the same day", "Because FCR and margin are worsening together, compare feed amount, leftover feed, water quality, disease signs, sale price, and fixed-cost allocation on the same day.");
      add(alert, "next_feed_adjust", "Set the next feeding conservatively", "Temporarily lower the feeding rate while watching appetite and leftover feed, then decide whether to restore it after growth measurement.");
    } else if (alert.id.includes("fcr")) {
      add(alert, "feeding_observation", "Record leftover feed, appetite, and feeding time", "Check uneaten feed, sinking-feed accumulation, feeding time, and mismatch between pellet size and fish size.");
      add(alert, "growth_sampling", "Remeasure average weight and estimated fish count", "Measure several fish in the same tank and adjust the FCR denominator for mortality, grading, and fish-count changes.");
      add(alert, "water_quality", "Check dissolved oxygen, ammonia, and water temperature", "Inspect water quality and sudden environmental changes behind weak appetite or slow growth.");
    } else if (alert.id.includes("margin")) {
      add(alert, "cost_breakdown", "Break costs into feed, power/water, and labor", "Separate which cost items are pressuring gross profit and distinguish reducible fixed and variable costs.");
      add(alert, "sales_price", "Review sale price and harvest grade", "Compare size, yield, buyer, and delivery conditions to check room for price negotiation or harvest timing changes.");
    } else if (alert.id.includes("feed_cost_share")) {
      add(alert, "feed_contract", "Compare feed brand, pellet size, and purchasing terms", "Check whether another option can achieve the same growth with less feed input or lower price per kg.");
      add(alert, "feed_storage", "Inspect feed storage condition", "Moisture absorption, oxidation, and powdering can reduce appetite and efficiency, so check lot and storage place.");
    }

    add(alert, "record_evidence", "Record the evidence behind the decision", alert.action);
  });

  return items;
}

function summarizeManagementSeverity(alerts: ManagementAlert[]): ManagementAlertSeverity {
  if (alerts.some((item) => item.severity === "danger")) return "danger";
  if (alerts.some((item) => item.severity === "watch")) return "watch";
  return "normal";
}

function buildManagementSummary(severity: ManagementAlertSeverity, fcr: number | null, marginPercent: number | null, feedCostSharePercent: number | null) {
  const fcrText = fcr === null ? "FCR not calculated" : `FCR ${formatNumber(fcr, 2)}`;
  const marginText = marginPercent === null ? "Margin not calculated" : `Margin ${formatNumber(marginPercent, 1)}%`;
  const feedText = feedCostSharePercent === null ? "Feed cost share not calculated" : `Feed cost share ${formatNumber(feedCostSharePercent, 1)}%`;
  const prefix = severity === "danger" ? "Check urgently." : severity === "watch" ? "Check carefully." : "Continue monitoring.";
  return `${prefix} ${fcrText}、${marginText}、${feedText} together.`;
}

function getLatestFishCount(feedings: Feeding[]) {
  const latest = [...feedings]
    .filter((item) => typeof item.fishCount === "number" && item.fishCount > 0)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return latest?.fishCount ?? null;
}

function estimateBiomassGainKg(measurements: GrowthMeasurement[], fishCount: number | null) {
  if (!fishCount || fishCount <= 0) return null;
  const sorted = [...measurements]
    .filter((item) => Number.isFinite(item.weightG) && item.weightG > 0)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (sorted.length < 2) return null;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const gainG = safeNumber(last.weightG) - safeNumber(first.weightG);
  if (gainG <= 0) return null;
  return (gainG * fishCount) / 1000;
}

function toMonthKey(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function safeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
