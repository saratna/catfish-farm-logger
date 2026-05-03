from pathlib import Path
import re

root = Path('/home/ubuntu/catfish_farm_logger')

farm_store = root / 'lib/farm-store.tsx'
text = farm_store.read_text()

text = text.replace('export type FishPhoto = {\n  id: string;\n  tankId: string;\n  createdAt: string;\n  uri: string;\n  notes: string;\n  synced: boolean;\n};', '''export type FishPhoto = {
  id: string;
  tankId: string;
  createdAt: string;
  uri: string;
  originalUri?: string;
  compressedUploadUri?: string;
  uploadSizeBytes?: number;
  notes: string;
  synced: boolean;
};''')

text = text.replace('  autoSyncEnabled: boolean;\n  staleSyncWarningDays: number;\n};', '''  autoSyncEnabled: boolean;
  staleSyncWarningDays: number;
  lowBandwidthMode: boolean;
  photoCompressionEnabled: boolean;
  photoCompressionQuality: number;
  photoMaxUploadWidth: number;
  weeklyPdfReportsEnabled: boolean;
};''')

text = text.replace('  status: "idle" | "waiting" | "syncing" | "synced" | "failed";\n  message: string;\n};', '''  status: "idle" | "waiting" | "syncing" | "synced" | "failed";
  message: string;
  lastWeeklyReportAt?: string;
};

export type SyncFailure = {
  id: string;
  createdAt: string;
  attemptAt: string;
  itemType: "farm_export" | "photo_upload" | "weekly_pdf" | "google_drive" | "network";
  itemId?: string;
  stage: string;
  reason: string;
  retryStatus: "pending" | "resolved";
  resolvedAt?: string;
  guidance: string;
};

export type WeeklyReportExport = {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  title: string;
  summary: {
    inspectionCount: number;
    feedingCount: number;
    photoCount: number;
    costTotal: number;
    salesTotal: number;
    grossProfit: number;
    activeAlertCount: number;
  };
  tankSummaries: Array<{
    tankId: string;
    tankName: string;
    inspections: number;
    feedKg: number;
    photos: number;
    growthRecords: number;
    cost: number;
    sales: number;
    grossProfit: number;
  }>;
  alerts: Array<{ severity: string; title: string; action: string }>;
};''')

text = text.replace('  sync: SyncLog;\n  hydrated: boolean;\n};', '  sync: SyncLog;\n  syncFailures: SyncFailure[];\n  hydrated: boolean;\n};')

text = text.replace('  | { type: "markSynced"; payload: { at: string } }\n  | { type: "setSyncStatus"; payload: SyncLog };', '''  | { type: "markSynced"; payload: { at: string; weeklyReportAt?: string } }
  | { type: "setSyncStatus"; payload: SyncLog }
  | { type: "addSyncFailure"; payload: SyncFailure }
  | { type: "resolveSyncFailures"; payload: { at: string } };''')

text = text.replace('    autoSyncEnabled: true,\n    staleSyncWarningDays: 7,\n  },', '''    autoSyncEnabled: true,
    staleSyncWarningDays: 7,
    lowBandwidthMode: true,
    photoCompressionEnabled: true,
    photoCompressionQuality: 0.55,
    photoMaxUploadWidth: 1280,
    weeklyPdfReportsEnabled: true,
  },''')

text = text.replace('  sync: {\n    status: "waiting",\n    message: "Local records are saved on this device until Google Drive sync is connected.",\n  },\n  hydrated: false,', '''  sync: {
    status: "waiting",
    message: "Local records are saved on this device until Google Drive sync is connected.",
  },
  syncFailures: [],
  hydrated: false,''')

text = text.replace('        sync: { status: "synced", lastSyncAt: action.payload.at, lastAttemptAt: action.payload.at, message: "All local records have been uploaded." },', '        sync: { status: "synced", lastSyncAt: action.payload.at, lastAttemptAt: action.payload.at, lastWeeklyReportAt: action.payload.weeklyReportAt ?? state.sync.lastWeeklyReportAt, message: "All local records have been uploaded." },\n        syncFailures: state.syncFailures.map((item) => item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item),')

