import { assessGrowthTrend, type RiskAssessment } from "./catfish-advisor";
import type { Feeding, GrowthMeasurement, Inspection, PhotoAssessmentRecord, Tank, WeatherRecord } from "./farm-store";

export type DiseaseKnowledgeCard = {
  id: string;
  group: "bacterial" | "viral" | "parasitic" | "fungal" | "environmental";
  name: string;
  commonNames: string[];
  earlySigns: string[];
  riskTriggers: string[];
  immediateResponse: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type TankDiseaseMonitorInput = {
  tank: Tank;
  inspections: Inspection[];
  feedings: Feeding[];
  photoAssessments: PhotoAssessmentRecord[];
  growthMeasurements: GrowthMeasurement[];
  weatherRecords?: WeatherRecord[];
  referenceDate?: Date;
};

export type DiseaseRiskAssessment = RiskAssessment & {
  category: "disease";
  tankId: string;
  tankName: string;
  diseaseIds: string[];
  evidence: string[];
  sourceLabels: string[];
};

export type TankHealthSnapshot = {
  tankId: string;
  tankName: string;
  severity: "normal" | "watch" | "danger";
  score: number;
  latestInspection?: Inspection;
  latestFeeding?: Feeding;
  latestAssessment?: PhotoAssessmentRecord;
  alerts: DiseaseRiskAssessment[];
  monitoringGaps: string[];
};

const DAY_MS = 86_400_000;

export const catfishDiseaseKnowledgeBase: DiseaseKnowledgeCard[] = [
  {
    id: "esc",
    group: "bacterial",
    name: "Enteric septicemia of catfish",
    commonNames: ["ESC", "hole-in-the-head disease", "Edwardsiella ictaluri infection"],
    earlySigns: ["feeding stops early", "lethargy", "tight circles or spinning", "head-up tail-down posture", "small red or white ulcers", "swollen belly", "popeye"],
    riskTriggers: ["20-28 °C water", "spring or fall", "handling stress", "crowding", "low oxygen", "high ammonia or nitrite"],
    immediateResponse: "Recheck water quality, reduce stress and feeding, isolate obviously affected fish when practical, and seek a fish-health professional before medication.",
    sourceLabel: "SRAC Publication 477",
    sourceUrl: "https://srac.msstate.edu/pdfs/Fact%20Sheets/477%20Enteric%20Septicemia%20of%20Catfish.pdf",
  },
  {
    id: "mas",
    group: "bacterial",
    name: "Motile Aeromonas septicemia",
    commonNames: ["MAS", "red sore disease", "Aeromonas infection"],
    earlySigns: ["poor appetite", "lethargy", "red skin patches", "ulcers", "hemorrhage", "mortality after stress"],
    riskTriggers: ["handling or transport stress", "crowding", "warm water", "organic load", "poor water quality"],
    immediateResponse: "Treat water-quality stress as the first control point, remove dead fish quickly, and obtain diagnosis before using antibiotics.",
    sourceLabel: "SRAC Publication 478",
    sourceUrl: "https://srac.msstate.edu/pdfs/Fact%20Sheets/478%20Motile%20Aeromonas%20Septicemia%20(MAS)%20in%20Fish%202019.pdf",
  },
  {
    id: "columnaris",
    group: "bacterial",
    name: "Columnaris disease",
    commonNames: ["saddleback", "cotton-wool-like bacterial lesions", "Flavobacterium columnare"],
    earlySigns: ["frayed fins", "pale patches", "skin erosion", "gill damage", "rapid breathing", "lethargy"],
    riskTriggers: ["warm water", "handling injury", "high stocking density", "low oxygen", "organic debris"],
    immediateResponse: "Lower handling stress, improve oxygen and solids management, and have lesions examined because columnaris can progress quickly.",
    sourceLabel: "Mississippi State Extension Catfish Diseases",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases",
  },
  {
    id: "ccvd",
    group: "viral",
    name: "Channel catfish virus disease",
    commonNames: ["CCVD", "channel catfish herpesvirus disease"],
    earlySigns: ["erratic swimming", "spinning", "lethargy", "swollen abdomen", "popeye", "hemorrhage"],
    riskTriggers: ["young channel catfish", "warm water", "crowding", "handling stress", "rapid temperature change"],
    immediateResponse: "Reduce stress immediately, avoid moving fish between units, document mortality pattern, and consult a diagnostic laboratory because there is no simple visual confirmation.",
    sourceLabel: "Mississippi State Extension Catfish Diseases",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases",
  },
  {
    id: "protozoa",
    group: "parasitic",
    name: "External protozoan parasites",
    commonNames: ["Trichodina", "Ichthyobodo", "Chilodonella", "Ich", "white spot disease"],
    earlySigns: ["flashing or rubbing", "white spots", "excess mucus", "gill swelling", "rapid breathing", "lethargy", "weight loss"],
    riskTriggers: ["crowding", "high ammonia", "heavy feeding", "poor water quality", "new fish introduction"],
    immediateResponse: "Confirm with microscopic examination where possible, improve water quality, and avoid blind treatments that can further reduce oxygen.",
    sourceLabel: "SRAC Publication 4701",
    sourceUrl: "https://srac.msstate.edu/pdfs/Fact%20Sheets/4701%20Protozoan%20Parasites.pdf",
  },
  {
    id: "epistylis",
    group: "parasitic",
    name: "Epistylis or Heteropolaria fouling",
    commonNames: ["white tuft disease", "fungus-like tufts", "Epistylis"],
    earlySigns: ["white fungus-like tufts", "skin irritation", "ulcers", "secondary red sore risk"],
    riskTriggers: ["poor water quality", "organic load", "crowding", "skin wounds"],
    immediateResponse: "Treat it as a water-quality and organic-load warning first; check for ulcers because bacterial infection may follow.",
    sourceLabel: "SRAC Publication 4701",
    sourceUrl: "https://srac.msstate.edu/pdfs/Fact%20Sheets/4701%20Protozoan%20Parasites.pdf",
  },
  {
    id: "pgd",
    group: "parasitic",
    name: "Proliferative gill disease",
    commonNames: ["PGD", "hamburger gill disease", "Henneguya-associated gill disease"],
    earlySigns: ["gill swelling", "respiratory distress", "surface piping", "reduced feeding", "sudden mortality"],
    riskTriggers: ["spring or fall", "pond exposure", "gill irritation", "oxygen stress"],
    immediateResponse: "Prioritize oxygen checks and expert confirmation because gill disease can look similar to oxygen or ammonia stress.",
    sourceLabel: "SRAC Publication 4701",
    sourceUrl: "https://srac.msstate.edu/pdfs/Fact%20Sheets/4701%20Protozoan%20Parasites.pdf",
  },
  {
    id: "fungal",
    group: "fungal",
    name: "Saprolegnia-like fungal infection",
    commonNames: ["water mold", "cotton-like fungus"],
    earlySigns: ["cotton-like growth", "white or gray patches", "wounds that do not heal", "egg or skin fungus"],
    riskTriggers: ["skin injury", "cold stress", "poor water quality", "handling wounds"],
    immediateResponse: "Separate badly affected fish if possible, reduce injury and organic matter, and confirm whether the white growth is fungus or protozoan fouling.",
    sourceLabel: "Mississippi State Extension Catfish Diseases",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases",
  },
  {
    id: "environmental",
    group: "environmental",
    name: "Environmental or water-quality stress syndrome",
    commonNames: ["low oxygen stress", "ammonia or nitrite stress", "temperature stress"],
    earlySigns: ["surface piping", "weak feeding", "fish at pond edge", "lethargy", "sudden group behavior change"],
    riskTriggers: ["low dissolved oxygen", "high ammonia", "high nitrite", "high temperature", "heavy rain", "overfeeding"],
    immediateResponse: "Correct oxygen and water-quality problems before assuming infection; many disease outbreaks start after stress weakens fish.",
    sourceLabel: "Mississippi State Extension Catfish Diseases",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases",
  },
];

function withinDays(createdAt: string, days: number, referenceDate = new Date()) {
  const time = Date.parse(createdAt);
  return Number.isFinite(time) && referenceDate.getTime() - time <= days * DAY_MS;
}

function latestByDate<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

function notesText(...values: Array<string | undefined>) {
  return values.filter(Boolean).join("\n").toLowerCase();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function seasonRisk(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 5 ? "spring" : month >= 9 && month <= 11 ? "fall" : undefined;
}

function scoreSeverity(score: number): "normal" | "watch" | "danger" {
  if (score >= 7) return "danger";
  if (score >= 3) return "watch";
  return "normal";
}

function makeAlert(input: Omit<DiseaseRiskAssessment, "category">): DiseaseRiskAssessment {
  return { ...input, category: "disease" };
}

export function assessTankDiseaseRisk(input: TankDiseaseMonitorInput): TankHealthSnapshot {
  const referenceDate = input.referenceDate ?? new Date();
  const recentInspections = input.inspections.filter((item) => item.tankId === input.tank.id && withinDays(item.createdAt, 14, referenceDate));
  const recentFeedings = input.feedings.filter((item) => item.tankId === input.tank.id && withinDays(item.createdAt, 14, referenceDate));
  const recentAssessments = input.photoAssessments.filter((item) => item.tankId === input.tank.id && withinDays(item.createdAt, 30, referenceDate));
  const tankGrowth = input.growthMeasurements.filter((item) => item.tankId === input.tank.id);
  const latestInspection = latestByDate(recentInspections);
  const latestFeeding = latestByDate(recentFeedings);
  const latestAssessment = latestByDate(recentAssessments);
  const text = notesText(
    input.tank.notes,
    ...recentInspections.map((item) => item.notes),
    ...recentFeedings.map((item) => item.notes),
    ...recentAssessments.map((item) => `${item.summary} ${item.recommendation} ${item.visibleSigns.join(" ")}`),
  );

  const evidence: string[] = [];
  const alerts: DiseaseRiskAssessment[] = [];
  let baselineScore = 0;

  const poorAppetiteDays = recentFeedings.filter((item) => item.feedBehavior === "poor" || item.residualFeed === "much").length;
  if (poorAppetiteDays >= 1) {
    baselineScore += poorAppetiteDays >= 2 ? 2 : 1;
    evidence.push(`${poorAppetiteDays} recent feeding record(s) show poor appetite or high leftovers.`);
  }

  if (typeof latestInspection?.dissolvedOxygen === "number" && latestInspection.dissolvedOxygen < 4) {
    baselineScore += 3;
    evidence.push(`Dissolved oxygen is ${latestInspection.dissolvedOxygen} mg/L, below the 4 mg/L danger threshold used by the app.`);
  }
  if (typeof latestInspection?.ammonia === "number" && latestInspection.ammonia > 0.5) {
    baselineScore += 2;
    evidence.push(`Ammonia is ${latestInspection.ammonia} mg/L, indicating water-quality stress.`);
  }
  if (typeof latestInspection?.nitrite === "number" && latestInspection.nitrite > 0.3) {
    baselineScore += 2;
    evidence.push(`Nitrite is ${latestInspection.nitrite} mg/L, indicating water-quality stress.`);
  }
  if (typeof latestInspection?.ph === "number" && (latestInspection.ph < 6.5 || latestInspection.ph > 8.8)) {
    baselineScore += 1;
    evidence.push(`pH is ${latestInspection.ph}, outside the preferred routine watch range.`);
  }

  const visualDanger = latestAssessment?.severity === "danger" || hasAny(text, ["ulcer", "red sore", "hemorrhage", "bleeding", "popeye", "swollen", "mortality", "dead fish"]);
  const parasiteSigns = hasAny(text, ["flashing", "rubbing", "white spot", "ich", "gill swelling", "rapid breathing", "piping", "surface", "white tuft", "fungus-like", "mucus"]);
  const neurologicSigns = hasAny(text, ["spinning", "spiral", "circle", "tail chasing", "head-up", "head up", "erratic"]);
  const lethargySigns = hasAny(text, ["letharg", "weak", "slow", "edge", "not eating", "off feed", "poor appetite"]);
  const season = seasonRisk(referenceDate);
  const temp = latestInspection?.waterTempC;
  const escTemp = typeof temp === "number" && temp >= 20 && temp <= 28;
  const warmStress = typeof temp === "number" && temp >= 25;
  const coldStress = typeof temp === "number" && temp < 18;

  if ((escTemp && (poorAppetiteDays > 0 || neurologicSigns || visualDanger || lethargySigns)) || (season && neurologicSigns)) {
    const score = baselineScore + (escTemp ? 2 : 0) + (neurologicSigns ? 3 : 0) + (visualDanger ? 2 : 0) + (poorAppetiteDays > 0 ? 1 : 0) + (season ? 1 : 0);
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["esc", "ccvd"],
      severity: scoreSeverity(score),
      title: `${input.tank.name}: ESC / viral-pattern watch`,
      reason: "Temperature seasonality plus appetite, swimming, or visible signs match published early-warning patterns for ESC and channel-catfish viral disease.",
      action: "Recheck dissolved oxygen, ammonia, nitrite, appetite, swimming behavior, and visible lesions today. Reduce handling and consult a fish-health specialist if signs repeat or mortality appears.",
      evidence: [...evidence, escTemp ? `Water temperature is ${temp} °C, within the ESC outbreak range reported by SRAC.` : "Neurologic swimming signs were noted."],
      sourceLabels: ["SRAC 477", "Mississippi State Extension"],
    }));
  }

  if ((warmStress && visualDanger) || hasAny(text, ["red sore", "aeromonas", "hemorrhage", "bloody", "ulcer"])) {
    const score = baselineScore + (warmStress ? 2 : 0) + (visualDanger ? 3 : 0);
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["mas", "columnaris"],
      severity: scoreSeverity(score),
      title: `${input.tank.name}: bacterial lesion watch`,
      reason: "Warm water, stress, ulcers, redness, or hemorrhage are consistent with bacterial disease warning patterns such as MAS, red sore disease, or columnaris.",
      action: "Do not diagnose from appearance alone. Photograph lesions, record mortality, improve oxygen and organic-load control, and seek diagnostic confirmation before medication.",
      evidence: [...evidence, "Recent notes or photo screening include ulcers, redness, hemorrhage, or similar lesions."],
      sourceLabels: ["SRAC 478", "Mississippi State Extension"],
    }));
  }

  if (parasiteSigns || hasAny(text, ["trichodina", "chilodonella", "ichthyobodo", "epistylis", "heteropolaria"])) {
    const score = baselineScore + 3 + (hasAny(text, ["gill", "piping", "rapid breathing", "surface"]) ? 2 : 0);
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["protozoa", "epistylis", "pgd"],
      severity: scoreSeverity(score),
      title: `${input.tank.name}: parasite or gill-disease watch`,
      reason: "Flashing, white spots or tufts, excess mucus, gill swelling, or respiratory stress align with external protozoan parasite and proliferative gill disease warning signs.",
      action: "Check oxygen first, then arrange microscopic gill/skin examination if signs persist. Avoid unconfirmed treatment that could worsen oxygen stress.",
      evidence: [...evidence, "Recent notes or photo screening include parasite, gill, white-spot, or white-tuft warning signs."],
      sourceLabels: ["SRAC 4701"],
    }));
  }

  if (coldStress && hasAny(text, ["cotton", "fungus", "mold", "white patch", "wound", "injury"])) {
    const score = baselineScore + 3;
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["fungal", "epistylis"],
      severity: scoreSeverity(score),
      title: `${input.tank.name}: fungus-like growth watch`,
      reason: "Cold stress, wounds, and cotton-like white growth can indicate Saprolegnia-like fungus or protozoan fouling.",
      action: "Reduce injury and organic debris, document affected fish, and confirm whether the growth is fungus or Epistylis-like fouling before treatment.",
      evidence: [...evidence, `Water temperature is ${temp} °C and notes mention white or cotton-like growth.`],
      sourceLabels: ["Mississippi State Extension", "SRAC 4701"],
    }));
  }

  const growth = assessGrowthTrend(tankGrowth);
  if (growth.severity !== "normal" && tankGrowth.length >= 2) {
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["environmental"],
      severity: growth.severity,
      title: `${input.tank.name}: growth and health cross-check`,
      reason: growth.summary,
      action: `${growth.recommendation} Treat this as supportive evidence, not a disease diagnosis by itself.`,
      evidence: ["Growth trend changed enough to require water-quality, appetite, and appearance cross-checks."],
      sourceLabels: ["App growth trend logic"],
    }));
  }

  if (alerts.length === 0 && baselineScore >= 3) {
    alerts.push(makeAlert({
      tankId: input.tank.id,
      tankName: input.tank.name,
      diseaseIds: ["environmental"],
      severity: scoreSeverity(baselineScore),
      title: `${input.tank.name}: environmental stress watch`,
      reason: "Water quality or appetite has shifted enough to increase disease susceptibility even without a specific disease pattern.",
      action: "Correct oxygen, ammonia, nitrite, pH, and feed residue before assuming infection. Recheck fish behavior after corrective action.",
      evidence,
      sourceLabels: ["Mississippi State Extension"],
    }));
  }

  const monitoringGaps = [
    latestInspection ? undefined : "No water-quality inspection in the last 14 days.",
    recentFeedings.length > 0 ? undefined : "No feeding/appetite record in the last 14 days.",
    recentAssessments.length > 0 ? undefined : "No recent photo or visible-sign screening; use it when appearance changes.",
  ].filter(Boolean) as string[];

  const maxScore = alerts.reduce((max, item) => Math.max(max, item.severity === "danger" ? 7 : item.severity === "watch" ? 3 : 0), baselineScore);
  const severity = alerts.some((item) => item.severity === "danger") ? "danger" : alerts.some((item) => item.severity === "watch") || monitoringGaps.length >= 2 ? "watch" : "normal";

  return {
    tankId: input.tank.id,
    tankName: input.tank.name,
    severity,
    score: maxScore,
    latestInspection,
    latestFeeding,
    latestAssessment,
    alerts,
    monitoringGaps,
  };
}

