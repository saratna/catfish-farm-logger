import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";

const photoAssessmentSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]).default("image/jpeg"),
  referenceLengthCm: z.number().positive().optional(),
  manualLengthCm: z.number().positive().optional(),
  manualWeightG: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
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
        summary: data.summary ?? "写真からの確認結果を取得しました。",
        recommendation: data.recommendation ?? "水質、食いつき、遊泳状態を合わせて確認してください。",
        disclaimer: "写真チェックは確定診断ではありません。病気名を断定せず、観察・水質測定・必要時の専門家相談の補助として使ってください。",
        storedUrl: stored.url,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
