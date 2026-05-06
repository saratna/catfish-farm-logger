import { useEffect, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { trpc } from "@/lib/trpc";
import { useFarm } from "@/lib/farm-store";
import { buildFarmHealthSnapshots } from "@/lib/health-monitor";
import { createLineDangerAlertKey, isLineDangerAlertWithinCooldown } from "@/lib/line-danger-alert-utils";

const SENT_ALERTS_STORAGE_KEY = "catfish.lineDangerAlerts.sentAtByKey.v1";

type SentAlertMap = Record<string, string>;

async function loadSentAlertMap(): Promise<SentAlertMap> {
  const raw = await AsyncStorage.getItem(SENT_ALERTS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SentAlertMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveSentAlertMap(value: SentAlertMap) {
  const entries = Object.entries(value)
    .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
    .slice(0, 80);
  await AsyncStorage.setItem(SENT_ALERTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

export function LineDangerAlertCoordinator() {
  const farm = useFarm();
  const mutation = trpc.line.sendDangerAlert.useMutation();
  const isSendingRef = useRef(false);

  const snapshots = useMemo(
    () =>
      buildFarmHealthSnapshots({
        tanks: farm.tanks,
        inspections: farm.inspections,
        feedings: farm.feedings,
        photoAssessments: farm.photoAssessments,
        growthMeasurements: farm.growthMeasurements,
        weatherRecords: farm.weatherRecords,
      }),
    [farm.tanks, farm.inspections, farm.feedings, farm.photoAssessments, farm.growthMeasurements, farm.weatherRecords],
  );

  const dangerAlerts = useMemo(
    () =>
      snapshots.flatMap((snapshot) =>
        snapshot.alerts
          .filter((alert) => alert.severity === "danger")
          .map((alert) => ({
            alertKey: createLineDangerAlertKey(snapshot.tankId, alert.title, alert.evidence),
            tankName: snapshot.tankName,
            title: alert.title,
            reason: alert.reason,
            action: alert.action,
            evidence: alert.evidence.slice(0, 8),
            sourceLabels: alert.sourceLabels.slice(0, 8),
            severity: "danger" as const,
            detectedAt: snapshot.latestInspection?.createdAt ?? snapshot.latestFeeding?.createdAt ?? snapshot.latestAssessment?.createdAt ?? new Date().toISOString(),
          })),
      ),
    [snapshots],
  );

  useEffect(() => {
    if (!farm.settings.lineDangerAlertsEnabled || dangerAlerts.length === 0 || isSendingRef.current) return;

    let cancelled = false;
    async function sendNewDangerAlerts() {
      isSendingRef.current = true;
      try {
        const now = new Date();
        const sentMap = await loadSentAlertMap();
        const unsent = dangerAlerts
          .filter((alert) => !isLineDangerAlertWithinCooldown(sentMap[alert.alertKey], farm.settings.lineAlertCooldownMinutes, now.getTime()))
          .slice(0, 8);

        if (cancelled || unsent.length === 0) return;

        const result = await mutation.mutateAsync({
          farmName: farm.settings.driveRootFolder || "Catfish Farm Logger",
          generatedAt: now.toISOString(),
          alerts: unsent,
        });

        if (cancelled) return;
        if (result.sent) {
          const sentAt = now.toISOString();
          for (const alert of unsent) {
            sentMap[alert.alertKey] = sentAt;
          }
          await saveSentAlertMap(sentMap);
        }
      } finally {
        isSendingRef.current = false;
      }
    }

    sendNewDangerAlerts();
    return () => {
      cancelled = true;
    };
  }, [dangerAlerts, farm.settings.driveRootFolder, farm.settings.lineAlertCooldownMinutes, farm.settings.lineDangerAlertsEnabled, mutation]);

  return null;
}
