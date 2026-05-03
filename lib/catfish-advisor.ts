export type WeatherSeverity = "normal" | "watch" | "danger";

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
  summary: string;
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
    title: main?.title ?? "Routine monitoring",
    summary: main?.reason ?? "No major weather-related risk has been detected. Continue checking water temperature and dissolved oxygen as usual.",
  };
}

export function assessCatfishWeatherRisk(weather: AdvisoryWeatherInput, inspection?: AdvisoryInspectionInput): RiskAssessment[] {
  const risks: RiskAssessment[] = [];
  const waterTemp = inspection?.waterTempC;
  const effectiveTemp = waterTemp ?? weather.airTempC;

  if (typeof effectiveTemp === "number" && effectiveTemp >= 34) {
    risks.push({ severity: "danger", category: "heat", title: "High heat risk", reason: "Air or water temperature is high, which can reduce dissolved oxygen and weaken feeding response.", action: "Measure dissolved oxygen early in the morning, avoid overfeeding, and increase aeration if available." });
  } else if (typeof effectiveTemp === "number" && effectiveTemp >= 30) {
    risks.push({ severity: "watch", category: "heat", title: "Heat watch", reason: "Warm conditions increase oxygen demand. Catfish stress may rise when water quality declines.", action: "Check water temperature, dissolved oxygen, and leftover feed before adjusting the feed amount." });
  }

  if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 50) {
    risks.push({ severity: "danger", category: "rain", title: "Water quality shift after heavy rain", reason: "Heavy rain can cause turbidity, pH shifts, and inflow-related water quality changes.", action: "After rain, check pH, turbidity, and dissolved oxygen. Act quickly if fish gather at the surface." });
  } else if (typeof weather.rainMm24h === "number" && weather.rainMm24h >= 20) {
    risks.push({ severity: "watch", category: "rain", title: "Rainfall watch", reason: "Meaningful rainfall is forecast or recorded. Pond water quality can change quickly.", action: "Keep an observation note after rain and check appetite and water condition before feeding." });
  }

  if (typeof weather.pressureTrendHpa === "number" && weather.pressureTrendHpa <= -5) {
    risks.push({ severity: "watch", category: "pressure", title: "Falling pressure", reason: "A short-term pressure drop can signal changing weather and the need to watch dissolved oxygen.", action: "Before feeding, observe surfacing, swimming behavior, and appetite. Reduce feed if anything looks abnormal." });
  }

  if (typeof weather.humidityPercent === "number" && typeof weather.airTempC === "number" && weather.humidityPercent >= 90 && weather.airTempC >= 30) {
    risks.push({ severity: "watch", category: "humidity", title: "Hot and humid conditions", reason: "High heat and humidity can keep water temperature elevated and increase early-morning oxygen risk.", action: "Prioritize early-morning dissolved oxygen checks and feed only an amount that leaves no residue." });
  }

  if (typeof inspection?.dissolvedOxygen === "number" && inspection.dissolvedOxygen < 4) {
    risks.push({ severity: "danger", category: "water", title: "Low dissolved oxygen", reason: "Dissolved oxygen is low, raising stress and mortality risk for catfish.", action: "Stop feeding and follow the farm safety procedure for aeration, water exchange, or emergency response." });
  }

  if (typeof inspection?.ammonia === "number" && inspection.ammonia > 0.5) {
    risks.push({ severity: "watch", category: "water", title: "Ammonia watch", reason: "Ammonia is elevated. Toxicity can rise under warm and high-pH conditions.", action: "Reduce feeding and re-check pH and water temperature together with ammonia." });
  }

  if (risks.length === 0) {
    risks.push({ severity: "normal", category: "water", title: "Routine monitoring", reason: "No major weather-driven risk is detected from the current inputs.", action: "Continue daily checks for water temperature, pH, dissolved oxygen, and appetite." });
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
  if (weightG < 50) return { min: 35, max: 40, label: "Prioritize high-protein feed for fry" };
  if (weightG < 200) return { min: 30, max: 36, label: "Use roughly 30-36% protein during grow-out" };
  return { min: 28, max: 34, label: "For larger fish, avoid excessive protein and adjust based on water quality" };
}

export function buildFeedingAdvice(input: FeedingAdviceInput): FeedingAdvice {
  const temp = input.inspection?.waterTempC ?? input.weather?.airTempC;
  let rate = baseFeedRatePercent(temp);
  const cautions: string[] = [];

  if (input.residualFeed === "much") {
    rate *= 0.65;
    cautions.push("Because leftover feed is high, reduce the next feeding and check water quality.");
  } else if (input.appetite === "poor") {
    rate *= 0.75;
    cautions.push("Because appetite is weak, check for disease, low oxygen, or water temperature change.");
  } else if (input.appetite === "strong" && input.residualFeed === "none") {
    rate *= 1.05;
  }

  if ((input.weather?.rainMm24h ?? 0) >= 20) {
    rate *= 0.85;
    cautions.push("After rain, feed conservatively because water quality can shift quickly.");
  }

  if ((input.inspection?.dissolvedOxygen ?? 99) < 4 || (input.weather?.airTempC ?? 0) >= 34) {
    rate *= 0.5;
    cautions.push("Under low oxygen or high heat, strongly reduce feeding or consider pausing it.");
  }

  const biomassKg = input.fishCount && input.fishCount > 0 ? (input.averageWeightG / 1000) * input.fishCount : undefined;
  const recommendedFeedKg = biomassKg ? Math.max(0, Number(((biomassKg * rate) / 100).toFixed(2))) : undefined;
  const protein = targetProteinRange(input.averageWeightG);

  let productAdvice = `${protein.label}.`;
  if (typeof input.proteinPercent === "number") {
    if (input.proteinPercent < protein.min) {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is low; if growth rate is the priority, consider a product at or above ${protein.min}%.`;
    } else if (input.proteinPercent > protein.max + 4) {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is high. Watch for leftover feed and ammonia increase.`;
    } else {
      productAdvice += ` The current protein level (${input.proteinPercent}%) is close to the target range.`;
    }
  }

  if (typeof input.pelletSizeMm === "number" && input.averageWeightG < 50 && input.pelletSizeMm > 2) {
    cautions.push("Pellet size may be large for the average body weight. Check whether smaller pellets are easier to eat.");
  }

  const amountText = recommendedFeedKg ? `Recommended feed is about ${recommendedFeedKg} kg/day.` : "Enter fish count to calculate recommended kg/day.";
  return { recommendedFeedKg, feedRatePercent: Number(rate.toFixed(2)), summary: `${amountText} The guide rate is ${rate.toFixed(2)}% of estimated biomass. Adjust using actual leftover feed, appetite, and water quality.`, productAdvice, cautions };
}

