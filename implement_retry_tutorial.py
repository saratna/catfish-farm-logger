from pathlib import Path

root = Path('/home/ubuntu/catfish_farm_logger')

farm_store = root / 'lib' / 'farm-store.tsx'
text = farm_store.read_text()
text = text.replace(
    '  | { type: "addSyncFailure"; payload: SyncFailure }\n  | { type: "resolveSyncFailures"; payload: { at: string } };',
    '  | { type: "addSyncFailure"; payload: SyncFailure }\n  | { type: "resolveSyncFailures"; payload: { at: string; id?: string } };'
)
text = text.replace(
    '    case "resolveSyncFailures":\n      return { ...state, syncFailures: state.syncFailures.map((item) => item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item) };',
    '    case "resolveSyncFailures":\n      return {\n        ...state,\n        syncFailures: state.syncFailures.map((item) => {\n          const shouldResolve = action.payload.id ? item.id === action.payload.id : item.retryStatus === "pending";\n          return shouldResolve && item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item;\n        }),\n      };'
)
text = text.replace(
    '  resolveSyncFailures: () => void;',
    '  resolveSyncFailures: (id?: string) => void;'
)
text = text.replace(
    '  const resolveSyncFailures = useCallback(() => {\n    dispatch({ type: "resolveSyncFailures", payload: { at: nowIso() } });\n  }, []);',
    '  const resolveSyncFailures = useCallback((id?: string) => {\n    dispatch({ type: "resolveSyncFailures", payload: { at: nowIso(), id } });\n  }, []);'
)
farm_store.write_text(text)

sync_history = root / 'app' / '(tabs)' / 'sync-history.tsx'
sync_history.write_text('''import { useState } from "react";
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
        status: "error",
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
''')

tutorial = root / 'app' / '(tabs)' / 'tutorial.tsx'
tutorial.write_text('''import { FlatList, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

const steps = [
  {
    title: "1. Record every tank visit",
    body: "Open Records after feeding, inspection, weighing, or taking fish photos. Save the data even when the signal is weak; the app keeps it on this phone first.",
  },
  {
    title: "2. Use short, consistent notes",
    body: "Write clear English notes such as low appetite, muddy water, dead fish count, pump issue, or changed feed brand. This helps the owner review farm conditions later.",
  },
  {
    title: "3. Watch the Today screen",
    body: "The Today screen shows missing tank checks, weather risk, business alerts, and whether records are still waiting for upload. Treat danger alerts as work instructions.",
  },
  {
    title: "4. Sync when the connection is stable",
    body: "The app tries to upload automatically when mobile data or Wi-Fi returns. If data has not uploaded for several days, open Sync and run a manual upload while the phone has a stable connection.",
  },
  {
    title: "5. Retry only the failed upload",
    body: "If Sync failures shows a problem, tap Retry this failure after moving to a stronger signal area. Do not delete local records; they are needed for the next upload attempt.",
  },
  {
    title: "6. Save data before changing phones",
    body: "Before replacing or resetting a phone, connect to stable internet and confirm Sync says the latest records were uploaded to Google Drive.",
  },
];

const doList = ["Keep the phone charged during farm rounds.", "Use one phone per farm team when possible.", "Take photos in low-bandwidth mode for faster uploads.", "Report repeated sync failures to the supervisor."];
const avoidList = ["Do not clear app data before upload is complete.", "Do not uninstall the app on an unsynced phone.", "Do not wait until harvest day to enter missing records.", "Do not ignore stale-sync warnings."];

export default function TutorialScreen() {
  return (
    <ScreenContainer className="px-5 pt-4">
      <Text className="text-3xl font-extrabold text-foreground">Quick guide</Text>
      <Text className="mt-1 text-base leading-6 text-muted">A simple field tutorial for Philippine catfish farm staff working with unstable mobile internet.</Text>
      <FlatList
        className="mt-4"
        data={steps}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="mb-4 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-xl font-bold text-foreground">Main rule</Text>
            <Text className="mt-2 text-sm leading-6 text-muted">Record work immediately in the field. The phone is the first storage location, and Google Drive is the backup when the internet becomes stable.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-lg font-bold text-foreground">{item.title}</Text>
            <Text className="mt-2 text-sm leading-6 text-muted">{item.body}</Text>
          </View>
        )}
        ListFooterComponent={
          <View className="gap-3">
            <View className="rounded-3xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-foreground">Do this</Text>
              {doList.map((item) => <Text key={item} className="mt-2 text-sm leading-5 text-muted">• {item}</Text>)}
            </View>
            <View className="rounded-3xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-foreground">Avoid this</Text>
              {avoidList.map((item) => <Text key={item} className="mt-2 text-sm leading-5 text-muted">• {item}</Text>)}
            </View>
          </View>
        }
      />
    </ScreenContainer>
  );
}
''')

layout = root / 'app' / '(tabs)' / '_layout.tsx'
text = layout.read_text()
insert = '''      <Tabs.Screen
        name="tutorial"
        options={{
          title: "Guide",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="book.fill" color={color} />,
        }}
      />
'''
if 'name="tutorial"' not in text:
    text = text.replace('      <Tabs.Screen\n        name="settings"', insert + '      <Tabs.Screen\n        name="settings"')
layout.write_text(text)

icon = root / 'components' / 'ui' / 'icon-symbol.tsx'
text = icon.read_text()
if '"book.fill"' not in text:
    text = text.replace('  "exclamationmark.triangle.fill": "warning",\n', '  "exclamationmark.triangle.fill": "warning",\n  "book.fill": "menu-book",\n')
icon.write_text(text)

test = root / 'tests' / 'app-basic.test.ts'
text = test.read_text()
addition = '''

  it("adds per-failure retry buttons and a Philippine staff quick guide", () => {
    const history = read("app/(tabs)/sync-history.tsx");
    const guide = read("app/(tabs)/tutorial.tsx");
    const layout = read("app/(tabs)/_layout.tsx");
    const store = read("lib/farm-store.tsx");
    expect(history).toContain("Retry this failure");
    expect(history).toContain("uploadFarmExportToGoogleDrive");
    expect(store).toContain("resolveSyncFailures: (id?: string) => void");
    expect(guide).toContain("Philippine catfish farm staff");
    expect(guide).toContain("Do not clear app data before upload is complete");
    expect(layout).toContain('name="tutorial"');
  });
'''
if 'adds per-failure retry buttons and a Philippine staff quick guide' not in text:
    text = text.replace('\n});\n\n\ndescribe("offline sync automation additions", () => {', addition + '\n});\n\n\ndescribe("offline sync automation additions", () => {')
test.write_text(text)
