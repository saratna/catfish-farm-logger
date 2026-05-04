import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm, type SyncFailure } from "@/lib/farm-store";
import { uploadFarmExportToGoogleDrive } from "@/lib/google-drive";

function FailureRow({ item }: { item: SyncFailure }) {
  const farm = useFarm();
  const [retrying, setRetrying] = useState(false);
  const isResolved = item.retryStatus === "resolved";

  const retrySingleFailure = async () => {
    if (isResolved || retrying) return;
    const attemptAt = new Date().toISOString();
    setRetrying(true);
    farm.setSyncStatus({
      ...farm.sync,
      status: "syncing",
      lastAttemptAt: attemptAt,
      message: `Retrying ${item.itemType.replace(/_/g, " ")} from the failure history. Local records remain safe on this phone.`,
    });

    try {
      const result = await uploadFarmExportToGoogleDrive(farm.generateDrivePayload());
      farm.resolveSyncFailures(item.id);
      farm.markSynced(result.weeklyReportGeneratedAt);
      farm.setSyncStatus({
        status: "synced",
        lastSyncAt: new Date().toISOString(),
        lastAttemptAt: attemptAt,
        lastWeeklyReportAt: result.weeklyReportGeneratedAt ?? farm.sync.lastWeeklyReportAt,
        message: `Manual retry complete: ${result.uploadedFileCount} JSON files, ${result.uploadedPhotoCount} photos, and ${result.uploadedWeeklyReportCount} weekly PDF reports were uploaded.`,
      });
      Alert.alert("Retry complete", "The selected failure was retried successfully. Other pending local records were also uploaded if Google Drive accepted them.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Manual retry failed. Records remain safely stored on this phone.";
      farm.recordSyncFailure({
        attemptAt,
        itemType: item.itemType,
        itemId: item.itemId,
        stage: "manual_retry",
        reason,
        guidance: "Try again when Wi-Fi or mobile data is stable. If this repeats, reconnect Google Drive from the Sync screen.",
      });
      farm.setSyncStatus({
        ...farm.sync,
        status: "failed",
        lastAttemptAt: attemptAt,
        message: reason,
      });
      Alert.alert("Retry failed", reason);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.itemType.replace(/_/g, " ")}</Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{formatShortDate(item.attemptAt)} · {item.stage}</Text>
        </View>
        <Text className={`rounded-full px-3 py-1 text-xs font-bold ${isResolved ? "bg-success text-white" : "bg-warning text-white"}`}>{item.retryStatus.toUpperCase()}</Text>
      </View>
      <Text className="mt-3 text-sm leading-5 text-foreground">{item.reason}</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">{item.guidance}</Text>
      {item.resolvedAt ? <Text className="mt-2 text-xs font-semibold text-success">Resolved {formatShortDate(item.resolvedAt)}</Text> : null}
      {!isResolved ? (
        <TouchableOpacity
          className="mt-4 rounded-2xl bg-primary px-4 py-3 active:opacity-80"
          disabled={retrying}
          onPress={retrySingleFailure}
        >
          {retrying ? (
            <View className="flex-row items-center justify-center gap-2">
              <ActivityIndicator color="#ffffff" />
              <Text className="font-bold text-white">Retrying upload...</Text>
            </View>
          ) : (
            <Text className="text-center font-bold text-white">Retry this failure</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function SyncHistoryScreen() {
  const farm = useFarm();
  return (
    <ScreenContainer className="px-5 pt-4">
      <Text className="text-3xl font-extrabold text-foreground">Sync failures</Text>
      <Text className="mt-1 text-base leading-6 text-muted">Review uploads that failed during weak mobile data or Google Drive interruptions. Records stay on this phone and auto-retry when the connection improves.</Text>
      <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
        <Text className="text-lg font-bold text-foreground">Retry guidance</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">Use the retry button on a single failure when staff are back on stable Wi-Fi or mobile data. A successful retry also uploads other pending records because Google Drive receives one safe export package.</Text>
      </View>
      <FlatList
        className="mt-4"
        data={farm.syncFailures}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-muted">No sync failures recorded. This means recent automatic uploads either have not run yet or completed without errors.</Text>}
        renderItem={({ item }) => <FailureRow item={item} />}
      />
    </ScreenContainer>
  );
}
