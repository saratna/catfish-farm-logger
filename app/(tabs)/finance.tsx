import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { catfishKnowledgeCards } from "@/lib/catfish-knowledge";
import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, calculateEconomicsSummary, formatCurrency, formatNumber, rankTanksByProfitability } from "@/lib/economics";
import type { ImprovementChecklistItem, MonthlyEconomicsTrendPoint, TankProfitabilityRank } from "@/lib/economics";
import type { FarmCostCategory } from "@/lib/farm-store";
import { formatShortDate, useFarm } from "@/lib/farm-store";

const COST_CATEGORIES: Array<{ value: FarmCostCategory; label: string }> = [
  { value: "seed_stock", label: "Fingerlings" },
  { value: "feed", label: "Feed" },
  { value: "labor", label: "Labor" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "medicine", label: "Medicine and hygiene" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const toNumber = (value: string) => Number(value.replace(/,/g, ""));

export default function FinanceScreen() {
  const farm = useFarm();
  const [selectedTankId, setSelectedTankId] = useState(farm.tanks[0]?.id ?? "");
  const [category, setCategory] = useState<FarmCostCategory>("feed");
  const [costLabel, setCostLabel] = useState("Feed cost");
  const [costAmount, setCostAmount] = useState("");
  const [costQuantity, setCostQuantity] = useState("");
  const [costUnit, setCostUnit] = useState("kg");
  const [vendor, setVendor] = useState("");
  const [costNotes, setCostNotes] = useState("");
  const [buyer, setBuyer] = useState("");
  const [grade, setGrade] = useState("Live fish - standard size");
  const [saleKg, setSaleKg] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [checkedImprovements, setCheckedImprovements] = useState<Record<string, boolean>>({});

  const scopedCosts = useMemo(() => farm.costEntries.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.costEntries, selectedTankId]);
  const scopedSales = useMemo(() => farm.saleRecords.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.saleRecords, selectedTankId]);
  const scopedFeedings = useMemo(() => farm.feedings.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.feedings, selectedTankId]);
  const scopedGrowthMeasurements = useMemo(() => farm.growthMeasurements.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.growthMeasurements, selectedTankId]);
  const summary = useMemo(() => calculateEconomicsSummary(scopedCosts, scopedSales), [scopedCosts, scopedSales]);
  const managementAlert = useMemo(() => assessFeedEfficiencyProfitRisk({ costs: scopedCosts, sales: scopedSales, feedings: scopedFeedings, growthMeasurements: scopedGrowthMeasurements }), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);
  const profitabilityRanking = useMemo(() => rankTanksByProfitability(farm.tanks, farm.costEntries, farm.saleRecords, farm.feedings, farm.growthMeasurements), [farm.tanks, farm.costEntries, farm.saleRecords, farm.feedings, farm.growthMeasurements]);
  const improvementChecklist = useMemo(() => buildImprovementChecklist(managementAlert.alerts), [managementAlert.alerts]);
  const recentRows = useMemo(() => {
    const costRows = scopedCosts.slice(0, 8).map((item) => ({ id: item.id, kind: "cost" as const, title: item.label, amount: -item.amount, detail: `${categoryLabel(item.category)} · ${formatShortDate(item.createdAt)}` }));
    const saleRows = scopedSales.slice(0, 8).map((item) => ({ id: item.id, kind: "sale" as const, title: item.buyer || item.productGrade, amount: item.totalAmount, detail: `${formatNumber(item.quantityKg)} kg × ${formatCurrency(item.unitPrice)} · ${formatShortDate(item.createdAt)}` }));
    return [...costRows, ...saleRows].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, 12);
  }, [scopedCosts, scopedSales]);

  const saveCost = () => {
    const amount = toNumber(costAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Check the amount", "Enter a cost amount greater than 0 for fingerlings, feed, labor, or other expenses.");
      return;
    }
    farm.addCostEntry({
      tankId: selectedTankId || undefined,
      category,
      label: costLabel.trim() || categoryLabel(category),
      amount,
      quantity: costQuantity.trim() ? toNumber(costQuantity) : undefined,
      unit: costUnit.trim() || undefined,
      vendor: vendor.trim() || undefined,
      notes: costNotes.trim(),
    });
    setCostAmount("");
    setCostQuantity("");
    setVendor("");
    setCostNotes("");
    Alert.alert("Cost saved", "The finance summary and Google Drive export will be updated.");
  };

  const saveSale = () => {
    const kg = toNumber(saleKg);
    const price = toNumber(unitPrice);
    if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(price) || price <= 0) {
      Alert.alert("Check sales quantity and price", "Enter sales kg and unit price per kg as numbers greater than 0.");
      return;
    }
    farm.addSaleRecord({
      tankId: selectedTankId || undefined,
      buyer: buyer.trim() || "Unspecified buyer",
      productGrade: grade.trim() || "Unspecified grade",
      quantityKg: kg,
      unitPrice: price,
      notes: saleNotes.trim(),
    });
    setBuyer("");
    setSaleKg("");
    setUnitPrice("");
    setSaleNotes("");
    Alert.alert("Sale saved", "Sales, gross profit, and cost per kg have been updated.");
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={recentRows}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Economics</Text>
            <Text className="mt-1 text-base leading-6 text-muted">Record input costs such as fingerlings, feed, labor, electricity, and water with sales prices for the same tank or lot, then review gross profit.</Text>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-sm font-bold text-muted">Selected tank</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {farm.tanks.map((tank) => (
                  <TouchableOpacity key={tank.id} className={`rounded-full px-4 py-2 ${selectedTankId === tank.id ? "bg-primary" : "bg-background"}`} onPress={() => setSelectedTankId(tank.id)}>
                    <Text className={`font-bold ${selectedTankId === tank.id ? "text-white" : "text-foreground"}`}>{tank.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-3">
              <Metric label="Total cost" value={formatCurrency(summary.totalCost)} tone="warning" />
              <Metric label="Sales" value={formatCurrency(summary.totalSales)} tone="success" />
              <Metric label="Gross profit" value={formatCurrency(summary.grossProfit)} tone={summary.grossProfit >= 0 ? "success" : "error"} />
              <Metric label="Cost / kg sold" value={summary.costPerKgSold === null ? "not calculated" : formatCurrency(summary.costPerKgSold)} tone="muted" />
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">FCR and margin alert</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted">Combine feed amount, average-weight gain, and sales economics to detect declining feed efficiency and profitability early.</Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${severityBadgeClass(managementAlert.severity)}`}>
                  <Text className="text-xs font-extrabold text-white">{severityLabel(managementAlert.severity)}</Text>
                </View>
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">{managementAlert.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">{managementAlert.summary}</Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                <MiniMetric label="Estimated FCR" value={managementAlert.fcr === null ? "not calculated" : formatNumber(managementAlert.fcr, 2)} />
                <MiniMetric label="Biomass gain" value={managementAlert.biomassGainKg === null ? "not calculated" : `${formatNumber(managementAlert.biomassGainKg, 2)} kg`} />
                <MiniMetric label="Margin" value={managementAlert.marginPercent === null ? "not calculated" : `${formatNumber(managementAlert.marginPercent, 1)}%`} />
                <MiniMetric label="Feed cost share" value={managementAlert.feedCostSharePercent === null ? "not calculated" : `${formatNumber(managementAlert.feedCostSharePercent, 1)}%`} />
              </View>
              {managementAlert.alerts.slice(0, 3).map((alert) => (
                <View key={alert.id} className="mt-3 rounded-2xl bg-background p-4">
                  <Text className={`text-sm font-extrabold ${alert.severity === "danger" ? "text-error" : alert.severity === "watch" ? "text-warning" : "text-success"}`}>{alert.title}</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted">{alert.reason}</Text>
                  <Text className="mt-2 text-sm leading-5 text-foreground">Action: {alert.action}</Text>
                </View>
              ))}
              <Text className="mt-3 text-xs leading-5 text-muted">{managementAlert.limitation}</Text>
            </View>

            <MonthlyTrendCard trend={monthlyTrend} />
            <ProfitabilityRankingCard ranking={profitabilityRanking} />
            <ImprovementChecklistCard
              items={improvementChecklist}
              checked={checkedImprovements}
              onToggle={(id) => setCheckedImprovements((current) => ({ ...current, [id]: !current[id] }))}
            />


            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Cost entry</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">Separate categories so feed-cost share and electricity or water burden can be reviewed later.</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {COST_CATEGORIES.map((item) => (
                  <TouchableOpacity key={item.value} className={`rounded-full px-3 py-2 ${category === item.value ? "bg-primary" : "bg-background"}`} onPress={() => { setCategory(item.value); setCostLabel(item.label); }}>
                    <Text className={`text-sm font-bold ${category === item.value ? "text-white" : "text-foreground"}`}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Name" value={costLabel} onChangeText={setCostLabel} placeholder="Example: 3 mm floating pellet" />
              <Input label="Amount" value={costAmount} onChangeText={setCostAmount} placeholder="Example: 18000" keyboardType="decimal-pad" />
              <View className="flex-row gap-3">
                <View className="flex-1"><Input label="Quantity" value={costQuantity} onChangeText={setCostQuantity} placeholder="Example: 20" keyboardType="decimal-pad" /></View>
                <View className="w-24"><Input label="Unit" value={costUnit} onChangeText={setCostUnit} placeholder="kg" /></View>
              </View>
              <Input label="Vendor or staff" value={vendor} onChangeText={setVendor} placeholder="Optional" />
              <Input label="Notes" value={costNotes} onChangeText={setCostNotes} placeholder="Tank condition or payment reason" multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveCost}>
                <Text className="text-center font-bold text-white">Save cost</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Sales record</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">The app calculates sales from kg and unit price, then compares it with input costs.</Text>
              <Input label="Buyer" value={buyer} onChangeText={setBuyer} placeholder="Example: local restaurant" />
              <Input label="Product and grade" value={grade} onChangeText={setGrade} placeholder="Example: live fish over 500 g" />
              <View className="flex-row gap-3">
                <View className="flex-1"><Input label="Sales kg" value={saleKg} onChangeText={setSaleKg} placeholder="Example: 12.5" keyboardType="decimal-pad" /></View>
                <View className="flex-1"><Input label="Unit price per kg" value={unitPrice} onChangeText={setUnitPrice} placeholder="Example: 900" keyboardType="decimal-pad" /></View>
              </View>
              <Input label="Notes" value={saleNotes} onChangeText={setSaleNotes} placeholder="Delivery condition and size notes" multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-success py-4 active:opacity-80" onPress={saveSale}>
                <Text className="text-center font-bold text-white">Save sale</Text>
              </TouchableOpacity>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">Knowledge from public and technical sources</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">Research and extension materials are used as decision support inside the app. Photo checks are not a definitive diagnosis.</Text>
            {catfishKnowledgeCards.map((card) => (
              <TouchableOpacity key={card.id} className="mt-3 rounded-3xl border border-border bg-surface p-5 active:opacity-80" onPress={() => Linking.openURL(card.sourceUrl)}>
                <Text className="text-lg font-bold text-foreground">{card.title}</Text>
                <Text className="mt-2 text-xs font-bold text-primary">{card.sourceLabel}</Text>
                <Text className="mt-2 text-sm leading-5 text-muted">{card.insight}</Text>
                <Text className="mt-3 rounded-2xl bg-background p-3 text-sm leading-5 text-foreground">How the app uses this: {card.appUse}</Text>
              </TouchableOpacity>
            ))}

            <Text className="mt-6 text-xl font-bold text-foreground">Recent finance records</Text>
          </View>
        }
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-muted">There are no finance records yet. Start with fingerling cost, feed cost, or sales price.</Text>}
        renderItem={({ item }) => (
          <View className="mb-3 flex-row items-center justify-between rounded-3xl border border-border bg-surface p-5">
            <View className="flex-1 pr-3">
              <Text className="font-bold text-foreground">{item.title}</Text>
              <Text className="mt-1 text-sm text-muted">{item.detail}</Text>
            </View>
            <Text className={`font-extrabold ${item.amount >= 0 ? "text-success" : "text-warning"}`}>{formatCurrency(item.amount)}</Text>
          </View>
        )}
        ListFooterComponent={<View className="h-8" />}
      />
    </ScreenContainer>
  );
}

function categoryLabel(value: FarmCostCategory) {
  return COST_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "error" | "muted" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "error" ? "text-error" : "text-muted";
  return (
    <View className="min-w-[47%] flex-1 rounded-3xl border border-border bg-surface p-4">
      <Text className="text-xs font-bold uppercase text-muted">{label}</Text>
      <Text className={`mt-2 text-xl font-extrabold ${color}`}>{value}</Text>
    </View>
  );
}

function Input(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad"; multiline?: boolean }) {
  return (
    <View className="mt-3">
      <Text className="mb-1 text-sm font-bold text-foreground">{props.label}</Text>
      <TextInput
        className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground"
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#8A8F98"
        keyboardType={props.keyboardType ?? "default"}
        multiline={props.multiline}
        returnKeyType="done"
      />
    </View>
  );
}

function severityBadgeClass(value: "normal" | "watch" | "danger") {
  if (value === "danger") return "bg-error";
  if (value === "watch") return "bg-warning";
  return "bg-success";
}

function severityLabel(value: "normal" | "watch" | "danger") {
  if (value === "danger") return "danger";
  if (value === "watch") return "watch";
  return "stable";
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-2xl bg-background p-3">
      <Text className="text-xs font-bold text-muted">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-foreground">{value}</Text>
    </View>
  );
}


function MonthlyTrendCard({ trend }: { trend: MonthlyEconomicsTrendPoint[] }) {
  return (
    <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
      <Text className="text-xl font-bold text-foreground">Monthly FCR and margin trend</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">Review the selected tank by month on the same timeline. Lower FCR and higher gross margin are better indicators.</Text>
      {trend.length === 0 ? (
        <Text className="mt-4 rounded-2xl bg-background p-4 text-sm leading-5 text-muted">There are not enough finance, feeding, and growth records to show a monthly trend yet.</Text>
      ) : (
        <>
          <DualLineChart trend={trend.slice(-6)} />
          <View className="mt-3 flex-row gap-3">
            <View className="flex-row items-center gap-2"><View className="h-2 w-5 rounded-full bg-primary" /><Text className="text-xs font-bold text-muted">FCR</Text></View>
            <View className="flex-row items-center gap-2"><View className="h-2 w-5 rounded-full bg-success" /><Text className="text-xs font-bold text-muted">Margin</Text></View>
          </View>
          {trend.slice(-3).map((item) => (
            <View key={item.month} className="mt-3 flex-row items-center justify-between rounded-2xl bg-background p-3">
              <Text className="font-bold text-foreground">{item.label}</Text>
              <Text className="text-sm text-muted">FCR {item.fcr === null ? "not calculated" : formatNumber(item.fcr, 2)} / Margin {item.marginPercent === null ? "not calculated" : `${formatNumber(item.marginPercent, 1)}%`}</Text>
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
        <SvgText x={padding} y={18} fontSize="10" fill="#64748B">High</SvgText>
        <SvgText x={width - padding - 28} y={height - 8} fontSize="10" fill="#64748B">Month</SvgText>
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
      <Text className="text-xl font-bold text-foreground">Tank profitability ranking</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">Compare all tanks by sales, cost, gross profit, margin, and FCR. This ranking is not affected by the selected tank and helps identify farm-wide priorities.</Text>
      {ranking.length === 0 ? (
        <Text className="mt-4 rounded-2xl bg-background p-4 text-sm text-muted">No tank data is available.</Text>
      ) : ranking.map((item) => (
        <View key={item.tankId} className="mt-3 rounded-2xl bg-background p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-extrabold text-foreground">#{item.rank} {item.tankName}</Text>
              <Text className="mt-1 text-xs text-muted">Sales {formatCurrency(item.totalSales)} / Cost {formatCurrency(item.totalCost)}</Text>
            </View>
            <View className={`rounded-full px-3 py-1 ${severityBadgeClass(item.severity)}`}><Text className="text-xs font-extrabold text-white">{severityLabel(item.severity)}</Text></View>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <MiniMetric label="Gross profit" value={formatCurrency(item.grossProfit)} />
            <MiniMetric label="Margin" value={item.marginPercent === null ? "not calculated" : `${formatNumber(item.marginPercent, 1)}%`} />
            <MiniMetric label="Estimated FCR" value={item.fcr === null ? "not calculated" : formatNumber(item.fcr, 2)} />
            <MiniMetric label="Sales kg" value={`${formatNumber(item.salesKg, 1)} kg`} />
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
          <Text className="text-xl font-bold text-foreground">Improvement checklist</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">The app turns alerts into field actions. Check states are kept only on this screen; record evidence in the notes field.</Text>
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
