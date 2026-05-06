export function createLineDangerAlertKey(tankId: string, title: string, evidence: string[]) {
  return [tankId, title, evidence.slice(0, 3).join("|")]
    .join("::")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

export function isLineDangerAlertWithinCooldown(previousIso: string | undefined, cooldownMinutes: number, nowMs: number) {
  if (!previousIso) return false;
  const previousMs = Date.parse(previousIso);
  if (!Number.isFinite(previousMs)) return false;
  return nowMs - previousMs < Math.max(15, cooldownMinutes) * 60_000;
}
