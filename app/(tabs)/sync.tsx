import { useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm } from "@/lib/farm-store";

export default function SyncScreen() {
  const farm = useFarm();
  const network = Network.useNetworkState();
  const [exportUri, setExportUri] = useState<string | null>(null);
  const drivePayload = farm.generateDrivePayload();
  const reachable = network.isInternetReachable === true;

  const exportForDrive = async () => {
    const directory = `${FileSystem.documentDirectory ?? ""}drive-export/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const fileUri = `${directory}catfish-farm-export.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(drivePayload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    setExportUri(fileUri);
    Alert.alert("Drive export prepared", "A JSON package was saved locally and is ready for Google Drive upload wiring.");
  };

  const markAsSynced = () => {
    if (!reachable) {
      Alert.alert("Internet not reachable", "Records remain safely stored on this device. Try again when the connection is stable.");
      return;
    }
    farm.markSynced();
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={drivePayload.tanks}
        keyExtractor={(item) => item.tank.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Google Drive Sync</Text>
            <Text className="mt-1 text-base leading-6 text-muted">
              Records stay local first. When internet is reachable, this app prepares the same per-tank folder structure that will be uploaded to Google Drive.
            </Text>
            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-foreground">Connection</Text>
                <Text className={`font-bold ${reachable ? "text-success" : "text-warning"}`}>{reachable ? "Internet reachable" : "Offline or unstable"}</Text>
              </View>
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-background p-3">
                  <Text className="text-xs text-muted">Pending records</Text>
                  <Text className="mt-1 text-2xl font-bold text-foreground">{farm.pendingSyncCount}</Text>
                </View>
                <View className="flex-1 rounded-2xl bg-background p-3">
                  <Text className="text-xs text-muted">Last sync</Text>
                  <Text className="mt-1 text-sm font-semibold text-foreground">{formatShortDate(farm.sync.lastSyncAt)}</Text>
                </View>
              </View>
              <Text className="mt-4 text-sm leading-5 text-muted">{farm.sync.message}</Text>
            </View>
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity className="flex-1 rounded-2xl border border-border bg-surface py-4 active:opacity-80" onPress={exportForDrive}>
                <Text className="text-center font-bold text-foreground">Prepare export</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-2xl bg-primary py-4 active:opacity-80" onPress={markAsSynced}>
                <Text className="text-center font-bold text-white">Mark synced</Text>
              </TouchableOpacity>
            </View>
            {exportUri ? <Text className="mt-3 rounded-2xl bg-surface p-3 text-xs text-muted">Export: {exportUri}</Text> : null}
            <Text className="mt-6 text-xl font-bold text-foreground">Drive folder plan</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-lg font-bold text-foreground">{item.folder}</Text>
            <Text className="mt-2 text-sm text-muted">{item.inspections.length} inspections, {item.feedings.length} feedings, {item.photos.length} photos</Text>
            <View className="mt-3 rounded-2xl bg-background p-3">
              {item.files.map((file) => (
                <Text key={file} className="py-1 text-sm text-foreground">/{file}</Text>
              ))}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View className="pb-8 pt-2">
            <Text className="text-xs leading-5 text-muted">
              Note: full automatic Google Drive upload requires Google OAuth and Drive API credentials at build time. The local export and folder plan are implemented so that Drive API upload can be connected without changing the farm recording screens.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
