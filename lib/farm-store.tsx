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

export type FarmSettings = {
  reminderHour: number;
  reminderMinute: number;
  feedTypes: string[];
  driveRootFolder: string;
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
  | { type: "updateSettings"; payload: Partial<FarmSettings> }
  | { type: "markSynced"; payload: { at: string } }
  | { type: "setSyncStatus"; payload: SyncLog };

const STORAGE_KEY = "catfish-farm-logger-state-v1";

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
  settings: {
    reminderHour: 8,
    reminderMinute: 0,
    feedTypes: ["Floating pellet", "Sinking pellet", "Mixed feed"],
    driveRootFolder: "CatfishFarmLogger",
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
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "markSynced":
      return {
        ...state,
        inspections: state.inspections.map((item) => ({ ...item, synced: true })),
        feedings: state.feedings.map((item) => ({ ...item, synced: true })),
        photos: state.photos.map((item) => ({ ...item, synced: true })),
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
  addTank: (input: Pick<Tank, "name" | "location" | "notes">) => void;
  addInspection: (input: Omit<Inspection, "id" | "createdAt" | "synced">) => void;
  addFeeding: (input: Omit<Feeding, "id" | "createdAt" | "synced">) => void;
  addPhoto: (input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => void;
  updateSettings: (input: Partial<FarmSettings>) => void;
  markSynced: () => void;
  generateDrivePayload: () => DriveExport;
};

export type DriveExport = {
  rootFolder: string;
  generatedAt: string;
  tanks: Array<{
    folder: string;
    tank: Tank;
    inspections: Inspection[];
    feedings: Feeding[];
    photos: FishPhoto[];
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
        const parsed = JSON.parse(value) as Omit<FarmState, "hydrated">;
        dispatch({ type: "hydrate", payload: { ...serializableState(defaultState), ...parsed } });
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
    () => state.inspections.filter((item) => !item.synced).length + state.feedings.filter((item) => !item.synced).length + state.photos.filter((item) => !item.synced).length,
    [state.inspections, state.feedings, state.photos],
  );

  const todaysMissingTankIds = useMemo(
    () => state.tanks.filter((tank) => !state.inspections.some((item) => item.tankId === tank.id && isSameLocalDate(item.createdAt))).map((tank) => tank.id),
    [state.tanks, state.inspections],
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
      tanks: state.tanks.map((tank) => {
        const safeName = tank.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
        return {
          folder: `${state.settings.driveRootFolder}/${safeName}`,
          tank,
          inspections: state.inspections.filter((item) => item.tankId === tank.id),
          feedings: state.feedings.filter((item) => item.tankId === tank.id),
          photos: state.photos.filter((item) => item.tankId === tank.id),
          files: ["tank.json", "inspections.json", "feedings.json", "photos/", "sync-log.json"],
        };
      }),
    };
  }, [state]);

  const value = useMemo<FarmContextValue>(
    () => ({
      ...state,
      pendingSyncCount,
      todaysMissingTankIds,
      addTank,
      addInspection,
      addFeeding,
      addPhoto,
      updateSettings,
      markSynced,
      generateDrivePayload,
    }),
    [state, pendingSyncCount, todaysMissingTankIds, addTank, addInspection, addFeeding, addPhoto, updateSettings, markSynced, generateDrivePayload],
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
