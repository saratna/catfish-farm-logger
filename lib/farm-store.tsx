import AsyncStorage from "@react-native-async-storage/async-storage";
import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, rankTanksByProfitability } from "@/lib/economics";
import { assessTankDiseaseRisk, buildFarmHealthSnapshots } from "@/lib/health-monitor";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

export type Tank = {
  id: string;
  name: string;
  location: string;
  notes: string;
  createdAt: string;
};

export type Inspection = {
  id: string;
  tankId: string;
  createdAt: string;
  waterTempC: number;
  ph?: number;
  dissolvedOxygen?: number;
  ammonia?: number;
  nitrite?: number;
  salinity?: number;
  notes: string;
  synced: boolean;
};

export type Feeding = {
  id: string;
  tankId: string;
  createdAt: string;
  feedType: string;
  feedAmountKg: number;
  averageWeightG: number;
  fishCount?: number;
  feedProductName?: string;
  proteinPercent?: number;
  pelletSizeMm?: number;
  feedBehavior?: "poor" | "normal" | "strong";
  residualFeed?: "none" | "little" | "much";
  floats?: boolean;
  recommendedFeedKg?: number;
  adviceSummary?: string;
  productAdvice?: string;
  notes: string;
  synced: boolean;
};

export type FishPhoto = {
  id: string;
  tankId: string;
  createdAt: string;
  uri: string;
  originalUri?: string;
  compressedUploadUri?: string;
  uploadSizeBytes?: number;
  notes: string;
  synced: boolean;
};

export type GrowthMeasurement = {
  id: string;
  tankId: string;
  createdAt: string;
  lengthCm: number;
  weightG: number;
  photoUri?: string;
  source: "manual" | "photo-assisted";
  notes: string;
  synced: boolean;
};

export type PhotoAssessmentRecord = {
  id: string;
  tankId: string;
  growthMeasurementId?: string;
  createdAt: string;
  uri: string;
  estimatedLengthCm?: number;
  estimatedWeightG?: number;
  confidence: "low" | "medium" | "high";
  visibleSigns: string[];
  severity: "normal" | "watch" | "danger";
  summary: string;
  recommendation: string;
  disclaimer: string;
  synced: boolean;
};

export type FarmCostCategory = "seed_stock" | "feed" | "labor" | "electricity" | "water" | "medicine" | "maintenance" | "other";

export type FarmCostEntry = {
  id: string;
  tankId?: string;
  createdAt: string;
  category: FarmCostCategory;
  label: string;
  amount: number;
  quantity?: number;
  unit?: string;
  vendor?: string;
  notes: string;
  synced: boolean;
};

export type FarmSaleRecord = {
  id: string;
  tankId?: string;
  createdAt: string;
  buyer: string;
  productGrade: string;
  quantityKg: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
  synced: boolean;
};

export type FarmLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  label: string;
  updatedAt: string;
};

export type WeatherRecord = {
  id: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceSummary: string;
  airTempC?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  pressureTrendHpa?: number;
  rainMm24h?: number;
  windKph?: number;
  forecastText: string;
  synced: boolean;
};

export type RiskAlert = {
  id: string;
  createdAt: string;
  severity: "normal" | "watch" | "danger";
  category: "heat" | "rain" | "pressure" | "humidity" | "water" | "feed" | "disease";
  title: string;
  reason: string;
  action: string;
  acknowledged: boolean;
  synced: boolean;
};

export type FeedProduct = {
  id: string;
  createdAt: string;
  name: string;
  proteinPercent?: number;
  pelletSizeMm?: number;
  floats?: boolean;
  notes: string;
  synced: boolean;
};

export type FarmSettings = {
  reminderHour: number;
  reminderMinute: number;
  feedTypes: string[];
  driveRootFolder: string;
  weatherAlertsEnabled: boolean;
  alertTempC: number;
  alertRainMm24h: number;
  autoSyncEnabled: boolean;
  staleSyncWarningDays: number;
  lowBandwidthMode: boolean;
  photoCompressionEnabled: boolean;
  photoCompressionQuality: number;
  photoMaxUploadWidth: number;
  weeklyPdfReportsEnabled: boolean;
  lineDangerAlertsEnabled: boolean;
  lineAlertCooldownMinutes: number;
};

