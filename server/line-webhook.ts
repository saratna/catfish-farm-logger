import crypto from "crypto";
import type { Express, Request, Response } from "express";

export type LineWebhookSource = {
  type?: string;
  userId?: string;
  groupId?: string;
  roomId?: string;
};

export type LineWebhookRecipient = {
  id: string;
  kind: "user" | "group" | "room" | "unknown";
  sourceType?: string;
  eventType?: string;
  receivedAt: string;
};

type RequestWithRawBody = Request & { rawBody?: Buffer };

type LineWebhookEvent = {
  type?: string;
  source?: LineWebhookSource;
};

const MAX_RECENT_RECIPIENTS = 20;
const recentRecipients: LineWebhookRecipient[] = [];

function recipientFromEvent(event: LineWebhookEvent, receivedAt: string): LineWebhookRecipient | undefined {
  const source = event.source;
  if (!source) return undefined;
  if (source.groupId) {
    return { id: source.groupId, kind: "group", sourceType: source.type, eventType: event.type, receivedAt };
  }
  if (source.roomId) {
    return { id: source.roomId, kind: "room", sourceType: source.type, eventType: event.type, receivedAt };
  }
  if (source.userId) {
    return { id: source.userId, kind: "user", sourceType: source.type, eventType: event.type, receivedAt };
  }
  return undefined;
}

function rememberRecipient(recipient: LineWebhookRecipient) {
  const existingIndex = recentRecipients.findIndex((item) => item.id === recipient.id);
  if (existingIndex >= 0) {
    recentRecipients.splice(existingIndex, 1);
  }
  recentRecipients.unshift(recipient);
  recentRecipients.splice(MAX_RECENT_RECIPIENTS);
}

export function listRecentLineWebhookRecipients() {
  return [...recentRecipients];
}

export function getWebhookUrlFromRequest(req: Request) {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.header("host") || "";
  return host ? `${protocol}://${host}/line/webhook` : "/line/webhook";
}

export function verifyLineSignature(rawBody: Buffer | undefined, signature: string | undefined, channelSecret: string | undefined) {
  if (!channelSecret) return true;
  if (!rawBody || !signature) return false;
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function registerLineWebhookRoutes(app: Express) {
  app.get("/line/webhook", (req: Request, res: Response) => {
    res.json({
      ok: true,
      webhookUrl: getWebhookUrlFromRequest(req),
      message: "Use this HTTPS URL in LINE Developers > Messaging API > Webhook URL, then send a message to the official account or group to capture userId/groupId.",
      recentRecipients: listRecentLineWebhookRecipients(),
    });
  });

  app.post("/line/webhook", (req: RequestWithRawBody, res: Response) => {
    const signature = req.header("x-line-signature") ?? undefined;
    if (!verifyLineSignature(req.rawBody, signature, process.env.LINE_CHANNEL_SECRET)) {
      res.status(401).json({ ok: false, message: "Invalid LINE webhook signature." });
      return;
    }

    const events = Array.isArray(req.body?.events) ? (req.body.events as LineWebhookEvent[]) : [];
    const receivedAt = new Date().toISOString();
    const captured = events.map((event) => recipientFromEvent(event, receivedAt)).filter((item): item is LineWebhookRecipient => Boolean(item));
    captured.forEach(rememberRecipient);
    res.json({ ok: true, capturedCount: captured.length, recentRecipients: listRecentLineWebhookRecipients() });
  });
}