export function assessGrowthTrend(measurements: GrowthMeasurementInput[]): GrowthAssessment {
  const ordered = [...measurements].filter((item) => Number.isFinite(item.lengthCm) && Number.isFinite(item.weightG)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ordered.length < 2) {
    return { status: "insufficient", severity: "watch", title: "Not enough growth data", summary: "At least two length and weight records from the same tank are needed to evaluate growth trend.", recommendation: "Use a consistent measuring method and record length in cm and weight in g next time. Do not conclude from photos alone." };
  }

  const previous = ordered[ordered.length - 2];
  const latest = ordered[ordered.length - 1];
  const days = Math.max(1, Math.round((new Date(latest.createdAt).getTime() - new Date(previous.createdAt).getTime()) / 86_400_000));
  const weightGain = latest.weightG - previous.weightG;
  const lengthGain = latest.lengthCm - previous.lengthCm;
  const dailyWeightGainPercent = previous.weightG > 0 ? ((latest.weightG / previous.weightG) ** (1 / days) - 1) * 100 : 0;

  if (weightGain < 0 || lengthGain < -0.5) {
    return { status: "decline", severity: "danger", title: "Weight decline watch", summary: `Weight changed by ${Math.abs(weightGain).toFixed(1)} g from the previous record. It may be measurement error, but appetite, water quality, and appearance should be checked.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Check scale and sampling conditions. If appetite loss, low oxygen, redness, ulcers, swollen belly, or mortality is present, consider isolation and expert advice." };
  }

  if (dailyWeightGainPercent < 0.15 && days >= 3) {
    return { status: "slow", severity: "watch", title: "Growth may be slowing", summary: `Weight gain over ${days} days is small, about ${dailyWeightGainPercent.toFixed(2)}% per day.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Review feeding amount, pellet size, protein level, water temperature, dissolved oxygen, and leftover feed together." };
  }

  if (dailyWeightGainPercent > 5 || latest.weightG > previous.weightG * 1.8) {
    return { status: "rapid", severity: "watch", title: "Check sudden change", summary: "The increase from the previous record is large, so confirm whether the sampled fish or input value changed.", dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Confirm the same measuring conditions and remeasure if needed. If swollen belly or other abnormal appearance is present, also consider disease risk." };
  }

  return { status: "good", severity: "normal", title: "Growth trend is on track", summary: `Over ${days} days, weight changed by ${weightGain.toFixed(1)} g and length by ${lengthGain.toFixed(1)} cm.`, dailyWeightGainPercent: Number(dailyWeightGainPercent.toFixed(2)), lengthGainCm: Number(lengthGain.toFixed(1)), comparedDays: days, recommendation: "Maintain this trend while also recording daily water temperature, dissolved oxygen, and appetite." };
}

export function buildPhotoScreeningFromInputs(signs: VisibleHealthSigns): PhotoScreening {
  const visibleSigns = [
    signs.redness ? "Redness or bleeding spots" : undefined,
    signs.ulcers ? "Ulcers or wounds" : undefined,
    signs.whiteSpots ? "White spots or cotton-like growth" : undefined,
    signs.finDamage ? "Fin damage" : undefined,
    signs.swollenBelly ? "Swollen belly" : undefined,
    signs.popeye ? "Popeye" : undefined,
    signs.abnormalColor ? "Abnormal body color" : undefined,
  ].filter(Boolean) as string[];

  const severe = signs.ulcers || signs.swollenBelly || signs.popeye;
  const severity = severe ? "danger" : visibleSigns.length > 0 ? "watch" : "normal";
  const title = severity === "danger" ? "Strong warning signs" : severity === "watch" ? "Visible appearance signs" : "No obvious visible abnormality";
  const recommendation = severity === "danger" ? "Check water quality, appetite, and swimming behavior. If the case worsens or mortality occurs, consider isolation and expert advice." : severity === "watch" ? "Keep observing the same fish and check water temperature, dissolved oxygen, ammonia, and nitrite." : "No major visible abnormality was selected from the photo. Continue daily appetite and water quality checks.";

  return { severity, title, summary: visibleSigns.length ? `Selected visible signs: ${visibleSigns.join(", ")}` : "No visible signs were selected.", visibleSigns, recommendation, disclaimer: "Photo screening is not a definitive diagnosis. It supports farmer observation, water testing, and expert consultation when needed; it does not identify a disease name by itself." };
}
