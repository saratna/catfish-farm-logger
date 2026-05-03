from pathlib import Path

root = Path('/home/ubuntu/catfish_farm_logger')

advisor = root / 'lib/catfish-advisor.ts'
advisor.write_text(r'''export type WeatherSeverity = "normal" | "watch" | "danger";

export type AdvisoryWeatherInput = {
  airTempC?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  pressureTrendHpa?: number;
  rainMm24h?: number;
  windKph?: number;
  sourceSummary?: string;
};

export type AdvisoryInspectionInput = {
  waterTempC?: number;
  dissolvedOxygen?: number;
  ph?: number;
  ammonia?: number;
  nitrite?: number;
};

export type RiskAssessment = {
  severity: WeatherSeverity;
  title: string;
  reason: string;
  action: string;
  category: "heat" | "rain" | "pressure" | "humidity" | "water" | "feed";
};

export type FeedingAdviceInput = {
  averageWeightG: number;
  fishCount?: number;
  feedAmountKg?: number;
  productName?: string;
  proteinPercent?: number;
  pelletSizeMm?: number;
  floats?: boolean;
  residualFeed?: "none" | "little" | "much";
  appetite?: "poor" | "normal" | "strong";
  weather?: AdvisoryWeatherInput;
  inspection?: AdvisoryInspectionInput;
};

export type FeedingAdvice = {
  recommendedFeedKg?: number;
  feedRatePercent: number;
  summary: string;
  productAdvice: string;
  cautions: string[];
};

export type GrowthMeasurementInput = {
  createdAt: string;
  lengthCm: number;
  weightG: number;
};

export type GrowthAssessment = {
  status: "insufficient" | "good" | "slow" | "rapid" | "decline";
  severity: "normal" | "watch" | "danger";
  title: string;
  summary: string;
  dailyWeightGainPercent?: number;
  lengthGainCm?: number;
  comparedDays?: number;
  recommendation: string;
};

export type VisibleHealthSigns = {
  redness?: boolean;
  ulcers?: boolean;
  whiteSpots?: boolean;
  finDamage?: boolean;
  swollenBelly?: boolean;
  popeye?: boolean;
  abnormalColor?: boolean;
};

export type PhotoScreening = {
  severity: "normal" | "watch" | "danger";
  title: string;
  visibleSigns: string[];
  recommendation: string;
  disclaimer: string;
};

function highestSeverity(items: RiskAssessment[]): WeatherSeverity {
  if (items.some((item) => item.severity === "danger")) return "danger";
  if (items.some((item) => item.severity === "watch")) return "watch";
  return "normal";
}

export function summarizeSeverity(items: RiskAssessment[]) {
  const severity = highestSeverity(items);
  const main = items.find((item) => item.severity === severity) ?? items[0];
  return {
    severity,
    title: main?.title ?? "通常監視",
    summary: main?.reason ?? "大きな気象リスクは検出されていません。水温と溶存酸素は通常どおり確認してください。",
  };
}

export function assessCatfishWeatherRisk(weather: AdvisoryWeatherInput, inspection?: AdvisoryInspectionInput): RiskAssessment[] {
  const risks: RiskAssessment[] = [];
  const waterTemp = inspection?.waterTempC;
  const effectiveTemp = waterTemp ?? weather.airTempC;

  if (typeof effectiveTemp === "number" && effectiveTemp >= 34) {
    risks.push({
      severity: "danger",
      category: "heat",
      title: "高温リスク",
      reason: "気温または水温が高く、溶存酸素低下と摂餌不良が起きやすい条件です。",
      action: "早朝に溶存酸素を測定し、過剰給餌を避け、必要なら曝気を強めてください。",
    });
  } else if (typeof effectiveTemp === "number" && effectiveTemp >= 30) {
    risks.push({
      severity: "watch",
      category: "heat",
      title: "暑熱注意",
      reason: "高めの温度で酸素需要が増えます。水質悪化時はナマズのストレスが増える可能性があります。",
      action: "水温、溶存酸素、残餌を確認して給餌量を控えめに調整してください。",
    });
  }

  if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 50) {
    risks.push({
      severity: "danger",
      category: "rain",
      title: "強雨後の水質変化",
      reason: "強い雨で池の濁り、pH変化、流入水による水質変化が起きる可能性があります。",
      action: "雨後にpH、濁り、溶存酸素を確認し、魚が水面に集まる場合は早急に対応してください。",
    });
  } else if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 20) {
    risks.push({
      severity: "watch",
      category: "rain",
      title: "雨量注意",
      reason: "まとまった雨が予想または記録されています。池の水質変動に注意が必要です。",
      action: "雨後の観察メモを残し、給餌前に食いつきと水の状態を確認してください。",
    });
  }

  if (typeof weather.pressureTrendHpa === "number" && weather.pressureTrendHpa <= -5) {
    risks.push({
      severity: "watch",
      category: "pressure",
      title: "気圧低下",
      reason: "気圧が短時間で下がると天候急変や溶存酸素低下の確認が必要になります。",
      action: "給餌前に魚の浮上、遊泳、食いつきを観察し、異常があれば給餌を減らしてください。",
    });
  }

  if (typeof weather.humidityPercent === "number" && typeof weather.airTempC === "number" && weather.humidityPercent >= 90 && weather.airTempC >= 30) {
    risks.push({
      severity: "watch",
      category: "humidity",
      title: "蒸し暑さ注意",
      reason: "高温多湿で水温が下がりにくく、夜間から早朝の酸素不足に注意が必要です。",
      action: "早朝の溶存酸素を優先して測り、残餌を出さない量に調整してください。",
    });
  }

  if (typeof inspection?.dissolvedOxygen === "number" && inspection.dissolvedOxygen < 4) {
    risks.push({
      severity: "danger",
      category: "water",
      title: "溶存酸素不足",
      reason: "溶存酸素が低く、ナマズのストレスや斃死リスクが高まる恐れがあります。",
      action: "給餌を止め、曝気や換水など現場の安全手順に従ってください。",
    });
  }

  if (typeof inspection?.ammonia === "number" && inspection.ammonia > 0.5) {
    risks.push({
      severity: "watch",
      category: "water",
      title: "アンモニア注意",
      reason: "アンモニアが高めです。高温・高pH条件では毒性が強まりやすくなります。",
      action: "給餌量を控え、pHと水温を合わせて再確認してください。",
    });
  }

  if (risks.length === 0) {
    risks.push({
      severity: "normal",
      category: "water",
      title: "通常監視",
      reason: "現在の入力値からは大きな気象由来リスクは検出されていません。",
      action: "日次の水温、pH、溶存酸素、食いつき確認を続けてください。",
    });
  }

  return risks;
}

function baseFeedRatePercent(temp?: number) {
  if (typeof temp !== "number") return 2.5;
  if (temp < 20) return 1.0;
  if (temp < 24) return 2.0;
  if (temp <= 30) return 3.0;
  if (temp <= 33) return 2.0;
  return 0.5;
}

function targetProteinRange(weightG: number) {
  if (weightG < 50) return { min: 35, max: 40, label: "稚魚期は高タンパク質の餌を優先" };
  if (weightG < 200) return { min: 30, max: 36, label: "成長期は30〜36%程度を目安" };
  return { min: 28, max: 34, label: "大型魚は過剰タンパクを避け水質を見ながら調整" };
}

export function buildFeedingAdvice(input: FeedingAdviceInput): FeedingAdvice {
  const temp = input.inspection?.waterTempC ?? input.weather?.airTempC;
  let rate = baseFeedRatePercent(temp);
  const cautions: string[] = [];

  if (input.residualFeed === "much") {
    rate *= 0.65;
    cautions.push("残餌が多いため、次回は給餌量を減らし水質を確認してください。");
  } else if (input.appetite === "poor") {
    rate *= 0.75;
    cautions.push("食いつきが弱いため、病気・低酸素・水温変化を確認してください。");
  } else if (input.appetite === "strong" && input.residualFeed === "none") {
    rate *= 1.05;
  }

  if ((input.weather?.rainMm24h ?? 0) >= 20) {
    rate *= 0.85;
    cautions.push("雨後は水質変化が起こりやすいため、給餌は控えめにしてください。");
  }

  if ((input.inspection?.dissolvedOxygen ?? 99) < 4 || (input.weather?.airTempC ?? 0) >= 34) {
    rate *= 0.5;
    cautions.push("低酸素または高温条件では、給餌を大きく減らすか一時停止を検討してください。");
  }

  const biomassKg = input.fishCount && input.fishCount > 0 ? (input.averageWeightG / 1000) * input.fishCount : undefined;
  const recommendedFeedKg = biomassKg ? Math.max(0, Number(((biomassKg * rate) / 100).toFixed(2))) : undefined;
  const protein = targetProteinRange(input.averageWeightG);

  let productAdvice = `${protein.label}です。`;
  if (typeof input.proteinPercent === "number") {
    if (input.proteinPercent < protein.min) {
      productAdvice += ` 現在のタンパク質率${input.proteinPercent}%は低めなので、成長速度を重視する場合は${protein.min}%以上の製品を検討してください。`;
    } else if (input.proteinPercent > protein.max + 4) {
      productAdvice += ` 現在のタンパク質率${input.proteinPercent}%は高めです。残餌やアンモニア上昇がないか確認してください。`;
    } else {
      productAdvice += ` 現在のタンパク質率${input.proteinPercent}%は目安範囲に近いです。`;
    }
  }

  if (typeof input.pelletSizeMm === "number" && input.averageWeightG < 50 && input.pelletSizeMm > 2) {
    cautions.push("平均体重に対して粒径が大きい可能性があります。摂餌しやすい小粒を確認してください。");
  }

  const amountText = recommendedFeedKg ? `推奨量は約${recommendedFeedKg}kg/日です。` : "個体数を入力すると推奨kg/日を計算できます。";
  return {
    recommendedFeedKg,
    feedRatePercent: Number(rate.toFixed(2)),
    summary: `${amountText} 目安は推定バイオマスの${rate.toFixed(2)}%です。実際の残餌、食いつき、水質で調整してください。`,
    productAdvice,
    cautions,
  };
}

export function assessGrowthTrend(measurements: GrowthMeasurementInput[]): GrowthAssessment {
  const ordered = [...measurements]
    .filter((item) => Number.isFinite(item.lengthCm) && Number.isFinite(item.weightG))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordered.length < 2) {
    return {
      status: "insufficient",
      severity: "watch",
      title: "成長データ不足",
      summary: "成長傾向を見るには、同じ水槽で少なくとも2回以上の体長・体重記録が必要です。",
      recommendation: "測定方法をそろえ、次回も体長cmと体重gを記録してください。写真だけで断定しないでください。",
    };
  }

  const previous = ordered[ordered.length - 2];
  const latest = ordered[ordered.length - 1];
  const days = Math.max(1, Math.round((new Date(latest.createdAt).getTime() - new Date(previous.createdAt).getTime()) / 86_400_000));
  const weightGain = latest.weightG - previous.weightG;
  const lengthGain = latest.lengthCm - previous.lengthCm;
  const dailyWeightGainPercent = previous.weightG > 0 ? ((latest.weightG / previous.weightG) ** (1 / days) - 1) * 100 : 0;

  if (weightGain < 0 || lengthGain < -0.5) {
    return {
      status: "decline",
      severity: "danger",
      title: "体重低下に注意",
      summary: `前回より体重が${Math.abs(weightGain).toFixed(1)}g変化しています。測定誤差の可能性もありますが、食いつき・水質・外観を確認してください。`,
      dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)),
      lengthGainCm: Number(lengthGain.toFixed(1)),
      comparedDays: days,
      recommendation: "測定器と個体条件を確認し、食欲低下、低酸素、赤み、潰瘍、腹部膨満があれば早めに隔離や専門家相談を検討してください。",
    };
  }

  if (dailyWeightGainPercent < 0.15 && days >= 3) {
    return {
      status: "slow",
      severity: "watch",
      title: "成長停滞ぎみ",
      summary: `${days}日間の体重増加が小さく、日あたり約${dailyWeightGainPercent.toFixed(2)}%です。`,
      dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)),
      lengthGainCm: Number(lengthGain.toFixed(1)),
      comparedDays: days,
      recommendation: "給餌量、餌の粒径・タンパク質、水温、溶存酸素、残餌を合わせて確認してください。",
    };
  }

  if (dailyWeightGainPercent > 5 || latest.weightG > previous.weightG * 1.8) {
    return {
      status: "rapid",
      severity: "watch",
      title: "急変値を確認",
      summary: `前回からの増加が大きく、測定個体の違いや入力ミスの確認が必要です。`,
      dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)),
      lengthGainCm: Number(lengthGain.toFixed(1)),
      comparedDays: days,
      recommendation: "同じ測定条件か確認し、必要なら再測定してください。腹部膨満など外観異常がある場合は病気の可能性も確認してください。",
    };
  }

  return {
    status: "good",
    severity: "normal",
    title: "成長は順調傾向",
    summary: `${days}日間で体重が${weightGain.toFixed(1)}g、体長が${lengthGain.toFixed(1)}cm変化しています。`,
    dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)),
    lengthGainCm: Number(lengthGain.toFixed(1)),
    comparedDays: days,
    recommendation: "この傾向を維持しつつ、毎日の水温・溶存酸素・食いつきも合わせて記録してください。",
  };
}

export function buildPhotoScreeningFromInputs(signs: VisibleHealthSigns): PhotoScreening {
  const visibleSigns = [
    signs.redness ? "赤み・出血斑" : undefined,
    signs.ulcers ? "潰瘍・傷" : undefined,
    signs.whiteSpots ? "白点・綿状付着" : undefined,
    signs.finDamage ? "ヒレ損傷" : undefined,
    signs.swollenBelly ? "腹部膨満" : undefined,
    signs.popeye ? "眼の突出" : undefined,
    signs.abnormalColor ? "体色異常" : undefined,
  ].filter(Boolean) as string[];

  const severe = signs.ulcers || signs.swollenBelly || signs.popeye;
  const severity = severe ? "danger" : visibleSigns.length > 0 ? "watch" : "normal";
  const title = severity === "danger" ? "強い注意サイン" : severity === "watch" ? "外観注意サイン" : "目立つ外観異常なし";
  const recommendation =
    severity === "danger"
      ? "水質測定、食いつき、遊泳状態を確認し、悪化や死亡がある場合は隔離・専門家相談を検討してください。"
      : severity === "watch"
        ? "同じ個体を継続観察し、水温・溶存酸素・アンモニア・亜硝酸を確認してください。"
        : "写真で見える範囲では大きな異常は選択されていません。日々の食いつきと水質確認は継続してください。";

  return {
    severity,
    title,
    visibleSigns,
    recommendation,
    disclaimer: "写真チェックは確定診断ではありません。病名の断定ではなく、飼育者の観察、水質測定、必要時の専門家相談を補助するものです。",
  };
}
''')

