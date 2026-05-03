from pathlib import Path
import re

root = Path('/home/ubuntu/catfish_farm_logger')

def p(rel):
    return root / rel

def read(rel):
    return p(rel).read_text()

def write(rel, text):
    p(rel).write_text(text)

def replace(rel, old, new):
    text = read(rel)
    if old not in text:
        raise SystemExit(f'Missing pattern in {rel}: {old[:80]!r}')
    write(rel, text.replace(old, new))

# Farm store: sync metadata, offline-first settings, stale warning helpers.
text = read('lib/farm-store.tsx')
text = text.replace('  alertRainMm24h: number;\n};', '  alertRainMm24h: number;\n  autoSyncEnabled: boolean;\n  staleSyncWarningDays: number;\n};')
text = text.replace('  lastExportAt?: string;\n  status: "idle" | "waiting" | "synced" | "failed";\n  message: string;\n};', '  lastExportAt?: string;\n  lastAttemptAt?: string;\n  status: "idle" | "waiting" | "syncing" | "synced" | "failed";\n  message: string;\n};')
text = text.replace('    alertRainMm24h: 50,\n  },', '    alertRainMm24h: 50,\n    autoSyncEnabled: true,\n    staleSyncWarningDays: 7,\n  },')
text = text.replace('        sync: { status: "synced", lastSyncAt: action.payload.at, message: "All local records are marked as synced." },', '        sync: { status: "synced", lastSyncAt: action.payload.at, lastAttemptAt: action.payload.at, message: "All local records have been uploaded." },')
text = text.replace('type FarmContextValue = FarmState & {\n  pendingSyncCount: number;', 'type FarmContextValue = FarmState & {\n  pendingSyncCount: number;\n  syncAgeDays: number | null;\n  hasStaleSyncWarning: boolean;')
text = text.replace('  updateSettings: (input: Partial<FarmSettings>) => void;\n  markSynced: () => void;\n  generateDrivePayload: () => DriveExport;', '  updateSettings: (input: Partial<FarmSettings>) => void;\n  markSynced: () => void;\n  setSyncStatus: (input: SyncLog) => void;\n  generateDrivePayload: () => DriveExport;')
text = text.replace('  const latestWeather = state.weatherRecords[0];\n  const activeRiskAlerts = useMemo(() => state.riskAlerts.filter((item) => !item.acknowledged), [state.riskAlerts]);', '  const latestWeather = state.weatherRecords[0];\n  const activeRiskAlerts = useMemo(() => state.riskAlerts.filter((item) => !item.acknowledged), [state.riskAlerts]);\n  const syncAgeDays = useMemo(() => daysSinceSync(state.sync.lastSyncAt), [state.sync.lastSyncAt]);\n  const hasStaleSyncWarning = useMemo(\n    () => pendingSyncCount > 0 && isSyncStale(state.sync.lastSyncAt, state.settings.staleSyncWarningDays),\n    [pendingSyncCount, state.sync.lastSyncAt, state.settings.staleSyncWarningDays],\n  );')
text = text.replace('  const markSynced = useCallback(() => {\n    dispatch({ type: "markSynced", payload: { at: nowIso() } });\n  }, []);', '  const markSynced = useCallback(() => {\n    dispatch({ type: "markSynced", payload: { at: nowIso() } });\n  }, []);\n\n  const setSyncStatus = useCallback((input: SyncLog) => {\n    dispatch({ type: "setSyncStatus", payload: input });\n  }, []);')
text = text.replace('      pendingSyncCount,\n      todaysMissingTankIds,', '      pendingSyncCount,\n      syncAgeDays,\n      hasStaleSyncWarning,\n      todaysMissingTankIds,')
text = text.replace('      markSynced,\n      generateDrivePayload,', '      markSynced,\n      setSyncStatus,\n      generateDrivePayload,')
text = text.replace('    [state, pendingSyncCount, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, addGrowthMeasurement, addPhotoAssessment, addCostEntry, addSaleRecord, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, generateDrivePayload],', '    [state, pendingSyncCount, syncAgeDays, hasStaleSyncWarning, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, addGrowthMeasurement, addPhotoAssessment, addCostEntry, addSaleRecord, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, setSyncStatus, generateDrivePayload],')
text += '\nexport function daysSinceSync(lastSyncAt?: string) {\n  if (!lastSyncAt) return null;\n  const last = Date.parse(lastSyncAt);\n  if (!Number.isFinite(last)) return null;\n  return Math.max(0, Math.floor((Date.now() - last) / 86_400_000));\n}\n\nexport function isSyncStale(lastSyncAt: string | undefined, thresholdDays: number) {\n  const age = daysSinceSync(lastSyncAt);\n  return age === null || age >= Math.max(1, thresholdDays);\n}\n'
write('lib/farm-store.tsx', text)

