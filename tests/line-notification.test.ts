import { describe, expect, it } from "vitest";

import { createDangerLineMessage, parseLineRecipients } from "../server/line-notifier";
import { createDangerNtfyMessage, maskNtfyToken, sendNtfyDangerAlerts } from "../server/ntfy-notifier";
import { verifyLineSignature } from "../server/line-webhook";
import { createLineDangerAlertKey, isLineDangerAlertWithinCooldown } from "../lib/line-danger-alert-utils";

describe("LINE notification utilities", () => {
  it("parses unique LINE recipient IDs from comma, space, and newline separated settings", () => {
    expect(parseLineRecipients("U111, C222\nU111;R333  C222")).toEqual(["U111", "C222", "R333"]);
  });

  it("creates an operator-friendly danger alert message for LINE", () => {
    const message = createDangerLineMessage({
      farmName: "Tank House A",
      generatedAt: "2026-05-06T12:00:00.000Z",
      alerts: [
        {
          alertKey: "tank-1-esc",
          tankName: "Tank 1",
          title: "Danger-level disease warning signs",
          reason: "Mortality and feed refusal were recorded together.",
          action: "Recheck dissolved oxygen, isolate affected fish if possible, and consult a fish-health professional.",
          evidence: ["Mortality count increased", "Feed response dropped"],
          sourceLabels: ["SRAC", "MSU Extension"],
          severity: "danger",
          detectedAt: "2026-05-06T12:00:00.000Z",
        },
      ],
    });

    expect(message).toContain("Catfish health danger alert");
    expect(message).toContain("Tank House A");
    expect(message).toContain("Tank 1");
    expect(message).toContain("not a veterinary diagnosis");
  });

  it("suppresses duplicate danger alerts during the configured cooldown window", () => {
    const now = Date.parse("2026-05-06T12:00:00.000Z");
    const alertKey = createLineDangerAlertKey("tank-1", "Danger signs", ["Feed refusal", "Mortality", "Red lesions", "Extra detail"]);

    expect(alertKey).toContain("tank-1::Danger signs::Feed refusal|Mortality|Red lesions");
    expect(isLineDangerAlertWithinCooldown("2026-05-06T11:45:01.000Z", 30, now)).toBe(true);
    expect(isLineDangerAlertWithinCooldown("2026-05-06T11:20:00.000Z", 30, now)).toBe(false);
    expect(isLineDangerAlertWithinCooldown(undefined, 30, now)).toBe(false);
  });

  it("verifies LINE webhook signatures when a channel secret is configured", () => {
    const body = Buffer.from(JSON.stringify({ events: [] }));
    const secret = "test-secret";
    const crypto = require("crypto") as typeof import("crypto");
    const signature = crypto.createHmac("sha256", secret).update(body).digest("base64");

    expect(verifyLineSignature(body, signature, secret)).toBe(true);
    expect(verifyLineSignature(body, "invalid", secret)).toBe(false);
  });
});

describe("ntfy notification utilities", () => {
  const sampleInput = {
    farmName: "Tank House A",
    generatedAt: "2026-05-06T12:00:00.000Z",
    alerts: [
      {
        alertKey: "tank-1-esc",
        tankName: "Tank 1",
        title: "Danger-level disease warning signs",
        reason: "Mortality and feed refusal were recorded together.",
        action: "Recheck dissolved oxygen, isolate affected fish if possible, and consult a fish-health professional.",
        evidence: ["Mortality count increased", "Feed response dropped"],
        sourceLabels: ["SRAC", "MSU Extension"],
        severity: "danger" as const,
        detectedAt: "2026-05-06T12:00:00.000Z",
      },
    ],
    serverUrl: "https://ntfy.sh",
    topic: "catfish-danger-test",
    token: "tk_example_private_token",
  };

  it("creates an operator-friendly danger alert message for ntfy", () => {
    const message = createDangerNtfyMessage(sampleInput);

    expect(message).toContain("Catfish health danger alert");
    expect(message).toContain("Tank House A");
    expect(message).toContain("Tank 1");
    expect(message).toContain("not a veterinary diagnosis");
  });

  it("sends ntfy danger alerts with urgent priority, tags, and optional bearer token", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await sendNtfyDangerAlerts(sampleInput, {
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return { ok: true } as Response;
      },
    });

    expect(result.sent).toBe(true);
    expect(calls[0]?.url).toBe("https://ntfy.sh/catfish-danger-test");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer tk_example_private_token", Priority: "5", Tags: "warning,fish,health" });
    expect(String(calls[0]?.init.body)).toContain("Mortality count increased");
  });

  it("reports ntfy as unconfigured when no topic is supplied and masks configured tokens", async () => {
    const result = await sendNtfyDangerAlerts({ ...sampleInput, topic: "" }, { fetcher: async () => ({ ok: true }) as Response });

    expect(result.sent).toBe(false);
    expect(result.configured).toBe(false);
    expect(maskNtfyToken("abcdef123456")).toBe("abcd…3456");
    expect(maskNtfyToken("")).toBe("not configured");
  });
});