# Patch farm-store in targeted replacements.
store = root / 'lib/farm-store.tsx'
text = store.read_text()
text = text.replace('export type FishPhoto = {\n  id: string;\n  tankId: string;\n  createdAt: string;\n  uri: string;\n  notes: string;\n  synced: boolean;\n};', '''export type FishPhoto = {
  id: string;
  tankId: string;
  createdAt: string;
  uri: string;
  notes: string;
  synced: boolean;
};

export type GrowthMeasurement = {
  id: string;
  tankId: string;
  createdAt: string;
  lengthCm: number;
  weightG: number;
  photoUri?: string;
  source: "manual" | "photo-assisted";
  notes: string;
  synced: boolean;
};

export type PhotoAssessmentRecord = {
  id: string;
  tankId: string;
  growthMeasurementId?: string;
  createdAt: string;
  uri: string;
  estimatedLengthCm?: number;
  estimatedWeightG?: number;
  confidence: "low" | "medium" | "high";
  visibleSigns: string[];
  severity: "normal" | "watch" | "danger";
  summary: string;
  recommendation: string;
  disclaimer: string;
  synced: boolean;
};''')
text = text.replace('photos: FishPhoto[];\n  location?: FarmLocation;', 'photos: FishPhoto[];\n  growthMeasurements: GrowthMeasurement[];\n  photoAssessments: PhotoAssessmentRecord[];\n  location?: FarmLocation;')
text = text.replace('| { type: "addPhoto"; payload: FishPhoto }\n  | { type: "setLocation"; payload: FarmLocation }', '| { type: "addPhoto"; payload: FishPhoto }\n  | { type: "addGrowthMeasurement"; payload: GrowthMeasurement }\n  | { type: "addPhotoAssessment"; payload: PhotoAssessmentRecord }\n  | { type: "setLocation"; payload: FarmLocation }')
text = text.replace('photos: [],\n  weatherRecords: [],', 'photos: [],\n  growthMeasurements: [],\n  photoAssessments: [],\n  weatherRecords: [],')
text = text.replace('case "addPhoto":\n      return { ...state, photos: [action.payload, ...state.photos], sync: waitingSync("Photo record saved locally") };', 'case "addPhoto":\n      return { ...state, photos: [action.payload, ...state.photos], sync: waitingSync("Photo record saved locally") };\n    case "addGrowthMeasurement":\n      return { ...state, growthMeasurements: [action.payload, ...state.growthMeasurements], sync: waitingSync("Growth measurement saved locally") };\n    case "addPhotoAssessment":\n      return { ...state, photoAssessments: [action.payload, ...state.photoAssessments], sync: waitingSync("Photo assessment saved locally") };')
text = text.replace('photos: state.photos.map((item) => ({ ...item, synced: true })),\n        weatherRecords:', 'photos: state.photos.map((item) => ({ ...item, synced: true })),\n        growthMeasurements: state.growthMeasurements.map((item) => ({ ...item, synced: true })),\n        photoAssessments: state.photoAssessments.map((item) => ({ ...item, synced: true })),\n        weatherRecords:')
text = text.replace('addPhoto: (input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => void;\n  setLocation:', 'addPhoto: (input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => void;\n  addGrowthMeasurement: (input: Omit<GrowthMeasurement, "id" | "createdAt" | "synced">) => void;\n  addPhotoAssessment: (input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => void;\n  setLocation:')
text = text.replace('photos: FishPhoto[];\n    files: string[];', 'photos: FishPhoto[];\n    growthMeasurements: GrowthMeasurement[];\n    photoAssessments: PhotoAssessmentRecord[];\n    files: string[];')
text = text.replace('state.photos.filter((item) => !item.synced).length +\n      state.weatherRecords', 'state.photos.filter((item) => !item.synced).length +\n      state.growthMeasurements.filter((item) => !item.synced).length +\n      state.photoAssessments.filter((item) => !item.synced).length +\n      state.weatherRecords')
text = text.replace('[state.inspections, state.feedings, state.photos, state.weatherRecords, state.riskAlerts, state.feedProducts]', '[state.inspections, state.feedings, state.photos, state.growthMeasurements, state.photoAssessments, state.weatherRecords, state.riskAlerts, state.feedProducts]')
text = text.replace('const addPhoto = useCallback((input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => {\n    dispatch({ type: "addPhoto", payload: { id: createId("photo"), createdAt: nowIso(), synced: false, ...input } });\n  }, []);', '''const addPhoto = useCallback((input: Omit<FishPhoto, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addPhoto", payload: { id: createId("photo"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addGrowthMeasurement = useCallback((input: Omit<GrowthMeasurement, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addGrowthMeasurement", payload: { id: createId("growth"), createdAt: nowIso(), synced: false, ...input } });
  }, []);

  const addPhotoAssessment = useCallback((input: Omit<PhotoAssessmentRecord, "id" | "createdAt" | "synced">) => {
    dispatch({ type: "addPhotoAssessment", payload: { id: createId("assessment"), createdAt: nowIso(), synced: false, ...input } });
  }, []);''')