# Auto sync coordinator mounted once at app root.
write('components/auto-sync-coordinator.tsx', '''import { useEffect, useRef } from "react";
import * as Network from "expo-network";

import { useFarm } from "@/lib/farm-store";
import { getGoogleOAuthClientId, getStoredGoogleDriveTokenSet, uploadFarmExportToGoogleDrive } from "@/lib/google-drive";

const AUTO_SYNC_COOLDOWN_MS = 60_000;

export function AutoSyncCoordinator() {
  const farm = useFarm();
  const network = Network.useNetworkState();
  const runningRef = useRef(false);
  const lastAttemptRef = useRef(0);
  const reachable = network.isInternetReachable === true;

  useEffect(() => {
    if (!farm.hydrated) return;
    if (!farm.settings.autoSyncEnabled) return;
    if (!reachable) return;
    if (farm.pendingSyncCount <= 0) return;
    if (!getGoogleOAuthClientId()) return;
    if (runningRef.current) return;
    if (Date.now() - lastAttemptRef.current < AUTO_SYNC_COOLDOWN_MS) return;

    let cancelled = false;
    runningRef.current = true;
    lastAttemptRef.current = Date.now();

    const runAutoSync = async () => {
      const attemptAt = new Date().toISOString();
      try {
        const tokenSet = await getStoredGoogleDriveTokenSet();
        if (!tokenSet || cancelled) return;
        farm.setSyncStatus({
          ...farm.sync,
          status: "syncing",
          lastAttemptAt: attemptAt,
          message: "Internet is available. Auto-uploading local farm records to Google Drive.",
        });
        const result = await uploadFarmExportToGoogleDrive(farm.generateDrivePayload());
        if (cancelled) return;
        farm.markSynced();
        farm.setSyncStatus({
          status: "synced",
          lastSyncAt: new Date().toISOString(),
          lastAttemptAt: attemptAt,
          message: `Auto-upload complete: ${result.uploadedFileCount} JSON files and ${result.uploadedPhotoCount} photos were uploaded.`,
        });
      } catch (error) {
        if (cancelled) return;
        farm.setSyncStatus({
          ...farm.sync,
          status: "failed",
          lastAttemptAt: attemptAt,
          message: error instanceof Error ? `Auto-upload failed: ${error.message}` : "Auto-upload failed. Records remain safely stored on this phone.",
        });
      } finally {
        runningRef.current = false;
      }
    };

    runAutoSync();
    return () => {
      cancelled = true;
    };
  }, [farm, reachable]);

  return null;
}
''')

text = read('app/_layout.tsx')
text = text.replace('import { FarmProvider } from "@/lib/farm-store";\n', 'import { FarmProvider } from "@/lib/farm-store";\nimport { AutoSyncCoordinator } from "@/components/auto-sync-coordinator";\n')
text = text.replace('          <FarmProvider>\n            <Stack', '          <FarmProvider>\n            <AutoSyncCoordinator />\n            <Stack')
write('app/_layout.tsx', text)

# Sync screen: explicit offline-first and stale warning UI, manual sync status updates.
text = read('app/(tabs)/sync.tsx')
text = text.replace('      setBusyAction("upload");\n      const result = await uploadFarmExportToGoogleDrive(drivePayload);', '      setBusyAction("upload");\n      const attemptAt = new Date().toISOString();\n      farm.setSyncStatus({ ...farm.sync, status: "syncing", lastAttemptAt: attemptAt, message: "Manual upload started. Records remain stored locally until the upload finishes." });\n      const result = await uploadFarmExportToGoogleDrive(drivePayload);')
text = text.replace('      farm.markSynced();\n      Alert.alert(', '      farm.markSynced();\n      Alert.alert(')
text = text.replace('    } catch (error) {\n      Alert.alert("Google Drive sync failed", error instanceof Error ? error.message : "The Drive upload did not complete.");', '    } catch (error) {\n      farm.setSyncStatus({ ...farm.sync, status: "failed", lastAttemptAt: new Date().toISOString(), message: error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed. Records remain safely stored on this phone." });\n      Alert.alert("Google Drive sync failed", error instanceof Error ? error.message : "The Drive upload did not complete.");')
text = text.replace('              Records stay local first. After Google authorization, the app uploads tank JSON files and photos into a per-tank folder structure in your Drive.', '              Built for field use in the Philippines: records stay on this phone first, and the app auto-uploads to Google Drive when a stable internet connection returns.')
text = text.replace('              <Text className="mt-4 text-sm leading-5 text-muted">{farm.sync.message}</Text>\n            </View>', '              <View className="mt-3 rounded-2xl bg-background p-3">\n                <Text className="text-xs text-muted">Automatic upload</Text>\n                <Text className="mt-1 font-semibold text-foreground">{farm.settings.autoSyncEnabled ? "Enabled when internet returns" : "Disabled in settings"}</Text>\n              </View>\n              {farm.hasStaleSyncWarning ? (\n                <View className="mt-3 rounded-2xl border border-warning bg-background p-3">\n                  <Text className="font-bold text-warning">Upload is overdue</Text>\n                  <Text className="mt-1 text-sm leading-5 text-muted">This phone has farm data that has not been uploaded for {farm.syncAgeDays === null ? `more than ${farm.settings.staleSyncWarningDays} days` : `${farm.syncAgeDays} days`}. Keep entering records offline, then connect to the internet to upload.</Text>\n                </View>\n              ) : null}\n              <Text className="mt-4 text-sm leading-5 text-muted">{farm.sync.message}</Text>\n            </View>')
text = text.replace('              Google Drive uses the least broad app-file scope, so this app can create and manage files it uploads without gaining general access to all Drive files.', '              Offline-first behavior: farm records, photos, costs, sales, weather records, alerts, and sync status are kept on the phone. Google Drive is used only for upload backup after authorization and connectivity are available.')
write('app/(tabs)/sync.tsx', text)

# Home screen: add stale sync warning in dashboard. Use broad insertion after stats row if possible.
text = read('app/(tabs)/index.tsx')
needle = '''            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-surface p-4">
                <Text className="text-xs text-muted">Pending sync</Text>
                <Text className="mt-1 text-2xl font-extrabold text-foreground">{farm.pendingSyncCount}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-surface p-4">
                <Text className="text-xs text-muted">Photos</Text>
                <Text className="mt-1 text-2xl font-extrabold text-foreground">{farm.photos.length}</Text>
              </View>
            </View>'''
