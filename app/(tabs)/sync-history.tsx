import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { formatShortDate, useFarm } from "@/lib/farm-store";

export default function SyncHistoryScreen() {
  const farm = useFarm();
  return (
    <ScreenContainer className="px-5 pt-4">
      <Text className="text-3xl font-extrabold text-foreground">Sync failures</Text>
      <Text className="mt-1 text-base leading-6 text-muted">Review uploads that failed during weak mobile data or Google Drive interruptions. Records stay on this phone and auto-retry when the connection improves.</Text>
      <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
        <Text className="text-lg font-bold text-foreground">Retry guidance</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">Keep recording farm work offline. When Wi-Fi or mobile data becomes stable, open Sync or leave auto-upload enabled. Pending failures change to resolved after a successful upload.</Text>
      </View>
      <FlatList
        className="mt-4"
        data={farm.syncFailures}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-muted">No sync failures recorded. This means recent automatic uploads either have not run yet or completed without errors.</Text>}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{item.itemType.replace(/_/g, " ")}</Text>
                <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{formatShortDate(item.attemptAt)} · {item.stage}</Text>
              </View>
              <Text className={`rounded-full px-3 py-1 text-xs font-bold ${item.retryStatus === "resolved" ? "bg-success text-white" : "bg-warning text-white"}`}>{item.retryStatus.toUpperCase()}</Text>
            </View>
            <Text className="mt-3 text-sm leading-5 text-foreground">{item.reason}</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">{item.guidance}</Text>
            {item.resolvedAt ? <Text className="mt-2 text-xs font-semibold text-success">Resolved {formatShortDate(item.resolvedAt)}</Text> : null}
          </View>
        )}
      />
    </ScreenContainer>
  );
}
