export type LineDangerAlertInput = {
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

export type SendLineDangerAlertsInput = {
  farmName?: string;
  generatedAt: string;
  alerts: LineDangerAlertInput[];
};

export type LineSendResult = {
  sent: boolean;
  configured: boolean;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  message: string;
};

type FetchLike = typeof fetch;

const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const MAX_LINE_TEXT_LENGTH = 4900;

export function parseLineRecipients(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\n,;\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function createDangerLineMessage(input: SendLineDangerAlertsInput) {
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
  return message.length > MAX_LINE_TEXT_LENGTH ? `${message.slice(0, MAX_LINE_TEXT_LENGTH - 80)}\n\nMessage truncated. Open the app Health tab for full details.` : message;
}

export async function sendLineDangerAlerts(input: SendLineDangerAlertsInput, options?: { token?: string; recipients?: string; fetcher?: FetchLike }): Promise<LineSendResult> {
  const token = options?.token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const recipients = parseLineRecipients(options?.recipients ?? process.env.LINE_RECIPIENT_IDS);
  if (!token || recipients.length === 0) {
    return {
      sent: false,
      configured: false,
      recipientCount: recipients.length,
      deliveredCount: 0,
      failedCount: 0,
      message: "LINE danger alerts are not configured. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_RECIPIENT_IDS on the server.",
    };
  }

  const messageText = createDangerLineMessage(input);
  const fetcher = options?.fetcher ?? fetch;
  let deliveredCount = 0;
  let failedCount = 0;

  for (const to of recipients) {
    const response = await fetcher(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: messageText }],
      }),
    });
    if (response.ok) {
      deliveredCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return {
    sent: deliveredCount > 0,
    configured: true,
    recipientCount: recipients.length,
    deliveredCount,
    failedCount,
    message: deliveredCount > 0 ? `LINE danger alert delivered to ${deliveredCount} recipient(s).` : "LINE danger alert could not be delivered to any configured recipient.",
  };
}