insert = needle + '''
            {farm.hasStaleSyncWarning ? (
              <View className="mt-4 rounded-3xl border border-warning bg-surface p-4">
                <Text className="text-base font-extrabold text-warning">Upload overdue</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">
                  Farm data is safe on this phone, but it has not been uploaded for {farm.syncAgeDays === null ? `more than ${farm.settings.staleSyncWarningDays} days` : `${farm.syncAgeDays} days`}. Connect to the internet and the app will upload automatically.
                </Text>
              </View>
            ) : null}'''
if needle in text:
    text = text.replace(needle, insert)
write('app/(tabs)/index.tsx', text)

# Settings: add auto-sync and stale threshold controls, preserve validation.
text = read('app/(tabs)/settings.tsx')
text = text.replace('  const [driveRootFolder, setDriveRootFolder] = useState(farm.settings.driveRootFolder);', '  const [driveRootFolder, setDriveRootFolder] = useState(farm.settings.driveRootFolder);\n  const [autoSyncEnabled, setAutoSyncEnabled] = useState(farm.settings.autoSyncEnabled);\n  const [staleSyncWarningDays, setStaleSyncWarningDays] = useState(String(farm.settings.staleSyncWarningDays));')
text = text.replace('    if (!driveRootFolder.trim()) {\n      Alert.alert("Folder required", "Enter a Google Drive root folder name.");\n      return;\n    }', '    if (!driveRootFolder.trim()) {\n      Alert.alert("Folder required", "Enter a Google Drive root folder name.");\n      return;\n    }\n    const staleDays = Number(staleSyncWarningDays);\n    if (!Number.isFinite(staleDays) || staleDays < 1 || staleDays > 90) {\n      Alert.alert("Sync warning days required", "Enter a stale-sync warning threshold from 1 to 90 days.");\n      return;\n    }')
text = text.replace('      driveRootFolder: driveRootFolder.trim(),\n    });', '      driveRootFolder: driveRootFolder.trim(),\n      autoSyncEnabled,\n      staleSyncWarningDays: Math.round(staleDays),\n    });')
# Add imports Switch/TextInput maybe already. Let's inspect via regex not needed; use replacement if Switch absent.
text = text.replace('import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";', 'import { Alert, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";')
settings_card = '''        <View className="rounded-3xl border border-border bg-surface p-5">
          <Text className="text-lg font-bold text-foreground">Google Drive folder</Text>
          <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" value={driveRootFolder} onChangeText={setDriveRootFolder} placeholder="Drive root folder" placeholderTextColor="#7A8791" />
          <Text className="mt-3 text-sm leading-5 text-muted">Exports are organized by tank under this folder. Keep the name simple for field teams.</Text>
        </View>'''
settings_new = settings_card + '''

        <View className="rounded-3xl border border-border bg-surface p-5">
          <Text className="text-lg font-bold text-foreground">Offline and automatic upload</Text>
          <View className="mt-3 flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="font-semibold text-foreground">Auto-upload when internet returns</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">Recommended for Philippine field sites with unstable mobile data. Records stay on this phone until upload succeeds.</Text>
            </View>
            <Switch value={autoSyncEnabled} onValueChange={setAutoSyncEnabled} />
          </View>
          <Text className="mt-4 text-sm font-semibold text-foreground">Show overdue warning after this many days</Text>
          <TextInput className="mt-2 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" value={staleSyncWarningDays} onChangeText={setStaleSyncWarningDays} placeholder="7" placeholderTextColor="#7A8791" />
        </View>'''
if settings_card in text:
    text = text.replace(settings_card, settings_new)
write('app/(tabs)/settings.tsx', text)

