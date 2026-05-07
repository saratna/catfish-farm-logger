export type NtfyDangerAlertInput = {
  alertKey: string;
  tankName: string;
  title: string;
  reason: string;
  action: string;
  evidence: string[];
  sourceLabels: string[];
  severity: "danger";
  detectedAt: string;
};

export type SendNtfyDangerAlertsInput = {
  farmName?: string;
  generatedAt: string;
  alerts: NtfyDangerAlertInput[];
  serverUrl?: string;
  topic?: string;
  token?: string;
};

export type NtfySendResult = {
  sent: boolean;
  configured: boolean;
  serverUrl: string;
  topicConfigured: boolean;
  deliveredCount: number;
  failedCount: number;
  message: string;
};

type FetchLike = typeof fetch;

const DEFAULT_NTFY_SERVER_URL = "https://ntfy.sh";
const MAX_NTFY_BODY_LENGTH = 3900;

export function normalizeNtfyServerUrl(value?: string) {
  const trimmed = (value ?? process.env.NTFY_SERVER_URL ?? DEFAULT_NTFY_SERVER_URL).trim();
  const fallback = trimmed || DEFAULT_NTFY_SERVER_URL;
  return fallback.replace(/\/+$/g, "");
}

export function normalizeNtfyTopic(value?: string) {
  return (value ?? process.env.NTFY_TOPIC ?? "").trim().replace(/^\/+|\/+$/g, "");
}

export function maskNtfyToken(value?: string) {
  const token = (value ?? process.env.NTFY_TOKEN ?? "").trim();
  if (!token) return "not configured";
  if (token.length <= 8) return "configured";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

export function createDangerNtfyTitle(input: SendNtfyDangerAlertsInput) {
  const farmName = input.farmName?.trim() || "Catfish Farm Logger";
  const firstTank = input.alerts[0]?.tankName ?? "farm";
  const extraCount = Math.max(0, input.alerts.length - 1);
  return extraCount > 0 ? `${farmName}: danger alert for ${firstTank} +${extraCount}` : `${farmName}: danger alert for ${firstTank}`;
}

export function createDangerNtfyMessage(input: SendNtfyDangerAlertsInput) {
  const farmName = input.farmName?.trim() || "Catfish Farm Logger";
  const header = `Catfish health danger alert\nFarm: ${farmName}\nDetected: ${input.generatedAt}`;
  const body = input.alerts
    .slice(0, 5)
    .map((alert, index) => {
      const evidence = alert.evidence.slice(0, 4).map((item) => `- ${item}`).join("\n");
      const sources = alert.sourceLabels.length ? `\nSources: ${alert.sourceLabels.join(", ")}` : "";
      return [
        `${index + 1}. ${alert.tankName}`,
        `Alert: ${alert.title}`,
        `Reason: ${alert.reason}`,
        evidence ? `Evidence:\n${evidence}` : undefined,
        `Next action: ${alert.action}`,
        sources,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  const footer = "This is an early-warning notice, not a veterinary diagnosis. Recheck water quality and consult a fish-health professional when signs repeat, spread, or mortality appears.";
  const message = `${header}\n\n${body}\n\n${footer}`;
  return message.length > MAX_NTFY_BODY_LENGTH ? `${message.slice(0, MAX_NTFY_BODY_LENGTH - 90)}\n\nMessage truncated. Open the app Health tab for full details.` : message;
}

export async function sendNtfyDangerAlerts(input: SendNtfyDangerAlertsInput, options?: { serverUrl?: string; topic?: string; token?: string; fetcher?: FetchLike }): Promise<NtfySendResult> {
  const serverUrl = normalizeNtfyServerUrl(options?.serverUrl ?? input.serverUrl);
  const topic = normalizeNtfyTopic(options?.topic ?? input.topic);
  const token = (options?.token ?? input.token ?? process.env.NTFY_TOKEN ?? "").trim();

  if (!topic) {
    return {
      sent: false,
      configured: false,
      serverUrl,
      topicConfigured: false,
      deliveredCount: 0,
      failedCount: 0,
      message: "ntfy danger alerts are not configured. Set an ntfy topic in Settings or NTFY_TOPIC on the server.",
    };
  }

  const fetcher = options?.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: createDangerNtfyTitle(input),
    Priority: "5",
    Tags: "warning,fish,health",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetcher(`${serverUrl}/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers,
    body: createDangerNtfyMessage(input),
  });

  const delivered = response.ok ? 1 : 0;
  const failed = response.ok ? 0 : 1;
  return {
    sent: response.ok,
    configured: true,
    serverUrl,
    topicConfigured: true,
    deliveredCount: delivered,
    failedCount: failed,
    message: response.ok ? `ntfy danger alert delivered to topic ${topic}.` : `ntfy danger alert could not be delivered to topic ${topic}.`,
  };
}
