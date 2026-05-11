export const DISTRIBUTION_CHANNEL = process.env.EXPO_PUBLIC_DISTRIBUTION ?? "standard";

export const isFdroidBuild = DISTRIBUTION_CHANNEL === "fdroid";

export const googleDriveSyncEnabled = !isFdroidBuild;

export function getDistributionLabel() {
  return isFdroidBuild ? "F-Droid" : "standard";
}