export function buildFarmHealthSnapshots(input: Omit<TankDiseaseMonitorInput, "tank"> & { tanks: Tank[] }) {
  return input.tanks.map((tank) => assessTankDiseaseRisk({ ...input, tank })).sort((a, b) => {
    const rank = { danger: 2, watch: 1, normal: 0 } as const;
    return rank[b.severity] - rank[a.severity] || b.score - a.score || a.tankName.localeCompare(b.tankName);
  });
}

export function summarizeFarmHealth(snapshots: TankHealthSnapshot[]) {
  const danger = snapshots.filter((item) => item.severity === "danger").length;
  const watch = snapshots.filter((item) => item.severity === "watch").length;
  const totalAlerts = snapshots.reduce((sum, item) => sum + item.alerts.length, 0);
  if (danger > 0) {
    return { severity: "danger" as const, title: "Disease warning signs need action", summary: `${danger} tank(s) show danger-level disease or stress patterns. Review evidence and contact a fish-health professional if signs persist or mortality appears.`, totalAlerts };
  }
  if (watch > 0) {
    return { severity: "watch" as const, title: "Health watch active", summary: `${watch} tank(s) need closer observation or more complete daily records.`, totalAlerts };
  }
  return { severity: "normal" as const, title: "Routine health monitoring", summary: "No disease-pattern alert is active from the stored records. Continue daily water, appetite, and appearance checks.", totalAlerts };
}
