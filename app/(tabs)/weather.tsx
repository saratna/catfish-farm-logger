import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import { ScreenContainer } from "@/components/screen-container";
import { assessCatfishWeatherRisk, summarizeSeverity, type AdvisoryWeatherInput } from "@/lib/catfish-advisor";
import { formatShortDate, useFarm, type WeatherRecord } from "@/lib/farm-store";

const OPEN_METEO_CURRENT = "temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,rain";
const OPEN_METEO_HOURLY = "temperature_2m,relative_humidity_2m,pressure_msl,precipitation";

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (typeof value === "number" ? value : 0), 0);
}

function buildWeatherInput(record?: WeatherRecord): AdvisoryWeatherInput {
  return {
    airTempC: record?.airTempC,
    humidityPercent: record?.humidityPercent,
    pressureHpa: record?.pressureHpa,
    pressureTrendHpa: record?.pressureTrendHpa,
    rainMm24h: record?.rainMm24h,
    windKph: record?.windKph,
    sourceSummary: record?.sourceSummary,
  };
}

async function scheduleRiskNotification(title: string, body: string) {
  if (Platform.OS === "web") return;
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("catfish-weather-risk", {
      name: "Catfish weather risk",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export default function WeatherScreen() {
  const farm = useFarm();
  const [loading, setLoading] = useState(false);
  const latestInspection = farm.inspections[0];
  const summary = useMemo(() => summarizeSeverity(farm.activeRiskAlerts), [farm.activeRiskAlerts]);

  const updateWeather = async () => {
    try {
      setLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Allow location access to attach forecast data to the farm site.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = Number(position.coords.latitude.toFixed(5));
      const longitude = Number(position.coords.longitude.toFixed(5));
      farm.setLocation({ latitude, longitude, accuracyMeters: position.coords.accuracy ?? undefined, label: "GPS farm position" });

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${OPEN_METEO_CURRENT}&hourly=${OPEN_METEO_HOURLY}&forecast_days=2&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
      const data = await response.json();

      const current = data.current ?? {};
      const hourly = data.hourly ?? {};
      const pressureSeries: number[] = Array.isArray(hourly.pressure_msl) ? hourly.pressure_msl : [];
      const currentPressure = numberOrUndefined(current.pressure_msl);
      const pressureSixHoursAgo = pressureSeries.length > 6 ? numberOrUndefined(pressureSeries[Math.max(0, new Date().getHours() - 6)]) : undefined;
      const pressureTrendHpa = typeof currentPressure === "number" && typeof pressureSixHoursAgo === "number" ? Number((currentPressure - pressureSixHoursAgo).toFixed(1)) : undefined;
      const precipitationSeries: number[] = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];
      const rainMm24h = Number(sum(precipitationSeries.slice(0, 24)).toFixed(1));

      const weatherInput: AdvisoryWeatherInput = {
        airTempC: numberOrUndefined(current.temperature_2m),
        humidityPercent: numberOrUndefined(current.relative_humidity_2m),
        pressureHpa: currentPressure,
        pressureTrendHpa,
        rainMm24h,
        windKph: numberOrUndefined(current.wind_speed_10m),
        sourceSummary: "Open-Meteo Forecast API: best-match forecast with global model coverage. Future versions can add direct agency APIs where licensing and keys allow.",
      };
      const risks = assessCatfishWeatherRisk(weatherInput, latestInspection);
      const riskSummary = summarizeSeverity(risks);

      farm.addWeatherRecord({
        latitude,
        longitude,
        source: "Open-Meteo",
        sourceSummary: weatherInput.sourceSummary ?? "Open-Meteo Forecast API",
        airTempC: weatherInput.airTempC,
        humidityPercent: weatherInput.humidityPercent,
        pressureHpa: weatherInput.pressureHpa,
        pressureTrendHpa: weatherInput.pressureTrendHpa,
        rainMm24h: weatherInput.rainMm24h,
        windKph: weatherInput.windKph,
        forecastText: `${riskSummary.title}: ${riskSummary.summary}`,
      });
      farm.replaceRiskAlerts(risks.map(({ severity, category, title, reason, action }) => ({ severity, category, title, reason, action })));

      if (farm.settings.weatherAlertsEnabled && riskSummary.severity !== "normal") {
        await scheduleRiskNotification(`Catfish alert: ${riskSummary.title}`, riskSummary.summary);
      }
    } catch (error) {
      Alert.alert("Weather update failed", error instanceof Error ? error.message : "Could not update weather data.");
    } finally {
      setLoading(false);
    }
  };

  const latestWeather = farm.latestWeather;
  const latestWeatherInput = buildWeatherInput(latestWeather);

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={farm.activeRiskAlerts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Weather Risk</Text>
            <Text className="mt-1 text-base text-muted">GPS-based forecast records and catfish risk alerts for the farm site.</Text>

            <View className={`mt-4 rounded-3xl p-5 ${summary.severity === "danger" ? "bg-error" : summary.severity === "watch" ? "bg-warning" : "bg-primary"}`}>
              <Text className="text-sm font-bold text-white/80">Current risk</Text>
              <Text className="mt-2 text-2xl font-extrabold text-white">{summary.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-white/90">{summary.summary}</Text>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Farm GPS and forecast</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">
                {farm.location ? `${farm.location.latitude}, ${farm.location.longitude} · updated ${formatShortDate(farm.location.updatedAt)}` : "No GPS position saved yet."}
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-3">
                <Metric label="Air" value={typeof latestWeatherInput.airTempC === "number" ? `${latestWeatherInput.airTempC}°C` : "--"} />
                <Metric label="Humidity" value={typeof latestWeatherInput.humidityPercent === "number" ? `${latestWeatherInput.humidityPercent}%` : "--"} />
                <Metric label="Pressure" value={typeof latestWeatherInput.pressureHpa === "number" ? `${latestWeatherInput.pressureHpa} hPa` : "--"} />
                <Metric label="Rain 24h" value={typeof latestWeatherInput.rainMm24h === "number" ? `${latestWeatherInput.rainMm24h} mm` : "--"} />
              </View>
              <Text className="mt-3 text-xs leading-5 text-muted">Source: {latestWeather?.sourceSummary ?? "Tap update to fetch Open-Meteo forecast data."}</Text>
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={updateWeather} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-center font-bold text-white">Update GPS weather</Text>}
              </TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Important limitation</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">
                Forecast data cannot replace pond-side water tests. Use alerts as prompts to measure water temperature, dissolved oxygen, pH, ammonia, nitrite, turbidity, and fish behavior.
              </Text>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">Active alerts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{item.title}</Text>
                <Text className="mt-1 text-xs font-bold uppercase text-muted">{item.severity}</Text>
              </View>
              <TouchableOpacity className="rounded-full border border-border px-3 py-1 active:opacity-80" onPress={() => farm.acknowledgeRiskAlert(item.id)}>
                <Text className="text-xs font-bold text-foreground">OK</Text>
              </TouchableOpacity>
            </View>
            <Text className="mt-3 text-sm leading-5 text-foreground">{item.reason}</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">Next: {item.action}</Text>
          </View>
        )}
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-center text-muted">No active alert. Update weather to refresh risk checks.</Text>}
        ListFooterComponent={<View className="h-8" />}
      />
    </ScreenContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-2xl bg-background p-3">
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-foreground">{value}</Text>
    </View>
  );
}