export type SyncLog = {
  lastSyncAt?: string;
  lastExportAt?: string;
  lastAttemptAt?: string;
  status: "idle" | "waiting" | "syncing" | "synced" | "failed";
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
    diseaseAlertCount: number;
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
    healthSeverity: "normal" | "watch" | "danger";
    diseaseAlerts: number;
  }>;
  alerts: Array<{ severity: string; title: string; action: string }>;
};

type FarmState = {
  tanks: Tank[];
  inspections: Inspection[];
  feedings: Feeding[];
  photos: FishPhoto[];
  growthMeasurements: GrowthMeasurement[];
  photoAssessments: PhotoAssessmentRecord[];
  costEntries: FarmCostEntry[];
  saleRecords: FarmSaleRecord[];
  location?: FarmLocation;
  weatherRecords: WeatherRecord[];
  riskAlerts: RiskAlert[];
  feedProducts: FeedProduct[];
  settings: FarmSettings;
  sync: SyncLog;
  syncFailures: SyncFailure[];
  hydrated: boolean;
};

type FarmAction =
  | { type: "hydrate"; payload: Omit<FarmState, "hydrated"> }
  | { type: "addTank"; payload: Tank }
  | { type: "addInspection"; payload: Inspection }
  | { type: "addFeeding"; payload: Feeding }
  | { type: "addPhoto"; payload: FishPhoto }
  | { type: "addGrowthMeasurement"; payload: GrowthMeasurement }
  | { type: "addPhotoAssessment"; payload: PhotoAssessmentRecord }
  | { type: "addCostEntry"; payload: FarmCostEntry }
  | { type: "addSaleRecord"; payload: FarmSaleRecord }
  | { type: "setLocation"; payload: FarmLocation }
  | { type: "addWeatherRecord"; payload: WeatherRecord }
  | { type: "replaceRiskAlerts"; payload: RiskAlert[] }
  | { type: "acknowledgeRiskAlert"; payload: { id: string } }
  | { type: "addFeedProduct"; payload: FeedProduct }
  | { type: "updateSettings"; payload: Partial<FarmSettings> }
  | { type: "markSynced"; payload: { at: string; weeklyReportAt?: string } }
  | { type: "setSyncStatus"; payload: SyncLog }
  | { type: "addSyncFailure"; payload: SyncFailure }
  | { type: "resolveSyncFailures"; payload: { at: string; id?: string } };

const STORAGE_KEY = "catfish-farm-logger-state-v2";

const nowIso = () => new Date().toISOString();
const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultState: FarmState = {
  tanks: [
    {
      id: "tank_demo_1",
      name: "Tank 1",
      location: "Main pond area",
      notes: "Initial sample tank. Rename this for the real farm tank.",
      createdAt: nowIso(),
    },
  ],
  inspections: [],
  feedings: [],
  photos: [],
  growthMeasurements: [],
  photoAssessments: [],
  costEntries: [],
  saleRecords: [],
  weatherRecords: [],
  riskAlerts: [],
  feedProducts: [
    {
      id: "feed_demo_1",
      createdAt: nowIso(),
      name: "Floating catfish pellet",
      proteinPercent: 32,
      pelletSizeMm: 3,
      floats: true,
      notes: "Sample feed product. Replace with the actual brand and guaranteed analysis.",
      synced: false,
    },
  ],
  settings: {
    reminderHour: 8,
    reminderMinute: 0,
    feedTypes: ["Floating pellet", "Sinking pellet", "Mixed feed"],
    driveRootFolder: "CatfishFarmLogger",
    weatherAlertsEnabled: true,
    alertTempC: 34,
    alertRainMm24h: 50,
    autoSyncEnabled: true,
    staleSyncWarningDays: 7,
    lowBandwidthMode: true,
    photoCompressionEnabled: true,
    photoCompressionQuality: 0.55,
    photoMaxUploadWidth: 1280,
    weeklyPdfReportsEnabled: true,
    lineDangerAlertsEnabled: false,
    lineAlertCooldownMinutes: 180,
  },
  sync: {
    status: "waiting",
    message: "Local records are saved on this device until Google Drive sync is connected.",
  },
  syncFailures: [],
  hydrated: false,
};

