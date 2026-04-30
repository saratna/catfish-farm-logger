import { useMemo, useState } from "react";
import { Alert, FlatList, Image, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm } from "@/lib/farm-store";

const toNumber = (value: string) => Number(value.replace(",", "."));

export default function RecordsScreen() {
  const farm = useFarm();
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
  const [feedingNotes, setFeedingNotes] = useState("");
  const [photoNotes, setPhotoNotes] = useState("");

  const selectedTank = farm.tanks.find((tank) => tank.id === tankId) ?? farm.tanks[0];
  const selectedTankId = selectedTank?.id ?? "";

  const timeline = useMemo(() => {
    return [
      ...farm.inspections.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Inspection" as const, id: item.id, at: item.createdAt, text: `${item.waterTempC}°C water, pH ${item.ph ?? "--"}`, synced: item.synced })),
      ...farm.feedings.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Feeding" as const, id: item.id, at: item.createdAt, text: `${item.feedAmountKg} kg ${item.feedType}, ${item.averageWeightG} g avg`, synced: item.synced })),
      ...farm.photos.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Photo" as const, id: item.id, at: item.createdAt, text: item.notes || "Fish photo saved", synced: item.synced, uri: item.uri })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [farm.feedings, farm.inspections, farm.photos, selectedTankId]);

  const saveInspection = () => {
    const temp = toNumber(waterTempC);
    if (!selectedTankId || Number.isNaN(temp)) {
      Alert.alert("Water temperature required", "Please enter a valid water temperature before saving.");
      return;
    }
    farm.addInspection({
      tankId: selectedTankId,
      waterTempC: temp,
      ph: ph ? toNumber(ph) : undefined,
      dissolvedOxygen: oxygen ? toNumber(oxygen) : undefined,
      ammonia: ammonia ? toNumber(ammonia) : undefined,
      nitrite: nitrite ? toNumber(nitrite) : undefined,
      notes: inspectionNotes.trim(),
    });
    setWaterTempC("");
    setPh("");
    setOxygen("");
    setAmmonia("");
    setNitrite("");
    setInspectionNotes("");
  };

  const saveFeeding = () => {
    const amount = toNumber(feedAmountKg);
    const weight = toNumber(averageWeightG);
    if (!selectedTankId || Number.isNaN(amount) || Number.isNaN(weight)) {
      Alert.alert("Feeding details required", "Please enter feed amount and average fish weight.");
      return;
    }
    farm.addFeeding({ tankId: selectedTankId, feedType, feedAmountKg: amount, averageWeightG: weight, notes: feedingNotes.trim() });
    setFeedAmountKg("");
    setAverageWeightG("");
    setFeedingNotes("");
  };

  const addPhoto = async () => {
    if (!selectedTankId) return;
    const pickFromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera permission needed", "Please allow camera access to take fish photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
      if (!result.canceled) {
        farm.addPhoto({ tankId: selectedTankId, uri: result.assets[0].uri, notes: photoNotes.trim() });
        setPhotoNotes("");
      }
    };

    const pickFromLibrary = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ["images"] });
      if (!result.canceled) {
        farm.addPhoto({ tankId: selectedTankId, uri: result.assets[0].uri, notes: photoNotes.trim() });
        setPhotoNotes("");
      }
    };

    if (Platform.OS === "web") {
      await pickFromLibrary();
      return;
    }

    Alert.alert("Add fish photo", "Choose how to add the photo.", [
      { text: "Camera", onPress: () => void pickFromCamera() },
      { text: "Library", onPress: () => void pickFromLibrary() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (!selectedTank) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text className="text-center text-xl font-bold text-foreground">Add a tank first</Text>
        <Text className="mt-2 text-center text-muted">Use the Today tab to create the first tank.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={timeline}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Records</Text>
            <Text className="mt-1 text-base text-muted">Enter daily checks, feeding, weight, and photos by tank.</Text>

            <FlatList
              className="mt-4"
              data={farm.tanks}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity className={`mr-2 rounded-full px-4 py-2 ${item.id === selectedTankId ? "bg-primary" : "bg-surface border border-border"}`} onPress={() => setTankId(item.id)}>
                  <Text className={`font-bold ${item.id === selectedTankId ? "text-white" : "text-foreground"}`}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

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
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveInspection}>
                <Text className="text-center font-bold text-white">Save inspection</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Feeding and weight</Text>
              <FlatList
                className="mt-3"
                data={farm.settings.feedTypes}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity className={`mr-2 rounded-full px-3 py-2 ${item === feedType ? "bg-primary" : "bg-background border border-border"}`} onPress={() => setFeedType(item)}>
                    <Text className={`text-xs font-bold ${item === feedType ? "text-white" : "text-foreground"}`}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              <View className="mt-4 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Feed kg" value={feedAmountKg} onChangeText={setFeedAmountKg} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Avg weight g" value={averageWeightG} onChangeText={setAverageWeightG} />
              </View>
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Feeding notes" value={feedingNotes} onChangeText={setFeedingNotes} multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveFeeding}>
                <Text className="text-center font-bold text-white">Save feeding</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Fish photo</Text>
              <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Photo notes" value={photoNotes} onChangeText={setPhotoNotes} />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={addPhoto}>
                <Text className="text-center font-bold text-white">Add photo</Text>
              </TouchableOpacity>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">Latest for {selectedTank.name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-foreground">{item.kind}</Text>
              <Text className={`text-xs font-bold ${item.synced ? "text-success" : "text-warning"}`}>{item.synced ? "Synced" : "Pending"}</Text>
            </View>
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
