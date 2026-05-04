import { FlatList, Text, View } from "react-native";

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