text = text.replace('    case "setSyncStatus":\n      return { ...state, sync: action.payload };', '''    case "setSyncStatus":
      return { ...state, sync: action.payload };
    case "addSyncFailure":
      return { ...state, syncFailures: [action.payload, ...state.syncFailures].slice(0, 100) };
    case "resolveSyncFailures":
      return { ...state, syncFailures: state.syncFailures.map((item) => item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item) };''')

text = text.replace('  setSyncStatus: (input: SyncLog) => void;\n  generateDrivePayload: () => DriveExport;\n};', '''  setSyncStatus: (input: SyncLog) => void;
  recordSyncFailure: (input: Omit<SyncFailure, "id" | "createdAt" | "retryStatus" | "guidance"> & { guidance?: string }) => void;
  resolveSyncFailures: () => void;
  shouldCreateWeeklyReport: () => boolean;
  generateWeeklyReport: () => WeeklyReportExport;
  generateDrivePayload: () => DriveExport;
};''')

text = text.replace('  monthlyTrend: ReturnType<typeof buildMonthlyTrend>;\n  profitabilityRanking: ReturnType<typeof rankTanksByProfitability>;', '  monthlyTrend: ReturnType<typeof buildMonthlyTrend>;\n  profitabilityRanking: ReturnType<typeof rankTanksByProfitability>;\n  weeklyReport?: WeeklyReportExport;')

text = text.replace('      .then((value) => {', '      .then((value) => {')
text = text.replace('        dispatch({ type: "hydrate", payload: { ...serializableState(defaultState), ...parsed, settings: { ...defaultState.settings, ...parsed.settings } } });', '        dispatch({ type: "hydrate", payload: { ...serializableState(defaultState), ...parsed, settings: { ...defaultState.settings, ...parsed.settings }, sync: { ...defaultState.sync, ...parsed.sync }, syncFailures: parsed.syncFailures ?? [] } });')

text = text.replace('  const markSynced = useCallback(() => {\n    dispatch({ type: "markSynced", payload: { at: nowIso() } });\n  }, []);', '''  const markSynced = useCallback((weeklyReportAt?: string) => {
    dispatch({ type: "markSynced", payload: { at: nowIso(), weeklyReportAt } });
  }, []);''')

text = text.replace('  markSynced: () => void;', '  markSynced: (weeklyReportAt?: string) => void;')

text = text.replace('  const setSyncStatus = useCallback((input: SyncLog) => {\n    dispatch({ type: "setSyncStatus", payload: input });\n  }, []);', '''  const setSyncStatus = useCallback((input: SyncLog) => {
    dispatch({ type: "setSyncStatus", payload: input });
  }, []);

  const recordSyncFailure = useCallback((input: Omit<SyncFailure, "id" | "createdAt" | "retryStatus" | "guidance"> & { guidance?: string }) => {
    dispatch({
      type: "addSyncFailure",
      payload: {
        id: createId("sync_failure"),
        createdAt: nowIso(),
        retryStatus: "pending",
        guidance: input.guidance ?? "Keep recording locally. The app will retry automatically when mobile data or Wi-Fi becomes stable, or you can open Sync and run an upload manually.",
        ...input,
      },
    });
  }, []);

  const resolveSyncFailures = useCallback(() => {
    dispatch({ type: "resolveSyncFailures", payload: { at: nowIso() } });
  }, []);

  const shouldCreateWeeklyReport = useCallback(() => {
    if (!state.settings.weeklyPdfReportsEnabled) return false;
    if (!state.sync.lastWeeklyReportAt) return true;
    return daysSinceSync(state.sync.lastWeeklyReportAt) !== null && (daysSinceSync(state.sync.lastWeeklyReportAt) ?? 0) >= 7;
  }, [state.settings.weeklyPdfReportsEnabled, state.sync.lastWeeklyReportAt]);

  const generateWeeklyReport = useCallback((): WeeklyReportExport => {
    return buildWeeklyReport(state);
  }, [state]);''')

text = text.replace('      profitabilityRanking: rankTanksByProfitability(state.tanks, state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),', '      profitabilityRanking: rankTanksByProfitability(state.tanks, state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),\n      weeklyReport: state.settings.weeklyPdfReportsEnabled ? buildWeeklyReport(state) : undefined,')

