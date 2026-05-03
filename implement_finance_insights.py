from pathlib import Path

root = Path('/home/ubuntu/catfish_farm_logger')

economics = r'''import type { FarmCostEntry, FarmSaleRecord, Feeding, GrowthMeasurement, Tank } from "@/lib/farm-store";

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
        label: `${Number(month.slice(5, 7))}月`,
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
      add(alert, "same_day_review", "給餌・水質・販売条件を同日に確認", "FCRと利益率が同時に悪化しているため、給餌量、残餌、水質、疾病サイン、販売単価、固定費配賦を同じ日に照合します。");
      add(alert, "next_feed_adjust", "次回給餌を控えめに設定", "食い付きと残餌を見ながら一時的に給餌率を下げ、増体測定後に戻すか判断します。");
    } else if (alert.id.includes("fcr")) {
      add(alert, "feeding_observation", "残餌・食い付き・給餌時刻を記録", "食べ残し、沈下餌の滞留、給餌時間帯、粒径と魚体サイズのずれを確認します。");
      add(alert, "growth_sampling", "平均体重と推定尾数を再測定", "同じ水槽で複数個体を測り、死亡・選別・尾数変化を補正してFCRの分母を見直します。");
      add(alert, "water_quality", "溶存酸素・アンモニア・水温を確認", "摂餌低下や増体停滞の背景として、水質と急な環境変化を点検します。");
    } else if (alert.id.includes("margin")) {
      add(alert, "cost_breakdown", "費用内訳を餌代・電気水道・人件費に分解", "どの費目が粗利益を圧迫しているかを分け、削減できる固定費と変動費を切り分けます。");
      add(alert, "sales_price", "販売単価と出荷グレードを見直し", "サイズ、歩留まり、販売先、納品条件を比較し、単価交渉や出荷タイミングの余地を確認します。");
    } else if (alert.id.includes("feed_cost_share")) {
      add(alert, "feed_contract", "飼料銘柄・粒径・仕入条件を比較", "同じ増体に対してより少ない投入量または低いkg単価で済む選択肢がないか確認します。");
      add(alert, "feed_storage", "飼料の保管状態を点検", "吸湿、酸化、粉化があると食い付きと効率が落ちるため、ロットと保存場所を確認します。");
    }

    add(alert, "record_evidence", "判断根拠をメモへ残す", alert.action);
  });

  return items;
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
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
'''
(root / 'lib/economics.ts').write_text(economics, encoding='utf-8')

# Update farm-store imports and export payload
store_path = root / 'lib/farm-store.tsx'
store = store_path.read_text(encoding='utf-8')
store = store.replace('import { assessFeedEfficiencyProfitRisk } from "@/lib/economics";', 'import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, rankTanksByProfitability } from "@/lib/economics";')
store = store.replace('  saleRecords: FarmSaleRecord[];\n  tanks: Array<{', '  saleRecords: FarmSaleRecord[];\n  monthlyTrend: ReturnType<typeof buildMonthlyTrend>;\n  profitabilityRanking: ReturnType<typeof rankTanksByProfitability>;\n  tanks: Array<{')
store = store.replace('    managementAlert: ReturnType<typeof assessFeedEfficiencyProfitRisk>;\n    files: string[];', '    managementAlert: ReturnType<typeof assessFeedEfficiencyProfitRisk>;\n    monthlyTrend: ReturnType<typeof buildMonthlyTrend>;\n    improvementChecklist: ReturnType<typeof buildImprovementChecklist>;\n    files: string[];')
store = store.replace('      saleRecords: state.saleRecords,\n      tanks: state.tanks.map((tank) => {', '      saleRecords: state.saleRecords,\n      monthlyTrend: buildMonthlyTrend(state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),\n      profitabilityRanking: rankTanksByProfitability(state.tanks, state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),\n      tanks: state.tanks.map((tank) => {')
store = store.replace('        return {\n          folder: `${state.settings.driveRootFolder}/${safeName}`,', '        const managementAlert = assessFeedEfficiencyProfitRisk({ costs: tankCosts, sales: tankSales, feedings: tankFeedings, growthMeasurements: tankGrowthMeasurements });\n        return {\n          folder: `${state.settings.driveRootFolder}/${safeName}`,')
store = store.replace('          managementAlert: assessFeedEfficiencyProfitRisk({ costs: tankCosts, sales: tankSales, feedings: tankFeedings, growthMeasurements: tankGrowthMeasurements }),\n          files: ["tank.json", "inspections.json", "feedings.json", "photos/", "growth-measurements.json", "photo-assessments.json", "costs.json", "sales.json", "economics-summary.json", "management-alert.json", "growth-status.json", "sync-log.json", "feeding-advice.json"],', '          managementAlert,\n          monthlyTrend: buildMonthlyTrend(tankCosts, tankSales, tankFeedings, tankGrowthMeasurements),\n          improvementChecklist: buildImprovementChecklist(managementAlert.alerts),\n          files: ["tank.json", "inspections.json", "feedings.json", "photos/", "growth-measurements.json", "photo-assessments.json", "costs.json", "sales.json", "economics-summary.json", "management-alert.json", "monthly-trend.json", "improvement-checklist.json", "growth-status.json", "sync-log.json", "feeding-advice.json"],')
store_path.write_text(store, encoding='utf-8')