text = text.replace('photos: state.photos.filter((item) => item.tankId === tank.id),\n          files:', 'photos: state.photos.filter((item) => item.tankId === tank.id),\n          growthMeasurements: state.growthMeasurements.filter((item) => item.tankId === tank.id),\n          photoAssessments: state.photoAssessments.filter((item) => item.tankId === tank.id),\n          files:')
text = text.replace('"photos/", "sync-log.json", "feeding-advice.json"', '"photos/", "growth-measurements.json", "photo-assessments.json", "growth-status.json", "sync-log.json", "feeding-advice.json"')
text = text.replace('addPhoto,\n      setLocation,', 'addPhoto,\n      addGrowthMeasurement,\n      addPhotoAssessment,\n      setLocation,')
text = text.replace('[state, pendingSyncCount, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, generateDrivePayload]', '[state, pendingSyncCount, todaysMissingTankIds, latestWeather, activeRiskAlerts, addTank, addInspection, addFeeding, addPhoto, addGrowthMeasurement, addPhotoAssessment, setLocation, addWeatherRecord, replaceRiskAlerts, acknowledgeRiskAlert, addFeedProduct, updateSettings, markSynced, generateDrivePayload]')
store.write_text(text)

# Patch Google Drive export files.
gd = root / 'lib/google-drive.ts'
text = gd.read_text()
text = text.replace('{ name: "photos.json", value: tankExport.photos },\n      { name: "sync-log.json", value:', '{ name: "photos.json", value: tankExport.photos },\n      { name: "growth-measurements.json", value: tankExport.growthMeasurements },\n      { name: "photo-assessments.json", value: tankExport.photoAssessments },\n      { name: "sync-log.json", value:')
gd.write_text(text)