# Translate advisor strings to English.
write('lib/catfish-advisor.ts', '''export type WeatherSeverity = "normal" | "watch" | "danger";

export type AdvisoryWeatherInput = {
  airTempC?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  pressureTrendHpa?: number;
  rainMm24h?: number;
  windKph?: number;
  sourceSummary?: string;
};

export type AdvisoryInspectionInput = {
  waterTempC?: number;
  dissolvedOxygen?: number;
  ph?: number;
  ammonia?: number;
  nitrite?: number;
};

export type RiskAssessment = {
  severity: WeatherSeverity;
  title: string;
  reason: string;
  action: string;
  category: "heat" | "rain" | "pressure" | "humidity" | "water" | "feed";
};

export type FeedingAdviceInput = {
  averageWeightG: number;
  fishCount?: number;
  feedAmountKg?: number;
  productName?: string;
  proteinPercent?: number;
  pelletSizeMm?: number;
  floats?: boolean;
  residualFeed?: "none" | "little" | "much";
  appetite?: "poor" | "normal" | "strong";
  weather?: AdvisoryWeatherInput;
  inspection?: AdvisoryInspectionInput;
};

export type FeedingAdvice = {
  recommendedFeedKg?: number;
  feedRatePercent: number;
  summary: string;
  productAdvice: string;
  cautions: string[];
};

export type GrowthMeasurementInput = {
  createdAt: string;
  lengthCm: number;
  weightG: number;
};

export type GrowthAssessment = {
  status: "insufficient" | "good" | "slow" | "rapid" | "decline";
  severity: "normal" | "watch" | "danger";
  title: string;
  summary: string;
  dailyWeightGainPercent?: number;
  lengthGainCm?: number;
  comparedDays?: number;
  recommendation: string;
};

export type VisibleHealthSigns = {
  redness?: boolean;
  ulcers?: boolean;
  whiteSpots?: boolean;
  finDamage?: boolean;
  swollenBelly?: boolean;
  popeye?: boolean;
  abnormalColor?: boolean;
};

export type PhotoScreening = {
  severity: "normal" | "watch" | "danger";
  title: string;
  summary: string;
  visibleSigns: string[];
  recommendation: string;
  disclaimer: string;
};

function highestSeverity(items: RiskAssessment[]): WeatherSeverity {
  if (items.some((item) => item.severity === "danger")) return "danger";
  if (items.some((item) => item.severity === "watch")) return "watch";
  return "normal";
}

export function summarizeSeverity(items: RiskAssessment[]) {
  const severity = highestSeverity(items);
  const main = items.find((item) => item.severity === severity) ?? items[0];
  return {
    severity,
    title: main?.title ?? "Routine monitoring",
    summary: main?.reason ?? "No major weather-related risk has been detected. Continue checking water temperature and dissolved oxygen as usual.",
  };
}

export function assessCatfishWeatherRisk(weather: AdvisoryWeatherInput, inspection?: AdvisoryInspectionInput): RiskAssessment[] {
  const risks: RiskAssessment[] = [];
  const waterTemp = inspection?.waterTempC;
  const effectiveTemp = waterTemp ?? weather.airTempC;

  if (typeof effectiveTemp === "number" && effectiveTemp >= 34) {
    risks.push({ severity: "danger", category: "heat", title: "High heat risk", reason: "Air or water temperature is high, which can reduce dissolved oxygen and weaken feeding response.", action: "Measure dissolved oxygen early in the morning, avoid overfeeding, and increase aeration if available." });
  } else if (typeof effectiveTemp === "number" && effectiveTemp >= 30) {
    risks.push({ severity: "watch", category: "heat", title: "Heat watch", reason: "Warm conditions increase oxygen demand. Catfish stress may rise when water quality declines.", action: "Check water temperature, dissolved oxygen, and leftover feed before adjusting the feed amount." });
  }

  if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 50) {
    risks.push({ severity: "danger", category: "rain", title: "Water quality shift after heavy rain", reason: "Heavy rain can cause turbidity, pH shifts, and inflow-related water quality changes.", action: "After rain, check pH, turbidity, and dissolved oxygen. Act quickly if fish gather at the surface." });
  } else if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 20) {
    risks.push({ severity: "watch", category: "rain", title: "Rainfall watch", reason: "Meaningful rainfall is forecast or recorded. Pond water quality can change quickly.", action: "Keep an observation note after rain and check appetite and water condition before feeding." });
  }

  if (typeof weather.pressureTrendHpa === "number" && weather.pressureTrendHpa <= -5) {
    risks.push({ severity: "watch", category: "pressure", title: "Falling pressure", reason: "A short-term pressure drop can signal changing weather and the need to watch dissolved oxygen.", action: "Before feeding, observe surfacing, swimming behavior, and appetite. Reduce feed if anything looks abnormal." });
  }

  if (typeof weather.humidityPercent === "number" && typeof weather.airTempC === "number" && weather.humidityPercent >= 90 && weather.airTempC >= 30) {
    risks.push({ severity: "watch", category: "humidity", title: "Hot and humid conditions", reason: "High heat and humidity can keep water temperature elevated and increase early-morning oxygen risk.", action: "Prioritize early-morning dissolved oxygen checks and feed only an amount that leaves no residue." });
  }

  if (typeof inspection?.dissolvedOxygen === "number" && inspection.dissolvedOxygen < 4) {
    risks.push({ severity: "danger", category: "water", title: "Low dissolved oxygen", reason: "Dissolved oxygen is low, raising stress and mortality risk for catfish.", action: "Stop feeding and follow the farm safety procedure for aeration, water exchange, or emergency response." });
  }

  if (typeof inspection?.ammonia === "number" && inspection.ammonia > 0.5) {
    risks.push({ severity: "watch", category: "water", title: "Ammonia watch", reason: "Ammonia is elevated. Toxicity can rise under warm and high-pH conditions.", action: "Reduce feeding and re-check pH and water temperature together with ammonia." });
  }

  if (risks.length === 0) {
    risks.push({ severity: "normal", category: "water", title: "Routine monitoring", reason: "No major weather-driven risk is detected from the current inputs.", action: "Continue daily checks for water temperature, pH, dissolved oxygen, and appetite." });
  }

  return risks;
}

function baseFeedRatePercent(temp?: number) {
  if (typeof temp !== "number") return 2.5;
  if (temp < 20) return 1.0;
  if (temp < 24) return 2.0;
  if (temp <= 30) return 3.0;
  if (temp <= 33) return 2.0;
  return 0.5;
}

function targetProteinRange(weightG: number) {
  if (weightG < 50) return { min: 35, max: 40, label: "Prioritize high-protein feed for fry" };
  if (weightG < 200) return { min: 30, max: 36, label: "Use roughly 30-36% protein during grow-out" };
  return { min: 28, max: 34, label: "For larger fish, avoid excessive protein and adjust based on water quality" };
}

export function buildFeedingAdvice(input: FeedingAdviceInput): FeedingAdvice {
  const temp = input.inspection?.waterTempC ?? input.weather?.airTempC;
  let rate = baseFeedRatePercent(temp);
  const cautions: string[] = [];

  if (input.residualFeed === "much") {
    rate *= 0.65;
    cautions.push("Because leftover feed is high, reduce the next feeding and check water quality.");
  } else if (input.appetite === "poor") {
    rate *= 0.75;
    cautions.push("Because appetite is weak, check for disease, low oxygen, or water temperature change.");
  } else if (input.appetite === "strong" && input.residualFeed === "none") {
    rate *= 1.05;
  }

  if ((input.weather?.rainMm24h ?? 0) >= 20) {
    rate *= 0.85;
    cautions.push("After rain, feed conservatively because water quality can shift quickly.");
  }

  if ((input.inspection?.dissolvedOxygen ?? 99) < 4 || (input.weather?.airTempC ?? 0) >= 34) {
    rate *= 0.5;
    cautions.push("Under low oxygen or high heat, strongly reduce feeding or consider pausing it.");
  }

  const biomassKg = input.fishCount && input.fishCount > 0 ? (input.averageWeightG / 1000) * input.fishCount : undefined;
  const recommendedFeedKg = biomassKg ? Math.max(0, Number(((biomassKg * rate) / 100).toFixed(2))) : undefined;
  const protein = targetProteinRange(input.averageWeightG);

  let productAdvice = `${protein.label}.`;
  if (typeof input.proteinPercent === "number") {
    if (input.proteinPercent < protein.min) {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is low; if growth rate is the priority, consider a product at or above ${protein.min}%.`;
    } else if (input.proteinPercent > protein.max + 4) {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is high. Watch for leftover feed and ammonia increase.`;
    } else {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is close to the target range.`;
    }
  }

  if (typeof input.pelletSizeMm === "number" && input.averageWeightG < 50 && input.pelletSizeMm > 2) {
    cautions.push("Pellet size may be large for the average body weight. Check whether smaller pellets are easier to eat.");
  }

  const amountText = recommendedFeedKg ? `Recommended feed is about ${recommendedFeedKg} kg/day.` : "Enter fish count to calculate recommended kg/day.";
  return { recommendedFeedKg, feedRatePercent: Number(rate.toFixed(2)), summary: `${amountText} The guide rate is ${rate.toFixed(2)}% of estimated biomass. Adjust using actual leftover feed, appetite, and water quality.`, productAdvice, cautions };
}

export function assessGrowthTrend(measurements: GrowthMeasurementInput[]): GrowthAssessment {
  const ordered = [...measurements].filter((item) => Number.isFinite(item.lengthCm) && Number.isFinite(item.weightG)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordered.length < 2) {
    return { status: "insufficient", severity: "watch", title: "Not enough growth data", summary: "At least two length and weight records from the same tank are needed to evaluate growth trend.", recommendation: "Use a consistent measuring method and record length in cm and weight in g next time. Do not conclude from photos alone." };
  }

  const previous = ordered[ordered.length - 2];
  const latest = ordered[ordered.length - 1];
  const days = Math.max(1, Math.round((new Date(latest.createdAt).getTime() - new Date(previous.createdAt).getTime()) / 86_400_000));
  const weightGain = latest.weightG - previous.weightG;
  const lengthGain = latest.lengthCm - previous.lengthCm;
  const dailyWeightGainPercent = previous.weightG > 0 ? ((latest.weightG / previous.weightG) ** (1 / days) - 1) * 100 : 0;

  if (weightGain < 0 || lengthGain < -0.5) {
    return { status: "decline", severity: "danger", title: "Weight decline watch", summary: `Weight changed by ${Math.abs(weightGain).toFixed(1)} g from the previous record. It may be measurement error, but appetite, water quality, and appearance should be checked.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Check scale and sampling conditions. If appetite loss, low oxygen, redness, ulcers, swollen belly, or mortality is present, consider isolation and expert advice." };
  }

  if (dailyWeightGainPercent < 0.15 && days >= 3) {
    return { status: "slow", severity: "watch", title: "Growth may be slowing", summary: `Weight gain over ${days} days is small, about ${dailyWeightGainPercent.toFixed(2)}% per day.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Review feeding amount, pellet size, protein level, water temperature, dissolved oxygen, and leftover feed together." };
  }

  if (dailyWeightGainPercent > 5 || latest.weightG > previous.weightG * 1.8) {
    return { status: "rapid", severity: "watch", title: "Check sudden change", summary: "The increase from the previous record is large, so confirm whether the sampled fish or input value changed.", dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Confirm the same measuring conditions and remeasure if needed. If swollen belly or other abnormal appearance is present, also consider disease risk." };
  }

  return { status: "good", severity: "normal", title: "Growth trend is on track", summary: `Over ${days} days, weight changed by ${weightGain.toFixed(1)} g and length by ${lengthGain.toFixed(1)} cm.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Maintain this trend while also recording daily water temperature, dissolved oxygen, and appetite." };
}

export function buildPhotoScreeningFromInputs(signs: VisibleHealthSigns): PhotoScreening {
  const visibleSigns = [
    signs.redness ? "Redness or bleeding spots" : undefined,
    signs.ulcers ? "Ulcers or wounds" : undefined,
    signs.whiteSpots ? "White spots or cotton-like growth" : undefined,
    signs.finDamage ? "Fin damage" : undefined,
    signs.swollenBelly ? "Swollen belly" : undefined,
    signs.popeye ? "Popeye" : undefined,
    signs.abnormalColor ? "Abnormal body color" : undefined,
  ].filter(Boolean) as string[];

  const severe = signs.ulcers || signs.swollenBelly || signs.popeye;
  const severity = severe ? "danger" : visibleSigns.length > 0 ? "watch" : "normal";
  const title = severity === "danger" ? "Strong warning signs" : severity === "watch" ? "Visible appearance signs" : "No obvious visible abnormality";
  const recommendation = severity === "danger" ? "Check water quality, appetite, and swimming behavior. If the case worsens or mortality occurs, consider isolation and expert advice." : severity === "watch" ? "Keep observing the same fish and check water temperature, dissolved oxygen, ammonia, and nitrite." : "No major visible abnormality was selected from the photo. Continue daily appetite and water quality checks.";

  return { severity, title, summary: visibleSigns.length ? `Selected visible signs: ${visibleSigns.join(", ")}` : "No visible signs were selected.", visibleSigns, recommendation, disclaimer: "Photo screening is not a definitive diagnosis. It supports farmer observation, water testing, and expert consultation when needed; it does not identify a disease name by itself." };
}
''')

