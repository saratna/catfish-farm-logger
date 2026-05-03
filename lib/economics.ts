import type { FarmCostEntry, FarmSaleRecord, Feeding, GrowthMeasurement } from "@/lib/farm-store";

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
      title: "FCRをまだ推定できません",
      reason: "給餌量、複数回の平均体重、推定尾数が揃うと、投入飼料kg ÷ 増加バイオマスkgでFCRを推定できます。",
      action: "同じ水槽で定期的に平均体重と尾数を記録し、給餌量の入力を継続してください。",
    });
  } else if (fcr >= 3) {
    alerts.push({
      id: "fcr_danger",
      severity: "danger",
      title: "飼料効率が大きく悪化しています",
      reason: `推定FCRは${formatNumber(fcr, 2)}です。魚体増加に対して飼料投入が多く、残餌、水温、溶存酸素、疾病、選別遅れの影響が疑われます。`,
      action: "給餌量を一時的に抑え、残餌、食い付き、溶存酸素、アンモニア、魚体外観を確認してください。",
    });
  } else if (fcr >= 2.2) {
    alerts.push({
      id: "fcr_watch",
      severity: "watch",
      title: "飼料効率に注意が必要です",
      reason: `推定FCRは${formatNumber(fcr, 2)}です。利益率が十分でも、飼料効率の悪化は後続ロットの採算を圧迫します。`,
      action: "給餌時間、粒径、タンパク、残餌、サイズばらつきを見直してください。",
    });
  }

  if (summary.marginPercent === null) {
    alerts.push({
      id: "margin_missing_sales",
      severity: "watch",
      title: "利益率をまだ算出できません",
      reason: "販売記録がないため、売上に対する粗利益率を算出できません。",
      action: "販売kg、kg単価、販売先を入力して、コストと同じ水槽・ロットで比較してください。",
    });
  } else if (summary.marginPercent < 0) {
    alerts.push({
      id: "margin_danger",
      severity: "danger",
      title: "粗利益が赤字です",
      reason: `粗利益率は${formatNumber(summary.marginPercent, 1)}%です。販売額より投入コストが大きくなっています。`,
      action: "餌代、電気・水道、人件費、販売単価を分けて確認し、次回出荷条件や給餌計画を見直してください。",
    });
  } else if (summary.marginPercent < 15) {
    alerts.push({
      id: "margin_watch",
      severity: "watch",
      title: "利益率が低めです",
      reason: `粗利益率は${formatNumber(summary.marginPercent, 1)}%です。想定外の死亡、成長停滞、餌代高騰があると赤字化しやすい状態です。`,
      action: "単価交渉、出荷サイズ、飼料費、電気・水道費の削減余地を確認してください。",
    });
  }

  if (feedCostSharePercent !== null && feedCostSharePercent >= 55) {
    alerts.push({
      id: "feed_cost_share_watch",
      severity: feedCostSharePercent >= 70 ? "danger" : "watch",
      title: "餌代比率が高くなっています",
      reason: `総コストに占める餌代は${formatNumber(feedCostSharePercent, 1)}%です。FCR悪化と同時に起きると利益率を強く押し下げます。`,
      action: "銘柄、粒径、給餌率、保存状態、残餌を見直し、同じ増体をより少ない投入で得られるか確認してください。",
    });
  }

  if (fcr !== null && summary.marginPercent !== null && fcr >= 2.2 && summary.marginPercent < 15) {
    alerts.push({
      id: "combined_feed_profit_danger",
      severity: "danger",
      title: "FCR悪化と低利益率が同時に発生しています",
      reason: `推定FCR ${formatNumber(fcr, 2)}、粗利益率 ${formatNumber(summary.marginPercent, 1)}% の組み合わせです。成長効率と販売採算の両面で注意が必要です。`,
      action: "次回給餌を控えめにし、水質検査、選別、疾病サイン、販売単価、固定費配賦を同日に確認してください。",
    });
  }

  const highestSeverity = summarizeManagementSeverity(alerts);
  return {
    severity: highestSeverity,
    title: highestSeverity === "danger" ? "経営リスク高" : highestSeverity === "watch" ? "経営注意" : "収支と飼料効率は安定",
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
      title: "大きな経営アラートはありません",
      reason: "入力済みデータ上では、推定FCR、粗利益率、餌代比率に強い悪化サインは見られません。",
      action: "同じ条件で記録を継続し、出荷後に実測収支で再確認してください。",
    }],
    limitation: "FCRは、入力された給餌量、平均体重、推定尾数からの簡易推定です。死亡数、選別、サンプル偏り、未記録の給餌、在池量の誤差があると値がずれます。経営判断では現場測定と帳票を必ず併用してください。",
  };
}

function summarizeManagementSeverity(alerts: ManagementAlert[]): ManagementAlertSeverity {
  if (alerts.some((item) => item.severity === "danger")) return "danger";
  if (alerts.some((item) => item.severity === "watch")) return "watch";
  return "normal";
}

function buildManagementSummary(severity: ManagementAlertSeverity, fcr: number | null, marginPercent: number | null, feedCostSharePercent: number | null) {
  const fcrText = fcr === null ? "FCR未計算" : `FCR ${formatNumber(fcr, 2)}`;
  const marginText = marginPercent === null ? "利益率未計算" : `利益率 ${formatNumber(marginPercent, 1)}%`;
  const feedText = feedCostSharePercent === null ? "餌代比率未計算" : `餌代比率 ${formatNumber(feedCostSharePercent, 1)}%`;
  const prefix = severity === "danger" ? "至急確認してください。" : severity === "watch" ? "注意して確認してください。" : "継続観察で問題ありません。";
  return `${prefix} ${fcrText}、${marginText}、${feedText} を連動して評価しています。`;
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

function safeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