# Update Google Drive export files
gd_path = root / 'lib/google-drive.ts'
gd = gd_path.read_text(encoding='utf-8')
gd = gd.replace('{ name: "management-alert.json", value: tankExport.managementAlert },\n      { name: "sync-log.json", value: { generatedAt: exportPayload.generatedAt, folder: tankExport.folder } },', '{ name: "management-alert.json", value: tankExport.managementAlert },\n      { name: "monthly-trend.json", value: tankExport.monthlyTrend },\n      { name: "improvement-checklist.json", value: tankExport.improvementChecklist },\n      { name: "sync-log.json", value: { generatedAt: exportPayload.generatedAt, folder: tankExport.folder } },')
gd_path.write_text(gd, encoding='utf-8')

# Update finance screen
finance_path = root / 'app/(tabs)/finance.tsx'
finance = finance_path.read_text(encoding='utf-8')
finance = finance.replace('import { Alert, FlatList, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";', 'import { Alert, FlatList, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";\nimport Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";')
finance = finance.replace('import { assessFeedEfficiencyProfitRisk, calculateEconomicsSummary, formatCurrency, formatNumber } from "@/lib/economics";', 'import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, calculateEconomicsSummary, formatCurrency, formatNumber, rankTanksByProfitability } from "@/lib/economics";\nimport type { ImprovementChecklistItem, MonthlyEconomicsTrendPoint, TankProfitabilityRank } from "@/lib/economics";')
finance = finance.replace('  const [saleNotes, setSaleNotes] = useState("");', '  const [saleNotes, setSaleNotes] = useState("");\n  const [checkedImprovements, setCheckedImprovements] = useState<Record<string, boolean>>({});')
finance = finance.replace('  const managementAlert = useMemo(() => assessFeedEfficiencyProfitRisk({ costs: scopedCosts, sales: scopedSales, feedings: scopedFeedings, growthMeasurements: scopedGrowthMeasurements }), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);', '  const managementAlert = useMemo(() => assessFeedEfficiencyProfitRisk({ costs: scopedCosts, sales: scopedSales, feedings: scopedFeedings, growthMeasurements: scopedGrowthMeasurements }), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);\n  const monthlyTrend = useMemo(() => buildMonthlyTrend(scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);\n  const profitabilityRanking = useMemo(() => rankTanksByProfitability(farm.tanks, farm.costEntries, farm.saleRecords, farm.feedings, farm.growthMeasurements), [farm.tanks, farm.costEntries, farm.saleRecords, farm.feedings, farm.growthMeasurements]);\n  const improvementChecklist = useMemo(() => buildImprovementChecklist(managementAlert.alerts), [managementAlert.alerts]);')
insert = r'''

            <MonthlyTrendCard trend={monthlyTrend} />
            <ProfitabilityRankingCard ranking={profitabilityRanking} />
            <ImprovementChecklistCard
              items={improvementChecklist}
              checked={checkedImprovements}
              onToggle={(id) => setCheckedImprovements((current) => ({ ...current, [id]: !current[id] }))}
            />
'''
finance = finance.replace('              <Text className="mt-3 text-xs leading-5 text-muted">{managementAlert.limitation}</Text>\n            </View>\n\n            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">', '              <Text className="mt-3 text-xs leading-5 text-muted">{managementAlert.limitation}</Text>\n            </View>' + insert + '\n\n            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">')
components = r'''

function MonthlyTrendCard({ trend }: { trend: MonthlyEconomicsTrendPoint[] }) {
  return (
    <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
      <Text className="text-xl font-bold text-foreground">月次FCR・利益率推移</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">選択中の水槽について、月別の推定FCRと粗利益率を同じ時間軸で確認します。FCRは低いほど良く、利益率は高いほど良い指標です。</Text>
      {trend.length === 0 ? (
        <Text className="mt-4 rounded-2xl bg-background p-4 text-sm leading-5 text-muted">月別に表示できる収支・給餌・成長記録がまだありません。</Text>
      ) : (
        <>
          <DualLineChart trend={trend.slice(-6)} />
          <View className="mt-3 flex-row gap-3">
            <View className="flex-row items-center gap-2"><View className="h-2 w-5 rounded-full bg-primary" /><Text className="text-xs font-bold text-muted">FCR</Text></View>
            <View className="flex-row items-center gap-2"><View className="h-2 w-5 rounded-full bg-success" /><Text className="text-xs font-bold text-muted">利益率</Text></View>
          </View>
          {trend.slice(-3).map((item) => (
            <View key={item.month} className="mt-3 flex-row items-center justify-between rounded-2xl bg-background p-3">
              <Text className="font-bold text-foreground">{item.label}</Text>
              <Text className="text-sm text-muted">FCR {item.fcr === null ? "未計算" : formatNumber(item.fcr, 2)} / 利益率 {item.marginPercent === null ? "未計算" : `${formatNumber(item.marginPercent, 1)}%`}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function DualLineChart({ trend }: { trend: MonthlyEconomicsTrendPoint[] }) {
  const width = 320;
  const height = 170;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const fcrValues = trend.map((item) => item.fcr).filter((value): value is number => value !== null);
  const marginValues = trend.map((item) => item.marginPercent).filter((value): value is number => value !== null);
  const maxFcr = Math.max(3, ...fcrValues);
  const minMargin = Math.min(0, ...marginValues);
  const maxMargin = Math.max(30, ...marginValues);
  const x = (index: number) => padding + (trend.length <= 1 ? chartWidth / 2 : (chartWidth * index) / (trend.length - 1));
  const yFcr = (value: number) => padding + chartHeight - (Math.min(value, maxFcr) / maxFcr) * chartHeight;
  const yMargin = (value: number) => padding + chartHeight - ((value - minMargin) / Math.max(1, maxMargin - minMargin)) * chartHeight;
  const fcrPoints = trend.map((item, index) => (item.fcr === null ? null : `${x(index)},${yFcr(item.fcr)}`)).filter(Boolean).join(" ");
  const marginPoints = trend.map((item, index) => (item.marginPercent === null ? null : `${x(index)},${yMargin(item.marginPercent)}`)).filter(Boolean).join(" ");

  return (
    <View className="mt-4 items-center rounded-2xl bg-background p-2">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#CBD5E1" strokeWidth="1" />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CBD5E1" strokeWidth="1" />
        <SvgText x={padding} y={18} fontSize="10" fill="#64748B">高</SvgText>
        <SvgText x={width - padding - 28} y={height - 8} fontSize="10" fill="#64748B">月</SvgText>
        {fcrPoints ? <Polyline points={fcrPoints} fill="none" stroke="#0A7EA4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {marginPoints ? <Polyline points={marginPoints} fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {trend.map((item, index) => (
          <SvgText key={`label-${item.month}`} x={x(index) - 10} y={height - 10} fontSize="10" fill="#64748B">{item.label}</SvgText>
        ))}
        {trend.map((item, index) => item.fcr === null ? null : <Circle key={`fcr-${item.month}`} cx={x(index)} cy={yFcr(item.fcr)} r="4" fill="#0A7EA4" />)}
        {trend.map((item, index) => item.marginPercent === null ? null : <Circle key={`margin-${item.month}`} cx={x(index)} cy={yMargin(item.marginPercent)} r="4" fill="#22C55E" />)}
      </Svg>
    </View>
  );
}

function ProfitabilityRankingCard({ ranking }: { ranking: TankProfitabilityRank[] }) {
  return (
    <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
      <Text className="text-xl font-bold text-foreground">水槽別採算ランキング</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">全水槽を売上・費用・粗利益・利益率・FCRで比較します。水槽選択の影響を受けず、農場全体の優先確認先を把握できます。</Text>
      {ranking.length === 0 ? (
        <Text className="mt-4 rounded-2xl bg-background p-4 text-sm text-muted">水槽データがありません。</Text>
      ) : ranking.map((item) => (
        <View key={item.tankId} className="mt-3 rounded-2xl bg-background p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-extrabold text-foreground">#{item.rank} {item.tankName}</Text>
              <Text className="mt-1 text-xs text-muted">売上 {formatCurrency(item.totalSales)} / 費用 {formatCurrency(item.totalCost)}</Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${severityBadgeClass(item.severity)}`}><Text className="text-xs font-extrabold text-white">{severityLabel(item.severity)}</Text></View>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <MiniMetric label="粗利益" value={formatCurrency(item.grossProfit)} />
            <MiniMetric label="利益率" value={item.marginPercent === null ? "未計算" : `${formatNumber(item.marginPercent, 1)}%`} />
            <MiniMetric label="推定FCR" value={item.fcr === null ? "未計算" : formatNumber(item.fcr, 2)} />
            <MiniMetric label="販売kg" value={`${formatNumber(item.salesKg, 1)} kg`} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ImprovementChecklistCard({ items, checked, onToggle }: { items: ImprovementChecklistItem[]; checked: Record<string, boolean>; onToggle: (id: string) => void }) {
  if (items.length === 0) return null;
  const completed = items.filter((item) => checked[item.id]).length;
  return (
    <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">改善チェックリスト</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">アラート内容から、現場で確認する行動を具体化します。チェック状態はこの画面内だけで管理され、記録の根拠はメモ欄へ残してください。</Text>
        </View>
        <Text className="rounded-full bg-background px-3 py-1 text-xs font-extrabold text-muted">{completed}/{items.length}</Text>
      </View>
      {items.map((item) => (
        <TouchableOpacity key={item.id} className="mt-3 flex-row gap-3 rounded-2xl bg-background p-4 active:opacity-80" onPress={() => onToggle(item.id)}>
          <View className={`mt-1 h-6 w-6 items-center justify-center rounded-full border ${checked[item.id] ? "border-success bg-success" : "border-border"}`}>
            <Text className="text-xs font-extrabold text-white">{checked[item.id] ? "✓" : ""}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-sm font-extrabold ${item.priority === "danger" ? "text-error" : "text-warning"}`}>{item.title}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{item.detail}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
'''
finance = finance + components
finance_path.write_text(finance, encoding='utf-8')