# Translate economics user-facing strings and switch currency to Philippine peso.
text = read('lib/economics.ts')
repls = {
'FCRをまだ推定できません':'FCR cannot be estimated yet',
'給餌量、複数回の平均体重、推定尾数が揃うと、投入飼料kg ÷ 増加バイオマスkgでFCRを推定できます。':'FCR can be estimated as feed input kg divided by biomass gain kg after feed amount, multiple average-weight records, and estimated fish count are available.',
'同じ水槽で定期的に平均体重と尾数を記録し、給餌量の入力を継続してください。':'Keep recording average weight, fish count, and feed amount regularly for the same tank.',
'飼料効率が大きく悪化しています':'Feed efficiency is seriously worsening',
'魚体増加に対して飼料投入が多く、残餌、水温、溶存酸素、疾病、選別遅れの影響が疑われます。':'Feed input is high relative to biomass gain. Leftover feed, water temperature, dissolved oxygen, disease, or delayed grading may be involved.',
'給餌量を一時的に抑え、残餌、食い付き、溶存酸素、アンモニア、魚体外観を確認してください。':'Temporarily reduce feeding and check leftover feed, appetite, dissolved oxygen, ammonia, and fish appearance.',
'飼料効率に注意が必要です':'Feed efficiency needs attention',
'利益率が十分でも、飼料効率の悪化は後続ロットの採算を圧迫します。':'Even when margin is acceptable, worsening feed efficiency can reduce profitability in later batches.',
'給餌時間、粒径、タンパク、残餌、サイズばらつきを見直してください。':'Review feeding time, pellet size, protein level, leftover feed, and size variation.',
'利益率をまだ算出できません':'Margin cannot be calculated yet',
'販売記録がないため、売上に対する粗利益率を算出できません。':'There are no sales records, so gross margin against sales cannot be calculated.',
'販売kg、kg単価、販売先を入力して、コストと同じ水槽・ロットで比較してください。':'Enter sales kg, unit price per kg, and buyer, then compare them against costs for the same tank or batch.',
'粗利益が赤字です':'Gross profit is negative',
'販売額より投入コストが大きくなっています。':'Input cost is higher than sales value.',
'餌代、電気・水道、人件費、販売単価を分けて確認し、次回出荷条件や給餌計画を見直してください。':'Separate feed, power, water, labor, and sale price, then review the next harvest conditions and feeding plan.',
'利益率が低めです':'Margin is low',
'想定外の死亡、成長停滞、餌代高騰があると赤字化しやすい状態です。':'Unexpected mortality, slow growth, or higher feed cost could easily turn this batch negative.',
'単価交渉、出荷サイズ、飼料費、電気・水道費の削減余地を確認してください。':'Check unit-price negotiation, harvest size, feed cost, power cost, and water cost reduction opportunities.',
'餌代比率が高くなっています':'Feed cost share is high',
'総コストに占める餌代は':'Feed cost is ',
'です。FCR悪化と同時に起きると利益率を強く押し下げます。':' of total cost. If it occurs together with worsening FCR, margin can fall sharply.',
'銘柄、粒径、給餌率、保存状態、残餌を見直し、同じ増体をより少ない投入で得られるか確認してください。':'Review brand, pellet size, feeding rate, storage condition, and leftover feed to see whether the same growth can be achieved with less input.',
'FCR悪化と低利益率が同時に発生しています':'Worse FCR and low margin are occurring together',
'の組み合わせです。成長効率と販売採算の両面で注意が必要です。':' together. Both growth efficiency and sales profitability need attention.',
'次回給餌を控えめにし、水質検査、選別、疾病サイン、販売単価、固定費配賦を同日に確認してください。':'Set the next feeding conservatively and check water quality, grading, disease signs, sale price, and fixed-cost allocation on the same day.',
'経営リスク高':'High business risk',
'経営注意':'Business watch',
'収支と飼料効率は安定':'Profitability and feed efficiency are stable',
'大きな経営アラートはありません':'No major business alert',
'入力済みデータ上では、推定FCR、粗利益率、餌代比率に強い悪化サインは見られません。':'Based on entered data, estimated FCR, gross margin, and feed cost share do not show strong worsening signs.',
'同じ条件で記録を継続し、出荷後に実測収支で再確認してください。':'Continue recording under the same conditions and verify with actual harvest accounts after sale.',
'FCRは、入力された給餌量、平均体重、推定尾数からの簡易推定です。死亡数、選別、サンプル偏り、未記録の給餌、在池量の誤差があると値がずれます。経営判断では現場測定と帳票を必ず併用してください。':'FCR is a simplified estimate based on entered feed amount, average weight, and estimated fish count. Mortality, grading, sample bias, unrecorded feed, and standing-stock error can shift the value. Always combine this app with field measurements and farm records for business decisions.',
'月':' mo',
'給餌・水質・販売条件を同日に確認':'Review feeding, water quality, and sales terms on the same day',
'FCRと利益率が同時に悪化しているため、給餌量、残餌、水質、疾病サイン、販売単価、固定費配賦を同じ日に照合します。':'Because FCR and margin are worsening together, compare feed amount, leftover feed, water quality, disease signs, sale price, and fixed-cost allocation on the same day.',
'次回給餌を控えめに設定':'Set the next feeding conservatively',
'食い付きと残餌を見ながら一時的に給餌率を下げ、増体測定後に戻すか判断します。':'Temporarily lower the feeding rate while watching appetite and leftover feed, then decide whether to restore it after growth measurement.',
'残餌・食い付き・給餌時刻を記録':'Record leftover feed, appetite, and feeding time',
'食べ残し、沈下餌の滞留、給餌時間帯、粒径と魚体サイズのずれを確認します。':'Check uneaten feed, sinking-feed accumulation, feeding time, and mismatch between pellet size and fish size.',
'平均体重と推定尾数を再測定':'Remeasure average weight and estimated fish count',
'同じ水槽で複数個体を測り、死亡・選別・尾数変化を補正してFCRの分母を見直します。':'Measure several fish in the same tank and adjust the FCR denominator for mortality, grading, and fish-count changes.',
'溶存酸素・アンモニア・水温を確認':'Check dissolved oxygen, ammonia, and water temperature',
'摂餌低下や増体停滞の背景として、水質と急な環境変化を点検します。':'Inspect water quality and sudden environmental changes behind weak appetite or slow growth.',
'費用内訳を餌代・電気水道・人件費に分解':'Break costs into feed, power/water, and labor',
'どの費目が粗利益を圧迫しているかを分け、削減できる固定費と変動費を切り分けます。':'Separate which cost items are pressuring gross profit and distinguish reducible fixed and variable costs.',
'販売単価と出荷グレードを見直し':'Review sale price and harvest grade',
'サイズ、歩留まり、販売先、納品条件を比較し、単価交渉や出荷タイミングの余地を確認します。':'Compare size, yield, buyer, and delivery conditions to check room for price negotiation or harvest timing changes.',
'飼料銘柄・粒径・仕入条件を比較':'Compare feed brand, pellet size, and purchasing terms',
'同じ増体に対してより少ない投入量または低いkg単価で済む選択肢がないか確認します。':'Check whether another option can achieve the same growth with less feed input or lower price per kg.',
'飼料の保管状態を点検':'Inspect feed storage condition',
'吸湿、酸化、粉化があると食い付きと効率が落ちるため、ロットと保存場所を確認します。':'Moisture absorption, oxidation, and powdering can reduce appetite and efficiency, so check lot and storage place.',
'判断根拠をメモへ残す':'Record the evidence behind the decision',
'FCR未計算':'FCR not calculated',
'利益率未計算':'Margin not calculated',
'餌代比率未計算':'Feed cost share not calculated',
'至急確認してください。':'Check urgently.',
'注意して確認してください。':'Check carefully.',
'継続観察で問題ありません。':'Continue monitoring.',
' を連動して評価しています。':' together.',
}
for old, new in repls.items():
    text = text.replace(old, new)