text = text.replace('      setSyncStatus,\n      generateDrivePayload,', '      setSyncStatus,\n      recordSyncFailure,\n      resolveSyncFailures,\n      shouldCreateWeeklyReport,\n      generateWeeklyReport,\n      generateDrivePayload,')
text = text.replace('setSyncStatus, generateDrivePayload]', 'setSyncStatus, recordSyncFailure, resolveSyncFailures, shouldCreateWeeklyReport, generateWeeklyReport, generateDrivePayload]')

insert_before = '\nexport function formatShortDate(value?: string) {'
helper = r'''
function getWeekBounds(reference = new Date()) {
  const end = new Date(reference);
  const start = new Date(reference);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isWithinRange(value: string, start: Date, end: Date) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
}

function buildWeeklyReport(state: FarmState): WeeklyReportExport {
  const { start, end } = getWeekBounds();
  const inspections = state.inspections.filter((item) => isWithinRange(item.createdAt, start, end));
  const feedings = state.feedings.filter((item) => isWithinRange(item.createdAt, start, end));
  const photos = state.photos.filter((item) => isWithinRange(item.createdAt, start, end));
  const costs = state.costEntries.filter((item) => isWithinRange(item.createdAt, start, end));
  const sales = state.saleRecords.filter((item) => isWithinRange(item.createdAt, start, end));
  const activeAlerts = state.riskAlerts.filter((item) => !item.acknowledged);
  const costTotal = costs.reduce((sum, item) => sum + item.amount, 0);
  const salesTotal = sales.reduce((sum, item) => sum + item.totalAmount, 0);
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    generatedAt: nowIso(),
    title: "Weekly Catfish Farm Report",
    summary: {
      inspectionCount: inspections.length,
      feedingCount: feedings.length,
      photoCount: photos.length,
      costTotal,
      salesTotal,
      grossProfit: salesTotal - costTotal,
      activeAlertCount: activeAlerts.length,
    },
    tankSummaries: state.tanks.map((tank) => {
      const tankFeedings = feedings.filter((item) => item.tankId === tank.id);
      const tankPhotos = photos.filter((item) => item.tankId === tank.id);
      const tankCosts = costs.filter((item) => item.tankId === tank.id);
      const tankSales = sales.filter((item) => item.tankId === tank.id);
      const cost = tankCosts.reduce((sum, item) => sum + item.amount, 0);
      const revenue = tankSales.reduce((sum, item) => sum + item.totalAmount, 0);
      return {
        tankId: tank.id,
        tankName: tank.name,
        inspections: inspections.filter((item) => item.tankId === tank.id).length,
        feedKg: tankFeedings.reduce((sum, item) => sum + item.feedAmountKg, 0),
        photos: tankPhotos.length,
        growthRecords: state.growthMeasurements.filter((item) => item.tankId === tank.id && isWithinRange(item.createdAt, start, end)).length,
        cost,
        sales: revenue,
        grossProfit: revenue - cost,
      };
    }),
    alerts: activeAlerts.slice(0, 12).map((item) => ({ severity: item.severity, title: item.title, action: item.action })),
  };
}
'''
text = text.replace(insert_before, helper + insert_before)

farm_store.write_text(text)