# Server router for photo assessment.
routers = root / 'server/routers.ts'
routers.write_text(r'''import { z } from "zod";

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

      const data = parseAssessment(response.choices[0]?.message?.content ?? "{}");
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
''')

# Records screen rewrite.
records = root / 'app/(tabs)/records.tsx'
records.write_text(r'''import { useMemo, useState } from "react";
import { Alert, FlatList, Image, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { ScreenContainer } from "@/components/screen-container";
import { assessGrowthTrend, buildFeedingAdvice, buildPhotoScreeningFromInputs, type VisibleHealthSigns } from "@/lib/catfish-advisor";
import { formatShortDate, useFarm } from "@/lib/farm-store";
import { trpc } from "@/lib/trpc";

const toNumber = (value: string) => Number(value.replace(",", "."));
const signOptions: Array<{ key: keyof VisibleHealthSigns; label: string }> = [
  { key: "redness", label: "Redness" },
  { key: "ulcers", label: "Ulcer" },
  { key: "whiteSpots", label: "White spots" },
  { key: "finDamage", label: "Fin damage" },
  { key: "swollenBelly", label: "Swollen belly" },
  { key: "popeye", label: "Popeye" },
  { key: "abnormalColor", label: "Color change" },
];

type PhotoAssessmentDraft = {
  estimatedLengthCm?: number;
  estimatedWeightG?: number;
  confidence: "low" | "medium" | "high";
  visibleSigns: string[];
  severity: "normal" | "watch" | "danger";
  summary: string;
  recommendation: string;
  disclaimer: string;
};

async function imageUriToBase64(uri: string) {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function mimeTypeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png" as const;
  if (lower.endsWith(".webp")) return "image/webp" as const;
  if (lower.endsWith(".heic")) return "image/heic" as const;
  return "image/jpeg" as const;
}

export default function RecordsScreen() {
  const farm = useFarm();
  const photoAssess = trpc.photo.assess.useMutation();
  const [tankId, setTankId] = useState(farm.tanks[0]?.id ?? "");
  const [waterTempC, setWaterTempC] = useState("");
  const [ph, setPh] = useState("");
  const [oxygen, setOxygen] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [nitrite, setNitrite] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [feedType, setFeedType] = useState(farm.settings.feedTypes[0] ?? "Floating pellet");
  const [feedAmountKg, setFeedAmountKg] = useState("");
  const [averageWeightG, setAverageWeightG] = useState("");
  const [fishCount, setFishCount] = useState("");
  const [feedProductName, setFeedProductName] = useState(farm.feedProducts[0]?.name ?? "");
  const [proteinPercent, setProteinPercent] = useState(farm.feedProducts[0]?.proteinPercent?.toString() ?? "");
  const [pelletSizeMm, setPelletSizeMm] = useState(farm.feedProducts[0]?.pelletSizeMm?.toString() ?? "");
  const [feedBehavior, setFeedBehavior] = useState<"poor" | "normal" | "strong">("normal");
  const [residualFeed, setResidualFeed] = useState<"none" | "little" | "much">("none");
  const [feedingNotes, setFeedingNotes] = useState("");
  const [photoNotes, setPhotoNotes] = useState("");
  const [growthLengthCm, setGrowthLengthCm] = useState("");
  const [growthWeightG, setGrowthWeightG] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [referenceLengthCm, setReferenceLengthCm] = useState("");
  const [growthPhotoUri, setGrowthPhotoUri] = useState<string | undefined>();
  const [selectedSigns, setSelectedSigns] = useState<VisibleHealthSigns>({});
  const [assessmentDraft, setAssessmentDraft] = useState<PhotoAssessmentDraft | undefined>();

  const selectedTank = farm.tanks.find((tank) => tank.id === tankId) ?? farm.tanks[0];
  const selectedTankId = selectedTank?.id ?? "";

  const growthAssessment = useMemo(() => assessGrowthTrend(farm.growthMeasurements.filter((item) => item.tankId === selectedTankId)), [farm.growthMeasurements, selectedTankId]);

  const timeline = useMemo(() => {
    return [
      ...farm.inspections.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Inspection" as const, id: item.id, at: item.createdAt, text: `${item.waterTempC}°C water, pH ${item.ph ?? "--"}`, synced: item.synced })),
      ...farm.feedings.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Feeding" as const, id: item.id, at: item.createdAt, text: `${item.feedAmountKg} kg ${item.feedProductName || item.feedType}, ${item.averageWeightG} g avg${item.recommendedFeedKg ? ` · rec ${item.recommendedFeedKg} kg` : ""}`, synced: item.synced })),
      ...farm.growthMeasurements.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Growth" as const, id: item.id, at: item.createdAt, text: `${item.lengthCm} cm · ${item.weightG} g${item.source === "photo-assisted" ? " · photo-assisted" : ""}${item.notes ? ` · ${item.notes}` : ""}`, synced: item.synced, uri: item.photoUri })),
      ...farm.photoAssessments.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Photo check" as const, id: item.id, at: item.createdAt, text: `${item.summary}${item.visibleSigns.length ? ` · signs: ${item.visibleSigns.join(", ")}` : ""}`, synced: item.synced, uri: item.uri })),
      ...farm.photos.filter((item) => item.tankId === selectedTankId).map((item) => ({ kind: "Photo" as const, id: item.id, at: item.createdAt, text: item.notes || "Fish photo saved", synced: item.synced, uri: item.uri })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [farm.feedings, farm.growthMeasurements, farm.inspections, farm.photoAssessments, farm.photos, selectedTankId]);

  const saveInspection = () => {
    const temp = toNumber(waterTempC);
    if (!selectedTankId || Number.isNaN(temp)) {
      Alert.alert("Water temperature required", "Please enter a valid water temperature before saving.");
      return;
    }
    farm.addInspection({ tankId: selectedTankId, waterTempC: temp, ph: ph ? toNumber(ph) : undefined, dissolvedOxygen: oxygen ? toNumber(oxygen) : undefined, ammonia: ammonia ? toNumber(ammonia) : undefined, nitrite: nitrite ? toNumber(nitrite) : undefined, notes: inspectionNotes.trim() });
    setWaterTempC(""); setPh(""); setOxygen(""); setAmmonia(""); setNitrite(""); setInspectionNotes("");
  };

  const saveFeeding = () => {
    const amount = toNumber(feedAmountKg);
    const weight = toNumber(averageWeightG);
    if (!selectedTankId || Number.isNaN(amount) || Number.isNaN(weight)) {
      Alert.alert("Feeding details required", "Please enter feed amount and average fish weight.");
      return;
    }
    const count = fishCount ? toNumber(fishCount) : undefined;
    const productProtein = proteinPercent ? toNumber(proteinPercent) : undefined;
    const pelletSize = pelletSizeMm ? toNumber(pelletSizeMm) : undefined;
    const latestInspection = farm.inspections.find((item) => item.tankId === selectedTankId);
    const advice = buildFeedingAdvice({ averageWeightG: weight, fishCount: count, feedAmountKg: amount, productName: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, residualFeed, appetite: feedBehavior, weather: farm.latestWeather, inspection: latestInspection });
    farm.addFeeding({ tankId: selectedTankId, feedType, feedAmountKg: amount, averageWeightG: weight, fishCount: count, feedProductName: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, feedBehavior, residualFeed, recommendedFeedKg: advice.recommendedFeedKg, adviceSummary: advice.summary, productAdvice: advice.productAdvice, notes: [feedingNotes.trim(), ...advice.cautions].filter(Boolean).join("\n") });
    if (feedProductName.trim()) farm.addFeedProduct({ name: feedProductName.trim(), proteinPercent: productProtein, pelletSizeMm: pelletSize, notes: feedingNotes.trim(), floats: feedType.toLowerCase().includes("floating") });
    setFeedAmountKg(""); setAverageWeightG(""); setFishCount(""); setFeedingNotes("");
  };

  const addPhoto = async () => {
    if (!selectedTankId) return;
    const saveAsset = (uri: string) => { farm.addPhoto({ tankId: selectedTankId, uri, notes: photoNotes.trim() }); setPhotoNotes(""); };
    const pickFromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access to take fish photos."); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
      if (!result.canceled) saveAsset(result.assets[0].uri);
    };
    const pickFromLibrary = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ["images"] });
      if (!result.canceled) saveAsset(result.assets[0].uri);
    };
    if (Platform.OS === "web") { await pickFromLibrary(); return; }
    Alert.alert("Add fish photo", "Choose how to add the photo.", [{ text: "Camera", onPress: () => void pickFromCamera() }, { text: "Library", onPress: () => void pickFromLibrary() }, { text: "Cancel", style: "cancel" }]);
  };

  const chooseGrowthPhoto = async (source: "camera" | "library") => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access to photograph the catfish."); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false });
      if (!result.canceled) { setGrowthPhotoUri(result.assets[0].uri); setAssessmentDraft(undefined); }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ["images"] });
    if (!result.canceled) { setGrowthPhotoUri(result.assets[0].uri); setAssessmentDraft(undefined); }
  };

  const runPhotoAssessment = async () => {
    if (!growthPhotoUri) { Alert.alert("Photo required", "Please take or select a catfish photo first."); return; }
    try {
      const imageBase64 = await imageUriToBase64(growthPhotoUri);
      const result = await photoAssess.mutateAsync({ imageBase64, mimeType: mimeTypeFromUri(growthPhotoUri), referenceLengthCm: referenceLengthCm ? toNumber(referenceLengthCm) : undefined, manualLengthCm: growthLengthCm ? toNumber(growthLengthCm) : undefined, manualWeightG: growthWeightG ? toNumber(growthWeightG) : undefined, notes: growthNotes });
      setAssessmentDraft(result);
      if (result.estimatedLengthCm && !growthLengthCm) setGrowthLengthCm(String(result.estimatedLengthCm));
      if (result.estimatedWeightG && !growthWeightG) setGrowthWeightG(String(result.estimatedWeightG));
    } catch (error) {
      const local = buildPhotoScreeningFromInputs(selectedSigns);
      setAssessmentDraft({ ...local, confidence: "low" });
      Alert.alert("Photo AI unavailable", "Saved a local screening from the selected signs. You can still save the growth record.");
    }
  };

  const saveGrowthMeasurement = () => {
    const length = toNumber(growthLengthCm);
    const weight = toNumber(growthWeightG);
    if (!selectedTankId || Number.isNaN(length) || Number.isNaN(weight)) { Alert.alert("Size required", "Please enter catfish length in cm and weight in g before saving."); return; }
    const localScreening = buildPhotoScreeningFromInputs(selectedSigns);
    const screening = assessmentDraft ?? { ...localScreening, confidence: "low" as const };
    farm.addGrowthMeasurement({ tankId: selectedTankId, lengthCm: length, weightG: weight, photoUri: growthPhotoUri, source: growthPhotoUri ? "photo-assisted" : "manual", notes: growthNotes.trim() });
    if (growthPhotoUri) {
      farm.addPhotoAssessment({ tankId: selectedTankId, uri: growthPhotoUri, estimatedLengthCm: screening.estimatedLengthCm, estimatedWeightG: screening.estimatedWeightG, confidence: screening.confidence, visibleSigns: screening.visibleSigns, severity: screening.severity, summary: screening.summary, recommendation: screening.recommendation, disclaimer: screening.disclaimer });
    }
    setGrowthLengthCm(""); setGrowthWeightG(""); setGrowthNotes(""); setReferenceLengthCm(""); setGrowthPhotoUri(undefined); setAssessmentDraft(undefined); setSelectedSigns({});
  };

  const toggleSign = (key: keyof VisibleHealthSigns) => setSelectedSigns((current) => ({ ...current, [key]: !current[key] }));

  if (!selectedTank) {
    return <ScreenContainer className="items-center justify-center p-6"><Text className="text-center text-xl font-bold text-foreground">Add a tank first</Text><Text className="mt-2 text-center text-muted">Use the Today tab to create the first tank.</Text></ScreenContainer>;
  }

  const statusClass = growthAssessment.severity === "danger" ? "bg-error" : growthAssessment.severity === "watch" ? "bg-warning" : "bg-success";

  return (
    <ScreenContainer className="px-5 pt-4">
      <FlatList
        data={timeline}
        keyExtractor={(item) => `${item.kind}_${item.id}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pb-4">
            <Text className="text-3xl font-extrabold text-foreground">Records</Text>
            <Text className="mt-1 text-base text-muted">Enter checks, feeding, growth measurements, and catfish photo screenings by tank.</Text>

            <FlatList className="mt-4" data={farm.tanks} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity className={`mr-2 rounded-full px-4 py-2 ${item.id === selectedTankId ? "bg-primary" : "bg-surface border border-border"}`} onPress={() => setTankId(item.id)}>
                <Text className={`font-bold ${item.id === selectedTankId ? "text-white" : "text-foreground"}`}>{item.name}</Text>
              </TouchableOpacity>
            )} />

            <View className={`mt-4 rounded-3xl p-5 ${statusClass}`}>
              <Text className="text-xl font-bold text-white">{growthAssessment.title}</Text>
              <Text className="mt-2 text-sm leading-5 text-white">{growthAssessment.summary}</Text>
              <Text className="mt-2 text-sm leading-5 text-white">{growthAssessment.recommendation}</Text>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Growth and photo check</Text>
              <Text className="mt-1 text-sm text-muted">Record catfish length and weight. Photo AI is a screening aid, not a diagnosis.</Text>
              <View className="mt-4 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Length cm" value={growthLengthCm} onChangeText={setGrowthLengthCm} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Weight g" value={growthWeightG} onChangeText={setGrowthWeightG} />
              </View>
              <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Reference cm (ruler/object, optional)" value={referenceLengthCm} onChangeText={setReferenceLengthCm} />
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Growth notes, appetite, behavior" value={growthNotes} onChangeText={setGrowthNotes} multiline />
              {growthPhotoUri ? <Image source={{ uri: growthPhotoUri }} className="mt-3 h-44 w-full rounded-2xl" resizeMode="cover" /> : null}
              <View className="mt-3 flex-row gap-3">
                <TouchableOpacity className="flex-1 rounded-2xl border border-primary py-3" onPress={() => void chooseGrowthPhoto(Platform.OS === "web" ? "library" : "camera")}>
                  <Text className="text-center font-bold text-primary">Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 rounded-2xl border border-primary py-3" onPress={() => void chooseGrowthPhoto("library")}>
                  <Text className="text-center font-bold text-primary">Choose photo</Text>
                </TouchableOpacity>
              </View>
              <Text className="mt-4 text-sm font-bold text-foreground">Visible signs if AI is unavailable or you want to confirm</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {signOptions.map((item) => (
                  <TouchableOpacity key={item.key} className={`rounded-full px-3 py-2 ${selectedSigns[item.key] ? "bg-warning" : "bg-background border border-border"}`} onPress={() => toggleSign(item.key)}>
                    <Text className={`text-xs font-bold ${selectedSigns[item.key] ? "text-white" : "text-foreground"}`}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {assessmentDraft ? (
                <View className="mt-4 rounded-2xl bg-background p-4">
                  <Text className="font-bold text-foreground">{assessmentDraft.severity === "danger" ? "Strong caution" : assessmentDraft.severity === "watch" ? "Watch" : "No major sign"} · confidence {assessmentDraft.confidence}</Text>
                  <Text className="mt-2 text-sm leading-5 text-foreground">{assessmentDraft.summary}</Text>
                  {assessmentDraft.visibleSigns.length ? <Text className="mt-2 text-sm text-warning">Signs: {assessmentDraft.visibleSigns.join(", ")}</Text> : null}
                  <Text className="mt-2 text-xs leading-5 text-muted">{assessmentDraft.recommendation}</Text>
                  <Text className="mt-2 text-xs leading-5 text-muted">{assessmentDraft.disclaimer}</Text>
                </View>
              ) : null}
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity className="flex-1 rounded-2xl bg-warning py-4 active:opacity-80" onPress={() => void runPhotoAssessment()} disabled={photoAssess.isPending}>
                  <Text className="text-center font-bold text-white">{photoAssess.isPending ? "Checking..." : "AI photo check"}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveGrowthMeasurement}>
                  <Text className="text-center font-bold text-white">Save growth</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Daily inspection</Text>
              <Text className="mt-1 text-sm text-muted">Water temperature is required once per day for each tank.</Text>
              <View className="mt-4 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Water °C" value={waterTempC} onChangeText={setWaterTempC} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="pH" value={ph} onChangeText={setPh} />
              </View>
              <View className="mt-3 flex-row gap-3">
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="DO mg/L" value={oxygen} onChangeText={setOxygen} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="NH3" value={ammonia} onChangeText={setAmmonia} />
                <TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="NO2" value={nitrite} onChangeText={setNitrite} />
              </View>
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Inspection notes" value={inspectionNotes} onChangeText={setInspectionNotes} multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveInspection}><Text className="text-center font-bold text-white">Save inspection</Text></TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Feeding and weight</Text>
              <FlatList className="mt-3" data={farm.settings.feedTypes} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item} renderItem={({ item }) => (
                <TouchableOpacity className={`mr-2 rounded-full px-3 py-2 ${item === feedType ? "bg-primary" : "bg-background border border-border"}`} onPress={() => setFeedType(item)}><Text className={`text-xs font-bold ${item === feedType ? "text-white" : "text-foreground"}`}>{item}</Text></TouchableOpacity>
              )} />
              <View className="mt-4 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Feed kg" value={feedAmountKg} onChangeText={setFeedAmountKg} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Avg weight g" value={averageWeightG} onChangeText={setAverageWeightG} /></View>
              <View className="mt-3 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="number-pad" placeholder="Fish count" value={fishCount} onChangeText={setFishCount} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Product" value={feedProductName} onChangeText={setFeedProductName} /></View>
              <View className="mt-3 flex-row gap-3"><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Protein %" value={proteinPercent} onChangeText={setProteinPercent} /><TextInput className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" keyboardType="decimal-pad" placeholder="Pellet mm" value={pelletSizeMm} onChangeText={setPelletSizeMm} /></View>
              <View className="mt-3 flex-row gap-2">{(["poor", "normal", "strong"] as const).map((item) => <TouchableOpacity key={item} className={`flex-1 rounded-full px-3 py-2 ${feedBehavior === item ? "bg-primary" : "bg-background border border-border"}`} onPress={() => setFeedBehavior(item)}><Text className={`text-center text-xs font-bold ${feedBehavior === item ? "text-white" : "text-foreground"}`}>{item}</Text></TouchableOpacity>)}</View>
              <View className="mt-3 flex-row gap-2">{(["none", "little", "much"] as const).map((item) => <TouchableOpacity key={item} className={`flex-1 rounded-full px-3 py-2 ${residualFeed === item ? "bg-warning" : "bg-background border border-border"}`} onPress={() => setResidualFeed(item)}><Text className={`text-center text-xs font-bold ${residualFeed === item ? "text-white" : "text-foreground"}`}>residue {item}</Text></TouchableOpacity>)}</View>
              <TextInput className="mt-3 min-h-20 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Feeding notes" value={feedingNotes} onChangeText={setFeedingNotes} multiline />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={saveFeeding}><Text className="text-center font-bold text-white">Save feeding</Text></TouchableOpacity>
            </View>

            <View className="mt-4 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xl font-bold text-foreground">Fish photo</Text>
              <TextInput className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-foreground" placeholder="Photo notes" value={photoNotes} onChangeText={setPhotoNotes} />
              <TouchableOpacity className="mt-4 rounded-2xl bg-primary py-4 active:opacity-80" onPress={addPhoto}><Text className="text-center font-bold text-white">Add photo</Text></TouchableOpacity>
            </View>

            <Text className="mt-6 text-xl font-bold text-foreground">Latest for {selectedTank.name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-3xl border border-border bg-surface p-4">
            <View className="flex-row items-center justify-between"><Text className="font-bold text-foreground">{item.kind}</Text><Text className={`text-xs font-bold ${item.synced ? "text-success" : "text-warning"}`}>{item.synced ? "Synced" : "Pending"}</Text></View>
            <Text className="mt-1 text-sm text-muted">{formatShortDate(item.at)}</Text>
            <Text className="mt-2 text-base text-foreground">{item.text}</Text>
            {"uri" in item && item.uri ? <Image source={{ uri: item.uri }} className="mt-3 h-40 w-full rounded-2xl" resizeMode="cover" /> : null}
          </View>
        )}
        ListEmptyComponent={<Text className="rounded-3xl bg-surface p-5 text-center text-muted">No records yet for this tank.</Text>}
        ListFooterComponent={<View className="h-8" />}
      />
    </ScreenContainer>
  );
}
''')