function reducer(state: FarmState, action: FarmAction): FarmState {
  switch (action.type) {
    case "hydrate":
      return { ...action.payload, hydrated: true };
    case "addTank":
      return { ...state, tanks: [action.payload, ...state.tanks], sync: waitingSync("Tank saved locally") };
    case "addInspection":
      return { ...state, inspections: [action.payload, ...state.inspections], sync: waitingSync("Inspection saved locally") };
    case "addFeeding":
      return { ...state, feedings: [action.payload, ...state.feedings], sync: waitingSync("Feeding saved locally") };
    case "addPhoto":
      return { ...state, photos: [action.payload, ...state.photos], sync: waitingSync("Photo record saved locally") };
    case "addGrowthMeasurement":
      return { ...state, growthMeasurements: [action.payload, ...state.growthMeasurements], sync: waitingSync("Growth measurement saved locally") };
    case "addPhotoAssessment":
      return { ...state, photoAssessments: [action.payload, ...state.photoAssessments], sync: waitingSync("Photo assessment saved locally") };
    case "addCostEntry":
      return { ...state, costEntries: [action.payload, ...state.costEntries], sync: waitingSync("Cost entry saved locally") };
    case "addSaleRecord":
      return { ...state, saleRecords: [action.payload, ...state.saleRecords], sync: waitingSync("Sale record saved locally") };
    case "setLocation":
      return { ...state, location: action.payload, sync: waitingSync("GPS location saved locally") };
    case "addWeatherRecord":
      return { ...state, weatherRecords: [action.payload, ...state.weatherRecords].slice(0, 120), sync: waitingSync("Weather record saved locally") };
    case "replaceRiskAlerts":
      return { ...state, riskAlerts: [...action.payload, ...state.riskAlerts.filter((item) => item.acknowledged)].slice(0, 120), sync: waitingSync("Risk alerts updated locally") };
    case "acknowledgeRiskAlert":
      return { ...state, riskAlerts: state.riskAlerts.map((item) => (item.id === action.payload.id ? { ...item, acknowledged: true, synced: false } : item)), sync: waitingSync("Risk alert acknowledged locally") };
    case "addFeedProduct":
      return { ...state, feedProducts: [action.payload, ...state.feedProducts], sync: waitingSync("Feed product saved locally") };
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "markSynced":
      return {
        ...state,
        inspections: state.inspections.map((item) => ({ ...item, synced: true })),
        feedings: state.feedings.map((item) => ({ ...item, synced: true })),
        photos: state.photos.map((item) => ({ ...item, synced: true })),
        growthMeasurements: state.growthMeasurements.map((item) => ({ ...item, synced: true })),
        photoAssessments: state.photoAssessments.map((item) => ({ ...item, synced: true })),
        costEntries: state.costEntries.map((item) => ({ ...item, synced: true })),
        saleRecords: state.saleRecords.map((item) => ({ ...item, synced: true })),
        weatherRecords: state.weatherRecords.map((item) => ({ ...item, synced: true })),
        riskAlerts: state.riskAlerts.map((item) => ({ ...item, synced: true })),
        feedProducts: state.feedProducts.map((item) => ({ ...item, synced: true })),
        sync: { status: "synced", lastSyncAt: action.payload.at, lastAttemptAt: action.payload.at, lastWeeklyReportAt: action.payload.weeklyReportAt ?? state.sync.lastWeeklyReportAt, message: "All local records have been uploaded." },
        syncFailures: state.syncFailures.map((item) => item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item),
      };
    case "setSyncStatus":
      return { ...state, sync: action.payload };
    case "addSyncFailure":
      return { ...state, syncFailures: [action.payload, ...state.syncFailures].slice(0, 100) };
    case "resolveSyncFailures":
      return {
        ...state,
        syncFailures: state.syncFailures.map((item) => {
          const shouldResolve = action.payload.id ? item.id === action.payload.id : item.retryStatus === "pending";
          return shouldResolve && item.retryStatus === "pending" ? { ...item, retryStatus: "resolved", resolvedAt: action.payload.at } : item;
        }),
      };
    default:
      return state;
  }
}

