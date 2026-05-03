export type CatfishKnowledgeCard = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  insight: string;
  appUse: string;
};

export const catfishKnowledgeCards: CatfishKnowledgeCard[] = [
  {
    id: "philippines-bfar-catfish",
    title: "Philippine catfish farming guidance",
    sourceLabel: "Bureau of Fisheries and Aquatic Resources / Philippine public aquaculture guidance",
    sourceUrl: "https://www.bfar.da.gov.ph/",
    insight: "Farm guidance should be adapted to tropical field conditions, local feed supply, and practical pond monitoring rather than relying only on laboratory-style data.",
    appUse: "This app keeps daily records offline so farmers can continue logging during weak mobile coverage and upload later when internet is available.",
  },
  {
    id: "fao-aquaculture-records",
    title: "Record keeping supports aquaculture decisions",
    sourceLabel: "FAO aquaculture resources",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Consistent records for feeding, growth, mortality, water quality, and sales are essential for improving farm management and profitability.",
    appUse: "Tank-level logs, FCR estimates, cost records, and sales records are kept together so the farmer can compare production and business results.",
  },
  {
    id: "water-quality-oxygen",
    title: "Dissolved oxygen and heat are daily priorities",
    sourceLabel: "FAO and aquaculture extension literature",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Warm tropical water can hold less oxygen, while high feeding increases oxygen demand and waste load.",
    appUse: "Weather and inspection alerts encourage early-morning dissolved oxygen checks, conservative feeding during heat, and careful observation after rain.",
  },
  {
    id: "feed-efficiency-fcr",
    title: "FCR should be interpreted with field context",
    sourceLabel: "Aquaculture production management references",
    sourceUrl: "https://www.fao.org/fishery/en/aquaculture",
    insight: "Feed conversion ratio is useful, but mortality, grading, sampling bias, and unrecorded feeding can distort the estimate.",
    appUse: "The app presents FCR as an estimate with limitations and links it with margin and feed cost share before issuing business alerts.",
  },
  {
    id: "photo-health-screening",
    title: "Photo checks support observation, not diagnosis",
    sourceLabel: "Aquatic animal health extension guidance",
    sourceUrl: "https://www.woah.org/en/what-we-do/animal-health-and-welfare/aquatic-animals/",
    insight: "Visible signs such as ulcers, redness, fin damage, or abnormal color should trigger closer observation and water checks, not an automatic disease diagnosis.",
    appUse: "Photo screening flags visible signs and recommends water testing and expert advice when the risk is high.",
  },
];
