import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm } from "@/lib/farm-store";
import {
  clearGoogleDriveTokens,
  connectGoogleDrive,
  getGoogleOAuthClientId,
  getStoredGoogleDriveTokenSet,
  uploadFarmExportToGoogleDrive,
} from "@/lib/google-drive";

type DriveConnectionState = "checking" | "connected" | "disconnected";

export default function SyncScreen() {
  const farm = useFarm();
  const network = Network.useNetworkState();
  const [exportUri, setExportUri] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<DriveConnectionState>("checking");
  const [busyAction, setBusyAction] = useState<"connect" | "upload" | "export" | "disconnect" | null>(null);
  const drivePayload = farm.generateDrivePayload();
  const reachable = network.isInternetReachable === true;
  const clientIdConfigured = Boolean(getGoogleOAuthClientId());

  const busy = busyAction !== null;
  const connected = connectionState === "connected";
  const connectionLabel = useMemo(() => {
    if (!clientIdConfigured) return "OAuth client missing";
    if (connectionState === "checking") return "Checking Drive token";
    return connected ? "Google Drive connected" : "Google Drive not connected";
  }, [clientIdConfigured, connected, connectionState]);

  useEffect(() => {
    let mounted = true;
    getStoredGoogleDriveTokenSet()
      .then((tokenSet) => {
        if (mounted) setConnectionState(tokenSet ? "connected" : "disconnected");
      })
      .catch(() => {
        if (mounted) setConnectionState("disconnected");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const exportForDrive = async () => {
    try {
      setBusyAction("export");
      const directory = `${FileSystem.documentDirectory ?? ""}drive-export/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const fileUri = `${directory}catfish-farm-export.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(drivePayload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      setExportUri(fileUri);
      Alert.alert("Drive export prepared", "A JSON package was saved locally. You can keep this as a manual backup or upload it with Google Drive sync.");
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Could not create the local export file.");
    } finally {
      setBusyAction(null);
    }
  };

  const connectDrive = async () => {
    if (!clientIdConfigured) {
      Alert.alert("Google OAuth is not configured", "Set VITE_GOOGLE_OAUTH_CLIENT_ID before building the app.");
      return;
    }
    if (!reachable) {
      Alert.alert("Internet not reachable", "Connect to the internet before starting Google Drive authorization.");
      return;
    }
    try {
      setBusyAction("connect");
      await connectGoogleDrive();
      setConnectionState("connected");
      Alert.alert("Google Drive connected", "The app can now upload farm records to your Google Drive.");
    } catch (error) {
      setConnectionState("disconnected");
      Alert.alert("Google Drive connection failed", error instanceof Error ? error.message : "Authorization did not complete.");
    } finally {
      setBusyAction(null);
    }
  };

  const disconnectDrive = async () => {
    try {
      setBusyAction("disconnect");
      await clearGoogleDriveTokens();
      setConnectionState("disconnected");
      Alert.alert("Google Drive disconnected", "Stored Google Drive tokens were removed from this device.");
    } catch (error) {
      Alert.alert("Disconnect failed", error instanceof Error ? error.message : "Could not remove stored Google Drive tokens.");
    } finally {
      setBusyAction(null);
    }
  };

  const uploadToDrive = async () => {
    if (!reachable) {
      Alert.alert("Internet not reachable", "Records remain safely stored on this device. Try again when the connection is stable.");
      return;
    }
    if (!connected) {
      Alert.alert("Google Drive not connected", "Connect Google Drive before uploading records.");
      return;
    }

    try {
      setBusyAction("upload");
      const result = await uploadFarmExportToGoogleDrive(drivePayload);
      farm.markSynced();
      Alert.alert(
        "Google Drive sync complete",
        `${result.uploadedFileCount} JSON files and ${result.uploadedPhotoCount} photos were uploaded to Drive folder ID ${result.rootFolderId}.`,
      );
    } catch (error) {
      Alert.alert("Google Drive sync failed", error instanceof Error ? error.message : "The Drive upload did not complete.");
    } finally {
      setBusyAction(null);
    }
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
              Records stay local first. After Google authorization, the app uploads tank JSON files and photos into a per-tank folder structure in your Drive.
            </Text>
            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-bold text-foreground">Network</Text>
                <Text className={`font-bold ${reachable ? "text-success" : "text-warning"}`}>{reachable ? "Internet reachable" : "Offline or unstable"}</Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between gap-3">
                <Text className="font-bold text-foreground">Drive</Text>
                <Text className={`flex-1 text-right font-bold ${connected ? "text-success" : "text-warning"}`}>{connectionLabel}</Text>
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
              <TouchableOpacity className="flex-1 rounded-2xl border border-border bg-surface py-4 active:opacity-80" disabled={busy} onPress={connected ? disconnectDrive : connectDrive}>
                <Text className="text-center font-bold text-foreground">{connected ? "Disconnect" : "Connect Drive"}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-2xl bg-primary py-4 active:opacity-80" disabled={busy || !connected} onPress={uploadToDrive}>
                <Text className="text-center font-bold text-white">Upload now</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-3">
              <TouchableOpacity className="rounded-2xl border border-border bg-surface py-4 active:opacity-80" disabled={busy} onPress={exportForDrive}>
                <Text className="text-center font-bold text-foreground">Prepare local export</Text>
              </TouchableOpacity>
            </View>
            {busy ? (
              <View className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl bg-surface p-3">
                <ActivityIndicator />
                <Text className="text-sm font-semibold text-muted">Working on {busyAction}...</Text>
              </View>
            ) : null}
            {exportUri ? <Text className="mt-3 rounded-2xl bg-surface p-3 text-xs text-muted">Export: {exportUri}</Text> : null}
            <Text className="mt-6 text-xl font-bold text-foreground">Drive folder plan</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-lg font-bold text-foreground">{item.folder}</Text>
            <Text className="mt-2 text-sm text-muted">{item.inspections.length} inspections, {item.feedings.length} feedings, {item.photos.length} photos, {item.costEntries.length} costs, {item.saleRecords.length} sales</Text>
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
              Google Drive uses the least broad app-file scope, so this app can create and manage files it uploads without gaining general access to all Drive files.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
