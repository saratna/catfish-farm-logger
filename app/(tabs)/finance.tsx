import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { catfishKnowledgeCards } from "@/lib/catfish-knowledge";
import { assessFeedEfficiencyProfitRisk, calculateEconomicsSummary, formatCurrency, formatNumber } from "@/lib/economics";
import type { FarmCostCategory } from "@/lib/farm-store";
import { formatShortDate, useFarm } from "@/lib/farm-store";

const COST_CATEGORIES: Array<{ value: FarmCostCategory; label: string }> = [
  { value: "seed_stock", label: "稚魚代" },
  { value: "feed", label: "餌代" },
  { value: "labor", label: "人件費" },
  { value: "electricity", label: "電気代" },
  { value: "water", label: "水道代" },
  { value: "medicine", label: "薬品・衛生" },
  { value: "maintenance", label: "設備保守" },
  { value: "other", label: "その他" },
];

const toNumber = (value: string) => Number(value.replace(/,/g, ""));

export default function FinanceScreen() {
  const farm = useFarm();
  const [selectedTankId, setSelectedTankId] = useState(farm.tanks[0]?.id ?? "");
  const [category, setCategory] = useState<FarmCostCategory>("feed");
  const [costLabel, setCostLabel] = useState("餌代");
  const [costAmount, setCostAmount] = useState("");
  const [costQuantity, setCostQuantity] = useState("");
  const [costUnit, setCostUnit] = useState("kg");
  const [vendor, setVendor] = useState("");
  const [costNotes, setCostNotes] = useState("");
  const [buyer, setBuyer] = useState("");
  const [grade, setGrade] = useState("活魚・通常サイズ");
  const [saleKg, setSaleKg] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleNotes, setSaleNotes] = useState("");

  const scopedCosts = useMemo(() => farm.costEntries.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.costEntries, selectedTankId]);
  const scopedSales = useMemo(() => farm.saleRecords.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.saleRecords, selectedTankId]);
  const scopedFeedings = useMemo(() => farm.feedings.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.feedings, selectedTankId]);
  const scopedGrowthMeasurements = useMemo(() => farm.growthMeasurements.filter((item) => !selectedTankId || item.tankId === selectedTankId), [farm.growthMeasurements, selectedTankId]);
  const summary = useMemo(() => calculateEconomicsSummary(scopedCosts, scopedSales), [scopedCosts, scopedSales]);
  const managementAlert = useMemo(() => assessFeedEfficiencyProfitRisk({ costs: scopedCosts, sales: scopedSales, feedings: scopedFeedings, growthMeasurements: scopedGrowthMeasurements }), [scopedCosts, scopedSales, scopedFeedings, scopedGrowthMeasurements]);
  const recentRows = useMemo(() => {
    const costRows = scopedCosts.slice(0, 8).map((item) => ({ id: item.id, kind: "cost" as const, title: item.label, amount: -item.amount, detail: `${categoryLabel(item.category)} · ${formatShortDate(item.createdAt)}` }));
    const saleRows = scopedSales.slice(0, 8).map((item) => ({ id: item.id, kind: "sale" as const, title: item.buyer || item.productGrade, amount: item.totalAmount, detail: `${formatNumber(item.quantityKg)} kg × ${formatCurrency(item.unitPrice)} · ${formatShortDate(item.createdAt)}` }));
    return [...costRows, ...saleRows].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, 12);
  }, [scopedCosts, scopedSales]);

  const saveCost = () => {
    const amount = toNumber(costAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("金額を確認してください", "稚魚代、餌代、人件費などの支出金額を0より大きい数値で入力してください。");
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
    Alert.alert("コストを保存しました", "収支サマリーとGoogle Driveエクスポートに反映されます。");
  };

  const saveSale = () => {
    const kg = toNumber(saleKg);
    const price = toNumber(unitPrice);
    if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(price) || price <= 0) {
      Alert.alert("販売数量と単価を確認してください", "販売kgとkg単価を0より大きい数値で入力してください。");
      return;
    }
    farm.addSaleRecord({
      tankId: selectedTankId || undefined,
      buyer: buyer.trim() || "未指定の販売先",
      productGrade: grade.trim() || "未指定グレード",
      quantityKg: kg,
      unitPrice: price,
      notes: saleNotes.trim(),
    });
    setBuyer("");
    setSaleKg("");
    setUnitPrice("");
    setSaleNotes("");
    Alert.alert("販売記録を保存しました", "売上、粗利益、kgあたりコストを更新しました。");
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
            <Text className="mt-1 text-base leading-6 text-muted">稚魚代、餌代、人件費、電気代、水道代などの投入コストと販売価格を同じ水槽・ロットで記録し、粗利益を確認します。</Text>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-sm font-bold text-muted">対象水槽</Text>
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
              <Metric label="Cost / kg sold" value={summary.costPerKgSold === null ? "未計算" : formatCurrency(summary.costPerKgSold)} tone="muted" />
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">FCR・利益率アラート</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted">給餌量、平均体重の増加、販売収支を組み合わせ、飼料効率と採算の悪化を早めに確認します。</Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${severityBadgeClass(managementAlert.severity)}`}>
                  <Text className="text-xs font-extrabold text-white">{severityLabel(managementAlert.severity)}</Text>
                </View>
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">{managementAlert.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">{managementAlert.summary}</Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                <MiniMetric label="推定FCR" value={managementAlert.fcr === null ? "未計算" : formatNumber(managementAlert.fcr, 2)} />
                <MiniMetric label="増加バイオマス" value={managementAlert.biomassGainKg === null ? "未計算" : `${formatNumber(managementAlert.biomassGainKg, 2)} kg`} />
                <MiniMetric label="利益率" value={managementAlert.marginPercent === null ? "未計算" : `${formatNumber(managementAlert.marginPercent, 1)}%`} />
                <MiniMetric label="餌代比率" value={managementAlert.feedCostSharePercent === null ? "未計算" : `${formatNumber(managementAlert.feedCostSharePercent, 1)}%`} />
              </View>
              {managementAlert.alerts.slice(0, 3).map((alert) => (
                <View key={alert.id} className="mt-3 rounded-2xl bg-background p-4">
                  <Text className={`text-sm font-extrabold ${alert.severity === "danger" ? "text-error" : alert.severity === "watch" ? "text-warning" : "text-success"}`}>{alert.title}</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted">{alert.reason}</Text>
                  <Text className="mt-2 text-sm leading-5 text-foreground">対応: {alert.action}</Text>
                </View>
              ))}
              <Text className="mt-3 text-xs leading-5 text-muted">{managementAlert.limitation}</Text>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">コスト入力</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">区分を分けると、後から餌代比率や電気・水道の負担を確認できます。</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {COST_CATEGORIES.map((item) => (
                  <TouchableOpacity key={item.value} className={`rounded-full px-3 py-2 ${category === item.value ? "bg-primary" : "bg-background"}`} onPress={() => { setCategory(item.value); setCostLabel(item.label); }}>
                    <Text className={`text-sm font-bold ${category === item.value ? "text-white" : "text-foreground"}`}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="名称" value={costLabel} onChangeText={setCostLabel} placeholder="例: 3mm浮上ペレット" />
              <Input label="金額" value={costAmount} onChangeText={setCostAmount} placeholder="例: 18000" keyboardType="decimal-pad" />
              <View className="flex-row gap-3">
                <View className="flex-1"><Input label="数量" value={costQuantity} onChangeText={setCostQuantity} placeholder="例: 20" keyboardType="decimal-pad" /></View>
                <View className="w-24"><Input label="単位" value={costUnit} onChangeText={setCostUnit} placeholder="kg" /></View>
              </View>
              <Input label="購入先・担当" value={vendor} onChangeText={setVendor} placeholder="任意" />
              <Input label="メモ" value={costNotes} onChangeText={setCostNotes} placeholder="水槽条件や支払根拠" multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveCost}>
                <Text className="text-center font-bold text-white">コストを保存</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">販売価格入力</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">販売kgと単価から売上を自動計算し、投入コストと比較します。</Text>
              <Input label="販売先" value={buyer} onChangeText={setBuyer} placeholder="例: 地元レストラン" />
              <Input label="商品・グレード" value={grade} onChangeText={setGrade} placeholder="例: 活魚 500g以上" />
              <View className="flex-row gap-3">
                <View className="flex-1"><Input label="販売kg" value={saleKg} onChangeText={setSaleKg} placeholder="例: 12.5" keyboardType="decimal-pad" /></View>
                <View className="flex-1"><Input label="kg単価" value={unitPrice} onChangeText={setUnitPrice} placeholder="例: 900" keyboardType="decimal-pad" /></View>
              </View>
              <Input label="メモ" value={saleNotes} onChangeText={setSaleNotes} placeholder="納品条件・サイズ感" multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-success py-4 active:opacity-80" onPress={saveSale}>
                <Text className="text-center font-bold text-white">販売記録を保存</Text>
              </TouchableOpacity>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">一次資料・公的資料からの知見</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">研究・普及資料はアプリ内の判断補助として使います。写真チェックは確定診断ではありません。</Text>
            {catfishKnowledgeCards.map((card) => (
              <TouchableOpacity key={card.id} className="mt-3 rounded-3xl border border-border bg-surface p-5 active:opacity-80" onPress={() => Linking.openURL(card.sourceUrl)}>
                <Text className="text-lg font-bold text-foreground">{card.title}</Text>
                <Text className="mt-2 text-xs font-bold text-primary">{card.sourceLabel}</Text>
                <Text className="mt-2 text-sm leading-5 text-muted">{card.insight}</Text>
                <Text className="mt-3 rounded-2xl bg-background p-3 text-sm leading-5 text-foreground">アプリへの反映: {card.appUse}</Text>
              </TouchableOpacity>
            ))}

            <Text className="mt-6 text-xl font-bold text-foreground">最近の収支記録</Text>
          </View>
        }
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-muted">まだ収支記録がありません。稚魚代・餌代・販売価格から入力してください。</Text>}
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
  if (value === "danger") return "危険";
  if (value === "watch") return "注意";
  return "安定";
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-2xl bg-background p-3">
      <Text className="text-xs font-bold text-muted">{label}</Text>
      <Text className="mt-1 text-base font-extrabold text-foreground">{value}</Text>
    </View>
  );
}