function waitingSync(message: string): SyncLog {
  return { status: "waiting", message };
}

function isSameLocalDate(a: string, b = new Date()) {
  const date = new Date(a);
  return date.getFullYear() === b.getFullYear() && date.getMonth() === b.getMonth() && date.getDate() === b.getDate();
}

function serializableState(state: FarmState): Omit<FarmState, "hydrated"> {
  const { hydrated: _hydrated, ...rest } = state;
  return rest;
}

type FarmContextValue = FarmState & {
  pendingSyncCount: number;
  syncAgeDays: number | null;
  hasStaleSyncWarning: boolean;
  todaysMissingTankIds: string[];
  latestWeather?: WeatherRecord;
  activeRiskAlerts: RiskAlert[];
  addTank: (input: Pick<Tank, "name" | "location" | "notes">) => void;
  addInspection: (input: Omit<Inspection, "id" | "createdAt" | "synced">) => void;
  addFeeding: (input: Omit<Feeding, "id" | "createdAt" | "synced">) => void;
  addPhoto: (input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => void;
  addGrowthMeasurement: (input: Omit<GrowthMeasurement, "id" | "createdAt" | "synced">) => void;
  addPhotoAssessment: (input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => void;
  addCostEntry: (input: Omit<FarmCostEntry, "id" | "createdAt" | "synced">) => void;
  addSaleRecord: (input: Omit<FarmSaleRecord, "id" | "createdAt" | "synced" | "totalAmount"> & { totalAmount?: number }) => void;
  setLocation: (input: Omit<FarmLocation, "updatedAt">) => void;
  addWeatherRecord: (input: Omit<WeatherRecord, "id" | "createdAt" | "synced">) => void;
  replaceRiskAlerts: (input: Array<Omit<RiskAlert, "id" | "createdAt" | "acknowledged" | "synced">>) => void;
  acknowledgeRiskAlert: (id: string) => void;
  addFeedProduct: (input: Omit<FeedProduct, "id" | "createdAt" | "synced">) => void;
  updateSettings: (input: Partial<FarmSettings>) => void;
  markSynced: (weeklyReportAt?: string) => void;
  setSyncStatus: (input: SyncLog) => void;
  recordSyncFailure: (input: Omit<SyncFailure, "id" | "createdAt" | "retryStatus" | "guidance"> & { guidance?: string }) => void;
  resolveSyncFailures: (id?: string) => void;
  shouldCreateWeeklyReport: () => boolean;
  generateWeeklyReport: () => WeeklyReportExport;
  generateDrivePayload: () => DriveExport;
};

export type DriveExport = {
  rootFolder: string;
  generatedAt: string;
  settings: FarmSettings;
  location?: FarmLocation;
  weatherRecords: WeatherRecord[];
  riskAlerts: RiskAlert[];
  feedProducts: FeedProduct[];
  costEntries: FarmCostEntry[];
  saleRecords: FarmSaleRecord[];
  monthlyTrend: ReturnType<typeof buildMonthlyTrend>;
  profitabilityRanking: ReturnType<typeof rankTanksByProfitability>;
  healthSnapshots: ReturnType<typeof buildFarmHealthSnapshots>;
  weeklyReport?: WeeklyReportExport;
  tanks: Array<{
    folder: string;
    tank: Tank;
    inspections: Inspection[];
    feedings: Feeding[];
    photos: FishPhoto[];
    growthMeasurements: GrowthMeasurement[];
    photoAssessments: PhotoAssessmentRecord[];
    costEntries: FarmCostEntry[];
    saleRecords: FarmSaleRecord[];
    managementAlert: ReturnType<typeof assessFeedEfficiencyProfitRisk>;
    healthSnapshot: ReturnType<typeof assessTankDiseaseRisk>;
    monthlyTrend: ReturnType<typeof buildMonthlyTrend>;
    improvementChecklist: ReturnType<typeof buildImprovementChecklist>;
    files: string[];
  }>;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!isMounted) return;
        if (!value) {
          dispatch({ type: "hydrate", payload: serializableState(defaultState) });
          return;
        }
        const parsed = JSON.parse(value) as Partial<Omit<FarmState, "hydrated">>;
        dispatch({ type: "hydrate", payload: { ...serializableState(defaultState), ...parsed, settings: { ...defaultState.settings, ...parsed.settings }, sync: { ...defaultState.sync, ...parsed.sync }, syncFailures: parsed.syncFailures ?? [] } });
      })
      .catch(() => dispatch({ type: "hydrate", payload: serializableState(defaultState) }));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState(state))).catch(() => undefined);
  }, [state]);

  const pendingSyncCount = useMemo(
    () =>
      state.inspections.filter((item) => !item.synced).length +
      state.feedings.filter((item) => !item.synced).length +
      state.photos.filter((item) => !item.synced).length +
      state.growthMeasurements.filter((item) => !item.synced).length +
      state.photoAssessments.filter((item) => !item.synced).length +
      state.costEntries.filter((item) => !item.synced).length +
      state.saleRecords.filter((item) => !item.synced).length +
      state.weatherRecords.filter((item) => !item.synced).length +
      state.riskAlerts.filter((item) => !item.synced).length +
      state.feedProducts.filter((item) => !item.synced).length,
    [state.inspections, state.feedings, state.photos, state.growthMeasurements, state.photoAssessments, state.costEntries, state.saleRecords, state.weatherRecords, state.riskAlerts, state.feedProducts],
  );

  const todaysMissingTankIds = useMemo(
    () => state.tanks.filter((tank) => !state.inspections.some((item) => item.tankId === tank.id && isSameLocalDate(item.createdAt))).map((tank) => tank.id),
    [state.tanks, state.inspections],
  );

  const latestWeather = state.weatherRecords[0];
  const activeRiskAlerts = useMemo(() => state.riskAlerts.filter((item) => !item.acknowledged), [state.riskAlerts]);
  const syncAgeDays = useMemo(() => daysSinceSync(state.sync.lastSyncAt), [state.sync.lastSyncAt]);
  const hasStaleSyncWarning = useMemo(
    () => pendingSyncCount > 0 && isSyncStale(state.sync.lastSyncAt, state.settings.staleSyncWarningDays),
    [pendingSyncCount, state.sync.lastSyncAt, state.settings.staleSyncWarningDays],
  );

  const addTank = useCallback((input: Pick<Tank, "name" | "location" | "notes">) => {
    dispatch({ type: "addTank", payload: { id: createId("tank"), createdAt: nowIso(), ...input } });
  }, []);

  const addInspection = useCallback((input: Omit<Inspection, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addInspection", payload: { id: createId("inspection"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addFeeding = useCallback((input: Omit<Feeding, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addFeeding", payload: { id: createId("feeding"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addPhoto = useCallback((input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addPhoto", payload: { id: createId("photo"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addGrowthMeasurement = useCallback((input: Omit<GrowthMeasurement, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addGrowthMeasurement", payload: { id: createId("growth"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addPhotoAssessment = useCallback((input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addPhotoAssessment", payload: { id: createId("assessment"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addCostEntry = useCallback((input: Omit<FarmCostEntry, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addCostEntry", payload: { id: createId("cost"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addSaleRecord = useCallback((input: Omit<FarmSaleRecord, "id" | "createdAt" | "synced" | "totalAmount"> & { totalAmount?: number }) => {
    const totalAmount = input.totalAmount ?? input.quantityKg * input.unitPrice;
    dispatch({ type: "addSaleRecord", payload: { id: createId("sale"), createdAt: nowIso(), synced: false, ...input, totalAmount } });
  }, []);

  const setLocation = useCallback((input: Omit<FarmLocation, "updatedAt">) => {
    dispatch({ type: "setLocation", payload: { updatedAt: nowIso(), ...input } });
  }, []);

  const addWeatherRecord = useCallback((input: Omit<WeatherRecord, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addWeatherRecord", payload: { id: createId("weather"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const replaceRiskAlerts = useCallback((input: Array<Omit<RiskAlert, "id" | "createdAt" | "acknowledged" | "synced">>) => {
    dispatch({
      type: "replaceRiskAlerts",
      payload: input.map((item) => ({ id: createId("risk"), createdAt: nowIso(), acknowledged: false, synced: false, ...item })),
    });
  }, []);

  const acknowledgeRiskAlert = useCallback((id: string) => {
    dispatch({ type: "acknowledgeRiskAlert", payload: { id } });
  }, []);

  const addFeedProduct = useCallback((input: Omit<FeedProduct, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addFeedProduct", payload: { id: createId("feed_product"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const updateSettings = useCallback((input: Partial<FarmSettings>) => {
    dispatch({ type: "updateSettings", payload: input });
  }, []);

  const markSynced = useCallback((weeklyReportAt?: string) => {
    dispatch({ type: "markSynced", payload: { at: nowIso(), weeklyReportAt } });
  }, []);

  const setSyncStatus = useCallback((input: SyncLog) => {
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

  const resolveSyncFailures = useCallback((id?: string) => {
    dispatch({ type: "resolveSyncFailures", payload: { at: nowIso(), id } });
  }, []);

  const shouldCreateWeeklyReport = useCallback(() => {
    if (!state.settings.weeklyPdfReportsEnabled) return false;
    if (!state.sync.lastWeeklyReportAt) return true;
    return daysSinceSync(state.sync.lastWeeklyReportAt) !== null && (daysSinceSync(state.sync.lastWeeklyReportAt) ?? 0) >= 7;
  }, [state.settings.weeklyPdfReportsEnabled, state.sync.lastWeeklyReportAt]);

  const generateWeeklyReport = useCallback((): WeeklyReportExport => {
    return buildWeeklyReport(state);
  }, [state]);

  const generateDrivePayload = useCallback((): DriveExport => {
    return {
      rootFolder: state.settings.driveRootFolder,
      generatedAt: nowIso(),
      settings: state.settings,
      location: state.location,
      weatherRecords: state.weatherRecords,
      riskAlerts: state.riskAlerts,
      feedProducts: state.feedProducts,
      costEntries: state.costEntries,
      saleRecords: state.saleRecords,
      monthlyTrend: buildMonthlyTrend(state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),
      profitabilityRanking: rankTanksByProfitability(state.tanks, state.costEntries, state.saleRecords, state.feedings, state.growthMeasurements),
      healthSnapshots: buildFarmHealthSnapshots({ tanks: state.tanks, inspections: state.inspections, feedings: state.feedings, photoAssessments: state.photoAssessments, growthMeasurements: state.growthMeasurements, weatherRecords: state.weatherRecords }),
      weeklyReport: state.settings.weeklyPdfReportsEnabled ? buildWeeklyReport(state) : undefined,
      tanks: state.tanks.map((tank) => {
        const safeName = tank.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
        const tankFeedings = state.feedings.filter((item) => item.tankId === tank.id);
        const tankGrowthMeasurements = state.growthMeasurements.filter((item) => item.tankId === tank.id);
        const tankCosts = state.costEntries.filter((item) => item.tankId === tank.id);
        const tankSales = state.saleRecords.filter((item) => item.tankId === tank.id);
        const managementAlert = assessFeedEfficiencyProfitRisk({ costs: tankCosts, sales: tankSales, feedings: tankFeedings, growthMeasurements: tankGrowthMeasurements });
        const healthSnapshot = assessTankDiseaseRisk({ tank, inspections: state.inspections, feedings: state.feedings, photoAssessments: state.photoAssessments, growthMeasurements: state.growthMeasurements, weatherRecords: state.weatherRecords });
        return {
          folder: `${state.settings.driveRootFolder}/${safeName}`,
          tank,
          inspections: state.inspections.filter((item) => item.tankId === tank.id),
          feedings: tankFeedings,
          photos: state.photos.filter((item) => item.tankId === tank.id),
          growthMeasurements: tankGrowthMeasurements,
          photoAssessments: state.photoAssessments.filter((item) => item.tankId === tank.id),
          costEntries: tankCosts,
          saleRecords: tankSales,
          managementAlert,
          healthSnapshot,
          monthlyTrend: buildMonthlyTrend(tankCosts, tankSales, tankFeedings, tankGrowthMeasurements),
          improvementChecklist: buildImprovementChecklist(managementAlert.alerts),
          files: ["tank.json", "inspections.json", "feedings.json", "photos/", "growth-measurements.json", "photo-assessments.json", "costs.json", "sales.json", "economics-summary.json", "management-alert.json", "health-snapshot.json", "monthly-trend.json", "improvement-checklist.json", "growth-status.json", "sync-log.json", "feeding-advice.json"],
        };
      }),
    };
  }, [state]);

  const value = useMemo<FarmContextValue>(
    () => ({
      ...state,
      pendingSyncCount,
      syncAgeDays,
      hasStaleSyncWarning,
      todaysMissingTankIds,
      latestWeather,
      activeRiskAlerts,
      addTank,
      addInspection,
      addFeeding,
      addPhoto,
      addGrowthMeasurement,
      addPhotoAssessment,
      addCostEntry,
      addSaleRecord,
      setLocation,
      addWeatherRecord,
      replaceRiskAlerts,
      acknowledgeRiskAlert,
      addFeedProduct,
      updateSettings,
      markSynced,
      setSyncStatus,
      recordSyncFailure,
      resolveSyncFailures,
      shouldCreateWeeklyReport,
      generateWeeklyReport,
      generateDrivePayload,
    }),
    [state, pendingSyncCount, syncAgeDays, hasStaleSyncWarning, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, addGrowthMeasurement, addPhotoAssessment, addCostEntry, addSaleRecord, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, setSyncStatus, recordSyncFailure, resolveSyncFailures, shouldCreateWeeklyReport, generateWeeklyReport, generateDrivePayload],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error("useFarm must be used inside FarmProvider");
  }
  return context;
}

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
  const healthSnapshots = buildFarmHealthSnapshots({ tanks: state.tanks, inspections: state.inspections, feedings: state.feedings, photoAssessments: state.photoAssessments, growthMeasurements: state.growthMeasurements, weatherRecords: state.weatherRecords });
  const diseaseAlerts = healthSnapshots.flatMap((snapshot) => snapshot.alerts);
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
      activeAlertCount: activeAlerts.length + diseaseAlerts.length,
      diseaseAlertCount: diseaseAlerts.length,
    },
    tankSummaries: state.tanks.map((tank) => {
      const tankFeedings = feedings.filter((item) => item.tankId === tank.id);
      const tankPhotos = photos.filter((item) => item.tankId === tank.id);
      const tankCosts = costs.filter((item) => item.tankId === tank.id);
      const tankSales = sales.filter((item) => item.tankId === tank.id);
      const tankHealth = healthSnapshots.find((item) => item.tankId === tank.id);
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
        healthSeverity: tankHealth?.severity ?? "watch",
        diseaseAlerts: tankHealth?.alerts.length ?? 0,
      };
    }),
    alerts: [
      ...diseaseAlerts.map((item) => ({ severity: item.severity, title: item.title, action: item.action })),
      ...activeAlerts.map((item) => ({ severity: item.severity, title: item.title, action: item.action })),
    ].slice(0, 12),
  };
}

export function formatShortDate(value?: string) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function daysSinceSync(lastSyncAt?: string) {
  if (!lastSyncAt) return null;
  const last = Date.parse(lastSyncAt);
  if (!Number.isFinite(last)) return null;
  return Math.max(0, Math.floor((Date.now() - last) / 86_400_000));
}

export function isSyncStale(lastSyncAt: string | undefined, thresholdDays: number) {
  const age = daysSinceSync(lastSyncAt);
  return age === null || age >= Math.max(1, thresholdDays);
}