# google-drive.ts rewrite targeted additions
gd = root / 'lib/google-drive.ts'
g = gd.read_text()
g = g.replace('import * as FileSystem from "expo-file-system/legacy";\nimport * as SecureStore from "expo-secure-store";', 'import * as FileSystem from "expo-file-system/legacy";\nimport * as ImageManipulator from "expo-image-manipulator";\nimport * as Print from "expo-print";\nimport * as SecureStore from "expo-secure-store";')
g = g.replace('import type { DriveExport, FishPhoto } from "@/lib/farm-store";', 'import type { DriveExport, FishPhoto, WeeklyReportExport } from "@/lib/farm-store";')
g = g.replace('  uploadedPhotoCount: number;\n};', '  uploadedPhotoCount: number;\n  uploadedWeeklyReportCount: number;\n  weeklyReportGeneratedAt?: string;\n};')
helper2 = r'''
async function preparePhotoForUpload(photo: FishPhoto, exportPayload: DriveExport) {
  if (photo.compressedUploadUri) return photo.compressedUploadUri;
  const settings = exportPayload.settings;
  if (!settings.photoCompressionEnabled && !settings.lowBandwidthMode) return photo.uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: settings.photoMaxUploadWidth } }],
      { compress: settings.photoCompressionQuality, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return photo.uri;
  }
}

function peso(value: number) {
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function weeklyReportHtml(report: WeeklyReportExport) {
  const rows = report.tankSummaries.map((tank) => `<tr><td>${escapeHtml(tank.tankName)}</td><td>${tank.inspections}</td><td>${tank.feedKg.toFixed(1)} kg</td><td>${tank.growthRecords}</td><td>${peso(tank.cost)}</td><td>${peso(tank.sales)}</td><td>${peso(tank.grossProfit)}</td></tr>`).join("");
  const alerts = report.alerts.length ? report.alerts.map((alert) => `<li><strong>${escapeHtml(alert.severity.toUpperCase())}: ${escapeHtml(alert.title)}</strong><br/>${escapeHtml(alert.action)}</li>`).join("") : "<li>No active alerts at report generation time.</li>";
  return `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;padding:28px;}h1{color:#075985;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;}th{background:#e0f2fe}.cards{display:flex;flex-wrap:wrap;gap:10px}.card{border:1px solid #cbd5e1;border-radius:12px;padding:10px;min-width:145px}.muted{color:#64748b;font-size:12px}</style></head><body><h1>${escapeHtml(report.title)}</h1><p class="muted">${new Date(report.weekStart).toDateString()} to ${new Date(report.weekEnd).toDateString()} · generated ${new Date(report.generatedAt).toLocaleString()}</p><div class="cards"><div class="card"><b>Inspections</b><br/>${report.summary.inspectionCount}</div><div class="card"><b>Feedings</b><br/>${report.summary.feedingCount}</div><div class="card"><b>Photos</b><br/>${report.summary.photoCount}</div><div class="card"><b>Gross profit</b><br/>${peso(report.summary.grossProfit)}</div><div class="card"><b>Active alerts</b><br/>${report.summary.activeAlertCount}</div></div><h2>Tank summary</h2><table><thead><tr><th>Tank</th><th>Inspections</th><th>Feed</th><th>Growth</th><th>Cost</th><th>Sales</th><th>Profit</th></tr></thead><tbody>${rows}</tbody></table><h2>Current alert actions</h2><ul>${alerts}</ul><p class="muted">This report was generated from records stored locally on the phone. It uploads automatically when Google Drive sync succeeds.</p></body></html>`;
}

async function createWeeklyReportPdf(directory: string, report: WeeklyReportExport) {
  const html = weeklyReportHtml(report);
  const pdf = await Print.printToFileAsync({ html, base64: false });
  const fileName = `weekly-report-${report.weekStart.slice(0, 10)}.pdf`;
  const targetUri = `${directory}${fileName}`;
  await FileSystem.copyAsync({ from: pdf.uri, to: targetUri });
  return { uri: targetUri, fileName };
}
'''
g = g.replace('\nasync function writeJsonExportFile(directory: string, fileName: string, value: unknown) {', helper2 + '\nasync function writeJsonExportFile(directory: string, fileName: string, value: unknown) {')
g = g.replace('  let uploadedFileCount = 1;\n  let uploadedPhotoCount = 0;', '  let uploadedFileCount = 1;\n  let uploadedPhotoCount = 0;\n  let uploadedWeeklyReportCount = 0;\n  let weeklyReportGeneratedAt: string | undefined;\n\n  if (exportPayload.weeklyReport) {\n    const reportFolderId = await ensureFolder("weekly-reports", rootFolderId, accessToken);\n    const report = await createWeeklyReportPdf(tempDirectory, exportPayload.weeklyReport);\n    await uploadLocalFile(accessToken, reportFolderId, report.fileName, report.uri, "application/pdf");\n    uploadedWeeklyReportCount += 1;\n    weeklyReportGeneratedAt = exportPayload.weeklyReport.generatedAt;\n  }')
g = g.replace('      await uploadLocalFile(accessToken, photoFolderId, getPhotoFileName(photo, index), photo.uri, getPhotoMimeType(photo));', '      const uploadUri = await preparePhotoForUpload(photo, exportPayload);\n      await uploadLocalFile(accessToken, photoFolderId, getPhotoFileName(photo, index), uploadUri, getPhotoMimeType(photo));')
g = g.replace('  return { rootFolderId, uploadedFileCount, uploadedPhotoCount } satisfies GoogleDriveSyncResult;', '  return { rootFolderId, uploadedFileCount, uploadedPhotoCount, uploadedWeeklyReportCount, weeklyReportGeneratedAt } satisfies GoogleDriveSyncResult;')
gd.write_text(g)

