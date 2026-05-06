import { useMemo } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useFarm } from "@/lib/farm-store";
import { buildFarmHealthSnapshots, catfishDiseaseKnowledgeBase, summarizeFarmHealth, type DiseaseRiskAssessment, type TankHealthSnapshot } from "@/lib/health-monitor";

const severityTone = {
  normal: { label: "Routine", chip: "bg-success/15", text: "text-success", border: "border-success/30" },
  watch: { label: "Watch", chip: "bg-warning/15", text: "text-warning", border: "border-warning/30" },
  danger: { label: "Action", chip: "bg-error/15", text: "text-error", border: "border-error/30" },
} as const;

const dailyChecks = [
  "Water temperature, dissolved oxygen, pH, ammonia, and nitrite",
  "Appetite: poor, normal, or strong; leftover feed after feeding",
  "Swimming: spinning, flashing, piping, edge gathering, or lethargy",
  "Appearance: ulcers, redness, white spots, white tufts, swollen belly, popeye, fin damage",
  "Mortality count, recent handling, stocking changes, rain, or transport stress",
];

export default function HealthScreen() {
  const farm = useFarm();
  const snapshots = useMemo(
    () => buildFarmHealthSnapshots({
      tanks: farm.tanks,
      inspections: farm.inspections,
      feedings: farm.feedings,
      photoAssessments: farm.photoAssessments,
      growthMeasurements: farm.growthMeasurements,
      weatherRecords: farm.weatherRecords,
    }),
    [farm.tanks, farm.inspections, farm.feedings, farm.photoAssessments, farm.growthMeasurements, farm.weatherRecords],
  );
  const summary = useMemo(() => summarizeFarmHealth(snapshots), [snapshots]);
  const activeAlerts = snapshots.flatMap((snapshot) => snapshot.alerts).slice(0, 12);
  const topKnowledge = catfishDiseaseKnowledgeBase.slice(0, 9);
  const tone = severityTone[summary.severity];

  return (
    <ScreenContainer className="px-5 pt-3">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-5">
          <View className={`rounded-[28px] border ${tone.border} bg-surface p-5 shadow-sm`}>
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-muted">Continuous health monitor</Text>
                <Text className="mt-1 text-3xl font-bold leading-10 text-foreground">{summary.title}</Text>
              </View>
              <View className={`rounded-full px-3 py-2 ${tone.chip}`}>
                <Text className={`text-sm font-bold ${tone.text}`}>{tone.label}</Text>
              </View>
            </View>
            <Text className="text-base leading-6 text-muted">{summary.summary}</Text>
            <Text className="mt-3 text-sm leading-5 text-muted">This screen is a surveillance aid. It does not diagnose disease; it links daily observations with published catfish disease warning patterns and tells you what to verify next.</Text>
          </View>

          <SectionTitle title="Active disease warning cards" subtitle="Generated from recent inspections, feed behavior, photo screening, notes, and growth records." />
          {activeAlerts.length === 0 ? (
            <View className="rounded-3xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-foreground">No specific disease pattern is active</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">Keep recording water quality, appetite, and appearance every day. The monitor becomes stronger as records accumulate.</Text>
            </View>
          ) : (
            activeAlerts.map((alert) => <DiseaseAlertCard key={`${alert.tankId}-${alert.title}`} alert={alert} />)
          )}

          <SectionTitle title="Tank health snapshots" subtitle="Each tank is scored separately so one problem tank does not hide inside a farm-wide average." />
          {snapshots.map((snapshot) => <TankSnapshotCard key={snapshot.tankId} snapshot={snapshot} />)}

          <SectionTitle title="Daily precursor checklist" subtitle="Record these items in Records → Inspection, Feeding, Photo screening, and Notes." />
          <View className="rounded-3xl border border-border bg-surface p-5">
            {dailyChecks.map((item, index) => (
              <View key={item} className="mb-3 flex-row gap-3 last:mb-0">
                <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-sm font-bold text-primary">{index + 1}</Text>
                </View>
                <Text className="flex-1 text-sm leading-6 text-foreground">{item}</Text>
              </View>
            ))}
          </View>

          <SectionTitle title="Disease knowledge base" subtitle="Source-backed patterns currently watched by the app." />
          {topKnowledge.map((card) => (
            <View key={card.id} className="rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold leading-6 text-foreground">{card.name}</Text>
                  <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-muted">{card.group} · {card.commonNames.join(" / ")}</Text>
                </View>
                <View className="rounded-full bg-background px-3 py-1">
                  <Text className="text-xs font-bold text-primary">Source</Text>
                </View>
              </View>
              <InfoRow label="Early signs" value={card.earlySigns.join(", ")} />
              <InfoRow label="Risk triggers" value={card.riskTriggers.join(", ")} />
              <InfoRow label="First response" value={card.immediateResponse} />
              <TouchableOpacity activeOpacity={0.75} onPress={() => Linking.openURL(card.sourceUrl)} className="mt-4 rounded-2xl bg-primary px-4 py-3">
                <Text className="text-center text-sm font-bold text-background">Open {card.sourceLabel}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-1 pt-2">
      <Text className="text-2xl font-bold text-foreground">{title}</Text>
      <Text className="text-sm leading-5 text-muted">{subtitle}</Text>
    </View>
  );
}

function DiseaseAlertCard({ alert }: { alert: DiseaseRiskAssessment }) {
  const tone = severityTone[alert.severity];
  return (
    <View className={`rounded-3xl border ${tone.border} bg-surface p-5`}>
      <View className="mb-2 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-lg font-bold leading-6 text-foreground">{alert.title}</Text>
        <View className={`rounded-full px-3 py-1 ${tone.chip}`}>
          <Text className={`text-xs font-bold uppercase ${tone.text}`}>{alert.severity}</Text>
        </View>
      </View>
      <Text className="text-sm leading-5 text-muted">{alert.reason}</Text>
      <InfoRow label="Action" value={alert.action} />
      <InfoRow label="Evidence" value={alert.evidence.length ? alert.evidence.join(" ") : "No detailed evidence was stored."} />
      <InfoRow label="Sources" value={alert.sourceLabels.join(", ")} />
    </View>
  );
}

function TankSnapshotCard({ snapshot }: { snapshot: TankHealthSnapshot }) {
  const tone = severityTone[snapshot.severity];
  return (
    <View className={`rounded-3xl border ${tone.border} bg-surface p-5`}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">{snapshot.tankName}</Text>
          <Text className="mt-1 text-sm text-muted">Risk score {snapshot.score} · {snapshot.alerts.length} disease card(s)</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${tone.chip}`}>
          <Text className={`text-xs font-bold uppercase ${tone.text}`}>{snapshot.severity}</Text>
        </View>
      </View>
      <View className="mt-4 gap-2">
        <Text className="text-sm text-muted">Latest inspection: {snapshot.latestInspection ? `${snapshot.latestInspection.waterTempC} °C water` : "missing"}</Text>
        <Text className="text-sm text-muted">Latest feeding: {snapshot.latestFeeding ? `${snapshot.latestFeeding.feedBehavior ?? "unknown"} appetite, ${snapshot.latestFeeding.residualFeed ?? "unknown"} leftovers` : "missing"}</Text>
        <Text className="text-sm text-muted">Latest photo screening: {snapshot.latestAssessment ? snapshot.latestAssessment.severity : "not recorded"}</Text>
      </View>
      {snapshot.monitoringGaps.length > 0 ? (
        <View className="mt-4 rounded-2xl bg-background p-4">
          <Text className="mb-2 text-sm font-bold text-foreground">Monitoring gaps</Text>
          {snapshot.monitoringGaps.map((gap) => <Text key={gap} className="text-sm leading-5 text-muted">• {gap}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-4">
      <Text className="text-xs font-bold uppercase tracking-[1px] text-muted">{label}</Text>
      <Text className="mt-1 text-sm leading-5 text-foreground">{value}</Text>
    </View>
  );
}
