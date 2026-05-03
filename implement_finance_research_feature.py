from pathlib import Path

root = Path('/home/ubuntu/catfish_farm_logger')

farm_store = root / 'lib/farm-store.tsx'
text = farm_store.read_text()
text = text.replace('export type FarmLocation = {', '''export type FarmCostCategory = "seed_stock" | "feed" | "labor" | "electricity" | "water" | "medicine" | "maintenance" | "other";

export type FarmCostEntry = {
  id: string;
  tankId?: string;
  createdAt: string;
  category: FarmCostCategory;
  label: string;
  amount: number;
  quantity?: number;
  unit?: string;
  vendor?: string;
  notes: string;
  synced: boolean;
};

export type FarmSaleRecord = {
  id: string;
  tankId?: string;
  createdAt: string;
  buyer: string;
  productGrade: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
  synced: boolean;
};

export type FarmLocation = {''')
text = text.replace('  photoAssessments: PhotoAssessmentRecord[];\n  location?: FarmLocation;', '  photoAssessments: PhotoAssessmentRecord[];\n  costEntries: FarmCostEntry[];\n  saleRecords: FarmSaleRecord[];\n  location?: FarmLocation;')
text = text.replace('  | { type: "addPhotoAssessment"; payload: PhotoAssessmentRecord }\n  | { type: "setLocation"; payload: FarmLocation }', '  | { type: "addPhotoAssessment"; payload: PhotoAssessmentRecord }\n  | { type: "addCostEntry"; payload: FarmCostEntry }\n  | { type: "addSaleRecord"; payload: FarmSaleRecord }\n  | { type: "setLocation"; payload: FarmLocation }')
text = text.replace('  photoAssessments: [],\n  weatherRecords: [],', '  photoAssessments: [],\n  costEntries: [],\n  saleRecords: [],\n  weatherRecords: [],')
text = text.replace('    case "addPhotoAssessment":\n      return { ...state, photoAssessments: [action.payload, ...state.photoAssessments], sync: waitingSync("Photo assessment saved locally") };\n    case "setLocation":', '    case "addPhotoAssessment":\n      return { ...state, photoAssessments: [action.payload, ...state.photoAssessments], sync: waitingSync("Photo assessment saved locally") };\n    case "addCostEntry":\n      return { ...state, costEntries: [action.payload, ...state.costEntries], sync: waitingSync("Cost entry saved locally") };\n    case "addSaleRecord":\n      return { ...state, saleRecords: [action.payload, ...state.saleRecords], sync: waitingSync("Sale record saved locally") };\n    case "setLocation":')
text = text.replace('        photoAssessments: state.photoAssessments.map((item) => ({ ...item, synced: true })),\n        weatherRecords:', '        photoAssessments: state.photoAssessments.map((item) => ({ ...item, synced: true })),\n        costEntries: state.costEntries.map((item) => ({ ...item, synced: true })),\n        saleRecords: state.saleRecords.map((item) => ({ ...item, synced: true })),\n        weatherRecords:')
text = text.replace('  addPhotoAssessment: (input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => void;\n  setLocation:', '  addPhotoAssessment: (input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => void;\n  addCostEntry: (input: Omit<FarmCostEntry, "id" | "createdAt" | "synced">) => void;\n  addSaleRecord: (input: Omit<FarmSaleRecord, "id" | "createdAt" | "synced" | "totalAmount"> & { totalAmount?: number }) => void;\n  setLocation:')
text = text.replace('  feedProducts: FeedProduct[];\n  tanks: Array<{', '  feedProducts: FeedProduct[];\n  costEntries: FarmCostEntry[];\n  saleRecords: FarmSaleRecord[];\n  tanks: Array<{')
text = text.replace('    photoAssessments: PhotoAssessmentRecord[];\n    files:', '    photoAssessments: PhotoAssessmentRecord[];\n    costEntries: FarmCostEntry[];\n    saleRecords: FarmSaleRecord[];\n    files:')
text = text.replace('      state.photoAssessments.filter((item) => !item.synced).length +\n      state.weatherRecords', '      state.photoAssessments.filter((item) => !item.synced).length +\n      state.costEntries.filter((item) => !item.synced).length +\n      state.saleRecords.filter((item) => !item.synced).length +\n      state.weatherRecords')
text = text.replace('[state.inspections, state.feedings, state.photos, state.growthMeasurements, state.photoAssessments, state.weatherRecords', '[state.inspections, state.feedings, state.photos, state.growthMeasurements, state.photoAssessments, state.costEntries, state.saleRecords, state.weatherRecords')
text = text.replace('  const setLocation = useCallback', '''  const addCostEntry = useCallback((input: Omit<FarmCostEntry, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addCostEntry", payload: { id: createId("cost"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addSaleRecord = useCallback((input: Omit<FarmSaleRecord, "id" | "createdAt" | "synced" | "totalAmount"> & { totalAmount?: number }) => {
    const totalAmount = input.totalAmount ?? input.quantityKg * input.unitPrice;
    dispatch({ type: "addSaleRecord", payload: { id: createId("sale"), createdAt: nowIso(), synced: false, ...input, totalAmount } });
  }, []);

  const setLocation = useCallback''')
