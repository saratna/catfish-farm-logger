import { useState } from "react";
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Notifications from "expo-notifications";

import { ScreenContainer } from "@/components/screen-container";
import { useFarm } from "@/lib/farm-store";

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

  const saveSettings = () => {
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);
    if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 || Number.isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      Alert.alert("Invalid reminder time", "Please enter a 24-hour time such as 8:00 or 17:30.");
      return;
    }
    const parsedFeedTypes = feedTypes.split(",").map((item) => item.trim()).filter(Boolean);
    farm.updateSettings({
      reminderHour: parsedHour,
      reminderMinute: parsedMinute,
      feedTypes: parsedFeedTypes.length ? parsedFeedTypes : farm.settings.feedTypes,
      driveRootFolder: driveRootFolder.trim() || "CatfishFarmLogger",
    });
    Alert.alert("Settings saved", "Local settings were saved on this device.");
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
        <Text className="mt-1 text-base leading-6 text-muted">Set the daily inspection reminder, feed type choices, and Google Drive root folder name.</Text>

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

        <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-xl font-bold text-foreground">Google Drive folder</Text>
          <Text className="mt-1 text-sm text-muted">Each tank will be exported below this folder name.</Text>
          <TextInput className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" value={driveRootFolder} onChangeText={setDriveRootFolder} />
        </View>

        <TouchableOpacity className="mt-5 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveSettings}>
          <Text className="text-center font-bold text-white">Save settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
