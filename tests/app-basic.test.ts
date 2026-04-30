import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
});
