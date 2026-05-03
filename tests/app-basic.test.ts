import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assessCatfishWeatherRisk, assessGrowthTrend, buildFeedingAdvice, buildPhotoScreeningFromInputs } from "../lib/catfish-advisor";
import { assessFeedEfficiencyProfitRisk, buildImprovementChecklist, buildMonthlyTrend, rankTanksByProfitability } from "../lib/economics";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("Catfish Farm Logger implementation", () => {
  it("uses the branded app name and generated logo URL", () => {
    const config = read("app.config.ts");
    expect(config).toContain('appName: "Catfish Farm Logger"');
    expect(config).toContain("catfish_farm_logger_icon");
    expect(config).toContain('backgroundColor: "#D9F4EC"');
  });

  it("includes the offline farm store with Drive export support", () => {
    const store = read("lib/farm-store.tsx");
    expect(store).toContain("AsyncStorage");
    expect(store).toContain("generateDrivePayload");
    expect(store).toContain("todaysMissingTankIds");
    expect(store).toContain("pendingSyncCount");
    expect(store).toContain("growthMeasurements");
    expect(store).toContain("photoAssessments");
  });

  it("contains record inputs for inspection, feeding, weight, growth, and photos", () => {
    const records = read("app/(tabs)/records.tsx");
    expect(records).toContain("Daily inspection");
    expect(records).toContain("Water °C");
    expect(records).toContain("Avg weight g");
    expect(records).toContain("Add photo");
    expect(records).toContain("Growth and photo check");
    expect(records).toContain("AI photo check");
  });

  it("includes EAS configuration for iOS production builds", () => {
    const eas = JSON.parse(read("eas.json"));
    const packageJson = JSON.parse(read("package.json"));
    expect(eas.cli.appVersionSource).toBe("local");
    expect(eas.build.production.env.EAS_BUILD_NO_EXPO_GO_WARNING).toBe("true");
    expect(eas.build.production.ios.simulator).toBe(false);
    expect(packageJson.scripts["build:ios"]).toContain("eas build --platform ios");
  });

  it("includes Android-first Google Play build and OAuth configuration", () => {
    const config = read("app.config.ts");
    const packageJson = JSON.parse(read("package.json"));
    expect(config).toContain("googleAndroidReversedClientId");
    expect(config).toContain("VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID");
    expect(config).toContain("versionCode: 1");
    expect(packageJson.scripts["build:android"]).toContain("eas build --platform android");
    expect(packageJson.scripts["submit:android"]).toContain("eas submit --platform android");
  });

  it("includes GPS weather monitoring and catfish risk UI", () => {
    const weather = read("app/(tabs)/weather.tsx");
    const store = read("lib/farm-store.tsx");
    const packageJson = JSON.parse(read("package.json"));
    expect(packageJson.dependencies["expo-location"]).toBeTruthy();
    expect(weather).toContain("Location.requestForegroundPermissionsAsync");
    expect(weather).toContain("api.open-meteo.com");
    expect(weather).toContain("scheduleNotificationAsync");
    expect(store).toContain("weatherRecords");
    expect(store).toContain("activeRiskAlerts");
  });

  it("flags high-risk weather and water conditions for catfish", () => {
    const risks = assessCatfishWeatherRisk(
      { airTempC: 35, rainMm24h: 55, humidityPercent: 92, pressureTrendHpa: -6 },
      { waterTempC: 34.2, dissolvedOxygen: 3.5, ammonia: 0.7 },
    );
    expect(risks.some((risk) => risk.severity === "danger" && risk.category === "heat")).toBe(true);
    expect(risks.some((risk) => risk.severity === "danger" && risk.category === "water")).toBe(true);
    expect(risks.some((risk) => risk.category === "rain")).toBe(true);
  });

  it("reduces feeding recommendations when weather and appetite are unfavorable", () => {
    const advice = buildFeedingAdvice({
      averageWeightG: 250,
      fishCount: 1000,
      feedAmountKg: 7,
      productName: "Sample Pellet",
      proteinPercent: 24,
      pelletSizeMm: 5,
      residualFeed: "much",
      appetite: "poor",
      weather: { airTempC: 35, rainMm24h: 30 },
      inspection: { waterTempC: 31, dissolvedOxygen: 3.8 },
    });
    expect(advice.recommendedFeedKg).toBeLessThan(7);
    expect(advice.productAdvice).toContain("low");
    expect(advice.cautions.length).toBeGreaterThan(1);
  });

  it("assesses growth trend and visible photo health signs", () => {
    const trend = assessGrowthTrend([
      { createdAt: "2026-05-01T00:00:00.000Z", lengthCm: 20, weightG: 100 },
      { createdAt: "2026-05-06T00:00:00.000Z", lengthCm: 22.5, weightG: 120 },
    ]);
    expect(trend.status).toBe("good");
    expect(trend.dailyWeightGainPercent).toBeGreaterThan(0);

    const screening = buildPhotoScreeningFromInputs({ ulcers: true, finDamage: true });
    expect(screening.severity).toBe("danger");
    expect(screening.visibleSigns).toContain("Ulcers or wounds");
    expect(screening.disclaimer).toContain("not a definitive diagnosis");
  });
  it("calculates economics summary from costs and sales", async () => {
    const { calculateEconomicsSummary } = await import("../lib/economics");
    const summary = calculateEconomicsSummary(
      [
        { id: "c1", createdAt: "2026-01-01", category: "feed", label: "Feed", amount: 12000, notes: "", synced: false },
        { id: "c2", createdAt: "2026-01-02", category: "electricity", label: "Power", amount: 3000, notes: "", synced: false },
      ],
      [{ id: "s1", createdAt: "2026-01-03", buyer: "Market", productGrade: "Live", quantityKg: 20, unitPrice: 900, totalAmount: 18000, notes: "", synced: false }],
    );

    expect(summary.totalCost).toBe(15000);
    expect(summary.totalSales).toBe(18000);
    expect(summary.grossProfit).toBe(3000);
    expect(summary.costPerKgSold).toBe(750);
    expect(summary.topCostCategory).toBe("feed");
  });

  it("keeps research knowledge cards tied to source URLs", async () => {
    const { catfishKnowledgeCards } = await import("../lib/catfish-knowledge");
    expect(catfishKnowledgeCards.length).toBeGreaterThanOrEqual(5);
    expect(catfishKnowledgeCards.every((card: { sourceUrl: string }) => card.sourceUrl.startsWith("https://"))).toBe(true);
  });

  it("flags combined FCR and margin risk", () => {
    const alert = assessFeedEfficiencyProfitRisk({
      costs: [{ id: "c1", category: "feed", label: "feed", amount: 9000, createdAt: "2026-01-01T00:00:00.000Z", tankId: "t1", notes: "", synced: false }],
      sales: [{ id: "s1", buyer: "buyer", productGrade: "regular", quantityKg: 20, unitPrice: 400, totalAmount: 8000, createdAt: "2026-01-20T00:00:00.000Z", tankId: "t1", notes: "", synced: false }],
      feedings: [{ id: "f1", tankId: "t1", createdAt: "2026-01-10T00:00:00.000Z", feedType: "pellet", feedAmountKg: 30, averageWeightG: 100, fishCount: 100, notes: "", synced: false }],
      growthMeasurements: [
        { id: "g1", tankId: "t1", createdAt: "2026-01-01T00:00:00.000Z", lengthCm: 12, weightG: 100, source: "manual", notes: "", synced: false },
        { id: "g2", tankId: "t1", createdAt: "2026-01-20T00:00:00.000Z", lengthCm: 18, weightG: 200, source: "manual", notes: "", synced: false },
      ],
    });

    expect(alert.severity).toBe("danger");
    expect(alert.fcr).toBe(3);
    expect(alert.marginPercent).toBeLessThan(0);
    expect(alert.alerts.some((item) => item.id === "combined_feed_profit_danger")).toBe(true);
  });


  it("builds monthly FCR and margin trends from dated records", () => {
    const trend = buildMonthlyTrend(
      [
        { id: "c1", tankId: "t1", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 1000, notes: "", synced: false },
        { id: "c2", tankId: "t1", createdAt: "2026-02-05T00:00:00.000Z", category: "feed", label: "feed", amount: 800, notes: "", synced: false },
      ],
      [
        { id: "s1", tankId: "t1", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 300, totalAmount: 1500, notes: "", synced: false },
      ],
      [
        { id: "f1", tankId: "t1", createdAt: "2026-01-10T00:00:00.000Z", feedType: "pellet", feedAmountKg: 20, averageWeightG: 100, fishCount: 100, notes: "", synced: false },
      ],
      [
        { id: "g1", tankId: "t1", createdAt: "2026-01-01T00:00:00.000Z", lengthCm: 10, weightG: 100, source: "manual", notes: "", synced: false },
        { id: "g2", tankId: "t1", createdAt: "2026-01-31T00:00:00.000Z", lengthCm: 14, weightG: 200, source: "manual", notes: "", synced: false },
      ],
    );

    expect(trend.map((item) => item.month)).toEqual(["2026-01", "2026-02"]);
    expect(trend[0].marginPercent).toBeCloseTo(33.3, 1);
    expect(trend[0].fcr).toBe(2);
    expect(trend[1].marginPercent).toBeNull();
  });

  it("ranks tanks by profitability and creates improvement actions", () => {
    const tanks = [
      { id: "t1", name: "Tank A", location: "", notes: "", createdAt: "2026-01-01" },
      { id: "t2", name: "Tank B", location: "", notes: "", createdAt: "2026-01-01" },
    ];
    const ranking = rankTanksByProfitability(
      tanks,
      [
        { id: "c1", tankId: "t1", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 1000, notes: "", synced: false },
        { id: "c2", tankId: "t2", createdAt: "2026-01-05T00:00:00.000Z", category: "feed", label: "feed", amount: 3000, notes: "", synced: false },
      ],
      [
        { id: "s1", tankId: "t1", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 400, totalAmount: 2000, notes: "", synced: false },
        { id: "s2", tankId: "t2", createdAt: "2026-01-28T00:00:00.000Z", buyer: "buyer", productGrade: "regular", quantityKg: 5, unitPrice: 400, totalAmount: 2000, notes: "", synced: false },
      ],
      [],
      [],
    );

    expect(ranking[0].tankId).toBe("t1");
    expect(ranking[0].marginPercent).toBe(50);
    expect(ranking[1].grossProfit).toBe(-1000);

    const checklist = buildImprovementChecklist([{ id: "margin_danger", severity: "danger", title: "Negative margin", reason: "", action: "Check price and costs" }]);
    expect(checklist.some((item) => item.title.includes("Break costs"))).toBe(true);
    expect(checklist.every((item) => item.priority === "danger")).toBe(true);
  });

  it("supports Philippines offline-first auto-upload and stale-sync warnings", () => {
    const store = read("lib/farm-store.tsx");
    const syncScreen = read("app/(tabs)/sync.tsx");
    const autoSync = read("components/auto-sync-coordinator.tsx");
    expect(store).toContain("autoSyncEnabled: true");
    expect(store).toContain("staleSyncWarningDays: 7");
    expect(store).toContain("isSyncStale");
    expect(syncScreen).toContain("Built for field use in the Philippines");
    expect(syncScreen).toContain("records stay on this phone first");
    expect(autoSync).toContain("Network.useNetworkState");
    expect(autoSync).toContain("uploadFarmExportToGoogleDrive");
  });

  it("keeps generated user-facing advisory text in English", () => {
    const risks = assessCatfishWeatherRisk({ airTempC: 35, rainMm24h: 55 }, { dissolvedOxygen: 3.5 });
    expect(risks[0].title).toMatch(/High|Water|Heat|Rain|Low|Routine/);
    const alert = assessFeedEfficiencyProfitRisk({ costs: [], sales: [], feedings: [], growthMeasurements: [] });
    expect(alert.title).toMatch(/Business|Profitability/);
    expect(alert.limitation).toContain("FCR is a simplified estimate");
  });

});
