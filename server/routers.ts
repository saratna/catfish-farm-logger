import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import { sendLineDangerAlerts } from "./line-notifier";
import { getWebhookUrlFromRequest, listRecentLineWebhookRecipients } from "./line-webhook";
import { maskNtfyToken, normalizeNtfyServerUrl, normalizeNtfyTopic, sendNtfyDangerAlerts } from "./ntfy-notifier";

const photoAssessmentSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]).default("image/jpeg"),
  referenceLengthCm: z.number().positive().optional(),
  manualLengthCm: z.number().positive().optional(),
  manualWeightG: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

const dangerAlertSchema = z.object({
  farmName: z.string().max(120).optional(),
  generatedAt: z.string().datetime(),
  alerts: z.array(z.object({
    alertKey: z.string().min(3).max(240),
    tankName: z.string().min(1).max(120),
    title: z.string().min(1).max(180),
    reason: z.string().min(1).max(900),
    action: z.string().min(1).max(900),
    evidence: z.array(z.string().max(500)).max(8),
    sourceLabels: z.array(z.string().max(120)).max(8),
    severity: z.literal("danger"),
    detectedAt: z.string().datetime(),
  })).min(1).max(8),
});

const ntfyDangerAlertSchema = dangerAlertSchema.extend({
  serverUrl: z.string().url().max(240).optional(),
  topic: z.string().trim().min(1).max(120).optional(),
  token: z.string().max(500).optional(),
});

function parseAssessment(content: string) {
  try {
    return JSON.parse(content) as {
      estimatedLengthCm?: number;
      estimatedWeightG?: number;
      confidence?: "low" | "medium" | "high";
      visibleSigns?: string[];
      severity?: "normal" | "watch" | "danger";
      summary?: string;
      recommendation?: string;
    };
  } catch {
    return {};
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  line: router({
    status: publicProcedure.query(({ ctx }) => {
      const recipients = (process.env.LINE_RECIPIENT_IDS ?? "").split(/[\n,;\s]+/).map((item) => item.trim()).filter(Boolean);
      return {
        configured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && recipients.length > 0),
        recipientCount: recipients.length,
        webhookUrl: getWebhookUrlFromRequest(ctx.req),
        recentRecipients: listRecentLineWebhookRecipients(),
        channelSecretConfigured: Boolean(process.env.LINE_CHANNEL_SECRET),
        message: process.env.LINE_CHANNEL_ACCESS_TOKEN && recipients.length > 0 ? "LINE danger alerts are configured on the server." : "LINE danger alerts need LINE_CHANNEL_ACCESS_TOKEN and LINE_RECIPIENT_IDS.",
      };
    }),
    sendDangerAlert: publicProcedure.input(dangerAlertSchema).mutation(async ({ input }) => sendLineDangerAlerts(input)),
  }),

  ntfy: router({
    status: publicProcedure.input(z.object({ serverUrl: z.string().url().max(240).optional(), topic: z.string().max(120).optional(), token: z.string().max(500).optional() }).optional()).query(({ input }) => {
      const serverUrl = normalizeNtfyServerUrl(input?.serverUrl);
      const topic = normalizeNtfyTopic(input?.topic);
      const token = input?.token?.trim() || process.env.NTFY_TOKEN || "";
      return {
        configured: Boolean(topic),
        serverUrl,
        topicConfigured: Boolean(topic),
        topic: topic ? topic.replace(/^(.{2}).*(.{2})$/, "$1…$2") : "",
        tokenStatus: maskNtfyToken(token),
        message: topic ? `ntfy danger alerts are configured for ${serverUrl}.` : "ntfy danger alerts need a topic in Settings or NTFY_TOPIC on the server.",
      };
    }),
    sendDangerAlert: publicProcedure.input(ntfyDangerAlertSchema).mutation(async ({ input }) => sendNtfyDangerAlerts(input)),
  }),

  photo: router({
    assess: publicProcedure.input(photoAssessmentSchema).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const extension = input.mimeType.includes("png") ? "png" : input.mimeType.includes("webp") ? "webp" : input.mimeType.includes("heic") ? "heic" : "jpg";
      const stored = await storagePut(`catfish-photo-assessments/photo.${extension}`, buffer, input.mimeType);
      const imageUrl = await storageGetSignedUrl(stored.key);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an aquaculture photo screening assistant for catfish. Return only JSON. Do not diagnose disease. Estimate size only when a ruler, known reference, or user-provided reference is visible or supplied. Flag visible external signs such as redness, ulcer, white spots, cotton-like growth, fin damage, swollen belly, popeye, abnormal color, emaciation. Always include a practical next action and a caution that photo review is not a veterinary diagnosis.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this catfish photo for growth logging. User notes: ${input.notes ?? "none"}. Known reference length cm: ${input.referenceLengthCm ?? "not provided"}. Manual length cm: ${input.manualLengthCm ?? "not provided"}. Manual weight g: ${input.manualWeightG ?? "not provided"}. Return JSON with estimatedLengthCm, estimatedWeightG, confidence, visibleSigns, severity, summary, recommendation.`,
              },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content;
      const data = parseAssessment(typeof rawContent === "string" ? rawContent : "{}");
      return {
        estimatedLengthCm: typeof data.estimatedLengthCm === "number" ? data.estimatedLengthCm : undefined,
        estimatedWeightG: typeof data.estimatedWeightG === "number" ? data.estimatedWeightG : undefined,
        confidence: data.confidence ?? "low",
        visibleSigns: Array.isArray(data.visibleSigns) ? data.visibleSigns.map(String).slice(0, 8) : [],
        severity: data.severity ?? "watch",
        summary: data.summary ?? "The photo review result was retrieved.",
        recommendation: data.recommendation ?? "Check water quality, feeding response, and swimming behavior together.",
        disclaimer: "Photo checks are not a definitive diagnosis. Use them as support for observation, water testing, and professional consultation when needed without claiming a disease name as certain.",
        storedUrl: stored.url,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