# Fix template remnants more directly.
text = text.replace('title: "Feed cost is high",\n      reason: `Feed cost is ${formatNumber(feedCostSharePercent, 1)}% of total cost. If it occurs together with worsening FCR, margin can fall sharply.', 'title: "Feed cost share is high",\n      reason: `Feed cost is ${formatNumber(feedCostSharePercent, 1)}% of total cost. If it occurs together with worsening FCR, margin can fall sharply.')
text = text.replace('reason: `推定FCRは${formatNumber(fcr, 2)}です。', 'reason: `Estimated FCR is ${formatNumber(fcr, 2)}. ')
text = text.replace('reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Feed input is high', 'reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Feed input is high')
text = text.replace('reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Even when', 'reason: `Estimated FCR is ${formatNumber(fcr, 2)}. Even when')
text = text.replace('reason: `粗利益率は${formatNumber(summary.marginPercent, 1)}%です。', 'reason: `Gross margin is ${formatNumber(summary.marginPercent, 1)}%. ')
text = text.replace('reason: `Gross margin is ${formatNumber(summary.marginPercent, 1)}%. Unexpected', 'reason: `Gross margin is ${formatNumber(summary.marginPercent, 1)}%. Unexpected')
text = text.replace('reason: `推定FCR ${formatNumber(fcr, 2)}、粗利益率 ${formatNumber(summary.marginPercent, 1)}% together.', 'reason: `Estimated FCR ${formatNumber(fcr, 2)} and gross margin ${formatNumber(summary.marginPercent, 1)}% are occurring together.')
text = text.replace('label: `${Number(month.slice(5, 7))} mo`,', 'label: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${month}-01T00:00:00.000Z`)),')
text = text.replace('new Intl.NumberFormat(undefined, { style: "currency", currency: "JPY", maximumFractionDigits: 0 })', 'new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })')
write('lib/economics.ts', text)