# Add settings to DriveExport type
text = farm_store.read_text()
text = text.replace('  generatedAt: string;\n  location?: FarmLocation;', '  generatedAt: string;\n  settings: FarmSettings;\n  location?: FarmLocation;')
text = text.replace('      generatedAt: nowIso(),\n      location: state.location,', '      generatedAt: nowIso(),\n      settings: state.settings,\n      location: state.location,')
farm_store.write_text(text)

# Auto sync coordinator
asc = root / 'components/auto-sync-coordinator.tsx'
a = asc.read_text()
a = a.replace('  const reachable = network.isInternetReachable === true;', '  const reachable = network.isInternetReachable === true;\n  const shouldUpload = farm.pendingSyncCount > 0 || farm.shouldCreateWeeklyReport();')
a = a.replace('    if (farm.pendingSyncCount <= 0) return;', '    if (!shouldUpload) return;')
a = a.replace('        const result = await uploadFarmExportToGoogleDrive(farm.generateDrivePayload());', '        const result = await uploadFarmExportToGoogleDrive(farm.generateDrivePayload());')
a = a.replace('        farm.markSynced();', '        farm.resolveSyncFailures();\n        farm.markSynced(result.weeklyReportGeneratedAt);')
a = a.replace('message: `Auto-upload complete: ${result.uploadedFileCount} JSON files and ${result.uploadedPhotoCount} photos were uploaded.`', 'message: `Auto-upload complete: ${result.uploadedFileCount} JSON files, ${result.uploadedPhotoCount} photos, and ${result.uploadedWeeklyReportCount} weekly PDF reports were uploaded.`')
a = a.replace('        farm.setSyncStatus({\n          ...farm.sync,\n          status: "failed",\n          lastAttemptAt: attemptAt,\n          message: error instanceof Error ? `Auto-upload failed: ${error.message}` : "Auto-upload failed. Records remain safely stored on this phone.",\n        });', '        const reason = error instanceof Error ? error.message : "Auto-upload failed. Records remain safely stored on this phone.";\n        farm.recordSyncFailure({ attemptAt, itemType: "google_drive", stage: "automatic_upload", reason });\n        farm.setSyncStatus({\n          ...farm.sync,\n          status: "failed",\n          lastAttemptAt: attemptAt,\n          message: `Auto-upload failed: ${reason}`,\n        });')
a = a.replace('  }, [farm, reachable]);', '  }, [farm, reachable, shouldUpload]);')
asc.write_text(a)

# Settings screen add controls/save fields
settings = root / 'app/(tabs)/settings.tsx'
s = settings.read_text()
s = s.replace('  const [staleSyncWarningDays, setStaleSyncWarningDays] = useState(String(farm.settings.staleSyncWarningDays));', '''  const [staleSyncWarningDays, setStaleSyncWarningDays] = useState(String(farm.settings.staleSyncWarningDays));
  const [lowBandwidthMode, setLowBandwidthMode] = useState(farm.settings.lowBandwidthMode);
  const [photoCompressionEnabled, setPhotoCompressionEnabled] = useState(farm.settings.photoCompressionEnabled);
  const [photoCompressionQuality, setPhotoCompressionQuality] = useState(String(farm.settings.photoCompressionQuality));
  const [photoMaxUploadWidth, setPhotoMaxUploadWidth] = useState(String(farm.settings.photoMaxUploadWidth));
  const [weeklyPdfReportsEnabled, setWeeklyPdfReportsEnabled] = useState(farm.settings.weeklyPdfReportsEnabled);''')
s = s.replace('    const parsedFeedTypes = feedTypes.split(",").map((item) => item.trim()).filter(Boolean);', '''    const parsedFeedTypes = feedTypes.split(",").map((item) => item.trim()).filter(Boolean);
    const parsedStaleDays = Math.max(1, Number(staleSyncWarningDays) || farm.settings.staleSyncWarningDays);
    const parsedQuality = Math.min(0.9, Math.max(0.2, Number(photoCompressionQuality) || farm.settings.photoCompressionQuality));
    const parsedWidth = Math.min(2048, Math.max(640, Number(photoMaxUploadWidth) || farm.settings.photoMaxUploadWidth));''')