# Tests update.
tests = root / 'tests/app-basic.test.ts'
text = tests.read_text()
text = text.replace('import { assessCatfishWeatherRisk, buildFeedingAdvice } from "../lib/catfish-advisor";', 'import { assessCatfishWeatherRisk, assessGrowthTrend, buildFeedingAdvice, buildPhotoScreeningFromInputs } from "../lib/catfish-advisor";')
text = text.replace('expect(records).toContain("Add photo");\n  });', 'expect(records).toContain("Add photo");\n    expect(records).toContain("Growth and photo check");\n    expect(records).toContain("AI photo check");\n  });')
text = text.replace('expect(store).toContain("pendingSyncCount");\n  });', 'expect(store).toContain("pendingSyncCount");\n    expect(store).toContain("growthMeasurements");\n    expect(store).toContain("photoAssessments");\n  });')
text = text.replace('});\n', r'''

  it("assesses growth trend and visible photo health signs", () => {
    const trend = assessGrowthTrend([
      { createdAt: "2026-05-01T00:00:00.000Z", lengthCm: 20, weightG: 100 },
      { createdAt: "2026-05-06T00:00:00.000Z", lengthCm: 22.5, weightG: 120 },
    ]);
    expect(trend.status).toBe("good");
    expect(trend.dailyWeightGainPercent).toBeGreaterThan(0);

    const screening = buildPhotoScreeningFromInputs({ ulcers: true, finDamage: true });
    expect(screening.severity).toBe("danger");
    expect(screening.visibleSigns).toContain("潰瘍・傷");
    expect(screening.disclaimer).toContain("確定診断ではありません");
  });
});
''', 1)
tests.write_text(text)

# TODO marking for out-of-scope agriculture item only; feature items marked after tests pass later.
todo = root / 'todo.md'
text = todo.read_text()
text = text.replace('- [ ] 農業向けの土壌・肥料・農薬・OCR機能案は今回の実装対象外として扱う', '- [x] 農業向けの土壌・肥料・農薬・OCR機能案は今回の実装対象外として扱う')
todo.write_text(text)
