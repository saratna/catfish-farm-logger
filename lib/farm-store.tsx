import AsyncStorage from "@react-native-async-storage/async-storage";
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
  category: "heat" | "rain" | "pressure" | "humidity" | "water" | "feed";
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
};

export type SyncLog = {
  lastSyncAt?: string;
  lastExportAt?: string;
  status: "idle" | "waiting" | "synced" | "failed";
  message: string;
};

type FarmState = {
  tanks: Tank[];
  inspections: Inspection[];
  feedings: Feeding[];
  photos: FishPhoto[];
  growthMeasurements: GrowthMeasurement[];
  photoAssessments: PhotoAssessmentRecord[];
  location?: FarmLocation;
  weatherRecords: WeatherRecord[];
  riskAlerts: RiskAlert[];
  feedProducts: FeedProduct[];
  settings: FarmSettings;
  sync: SyncLog;
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
  | { type: "setLocation"; payload: FarmLocation }
  | { type: "addWeatherRecord"; payload: WeatherRecord }
  | { type: "replaceRiskAlerts"; payload: RiskAlert[] }
  | { type: "acknowledgeRiskAlert"; payload: { id: string } }
  | { type: "addFeedProduct"; payload: FeedProduct }
  | { type: "updateSettings"; payload: Partial<FarmSettings> }
  | { type: "markSynced"; payload: { at: string } }
  | { type: "setSyncStatus"; payload: SyncLog };

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
  },
  sync: {
    status: "waiting",
    message: "Local records are saved on this device until Google Drive sync is connected.",
  },
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
        weatherRecords: state.weatherRecords.map((item) => ({ ...item, synced: true })),
        riskAlerts: state.riskAlerts.map((item) => ({ ...item, synced: true })),
        feedProducts: state.feedProducts.map((item) => ({ ...item, synced: true })),
        sync: { status: "synced", lastSyncAt: action.payload.at, message: "All local records are marked as synced." },
      };
    case "setSyncStatus":
      return { ...state, sync: action.payload };
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
  todaysMissingTankIds: string[];
  latestWeather?: WeatherRecord;
  activeRiskAlerts: RiskAlert[];
  addTank: (input: Pick<Tank, "name" | "location" | "notes">) => void;
  addInspection: (input: Omit<Inspection, "id" | "createdAt" | "synced">) => void;
  addFeeding: (input: Omit<Feeding, "id" | "createdAt" | "synced">) => void;
  addPhoto: (input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => void;
  addGrowthMeasurement: (input: Omit<GrowthMeasurement, "id" | "createdAt" | "synced">) => void;
  addPhotoAssessment: (input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => void;
  setLocation: (input: Omit<FarmLocation, "updatedAt">) => void;
  addWeatherRecord: (input: Omit<WeatherRecord, "id" | "createdAt" | "synced">) => void;
  replaceRiskAlerts: (input: Array<Omit<RiskAlert, "id" | "createdAt" | "acknowledged" | "synced">>) => void;
  acknowledgeRiskAlert: (id: string) => void;
  addFeedProduct: (input: Omit<FeedProduct, "id" | "createdAt" | "synced">) => void;
  updateSettings: (input: Partial<FarmSettings>) => void;
  markSynced: () => void;
  generateDrivePayload: () => DriveExport;
};

export type DriveExport = {
  rootFolder: string;
  generatedAt: string;
  location?: FarmLocation;
  weatherRecords: WeatherRecord[];
  riskAlerts: RiskAlert[];
  feedProducts: FeedProduct[];
  tanks: Array<{
    folder: string;
    tank: Tank;
    inspections: Inspection[];
    feedings: Feeding[];
    photos: FishPhoto[];
    growthMeasurements: GrowthMeasurement[];
    photoAssessments: PhotoAssessmentRecord[];
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
        dispatch({ type: "hydrate", payload: { ...serializableState(defaultState), ...parsed, settings: { ...defaultState.settings, ...parsed.settings } } });
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
      state.weatherRecords.filter((item) => !item.synced).length +
      state.riskAlerts.filter((item) => !item.synced).length +
      state.feedProducts.filter((item) => !item.synced).length,
    [state.inspections, state.feedings, state.photos, state.growthMeasurements, state.photoAssessments, state.weatherRecords, state.riskAlerts, state.feedProducts],
  );

  const todaysMissingTankIds = useMemo(
    () => state.tanks.filter((tank) => !state.inspections.some((item) => item.tankId === tank.id && isSameLocalDate(item.createdAt))).map((tank) => tank.id),
    [state.tanks, state.inspections],
  );

  const latestWeather = state.weatherRecords[0];
  const activeRiskAlerts = useMemo(() => state.riskAlerts.filter((item) => !item.acknowledged), [state.riskAlerts]);

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

  const markSynced = useCallback(() => {
    dispatch({ type: "markSynced", payload: { at: nowIso() } });
  }, []);

  const generateDrivePayload = useCallback((): DriveExport => {
    return {
      rootFolder: state.settings.driveRootFolder,
      generatedAt: nowIso(),
      location: state.location,
      weatherRecords: state.weatherRecords,
      riskAlerts: state.riskAlerts,
      feedProducts: state.feedProducts,
      tanks: state.tanks.map((tank) => {
        const safeName = tank.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
        return {
          folder: `${state.settings.driveRootFolder}/${safeName}`,
          tank,
          inspections: state.inspections.filter((item) => item.tankId === tank.id),
          feedings: state.feedings.filter((item) => item.tankId === tank.id),
          photos: state.photos.filter((item) => item.tankId === tank.id),
          growthMeasurements: state.growthMeasurements.filter((item) => item.tankId === tank.id),
          photoAssessments: state.photoAssessments.filter((item) => item.tankId === tank.id),
          files: ["tank.json", "inspections.json", "feedings.json", "photos/", "growth-measurements.json", "photo-assessments.json", "growth-status.json", "sync-log.json", "feeding-advice.json"],
        };
      }),
    };
  }, [state]);

  const value = useMemo<FarmContextValue>(
    () => ({
      ...state,
      pendingSyncCount,
      todaysMissingTankIds,
      latestWeather,
      activeRiskAlerts,
      addTank,
      addInspection,
      addFeeding,
      addPhoto,
      addGrowthMeasurement,
      addPhotoAssessment,
      setLocation,
      addWeatherRecord,
      replaceRiskAlerts,
      acknowledgeRiskAlert,
      addFeedProduct,
      updateSettings,
      markSynced,
      generateDrivePayload,
    }),
    [state, pendingSyncCount, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, addGrowthMeasurement, addPhotoAssessment, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, generateDrivePayload],
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

export function formatShortDate(value?: string) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