# Append tests
test_path = root / 'tests/app-basic.test.ts'
test = test_path.read_text(encoding='utf-8')
test = test.replace('import { assessFeedEfficiencyProfitRisk } from "../lib/economics";', 'import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, rankTanksByProfitability } from "../lib/economics";')
extra = r'''

  it("builds monthly FCR and margin trends from dated records", () => {
    const trend = buildMonthlyTrend(
      [
        { id: "c1", tankId: "t1", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 1000, notes: "", synced: false },
        { id: "c2", tankId: "t1", createdAt: "2026-02-05T00:00:00.000Z", category: "feed", label: "feed", amount: 800, notes: "", synced: false },
      ],
      [
        { id: "s1", tankId: "t1", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 300, totalAmount: 1500, notes: "", synced: false },
      ],
      [
        { id: "f1", tankId: "t1", createdAt: "2026-01-10T00:00:00.000Z", feedType: "pellet", feedAmountKg: 20, averageWeightG: 100, fishCount: 100, notes: "", synced: false },
      ],
      [
        { id: "g1", tankId: "t1", createdAt: "2026-01-01T00:00:00.000Z", lengthCm: 10, weightG: 100, source: "manual", notes: "", synced: false },
        { id: "g2", tankId: "t1", createdAt: "2026-01-31T00:00:00.000Z", lengthCm: 14, weightG: 200, source: "manual", notes: "", synced: false },
      ],
    );

    expect(trend.map((item) => item.month)).toEqual(["2026-01", "2026-02"]);
    expect(trend[0].marginPercent).toBeCloseTo(33.3, 1);
    expect(trend[0].fcr).toBe(2);
    expect(trend[1].marginPercent).toBeNull();
  });

  it("ranks tanks by profitability and creates improvement actions", () => {
    const tanks = [
      { id: "t1", name: "A水槽", location: "", notes: "", createdAt: "2026-01-01" },
      { id: "t2", name: "B水槽", location: "", notes: "", createdAt: "2026-01-01" },
    ];
    const ranking = rankTanksByProfitability(
      tanks,
      [
        { id: "c1", tankId: "t1", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 1000, notes: "", synced: false },
        { id: "c2", tankId: "t2", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 3000, notes: "", synced: false },
      ],
      [
        { id: "s1", tankId: "t1", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 400, totalAmount: 2000, notes: "", synced: false },
        { id: "s2", tankId: "t2", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 400, totalAmount: 2000, notes: "", synced: false },
      ],
      [],
      [],
    );

    expect(ranking[0].tankId).toBe("t1");
    expect(ranking[0].marginPercent).toBe(50);
    expect(ranking[1].grossProfit).toBe(-1000);

    const checklist = buildImprovementChecklist([{ id: "margin_danger", severity: "danger", title: "赤字", reason: "", action: "単価と費用を確認" }]);
    expect(checklist.some((item) => item.title.includes("費用内訳"))).toBe(true);
    expect(checklist.every((item) => item.priority === "danger")).toBe(true);
  });
'''
test = test.replace('\n});\n', extra + '\n});\n')
test_path.write_text(test, encoding='utf-8')

# Append design notes
design_path = root / 'design.md'
with design_path.open('a', encoding='utf-8') as f:
    f.write('\n\n## 収支インサイト拡張設計（2026-05-04）\n\n収支画面には、選択水槽の月次FCR・粗利益率推移、全水槽を横断した採算ランキング、アラート内容に連動する改善チェックリストを追加する。月次グラフは片手操作の縦長画面で読めるようにカード内へ簡易SVG折れ線として表示し、詳細な月別値は直近3か月の行で補足する。ランキングは選択タブの影響を受けず、農場全体の水槽を利益率、粗利益、名称の順で並べる。改善チェックリストは危険・注意アラートが存在する場合だけ表示し、チェック状態は画面内の一時状態として保持する。Google Driveエクスポートには全体の月次推移とランキング、各水槽の月次推移と改善チェックリストを含める。\n')

print('implemented finance insights')
