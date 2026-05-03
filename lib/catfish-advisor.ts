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
