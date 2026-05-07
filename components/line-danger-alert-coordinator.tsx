import { useEffect, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { trpc } from "@/lib/trpc";
import { useFarm } from "@/lib/farm-store";
import { buildFarmHealthSnapshots } from "@/lib/health-monitor";
import { createDangerAlertKey, isDangerAlertWithinCooldown } from "@/lib/line-danger-alert-utils";

const LINE_SENT_ALERTS_STORAGE_KEY = "catfish.lineDangerAlerts.sentAtByKey.v1";
const NTFY_SENT_ALERTS_STORAGE_KEY = "catfish.ntfyDangerAlerts.sentAtByKey.v1";

type SentAlertMap = Record<string, string>;

async function loadSentAlertMap(storageKey: string): Promise<SentAlertMap> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as SentAlertMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveSentAlertMap(storageKey: string, value: SentAlertMap) {
  const entries = Object.entries(value)
    .sort((a, b) => Date.parse(b[1]) - Date.parse(a[1]))
    .slice(0, 80);
  await AsyncStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
}

export function LineDangerAlertCoordinator() {
  const farm = useFarm();
  const lineMutation = trpc.line.sendDangerAlert.useMutation();
  const ntfyMutation = trpc.ntfy.sendDangerAlert.useMutation();
  const isSendingLineRef = useRef(false);
  const isSendingNtfyRef = useRef(false);

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
            alertKey: createDangerAlertKey(snapshot.tankId, alert.title, alert.evidence),
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
    if (!farm.settings.lineDangerAlertsEnabled || dangerAlerts.length === 0 || isSendingLineRef.current) return;

    let cancelled = false;
    async function sendNewLineDangerAlerts() {
      isSendingLineRef.current = true;
      try {
        const now = new Date();
        const sentMap = await loadSentAlertMap(LINE_SENT_ALERTS_STORAGE_KEY);
        const unsent = dangerAlerts
          .filter((alert) => !isDangerAlertWithinCooldown(sentMap[alert.alertKey], farm.settings.lineAlertCooldownMinutes, now.getTime()))
          .slice(0, 8);

        if (cancelled || unsent.length === 0) return;

        const result = await lineMutation.mutateAsync({
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
          await saveSentAlertMap(LINE_SENT_ALERTS_STORAGE_KEY, sentMap);
        }
      } finally {
        isSendingLineRef.current = false;
      }
    }

    sendNewLineDangerAlerts();
    return () => {
      cancelled = true;
    };
  }, [dangerAlerts, farm.settings.driveRootFolder, farm.settings.lineAlertCooldownMinutes, farm.settings.lineDangerAlertsEnabled, lineMutation]);

  useEffect(() => {
    if (!farm.settings.ntfyDangerAlertsEnabled || dangerAlerts.length === 0 || isSendingNtfyRef.current) return;

    let cancelled = false;
    async function sendNewNtfyDangerAlerts() {
      isSendingNtfyRef.current = true;
      try {
        const now = new Date();
        const sentMap = await loadSentAlertMap(NTFY_SENT_ALERTS_STORAGE_KEY);
        const unsent = dangerAlerts
          .filter((alert) => !isDangerAlertWithinCooldown(sentMap[alert.alertKey], farm.settings.lineAlertCooldownMinutes, now.getTime()))
          .slice(0, 8);

        if (cancelled || unsent.length === 0) return;

        const result = await ntfyMutation.mutateAsync({
          farmName: farm.settings.driveRootFolder || "Catfish Farm Logger",
          generatedAt: now.toISOString(),
          alerts: unsent,
          serverUrl: farm.settings.ntfyServerUrl || "https://ntfy.sh",
          topic: farm.settings.ntfyTopic,
          token: farm.settings.ntfyToken || undefined,
        });

        if (cancelled) return;
        if (result.sent) {
          const sentAt = now.toISOString();
          for (const alert of unsent) {
            sentMap[alert.alertKey] = sentAt;
          }
          await saveSentAlertMap(NTFY_SENT_ALERTS_STORAGE_KEY, sentMap);
        }
      } finally {
        isSendingNtfyRef.current = false;
      }
    }

    sendNewNtfyDangerAlerts();
    return () => {
      cancelled = true;
    };
  }, [dangerAlerts, farm.settings.driveRootFolder, farm.settings.lineAlertCooldownMinutes, farm.settings.ntfyDangerAlertsEnabled, farm.settings.ntfyServerUrl, farm.settings.ntfyToken, farm.settings.ntfyTopic, ntfyMutation]);

  return null;
}
