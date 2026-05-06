import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assessTankDiseaseRisk, buildFarmHealthSnapshots, catfishDiseaseKnowledgeBase } from "../lib/health-monitor";
import type { Feeding, GrowthMeasurement, Inspection, PhotoAssessmentRecord, Tank } from "../lib/farm-store";

const tank: Tank = {
  id: "tank_esc",
  name: "North Pond",
  location: "Farm block A",
  notes: "Recent handling and crowding after grading.",
  createdAt: "2026-04-01T00:00:00.000Z",
};

const referenceDate = new Date("2026-04-20T08:00:00.000Z");
const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

function inspection(input: Partial<Inspection>): Inspection {
  return {
    id: "inspection_1",
    tankId: tank.id,
    createdAt: "2026-04-20T07:30:00.000Z",
    waterTempC: 24,
    ph: 7.5,
    dissolvedOxygen: 3.6,
    ammonia: 0.7,
    nitrite: 0.4,
    salinity: 0,
    notes: "Several fish are lethargic and one swims in tight circles near the edge.",
    synced: false,
    ...input,
  };
}

function feeding(input: Partial<Feeding>): Feeding {
  return {
    id: "feeding_1",
    tankId: tank.id,
    createdAt: "2026-04-20T07:45:00.000Z",
    feedType: "Floating pellet",
    feedAmountKg: 8,
    averageWeightG: 220,
    feedBehavior: "poor",
    residualFeed: "much",
    notes: "Stopped feeding early.",
    synced: false,
    ...input,
  };
}

function assessment(input: Partial<PhotoAssessmentRecord>): PhotoAssessmentRecord {
  return {
    id: "assessment_1",
    tankId: tank.id,
    createdAt: "2026-04-20T07:50:00.000Z",
    uri: "file://photo.jpg",
    confidence: "medium",
    visibleSigns: ["Popeye", "Ulcers or wounds"],
    severity: "danger",
    summary: "Selected visible signs: popeye, ulcers.",
    recommendation: "Check water quality and consult an expert if signs continue.",
    disclaimer: "Not a diagnosis.",
    synced: false,
    ...input,
  };
}

describe("health monitor", () => {
  it("keeps a source-backed disease knowledge base", () => {
    expect(catfishDiseaseKnowledgeBase.length).toBeGreaterThanOrEqual(8);
    expect(catfishDiseaseKnowledgeBase.some((item) => item.id === "esc" && item.sourceUrl.includes("477"))).toBe(true);
    expect(catfishDiseaseKnowledgeBase.some((item) => item.id === "protozoa" && item.sourceUrl.includes("4701"))).toBe(true);
  });

  it("raises danger-level ESC and stress warnings from daily records", () => {
    const snapshot = assessTankDiseaseRisk({
      tank,
      inspections: [inspection({})],
      feedings: [feeding({})],
      photoAssessments: [assessment({})],
      growthMeasurements: [] as GrowthMeasurement[],
      referenceDate,
    });

    expect(snapshot.severity).toBe("danger");
    expect(snapshot.alerts.some((alert) => alert.diseaseIds.includes("esc"))).toBe(true);
    expect(snapshot.alerts[0].evidence.join(" ")).toMatch(/Dissolved oxygen|Ammonia|poor appetite/i);
  });

  it("reports monitoring gaps when recent inspection and appetite data are missing", () => {
    const snapshot = assessTankDiseaseRisk({
      tank: { ...tank, id: "tank_gap", name: "Gap Pond", notes: "" },
      inspections: [],
      feedings: [],
      photoAssessments: [],
      growthMeasurements: [],
      referenceDate,
    });

    expect(snapshot.severity).toBe("watch");
    expect(snapshot.monitoringGaps.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts farm snapshots by highest health severity first", () => {
    const calmTank: Tank = { ...tank, id: "tank_calm", name: "Calm Pond", notes: "" };
    const snapshots = buildFarmHealthSnapshots({
      tanks: [calmTank, tank],
      inspections: [inspection({})],
      feedings: [feeding({})],
      photoAssessments: [assessment({})],
      growthMeasurements: [],
      referenceDate,
    });

    expect(snapshots[0].tankId).toBe(tank.id);
    expect(snapshots[0].severity).toBe("danger");
  });

  it("adds an English Health tab and includes disease snapshots in sync reports", () => {
    const layout = read("app/(tabs)/_layout.tsx");
    const healthScreen = read("app/(tabs)/health.tsx");
    const store = read("lib/farm-store.tsx");
    const drive = read("lib/google-drive.ts");

    expect(layout).toContain('name="health"');
    expect(healthScreen).toContain("Continuous health monitor");
    expect(healthScreen).toContain("Disease knowledge base");
    expect(store).toContain("healthSnapshots");
    expect(store).toContain("diseaseAlertCount");
    expect(drive).toContain("health-snapshot.json");
    expect(drive).toContain("Disease alerts");
  });
});