# Translate static knowledge cards broadly if present.
if p('lib/catfish-knowledge.ts').exists():
    write('lib/catfish-knowledge.ts', '''export type CatfishKnowledgeCard = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  insight: string;
  appUse: string;
};

export const catfishKnowledgeCards: CatfishKnowledgeCard[] = [
  {
    id: "philippines-bfar-catfish",
    title: "Philippine catfish farming guidance",
    sourceLabel: "Bureau of Fisheries and Aquatic Resources / Philippine public aquaculture guidance",
    sourceUrl: "https://www.bfar.da.gov.ph/",
    insight: "Farm guidance should be adapted to tropical field conditions, local feed supply, and practical pond monitoring rather than relying only on laboratory-style data.",
    appUse: "This app keeps daily records offline so farmers can continue logging during weak mobile coverage and upload later when internet is available.",
  },
  {
    id: "fao-aquaculture-records",
    title: "Record keeping supports aquaculture decisions",
    sourceLabel: "FAO aquaculture resources",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Consistent records for feeding, growth, mortality, water quality, and sales are essential for improving farm management and profitability.",
    appUse: "Tank-level logs, FCR estimates, cost records, and sales records are kept together so the farmer can compare production and business results.",
  },
  {
    id: "water-quality-oxygen",
    title: "Dissolved oxygen and heat are daily priorities",
    sourceLabel: "FAO and aquaculture extension literature",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Warm tropical water can hold less oxygen, while high feeding increases oxygen demand and waste load.",
    appUse: "Weather and inspection alerts encourage early-morning dissolved oxygen checks, conservative feeding during heat, and careful observation after rain.",
  },
  {
    id: "feed-efficiency-fcr",
    title: "FCR should be interpreted with field context",
    sourceLabel: "Aquaculture production management references",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Feed conversion ratio is useful, but mortality, grading, sampling bias, and unrecorded feeding can distort the estimate.",
    appUse: "The app presents FCR as an estimate with limitations and links it with margin and feed cost share before issuing business alerts.",
  },
  {
    id: "photo-health-screening",
    title: "Photo checks support observation, not diagnosis",
    sourceLabel: "Aquatic animal health extension guidance",
    sourceUrl: "https://www.woah.org/en/what-we-do/animal-health-and-welfare/aquatic-animals/",
    insight: "Visible signs such as ulcers, redness, fin damage, or abnormal color should trigger closer observation and water checks, not an automatic disease diagnosis.",
    appUse: "Photo screening flags visible signs and recommends water testing and expert advice when the risk is high.",
  },
];
''')