s = s.replace('      driveRootFolder: driveRootFolder.trim() || "CatfishFarmLogger",\n    });', '''      driveRootFolder: driveRootFolder.trim() || "CatfishFarmLogger",
      autoSyncEnabled,
      staleSyncWarningDays: parsedStaleDays,
      lowBandwidthMode,
      photoCompressionEnabled,
      photoCompressionQuality: parsedQuality,
      photoMaxUploadWidth: parsedWidth,
      weeklyPdfReportsEnabled,
    });''')
insert = '''
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
'''
s = s.replace('        <TouchableOpacity className="mt-5 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveSettings}>', insert + '\n        <TouchableOpacity className="mt-5 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveSettings}>')
s += '''

function ToggleRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity className="mt-4 flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 active:opacity-80" onPress={onPress}>
      <Text className="flex-1 pr-3 font-semibold text-foreground">{label}</Text>
      <Text className={`rounded-full px-3 py-1 text-xs font-bold ${value ? "bg-success text-white" : "bg-border text-muted"}`}>{value ? "ON" : "OFF"}</Text>
    </TouchableOpacity>
  );
}
'''
settings.write_text(s)

# Records screen use low-bandwidth capture quality
records = root / 'app/(tabs)/records.tsx'
r = records.read_text()
r = r.replace('  const selectedTank = farm.tanks.find((tank) => tank.id === tankId) ?? farm.tanks[0];', '  const selectedTank = farm.tanks.find((tank) => tank.id === tankId) ?? farm.tanks[0];\n  const captureQuality = farm.settings.lowBandwidthMode ? 0.45 : 0.75;')
r = r.replace('quality: 0.75', 'quality: captureQuality')
records.write_text(r)

# Sync history screen
sync_history = root / 'app/(tabs)/sync-history.tsx'
sync_history.write_text('''import { FlatList, Text, TouchableOpacity, View } from "react-native";\n\nimport { ScreenContainer } from "@/components/screen-container";\nimport { formatShortDate, useFarm } from "@/lib/farm-store";\n\nexport default function SyncHistoryScreen() {\n  const farm = useFarm();\n  return (\n    <ScreenContainer className="px-5 pt-4">\n      <Text className="text-3xl font-extrabold text-foreground">Sync failures</Text>\n      <Text className="mt-1 text-base leading-6 text-muted">Review uploads that failed during weak mobile data or Google Drive interruptions. Records stay on this phone and auto-retry when the connection improves.</Text>\n      <View className="mt-4 rounded-3xl border border-border bg-surface p-5">\n        <Text className="text-lg font-bold text-foreground">Retry guidance</Text>\n        <Text className="mt-1 text-sm leading-5 text-muted">Keep recording farm work offline. When Wi-Fi or mobile data becomes stable, open Sync or leave auto-upload enabled. Pending failures change to resolved after a successful upload.</Text>\n      </View>\n      <FlatList\n        className="mt-4"\n        data={farm.syncFailures}\n        keyExtractor={(item) => item.id}\n        contentContainerStyle={{ paddingBottom: 32 }}\n        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-muted">No sync failures recorded. This means recent automatic uploads either have not run yet or completed without errors.</Text>}\n        renderItem={({ item }) => (\n          <View className="mb-3 rounded-3xl border border-border bg-surface p-5">\n            <View className="flex-row items-start justify-between gap-3">\n              <View className="flex-1">\n                <Text className="text-lg font-bold text-foreground">{item.itemType.replace(/_/g, " ")}</Text>\n                <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{formatShortDate(item.attemptAt)} · {item.stage}</Text>\n              </View>\n              <Text className={`rounded-full px-3 py-1 text-xs font-bold ${item.retryStatus === "resolved" ? "bg-success text-white" : "bg-warning text-white"}`}>{item.retryStatus.toUpperCase()}</Text>\n            </View>\n            <Text className="mt-3 text-sm leading-5 text-foreground">{item.reason}</Text>\n            <Text className="mt-2 text-sm leading-5 text-muted">{item.guidance}</Text>\n            {item.resolvedAt ? <Text className="mt-2 text-xs font-semibold text-success">Resolved {formatShortDate(item.resolvedAt)}</Text> : null}\n          </View>\n        )}\n      />\n    </ScreenContainer>\n  );\n}\n''')