text = text.replace('      feedProducts: state.feedProducts,\n      tanks:', '      feedProducts: state.feedProducts,\n      costEntries: state.costEntries,\n      saleRecords: state.saleRecords,\n      tanks:')
text = text.replace('          photoAssessments: state.photoAssessments.filter((item) => item.tankId === tank.id),\n          files:', '          photoAssessments: state.photoAssessments.filter((item) => item.tankId === tank.id),\n          costEntries: state.costEntries.filter((item) => item.tankId === tank.id),\n          saleRecords: state.saleRecords.filter((item) => item.tankId === tank.id),\n          files:')
text = text.replace('"photo-assessments.json", "growth-status.json", "sync-log.json", "feeding-advice.json"', '"photo-assessments.json", "costs.json", "sales.json", "economics-summary.json", "growth-status.json", "sync-log.json", "feeding-advice.json"')
text = text.replace('      addPhotoAssessment,\n      setLocation,', '      addPhotoAssessment,\n      addCostEntry,\n      addSaleRecord,\n      setLocation,')
text = text.replace('addGrowthMeasurement, addPhotoAssessment, setLocation', 'addGrowthMeasurement, addPhotoAssessment, addCostEntry, addSaleRecord, setLocation')
farm_store.write_text(text)

(root / 'lib/economics.ts').write_text('''import type { FarmCostEntry, FarmSaleRecord } from "@/lib/farm-store";

export type EconomicsSummary = {
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  marginPercent: number | null;
  costPerKgSold: number | null;
  salesKg: number;
  topCostCategory: string;
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

function safeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
''')

(root / 'lib/catfish-knowledge.ts').write_text('''export type CatfishKnowledgeCard = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  insight: string;
  appUse: string;
};

export const catfishKnowledgeCards: CatfishKnowledgeCard[] = [
  {
    id: "akishinonomiya-taxonomy",
    title: "分類・系統研究を養殖記録の前提にする",
    sourceLabel: "山階鳥類研究所・総裁プロフィール",
    sourceUrl: "https://www.yamashina.or.jp/hp/gaiyo/staff/sosai/100101.html",
    insight: "秋篠宮皇嗣殿下はナマズ類など魚類の分類・系統に関する研究業績を持つ研究者として公表されている。養殖記録では、種名・系統・導入ロットを曖昧にしないことが比較可能なデータの基盤になる。",
    appUse: "水槽・ロット名、稚魚由来、写真、成長測定を同じIDで残し、後から品種や系統差を比較できるようにする。",
  },
  {
    id: "seafdec-hatchery",
    title: "稚魚・種苗段階の管理費を分けて記録する",
    sourceLabel: "SEAFDEC/AQD Catfish resources",
    sourceUrl: "https://www.seafdec.org.ph/catfish/",
    insight: "東南アジアの水産研究機関は、ナマズ養殖で種苗生産、飼育、餌、疾病管理を一体の技術体系として扱っている。稚魚代は単なる購入費ではなく、生残率と成長結果を左右する初期投資である。",
    appUse: "稚魚代を独立したコスト区分にし、成長記録・死亡や異常の記録と同じ水槽単位で追跡する。",
  },
  {
    id: "philippines-government",
    title: "政府普及資料は現場向けチェックリストとして使う",
    sourceLabel: "Philippines BFAR / official aquaculture materials",
    sourceUrl: "https://www.bfar.da.gov.ph/",
    insight: "フィリピン政府系機関は養殖魚の生産、飼料、池管理、疾病予防などの普及情報を発信している。公的資料は地域条件に応じた実務上の基準や注意点を確認する入口になる。",
    appUse: "餌代、水道代、電気代、人件費を日次またはロット単位で入れ、販売価格と照合して現場改善に使う。",
  },
  {
    id: "mississippi-disease",
    title: "病気チェックは確定診断ではなく早期発見の補助に限定する",
    sourceLabel: "Mississippi State University Extension Catfish disease information",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases-catfish",
    insight: "米国の普及機関は、ナマズ疾病で外観、行動、水質、死亡状況を総合して判断する重要性を示している。写真だけで病名を断定するのは危険である。",
    appUse: "写真チェック結果には注意喚起と専門家相談の文言を残し、水温・水質・給餌履歴と一緒に確認する。",
  },
  {
    id: "mekong-conservation",
    title: "成長データは長期比較できる形式で残す",
    sourceLabel: "Natural History Bulletin of the Siam Society: Mekong giant catfish research",
    sourceUrl: "https://so04.tci-thaijo.org/index.php/nhbss/article/view/170006",
    insight: "メコンオオナマズなどの研究は、個体群、成長、分布、保全の情報を長期的に蓄積する価値を示している。養殖でも短期の見た目だけではなく時系列データが重要になる。",
    appUse: "体長・体重・写真・販売重量・コストを時系列に残し、ロットごとの成長効率と利益を比較する。",
  },
];
''')