# Update tests to English expectations and offline auto-sync checks.
text = read('tests/app-basic.test.ts')
text = text.replace('expect(advice.productAdvice).toContain("低め");', 'expect(advice.productAdvice).toContain("low");')
text = text.replace('expect(screening.visibleSigns).toContain("潰瘍・傷");\n    expect(screening.disclaimer).toContain("確定診断ではありません");', 'expect(screening.visibleSigns).toContain("Ulcers or wounds");\n    expect(screening.disclaimer).toContain("not a definitive diagnosis");')
text = text.replace('{ id: "t1", name: "A水槽", location: "", notes: "", createdAt: "2026-01-01" },\n      { id: "t2", name: "B水槽", location: "", notes: "", createdAt: "2026-01-01" },', '{ id: "t1", name: "Tank A", location: "", notes: "", createdAt: "2026-01-01" },\n      { id: "t2", name: "Tank B", location: "", notes: "", createdAt: "2026-01-01" },')
text = text.replace('const checklist = buildImprovementChecklist([{ id: "margin_danger", severity: "danger", title: "赤字", reason: "", action: "単価と費用を確認" }]);\n    expect(checklist.some((item) => item.title.includes("費用内訳"))).toBe(true);', 'const checklist = buildImprovementChecklist([{ id: "margin_danger", severity: "danger", title: "Negative margin", reason: "", action: "Check price and costs" }]);\n    expect(checklist.some((item) => item.title.includes("Break costs"))).toBe(true);')
text = text.replace('  });\n\n});', '  });\n\n  it("supports Philippines offline-first auto-upload and stale-sync warnings", () => {\n    const store = read("lib/farm-store.tsx");\n    const syncScreen = read("app/(tabs)/sync.tsx");\n    const autoSync = read("components/auto-sync-coordinator.tsx");\n    expect(store).toContain("autoSyncEnabled: true");\n    expect(store).toContain("staleSyncWarningDays: 7");\n    expect(store).toContain("isSyncStale");\n    expect(syncScreen).toContain("Built for field use in the Philippines");\n    expect(syncScreen).toContain("records stay on this phone first");\n    expect(autoSync).toContain("Network.useNetworkState");\n    expect(autoSync).toContain("uploadFarmExportToGoogleDrive");\n  });\n\n  it("keeps generated user-facing advisory text in English", () => {\n    const risks = assessCatfishWeatherRisk({ airTempC: 35, rainMm24h: 55 }, { dissolvedOxygen: 3.5 });\n    expect(risks[0].title).toMatch(/High|Water|Heat|Rain|Low|Routine/);\n    const alert = assessFeedEfficiencyProfitRisk({ costs: [], sales: [], feedings: [], growthMeasurements: [] });\n    expect(alert.title).toMatch(/Business|Profitability/);\n    expect(alert.limitation).toContain("FCR is a simplified estimate");\n  });\n\n});')
write('tests/app-basic.test.ts', text)

# Mark TODO items pending until validation later; do not complete now.
print('offline auto-sync implementation applied')
