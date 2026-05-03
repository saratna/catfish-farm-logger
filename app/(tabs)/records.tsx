import { useMemo, useState } from "react";
import { Alert, FlatList, Image, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { assessGrowthTrend, buildFeedingAdvice, buildPhotoScreeningFromInputs, type VisibleHealthSigns } from "@/lib/catfish-advisor";
import { formatShortDate, useFarm } from "@/lib/farm-store";
import { trpc } from "@/lib/trpc";

const toNumber = (value: string) => Number(value.replace(",", "."));
const signOptions: Array<{ key: keyof VisibleHealthSigns; label: string }> = [
  { key: "redness", label: "Redness" },
  { key: "ulcers", label: "Ulcer" },
  { key: "whiteSpots", label: "White spots" },
  { key: "finDamage", label: "Fin damage" },
  { key: "swollenBelly", label: "Swollen belly" },
  { key: "popeye", label: "Popeye" },
  { key: "abnormalColor", label: "Color change" },
];

type PhotoAssessmentDraft = {
  estimatedLengthCm?: number;
  estimatedWeightG?: number;
  confidence: "low" | "medium" | "high";
  visibleSigns: string[];
  severity: "normal" | "watch" | "danger";
  summary: string;
  recommendation: string;
  disclaimer: string;
};

async function imageUriToBase64(uri: string) {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function mimeTypeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png" as const;
  if (lower.endsWith(".webp")) return "image/webp" as const;
  if (lower.endsWith(".heic")) return "image/heic" as const;
  return "image/jpeg" as const;
}

export default function RecordsScreen() {
  const farm = useFarm();
  const photoAssess = trpc.photo.assess.useMutation();
  const [tankId, setTankId] = useState(farm.tanks[0]?.id ?? "");
  const [waterTempC, setWaterTempC] = useState("");
  const [ph, setPh] = useState("");
  const [oxygen, setOxygen] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [nitrite, setNitrite] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [feedType, setFeedType] = useState(farm.settings.feedTypes[0] ?? "Floating pellet");
  const [feedAmountKg, setFeedAmountKg] = useState("");
  const [averageWeightG, setAverageWeightG] = useState("");
  const [fishCount, setFishCount] = useState("");
  const [feedProductName, setFeedProductName] = useState(farm.feedProducts[0]?.name ?? "");
  const [proteinPercent, setProteinPercent] = useState(farm.feedProducts[0]?.proteinPercent?.toString() ?? "");
  const [pelletSizeMm, setPelletSizeMm] = useState(farm.feedProducts[0]?.pelletSizeMm?.toString() ?? "");
  const [feedBehavior, setFeedBehavior] = useState<"poor" | "normal" | "strong">("normal");
  const [residualFeed, setResidualFeed] = useState<"none" | "little" | "much">("none");
  const [feedingNotes, setFeedingNotes] = useState("");
  const [photoNotes, setPhotoNotes] = useState("");
  const [growthLengthCm, setGrowthLengthCm] = useState("");
  const [growthWeightG, setGrowthWeightG] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [referenceLengthCm, setReferenceLengthCm] = useState("");
  const [growthPhotoUri, setGrowthPhotoUri] = useState<string | undefined>();
  const [selectedSigns, setSelectedSigns] = useState<VisibleHealthSigns>({});
  const [assessmentDraft, setAssessmentDraft] = useState<PhotoAssessmentDraft | undefined>();

  const selectedTank = farm.tanks.find((tank) => tank.id === tankId) ?? farm.tanks[0];
  const selectedTankId = selectedTank?.id ?? "";

  const growthAssessment = useMemo(() => assessGrowthTrend(farm.growthMeasurements.filter((item) => item.tankId === selectedTankId)), [farm.growthMeasurements, selectedTankId]);

  const timeline = useMemo(() => {
    return [
      ...farm.inspections.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Inspection" as const, id: item.id, at: item.createdAt, text: `${item.waterTempC}°C water, pH ${item.ph ?? "--"}`, synced: item.synced })),
      ...farm.feedings.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Feeding" as const, id: item.id, at: item.createdAt, text: `${item.feedAmountKg} kg ${item.feedProductName || item.feedType}, ${item.averageWeightG} g avg${item.recommendedFeedKg ? ` · rec ${item.recommendedFeedKg} kg` : ""}`, synced: item.synced })),
      ...farm.growthMeasurements.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Growth" as const, id: item.id, at: item.createdAt, text: `${item.lengthCm} cm · ${item.weightG} g${item.source === "photo-assisted" ? " · photo-assisted" : ""}${item.notes ? ` · ${item.notes}` : ""}`, synced: item.synced, uri: item.photoUri })),
      ...farm.photoAssessments.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Photo check" as const, id: item.id, at: item.createdAt, text: `${item.summary}${item.visibleSigns.length ? ` · signs: ${item.visibleSigns.join(", ")}` : ""}`, synced: item.synced, uri: item.uri })),
      ...farm.photos.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Photo" as const, id: item.id, at: item.createdAt, text: item.notes || "Fish photo saved", synced: item.synced, uri: item.uri })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [farm.feedings, farm.growthMeasurements, farm.inspections, farm.photoAssessments, farm.photos, selectedTankId]);

  const saveInspection = () => {
    const temp = toNumber(waterTempC);
    if (!selectedTankId || Number.isNaN(temp)) {
      Alert.alert("Water temperature required", "Please enter a valid water temperature before saving.");
      return;
    }
    farm.addInspection({ tankId: selectedTankId, waterTempC: temp, ph: ph ? toNumber(ph) : undefined, dissolvedOxygen: oxygen ? toNumber(oxygen) : undefined, ammonia: ammonia ? toNumber(ammonia) : undefined, nitrite: nitrite ? toNumber(nitrite) : undefined, notes: inspectionNotes.trim() });
    setWaterTempC(""); setPh(""); setOxygen(""); setAmmonia(""); setNitrite(""); setInspectionNotes("");
  };

  const saveFeeding = () => {
    const amount = toNumber(feedAmountKg);
    const weight = toNumber(averageWeightG);
    if (!selectedTankId || Number.isNaN(amount) || Number.isNaN(weight)) {
      Alert.alert("Feeding details required", "Please enter feed amount and average fish weight.");
      return;
    }
    const count = fishCount ? toNumber(fishCount) : undefined;
    const productProtein = proteinPercent ? toNumber(proteinPercent) : undefined;
    const pelletSize = pelletSizeMm ? toNumber(pelletSizeMm) : undefined;
    const latestInspection = farm.inspections.find((item) => item.tankId === selectedTankId);
    const advice = buildFeedingAdvice({ averageWeightG: weight, fishCount: count, feedAmountKg: amount, productName: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, residualFeed, appetite: feedBehavior, weather: farm.latestWeather, inspection: latestInspection });
    farm.addFeeding({ tankId: selectedTankId, feedType, feedAmountKg: amount, averageWeightG: weight, fishCount: count, feedProductName: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, feedBehavior, residualFeed, recommendedFeedKg: advice.recommendedFeedKg, adviceSummary: advice.summary, productAdvice: advice.productAdvice, notes: [feedingNotes.trim(), ...advice.cautions].filter(Boolean).join("\n") });
    if (feedProductName.trim()) farm.addFeedProduct({ name: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, notes: feedingNotes.trim(), floats: feedType.toLowerCase().includes("floating") });
    setFeedAmountKg(""); setAverageWeightG(""); setFishCount(""); setFeedingNotes("");
  };

  const addPhoto = async () => {
    if (!selectedTankId) return;
    const saveAsset = (uri: string) => { farm.addPhoto({ tankId: selectedTankId, uri, notes: photoNotes.trim() }); setPhotoNotes(""); };
    const pickFromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access to take fish photos."); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
      if (!result.canceled) saveAsset(result.assets[0].uri);
    };
    const pickFromLibrary = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ["images"] });
      if (!result.canceled) saveAsset(result.assets[0].uri);
    };
    if (Platform.OS === "web") { await pickFromLibrary(); return; }
    Alert.alert("Add fish photo", "Choose how to add the photo.", [{ text: "Camera", onPress: () => void pickFromCamera() }, { text: "Library", onPress: () => void pickFromLibrary() }, { text: "Cancel", style: "cancel" }]);
  };

  const chooseGrowthPhoto = async (source: "camera" | "library") => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access to photograph the catfish."); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
      if (!result.canceled) { setGrowthPhotoUri(result.assets[0].uri); setAssessmentDraft(undefined); }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ["images"] });
    if (!result.canceled) { setGrowthPhotoUri(result.assets[0].uri); setAssessmentDraft(undefined); }
  };

  const runPhotoAssessment = async () => {
    if (!growthPhotoUri) { Alert.alert("Photo required", "Please take or select a catfish photo first."); return; }
    try {
      const imageBase64 = await imageUriToBase64(growthPhotoUri);
      const result = await photoAssess.mutateAsync({ imageBase64, mimeType: mimeTypeFromUri(growthPhotoUri), referenceLengthCm: referenceLengthCm ? toNumber(referenceLengthCm) : undefined, manualLengthCm: growthLengthCm ? toNumber(growthLengthCm) : undefined, manualWeightG: growthWeightG ? toNumber(growthWeightG) : undefined, notes: growthNotes });
      setAssessmentDraft(result);
      if (result.estimatedLengthCm && !growthLengthCm) setGrowthLengthCm(String(result.estimatedLengthCm));
      if (result.estimatedWeightG && !growthWeightG) setGrowthWeightG(String(result.estimatedWeightG));
    } catch (error) {
      const local = buildPhotoScreeningFromInputs(selectedSigns);
      setAssessmentDraft({ ...local, confidence: "low" });
      Alert.alert("Photo AI unavailable", "Saved a local screening from the selected signs. You can still save the growth record.");
    }
  };

  const saveGrowthMeasurement = () => {
    const length = toNumber(growthLengthCm);
    const weight = toNumber(growthWeightG);
    if (!selectedTankId || Number.isNaN(length) || Number.isNaN(weight)) { Alert.alert("Size required", "Please enter catfish length in cm and weight in g before saving."); return; }
    const localScreening = buildPhotoScreeningFromInputs(selectedSigns);
    const screening = assessmentDraft ?? { ...localScreening, confidence: "low" as const };
    farm.addGrowthMeasurement({ tankId: selectedTankId, lengthCm: length, weightG: weight, photoUri: growthPhotoUri, source: growthPhotoUri ? "photo-assisted" : "manual", notes: growthNotes.trim() });
    if (growthPhotoUri) {
      farm.addPhotoAssessment({ tankId: selectedTankId, uri: growthPhotoUri, estimatedLengthCm: screening.estimatedLengthCm, estimatedWeightG: screening.estimatedWeightG, confidence: screening.confidence, visibleSigns: screening.visibleSigns, severity: screening.severity, summary: screening.summary, recommendation: screening.recommendation, disclaimer: screening.disclaimer });
    }
    setGrowthLengthCm(""); setGrowthWeightG(""); setGrowthNotes(""); setReferenceLengthCm(""); setGrowthPhotoUri(undefined); setAssessmentDraft(undefined); setSelectedSigns({});
  };

  const toggleSign = (key: keyof VisibleHealthSigns) => setSelectedSigns((current) => ({ ...current, [key]: !current[key] }));

  if (!selectedTank) {
    return <ScreenContainer className="items-center justify-center p-6"><Text className="text-center text-xl font-bold text-foreground">Add a tank first</Text><Text className="mt-2 text-center text-muted">Use the Today tab to create the first tank.</Text></ScreenContainer>;
  }

  const statusClass = growthAssessment.severity === "danger" ? "bg-error" : growthAssessment.severity === "watch" ? "bg-warning" : "bg-success";

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={timeline}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Records</Text>
            <Text className="mt-1 text-base text-muted">Enter checks, feeding, growth measurements, and catfish photo screenings by tank.</Text>

            <FlatList className="mt-4" data={farm.tanks} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity className={`mr-2 rounded-full px-4 py-2 ${item.id === selectedTankId ? "bg-primary" : "bg-surface border border-border"}`} onPress={() => setTankId(item.id)}>
                <Text className={`font-bold ${item.id === selectedTankId ? "text-white" : "text-foreground"}`}>{item.name}</Text>
              </TouchableOpacity>
            )} />

            <View className={`mt-4 rounded-3xl p-5 ${statusClass}`}>
              <Text className="text-xl font-bold text-white">{growthAssessment.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-white">{growthAssessment.summary}</Text>
              <Text className="mt-2 text-sm leading-5 text-white">{growthAssessment.recommendation}</Text>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Growth and photo check</Text>
              <Text className="mt-1 text-sm text-muted">Record catfish length and weight. Photo AI is a screening aid, not a diagnosis.</Text>
              <View className="mt-4 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Length cm" value={growthLengthCm} onChangeText={setGrowthLengthCm} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Weight g" value={growthWeightG} onChangeText={setGrowthWeightG} />
              </View>
              <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Reference cm (ruler/object, optional)" value={referenceLengthCm} onChangeText={setReferenceLengthCm} />
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Growth notes, appetite, behavior" value={growthNotes} onChangeText={setGrowthNotes} multiline />
              {growthPhotoUri ? <Image source={{ uri: growthPhotoUri }} className="mt-3 h-44 w-full rounded-2xl" resizeMode="cover" /> : null}
              <View className="mt-3 flex-row gap-3">
                <TouchableOpacity className="flex-1 rounded-2xl border border-primary py-3" onPress={() => void chooseGrowthPhoto(Platform.OS === "web" ? "library" : "camera")}>
                  <Text className="text-center font-bold text-primary">Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 rounded-2xl border border-primary py-3" onPress={() => void chooseGrowthPhoto("library")}>
                  <Text className="text-center font-bold text-primary">Choose photo</Text>
                </TouchableOpacity>
              </View>
              <Text className="mt-4 text-sm font-bold text-foreground">Visible signs if AI is unavailable or you want to confirm</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {signOptions.map((item) => (
                  <TouchableOpacity key={item.key} className={`rounded-full px-3 py-2 ${selectedSigns[item.key] ? "bg-warning" : "bg-background border border-border"}`} onPress={() => toggleSign(item.key)}>
                    <Text className={`text-xs font-bold ${selectedSigns[item.key] ? "text-white" : "text-foreground"}`}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {assessmentDraft ? (
                <View className="mt-4 rounded-2xl bg-background p-4">
                  <Text className="font-bold text-foreground">{assessmentDraft.severity === "danger" ? "Strong caution" : assessmentDraft.severity === "watch" ? "Watch" : "No major sign"} · confidence {assessmentDraft.confidence}</Text>
                  <Text className="mt-2 text-sm leading-5 text-foreground">{assessmentDraft.summary}</Text>
                  {assessmentDraft.visibleSigns.length ? <Text className="mt-2 text-sm text-warning">Signs: {assessmentDraft.visibleSigns.join(", ")}</Text> : null}
                  <Text className="mt-2 text-xs leading-5 text-muted">{assessmentDraft.recommendation}</Text>
                  <Text className="mt-2 text-xs leading-5 text-muted">{assessmentDraft.disclaimer}</Text>
                </View>
              ) : null}
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity className="flex-1 rounded-2xl bg-warning py-4 active:opacity-80" onPress={() => void runPhotoAssessment()} disabled={photoAssess.isPending}>
                  <Text className="text-center font-bold text-white">{photoAssess.isPending ? "Checking..." : "AI photo check"}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveGrowthMeasurement}>
                  <Text className="text-center font-bold text-white">Save growth</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Daily inspection</Text>
              <Text className="mt-1 text-sm text-muted">Water temperature is required once per day for each tank.</Text>
              <View className="mt-4 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Water °C" value={waterTempC} onChangeText={setWaterTempC} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="pH" value={ph} onChangeText={setPh} />
              </View>
              <View className="mt-3 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="DO mg/L" value={oxygen} onChangeText={setOxygen} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="NH3" value={ammonia} onChangeText={setAmmonia} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="NO2" value={nitrite} onChangeText={setNitrite} />
              </View>
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Inspection notes" value={inspectionNotes} onChangeText={setInspectionNotes} multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveInspection}><Text className="text-center font-bold text-white">Save inspection</Text></TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Feeding and weight</Text>
              <FlatList className="mt-3" data={farm.settings.feedTypes} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item} renderItem={({ item }) => (
                <TouchableOpacity className={`mr-2 rounded-full px-3 py-2 ${item === feedType ? "bg-primary" : "bg-background border border-border"}`} onPress={() => setFeedType(item)}><Text className={`text-xs font-bold ${item === feedType ? "text-white" : "text-foreground"}`}>{item}</Text></TouchableOpacity>
              )} />
              <View className="mt-4 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Feed kg" value={feedAmountKg} onChangeText={setFeedAmountKg} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Avg weight g" value={averageWeightG} onChangeText={setAverageWeightG} /></View>
              <View className="mt-3 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" placeholder="Fish count" value={fishCount} onChangeText={setFishCount} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Product" value={feedProductName} onChangeText={setFeedProductName} /></View>
              <View className="mt-3 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Protein %" value={proteinPercent} onChangeText={setProteinPercent} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Pellet mm" value={pelletSizeMm} onChangeText={setPelletSizeMm} /></View>
              <View className="mt-3 flex-row gap-2">{(["poor", "normal", "strong"] as const).map((item) => <TouchableOpacity key={item} className={`flex-1 rounded-full px-3 py-2 ${feedBehavior === item ? "bg-primary" : "bg-background border border-border"}`} onPress={() => setFeedBehavior(item)}><Text className={`text-center text-xs font-bold ${feedBehavior === item ? "text-white" : "text-foreground"}`}>{item}</Text></TouchableOpacity>)}</View>
              <View className="mt-3 flex-row gap-2">{(["none", "little", "much"] as const).map((item) => <TouchableOpacity key={item} className={`flex-1 rounded-full px-3 py-2 ${residualFeed === item ? "bg-warning" : "bg-background border border-border"}`} onPress={() => setResidualFeed(item)}><Text className={`text-center text-xs font-bold ${residualFeed === item ? "text-white" : "text-foreground"}`}>residue {item}</Text></TouchableOpacity>)}</View>
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Feeding notes" value={feedingNotes} onChangeText={setFeedingNotes} multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveFeeding}><Text className="text-center font-bold text-white">Save feeding</Text></TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Fish photo</Text>
              <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Photo notes" value={photoNotes} onChangeText={setPhotoNotes} />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={addPhoto}><Text className="text-center font-bold text-white">Add photo</Text></TouchableOpacity>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">Latest for {selectedTank.name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-4">
            <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{item.kind}</Text><Text className={`text-xs font-bold ${item.synced ? "text-success" : "text-warning"}`}>{item.synced ? "Synced" : "Pending"}</Text></View>
            <Text className="mt-1 text-sm text-muted">{formatShortDate(item.at)}</Text>
            <Text className="mt-2 text-base text-foreground">{item.text}</Text>
            {"uri" in item && item.uri ? <Image source={{ uri: item.uri }} className="mt-3 h-40 w-full rounded-2xl" resizeMode="cover" /> : null}
          </View>
        )}
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-center text-muted">No records yet for this tank.</Text>}
        ListFooterComponent={<View className="h-8" />}
      />
    </ScreenContainer>
  );
}
