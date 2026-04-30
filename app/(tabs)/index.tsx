import { useState } from "react";
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm, type Tank } from "@/lib/farm-store";

function TankCard({ tank, missing }: { tank: Tank; missing: boolean }) {
  const farm = useFarm();
  const latestInspection = farm.inspections.find((item) => item.tankId === tank.id);
  const latestFeeding = farm.feedings.find((item) => item.tankId === tank.id);
  return (
    <View className="mb-3 rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">{tank.name}</Text>
          <Text className="mt-1 text-sm text-muted">{tank.location || "No location set"}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${missing ? "bg-warning" : "bg-success"}`}>
          <Text className="text-xs font-bold text-white">{missing ? "Check today" : "Done"}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-background p-3">
          <Text className="text-xs text-muted">Latest temp</Text>
          <Text className="mt-1 text-lg font-bold text-foreground">{latestInspection ? `${latestInspection.waterTempC}°C` : "--"}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-background p-3">
          <Text className="text-xs text-muted">Last feeding</Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">{formatShortDate(latestFeeding?.createdAt)}</Text>
        </View>
      </View>
      {tank.notes ? <Text className="mt-3 text-sm leading-5 text-muted">{tank.notes}</Text> : null}
    </View>
  );
}

export default function HomeScreen() {
  const farm = useFarm();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const saveTank = () => {
    if (!name.trim()) return;
    farm.addTank({ name: name.trim(), location: location.trim(), notes: notes.trim() });
    setName("");
    setLocation("");
    setNotes("");
    setModalOpen(false);
  };

  const missingCount = farm.todaysMissingTankIds.length;

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "left", "right"]}>
      <FlatList
        data={farm.tanks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <View className="mb-4">
              <Text className="text-3xl font-extrabold text-foreground">Catfish Farm</Text>
              <Text className="mt-1 text-base text-muted">Offline records for tanks, feeding, weight, and photos.</Text>
            </View>
            <View className="rounded-3xl bg-primary p-5">
              <Text className="text-sm font-semibold text-white/80">Today’s inspection</Text>
              <Text className="mt-2 text-4xl font-extrabold text-white">{farm.tanks.length - missingCount}/{farm.tanks.length}</Text>
              <Text className="mt-2 text-sm leading-5 text-white/90">
                {missingCount === 0 ? "All tanks have today’s inspection record." : `${missingCount} tank(s) still need water temperature and test values today.`}
              </Text>
            </View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-3xl border border-border bg-surface p-4">
                <Text className="text-xs text-muted">Pending sync</Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">{farm.pendingSyncCount}</Text>
              </View>
              <View className="flex-1 rounded-3xl border border-border bg-surface p-4">
                <Text className="text-xs text-muted">Photos</Text>
                <Text className="mt-1 text-2xl font-bold text-foreground">{farm.photos.length}</Text>
              </View>
            </View>
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-foreground">Tanks</Text>
              <TouchableOpacity className="rounded-full bg-primary px-4 py-2 active:opacity-80" onPress={() => setModalOpen(true)}>
                <Text className="font-bold text-white">Add tank</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => <TankCard tank={item} missing={farm.todaysMissingTankIds.includes(item.id)} />}
        ListFooterComponent={<View className="h-8" />}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-background p-5">
            <Text className="text-2xl font-bold text-foreground">Add tank</Text>
            <Text className="mt-1 text-sm text-muted">Create one local tank record. A matching Drive folder will be prepared during sync.</Text>
            <TextInput className="mt-5 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" placeholder="Tank name" value={name} onChangeText={setName} returnKeyType="done" />
            <TextInput className="mt-3 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" placeholder="Location" value={location} onChangeText={setLocation} returnKeyType="done" />
            <TextInput className="mt-3 min-h-24 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" placeholder="Notes" value={notes} onChangeText={setNotes} multiline />
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity className="flex-1 rounded-2xl border border-border py-4 active:opacity-80" onPress={() => setModalOpen(false)}>
                <Text className="text-center font-bold text-foreground">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveTank}>
                <Text className="text-center font-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
