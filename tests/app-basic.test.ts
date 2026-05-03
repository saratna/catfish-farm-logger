import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assessCatfishWeatherRisk, buildFeedingAdvice } from "../lib/catfish-advisor";

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
  });

  it("contains record inputs for inspection, feeding, weight, and photos", () => {
    const records = read("app/(tabs)/records.tsx");
    expect(records).toContain("Daily inspection");
    expect(records).toContain("Water °C");
    expect(records).toContain("Avg weight g");
    expect(records).toContain("Add photo");
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
    expect(advice.productAdvice).toContain("低め");
    expect(advice.cautions.length).toBeGreaterThan(1);
  });
});
