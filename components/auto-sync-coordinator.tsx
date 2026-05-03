import { useEffect, useRef } from "react";
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
  const shouldUpload = farm.pendingSyncCount > 0 || farm.shouldCreateWeeklyReport();

  useEffect(() => {
    if (!farm.hydrated) return;
    if (!farm.settings.autoSyncEnabled) return;
    if (!reachable) return;
    if (!shouldUpload) return;
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
        farm.resolveSyncFailures();
        farm.markSynced(result.weeklyReportGeneratedAt);
        farm.setSyncStatus({
          status: "synced",
          lastSyncAt: new Date().toISOString(),
          lastAttemptAt: attemptAt,
          message: `Auto-upload complete: ${result.uploadedFileCount} JSON files, ${result.uploadedPhotoCount} photos, and ${result.uploadedWeeklyReportCount} weekly PDF reports were uploaded.`,
        });
      } catch (error) {
        if (cancelled) return;
        const reason = error instanceof Error ? error.message : "Auto-upload failed. Records remain safely stored on this phone.";
        farm.recordSyncFailure({ attemptAt, itemType: "google_drive", stage: "automatic_upload", reason });
        farm.setSyncStatus({
          ...farm.sync,
          status: "failed",
          lastAttemptAt: attemptAt,
          message: `Auto-upload failed: ${reason}`,
        });
      } finally {
        runningRef.current = false;
      }
    };

    runAutoSync();
    return () => {
      cancelled = true;
    };
  }, [farm, reachable, shouldUpload]);

  return null;
}