(root / 'app/(tabs)/finance.tsx').write_text('''import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { catfishKnowledgeCards } from "@/lib/catfish-knowledge";
import { calculateEconomicsSummary, formatCurrency, formatNumber } from "@/lib/economics";
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
  const summary = useMemo(() => calculateEconomicsSummary(scopedCosts, scopedSales), [scopedCosts, scopedSales]);
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
''')

layout = root / 'app/(tabs)/_layout.tsx'
text = layout.read_text()
text = text.replace('      <Tabs.Screen\n        name="sync"', '''      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="yensign.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sync"''')
layout.write_text(text)

icons = root / 'components/ui/icon-symbol.tsx'
text = icons.read_text()
text = text.replace('  "cloud.rain.fill": "thunderstorm",', '  "cloud.rain.fill": "thunderstorm",\n  "yensign.circle.fill": "payments",')
icons.write_text(text)

sync = root / 'app/(tabs)/sync.tsx'
text = sync.read_text()
text = text.replace('{item.inspections.length} inspections, {item.feedings.length} feedings, {item.photos.length} photos', '{item.inspections.length} inspections, {item.feedings.length} feedings, {item.photos.length} photos, {item.costEntries.length} costs, {item.saleRecords.length} sales')
sync.write_text(text)

gdrive = root / 'lib/google-drive.ts'
text = gdrive.read_text()
text = text.replace('      { name: "photo-assessments.json", value: tankExport.photoAssessments },\n      { name: "sync-log.json",', '      { name: "photo-assessments.json", value: tankExport.photoAssessments },\n      { name: "costs.json", value: tankExport.costEntries },\n      { name: "sales.json", value: tankExport.saleRecords },\n      { name: "economics-summary.json", value: { costCount: tankExport.costEntries.length, saleCount: tankExport.saleRecords.length } },\n      { name: "sync-log.json",')
gdrive.write_text(text)

test = root / 'tests/app-basic.test.ts'
text = test.read_text()
insert = '''\n  it("calculates economics summary from costs and sales", async () => {\n    const { calculateEconomicsSummary } = await import("../lib/economics");\n    const summary = calculateEconomicsSummary(\n      [\n        { id: "c1", createdAt: "2026-01-01", category: "feed", label: "Feed", amount: 12000, notes: "", synced: false },\n        { id: "c2", createdAt: "2026-01-02", category: "electricity", label: "Power", amount: 3000, notes: "", synced: false },\n      ],\n      [{ id: "s1", createdAt: "2026-01-03", buyer: "Market", productGrade: "Live", quantityKg: 20, unitPrice: 900, totalAmount: 18000, notes: "", synced: false }],\n    );\n\n    expect(summary.totalCost).toBe(15000);\n    expect(summary.totalSales).toBe(18000);\n    expect(summary.grossProfit).toBe(3000);\n    expect(summary.costPerKgSold).toBe(750);\n    expect(summary.topCostCategory).toBe("feed");\n  });\n\n  it("keeps research knowledge cards tied to source URLs", async () => {\n    const { catfishKnowledgeCards } = await import("../lib/catfish-knowledge");\n    expect(catfishKnowledgeCards.length).toBeGreaterThanOrEqual(5);\n    expect(catfishKnowledgeCards.every((card: { sourceUrl: string }) => card.sourceUrl.startsWith("https://"))).toBe(true);\n  });\n'''
if 'calculates economics summary from costs and sales' not in text:
    text = text.replace('\n});\n', insert + '\n});\n')
test.write_text(text)
