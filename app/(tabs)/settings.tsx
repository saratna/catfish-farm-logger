import { useState } from "react";
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Notifications from "expo-notifications";

import { ScreenContainer } from "@/components/screen-container";
import { useFarm } from "@/lib/farm-store";
import { trpc } from "@/lib/trpc";
import { googleDriveSyncEnabled, getDistributionLabel } from "@/lib/distribution";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function SettingsScreen() {
  const farm = useFarm();
  const [hour, setHour] = useState(String(farm.settings.reminderHour));
  const [minute, setMinute] = useState(String(farm.settings.reminderMinute).padStart(2, "0"));
  const [feedTypes, setFeedTypes] = useState(farm.settings.feedTypes.join(", "));
  const [driveRootFolder, setDriveRootFolder] = useState(farm.settings.driveRootFolder);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(farm.settings.autoSyncEnabled);
  const [staleSyncWarningDays, setStaleSyncWarningDays] = useState(String(farm.settings.staleSyncWarningDays));
  const [lowBandwidthMode, setLowBandwidthMode] = useState(farm.settings.lowBandwidthMode);
  const [photoCompressionEnabled, setPhotoCompressionEnabled] = useState(farm.settings.photoCompressionEnabled);
  const [photoCompressionQuality, setPhotoCompressionQuality] = useState(String(farm.settings.photoCompressionQuality));
  const [photoMaxUploadWidth, setPhotoMaxUploadWidth] = useState(String(farm.settings.photoMaxUploadWidth));
  const [weeklyPdfReportsEnabled, setWeeklyPdfReportsEnabled] = useState(farm.settings.weeklyPdfReportsEnabled);
  const [lineDangerAlertsEnabled, setLineDangerAlertsEnabled] = useState(farm.settings.lineDangerAlertsEnabled);
  const [lineAlertCooldownMinutes, setLineAlertCooldownMinutes] = useState(String(farm.settings.lineAlertCooldownMinutes));
  const [ntfyDangerAlertsEnabled, setNtfyDangerAlertsEnabled] = useState(farm.settings.ntfyDangerAlertsEnabled);
  const [ntfyServerUrl, setNtfyServerUrl] = useState(farm.settings.ntfyServerUrl || "https://ntfy.sh");
  const [ntfyTopic, setNtfyTopic] = useState(farm.settings.ntfyTopic);
  const [ntfyToken, setNtfyToken] = useState(farm.settings.ntfyToken);
  const lineStatus = trpc.line.status.useQuery(undefined, { refetchInterval: 10000 });
  const lineTestMutation = trpc.line.sendDangerAlert.useMutation();
  const ntfyStatus = trpc.ntfy.status.useQuery({ serverUrl: ntfyServerUrl.trim() || "https://ntfy.sh", topic: ntfyTopic.trim(), token: ntfyToken.trim() }, { refetchInterval: 10000 });
  const ntfyTestMutation = trpc.ntfy.sendDangerAlert.useMutation();

  const saveSettings = () => {
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);
    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 || Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      Alert.alert("Invalid reminder time", "Please enter a 24-hour time such as 8:00 or 17:30.");
      return;
    }
    const parsedFeedTypes = feedTypes.split(",").map((item) => item.trim()).filter(Boolean);
    const parsedStaleDays = Math.max(1, Number(staleSyncWarningDays) || farm.settings.staleSyncWarningDays);
    const parsedQuality = Math.min(0.9, Math.max(0.2, Number(photoCompressionQuality) || farm.settings.photoCompressionQuality));
    const parsedWidth = Math.min(2048, Math.max(640, Number(photoMaxUploadWidth) || farm.settings.photoMaxUploadWidth));
    const parsedLineCooldown = Math.min(1440, Math.max(15, Number(lineAlertCooldownMinutes) || farm.settings.lineAlertCooldownMinutes));
    const normalizedNtfyServerUrl = ntfyServerUrl.trim() || "https://ntfy.sh";
    try {
      const parsedUrl = new URL(normalizedNtfyServerUrl);
      if (!parsedUrl.protocol.startsWith("http")) {
        throw new Error("Invalid ntfy protocol");
      }
    } catch {
      Alert.alert("Invalid ntfy server URL", "Please enter a valid ntfy HTTPS URL such as https://ntfy.sh.");
      return;
    }
    farm.updateSettings({
      reminderHour: parsedHour,
      reminderMinute: parsedMinute,
      feedTypes: parsedFeedTypes.length ? parsedFeedTypes : farm.settings.feedTypes,
      driveRootFolder: driveRootFolder.trim() || "CatfishFarmLogger",
      autoSyncEnabled,
      staleSyncWarningDays: parsedStaleDays,
      lowBandwidthMode,
      photoCompressionEnabled,
      photoCompressionQuality: parsedQuality,
      photoMaxUploadWidth: parsedWidth,
      weeklyPdfReportsEnabled,
      lineDangerAlertsEnabled,
      lineAlertCooldownMinutes: parsedLineCooldown,
      ntfyDangerAlertsEnabled,
      ntfyServerUrl: normalizedNtfyServerUrl.replace(/\/+$/g, ""),
      ntfyTopic: ntfyTopic.trim(),
      ntfyToken: ntfyToken.trim(),
    });
    Alert.alert("Settings saved", "Local settings were saved on this device.");
  };

  const sendLineTestAlert = async () => {
    try {
      const result = await lineTestMutation.mutateAsync({
        farmName: driveRootFolder.trim() || "Catfish Farm Logger",
        generatedAt: new Date().toISOString(),
        alerts: [
          {
            alertKey: `manual-test-${Date.now()}`,
            tankName: "LINE setup test",
            title: "Manual LINE danger alert test",
            reason: "This is a manual test from Catfish Farm Logger settings to confirm LINE push delivery.",
            action: "If this message arrives, LINE_CHANNEL_ACCESS_TOKEN and LINE_RECIPIENT_IDS are configured correctly.",
            evidence: ["Settings screen test button was pressed."],
            sourceLabels: ["Catfish Farm Logger"],
            severity: "danger",
            detectedAt: new Date().toISOString(),
          },
        ],
      });
      Alert.alert(result.sent ? "LINE test sent" : "LINE test not sent", result.message);
    } catch (error) {
      Alert.alert("LINE test failed", error instanceof Error ? error.message : "The server could not send the LINE test alert.");
    }
  };

  const sendNtfyTestAlert = async () => {
    try {
      const result = await ntfyTestMutation.mutateAsync({
        farmName: driveRootFolder.trim() || "Catfish Farm Logger",
        generatedAt: new Date().toISOString(),
        serverUrl: ntfyServerUrl.trim() || "https://ntfy.sh",
        topic: ntfyTopic.trim(),
        token: ntfyToken.trim() || undefined,
        alerts: [
          {
            alertKey: `manual-ntfy-test-${Date.now()}`,
            tankName: "ntfy setup test",
            title: "Manual ntfy danger alert test",
            reason: "This is a manual test from Catfish Farm Logger settings to confirm ntfy topic delivery.",
            action: "If this message arrives, the ntfy server URL, topic, and optional token are configured correctly.",
            evidence: ["Settings screen ntfy test button was pressed."],
            sourceLabels: ["Catfish Farm Logger"],
            severity: "danger",
            detectedAt: new Date().toISOString(),
          },
        ],
      });
      Alert.alert(result.sent ? "ntfy test sent" : "ntfy test not sent", result.message);
    } catch (error) {
      Alert.alert("ntfy test failed", error instanceof Error ? error.message : "The server could not send the ntfy test alert.");
    }
  };

  const scheduleReminder = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Device only", "Daily local notifications are available on Android and iOS devices.");
      return;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-inspection", {
        name: "Daily inspection",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#087F8C",
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const finalStatus = current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
    if (finalStatus !== "granted") {
      Alert.alert("Notifications not allowed", "Daily reminders will stay visible inside the app, but system notifications are disabled.");
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Catfish tank inspection",
        body: "Please record water temperature and required test values for every tank today.",
        data: { screen: "records" },
      },
      trigger: { hour: Number(hour), minute: Number(minute), repeats: true, channelId: "daily-inspection" },
    });
    Alert.alert("Daily reminder set", `A daily inspection reminder is scheduled for ${hour}:${minute.padStart(2, "0")}.`);
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-3xl font-extrabold text-foreground">Settings</Text>
        <Text className="mt-1 text-base leading-6 text-muted">Set the daily inspection reminder, feed type choices, alert channels, and local backup behavior for the {getDistributionLabel()} build.</Text>

        <View className="mt-5 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-xl font-bold text-foreground">Daily inspection reminder</Text>
          <Text className="mt-1 text-sm text-muted">The home screen always shows missing inspections. Device notifications can also remind staff once per day.</Text>
          <View className="mt-4 flex-row gap-3">
            <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" placeholder="Hour" value={hour} onChangeText={setHour} />
            <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" placeholder="Minute" value={minute} onChangeText={setMinute} />
          </View>
          <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={scheduleReminder}>
            <Text className="text-center font-bold text-white">Schedule daily reminder</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-xl font-bold text-foreground">Feed types</Text>
          <Text className="mt-1 text-sm text-muted">Separate choices with commas to keep feeding records consistent.</Text>
          <TextInput className="mt-4 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" value={feedTypes} onChangeText={setFeedTypes} multiline />
        </View>

        {googleDriveSyncEnabled ? (
          <>
            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Google Drive folder</Text>
              <Text className="mt-1 text-sm text-muted">Each tank will be exported below this folder name.</Text>
              <TextInput className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" value={driveRootFolder} onChangeText={setDriveRootFolder} />
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Offline sync automation</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">Recommended for Philippine farms with unstable mobile data. Records remain on this phone first, then upload when the connection is usable.</Text>
              <ToggleRow label="Auto-upload when internet returns" value={autoSyncEnabled} onPress={() => setAutoSyncEnabled((value) => !value)} />
              <View className="mt-3">
                <Text className="text-sm font-semibold text-foreground">Show stale-sync warning after days</Text>
                <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" value={staleSyncWarningDays} onChangeText={setStaleSyncWarningDays} />
              </View>
              <ToggleRow label="Low-bandwidth mode for slow mobile networks" value={lowBandwidthMode} onPress={() => setLowBandwidthMode((value) => !value)} />
              <ToggleRow label="Compress photos before Google Drive upload" value={photoCompressionEnabled} onPress={() => setPhotoCompressionEnabled((value) => !value)} />
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Photo quality</Text>
              <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" value={photoCompressionQuality} onChangeText={setPhotoCompressionQuality} placeholder="0.55" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Max width</Text>
              <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" value={photoMaxUploadWidth} onChangeText={setPhotoMaxUploadWidth} placeholder="1280" />
            </View>
          </View>
              <ToggleRow label="Create weekly English PDF reports automatically" value={weeklyPdfReportsEnabled} onPress={() => setWeeklyPdfReportsEnabled((value) => !value)} />
            </View>
          </>
        ) : (
          <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-xl font-bold text-foreground">F-Droid local backup mode</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">Google Drive sync is hidden in this build. Records remain local-first; use the standard build for Google Drive backup or export data manually from a future F-Droid backup screen.</Text>
            <ToggleRow label="Low-bandwidth mode for slow mobile networks" value={lowBandwidthMode} onPress={() => setLowBandwidthMode((value) => !value)} />
          </View>
        )}

        <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-xl font-bold text-foreground">LINE danger alerts</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Send a real-time LINE push message when the Health monitor detects danger-level disease or stress warning signs. Recipient IDs are stored only on the server.</Text>
          <ToggleRow label="Send LINE alerts for danger-level health signs" value={lineDangerAlertsEnabled} onPress={() => setLineDangerAlertsEnabled((value) => !value)} />
          <View className="mt-3">
            <Text className="text-sm font-semibold text-foreground">Minimum minutes before resending the same alert</Text>
            <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" value={lineAlertCooldownMinutes} onChangeText={setLineAlertCooldownMinutes} placeholder="180" />
          </View>
          <View className="mt-4 rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-bold text-foreground">Webhook URL for LINE Developers</Text>
            <Text selectable className="mt-2 text-xs leading-5 text-muted">{lineStatus.data?.webhookUrl ?? "Loading webhook URL..."}</Text>
            <Text className="mt-3 text-xs leading-5 text-muted">Paste this HTTPS URL into LINE Developers → Messaging API → Webhook settings. Then enable Use webhook and send a message to the official account or group.</Text>
          </View>
          <View className="mt-4 rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-bold text-foreground">Server LINE status</Text>
            <Text className={`mt-2 text-sm font-semibold ${lineStatus.data?.configured ? "text-success" : "text-warning"}`}>{lineStatus.data?.message ?? "Checking LINE server configuration..."}</Text>
            <Text className="mt-1 text-xs text-muted">Recipients configured: {lineStatus.data?.recipientCount ?? 0} · Webhook secret: {lineStatus.data?.channelSecretConfigured ? "configured" : "optional / not set"}</Text>
          </View>
          <View className="mt-4 rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-bold text-foreground">Recently captured recipient IDs</Text>
            {lineStatus.data?.recentRecipients?.length ? (
              lineStatus.data.recentRecipients.slice(0, 5).map((item) => (
                <View key={`${item.kind}-${item.id}`} className="mt-3 rounded-xl border border-border p-3">
                  <Text className="text-xs font-bold uppercase text-muted">{item.kind}</Text>
                  <Text selectable className="mt-1 text-xs leading-5 text-foreground">{item.id}</Text>
                  <Text className="mt-1 text-xs text-muted">Last seen: {new Date(item.receivedAt).toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <Text className="mt-2 text-xs leading-5 text-muted">No IDs captured yet. After setting the webhook URL, send a LINE message to the official account or speak in the group where the official account is present.</Text>
            )}
          </View>
          <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={sendLineTestAlert} disabled={lineTestMutation.isPending}>
            <Text className="text-center font-bold text-white">Send LINE test alert</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-xl font-bold text-foreground">ntfy danger alerts</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Send the same danger-level health warnings to an ntfy topic. LINE and ntfy can be enabled independently, and ntfy works with ntfy.sh or a self-hosted server.</Text>
          <ToggleRow label="Send ntfy alerts for danger-level health signs" value={ntfyDangerAlertsEnabled} onPress={() => setNtfyDangerAlertsEnabled((value) => !value)} />
          <View className="mt-3">
            <Text className="text-sm font-semibold text-foreground">ntfy server URL</Text>
            <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" autoCapitalize="none" keyboardType="url" value={ntfyServerUrl} onChangeText={setNtfyServerUrl} placeholder="https://ntfy.sh" />
          </View>
          <View className="mt-3">
            <Text className="text-sm font-semibold text-foreground">Topic</Text>
            <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" autoCapitalize="none" value={ntfyTopic} onChangeText={setNtfyTopic} placeholder="catfish-farm-alerts" />
            <Text className="mt-2 text-xs leading-5 text-muted">Use a hard-to-guess private topic name, or configure a private topic/token on your own ntfy server.</Text>
          </View>
          <View className="mt-3">
            <Text className="text-sm font-semibold text-foreground">Optional auth token</Text>
            <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" autoCapitalize="none" secureTextEntry value={ntfyToken} onChangeText={setNtfyToken} placeholder="Bearer token for private topics" />
          </View>
          <View className="mt-4 rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-bold text-foreground">Server ntfy status</Text>
            <Text className={`mt-2 text-sm font-semibold ${ntfyStatus.data?.configured ? "text-success" : "text-warning"}`}>{ntfyStatus.data?.message ?? "Checking ntfy configuration..."}</Text>
            <Text className="mt-1 text-xs text-muted">Server: {ntfyStatus.data?.serverUrl ? ntfyStatus.data.serverUrl : ntfyServerUrl ? ntfyServerUrl : "https://ntfy.sh"} · Topic: {ntfyStatus.data?.topicConfigured ? "configured" : "not set"} · Token: {ntfyStatus.data?.tokenStatus ?? "not configured"}</Text>
          </View>
          <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={sendNtfyTestAlert} disabled={ntfyTestMutation.isPending}>
            <Text className="text-center font-bold text-white">Send ntfy test alert</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="mt-5 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveSettings}>
          <Text className="text-center font-bold text-white">Save settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}


function ToggleRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity className="mt-4 flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 active:opacity-80" onPress={onPress}>
      <Text className="flex-1 pr-3 font-semibold text-foreground">{label}</Text>
      <Text className={`rounded-full px-3 py-1 text-xs font-bold ${value ? "bg-success text-white" : "bg-border text-muted"}`}>{value ? "ON" : "OFF"}</Text>
    </TouchableOpacity>
  );
}