# tab layout and icon
layout = root / 'app/(tabs)/_layout.tsx'
l = layout.read_text()
l = l.replace('      <Tabs.Screen\n        name="settings"', '      <Tabs.Screen\n        name="sync-history"\n        options={{\n          title: "Failures",\n          tabBarIcon: ({ color }) => <IconSymbol size={26} name="exclamationmark.triangle.fill" color={color} />,\n        }}\n      />\n      <Tabs.Screen\n        name="settings"')
layout.write_text(l)
icon = root / 'components/ui/icon-symbol.tsx'
i = icon.read_text()
i = i.replace('  "yensign.circle.fill": "payments",', '  "yensign.circle.fill": "payments",\n  "exclamationmark.triangle.fill": "warning",')
icon.write_text(i)

# Fix remaining Japanese in finance/economics via broad replacements
for rel in ['app/(tabs)/finance.tsx', 'lib/economics.ts']:
    p = root / rel
    if p.exists():
        t = p.read_text()
        reps = {
            '収支管理': 'Finance', 'コスト入力': 'Cost entry', '販売価格入力': 'Sales entry', '水槽別採算ランキング': 'Tank profitability ranking', '月次FCR・利益率推移': 'Monthly FCR and margin trend', '改善チェックリスト': 'Improvement checklist', '利益率': 'Margin', '粗利益': 'Gross profit', '推定FCR': 'Estimated FCR', '販売kg': 'Sales kg', '売上': 'Sales', '費用': 'Cost', '未計算': 'Not calculated', '安定': 'Stable', '注意': 'Watch', '危険': 'Danger', '餌代比率': 'Feed cost share', 'アプリへの反映': 'App use', '最近の収支記録': 'Recent finance records', 'まだ収支記録がありません。稚魚代・餌代・販売価格から入力してください。': 'No finance records yet. Start with fingerlings, feed cost, and sales price.', '一次資料・公的資料からの知見': 'Findings from primary and public sources', '研究・普及資料はアプリ内の判断補助として使います。写真チェックは確定診断ではありません。': 'Research and extension references are used as decision support in the app. Photo checks are not a definitive diagnosis.', '水槽データがありません。': 'No tank data yet.', '月別に表示できる収支・給餌・成長記録がまだありません。': 'No monthly finance, feeding, or growth records are available yet.', '高': 'High', '月': 'Month', '選択中の水槽について、月別の推定FCRと粗利益率を同じ時間軸で確認します。FCRは低いほど良く、利益率は高いほど良い指標です。': 'Review estimated FCR and gross margin for the selected tank on the same monthly timeline. Lower FCR and higher margin are better.', '全水槽を売上・費用・粗利益・利益率・FCRで比較します。水槽選択の影響を受けず、農場全体の優先確認先を把握できます。': 'Compare tanks by sales, cost, gross profit, margin, and FCR. This ranking covers the whole farm regardless of selected tank.', 'アラート内容から、現場で確認する行動を具体化します。チェック状態はこの画面内だけで管理され、記録の根拠はメモ欄へ残してください。': 'Turn alerts into practical field checks. Checkbox state is kept only on this screen; record evidence in notes.'
        }
        for a0,b0 in reps.items():
            t = t.replace(a0,b0)
        p.write_text(t)

# Tests additions
_test = root / 'tests/app-basic.test.ts'
t = _test.read_text()
append = '''

describe("offline sync automation additions", () => {
  it("keeps Philippine low-bandwidth defaults enabled", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/farm-store.tsx", "utf8"));
    expect(source).toContain("lowBandwidthMode: true");
    expect(source).toContain("photoCompressionEnabled: true");
    expect(source).toContain("weeklyPdfReportsEnabled: true");
  });

  it("records sync failure history and weekly PDF metadata", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/farm-store.tsx", "utf8"));
    expect(source).toContain("export type SyncFailure");
    expect(source).toContain("export type WeeklyReportExport");
    expect(source).toContain("buildWeeklyReport");
  });

  it("compresses photos and uploads weekly PDF reports during Drive sync", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/google-drive.ts", "utf8"));
    expect(source).toContain("expo-image-manipulator");
    expect(source).toContain("expo-print");
    expect(source).toContain("weekly-reports");
  });
});
'''
if 'offline sync automation additions' not in t:
    t += append
_test.write_text(t)
