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
    id: "akishinonomiya-taxonomy",
    title: "分類・系統研究を養殖記録の前提にする",
    sourceLabel: "山階鳥類研究所・総裁プロフィール",
    sourceUrl: "https://www.yamashina.or.jp/hp/gaiyo/staff/sosai/100101.html",
    insight: "秋篠宮皇嗣殿下はナマズ類など魚類の分類・系統に関する研究業績を持つ研究者として公表されている。養殖記録では、種名・系統・導入ロットを曖昧にしないことが比較可能なデータの基盤になる。",
    appUse: "水槽・ロット名、稚魚由来、写真、成長測定を同じIDで残し、後から品種や系統差を比較できるようにする。",
  },
  {
    id: "seafdec-hatchery",
    title: "稚魚・種苗段階の管理費を分けて記録する",
    sourceLabel: "SEAFDEC/AQD Catfish resources",
    sourceUrl: "https://www.seafdec.org.ph/catfish/",
    insight: "東南アジアの水産研究機関は、ナマズ養殖で種苗生産、飼育、餌、疾病管理を一体の技術体系として扱っている。稚魚代は単なる購入費ではなく、生残率と成長結果を左右する初期投資である。",
    appUse: "稚魚代を独立したコスト区分にし、成長記録・死亡や異常の記録と同じ水槽単位で追跡する。",
  },
  {
    id: "philippines-government",
    title: "政府普及資料は現場向けチェックリストとして使う",
    sourceLabel: "Philippines BFAR / official aquaculture materials",
    sourceUrl: "https://www.bfar.da.gov.ph/",
    insight: "フィリピン政府系機関は養殖魚の生産、飼料、池管理、疾病予防などの普及情報を発信している。公的資料は地域条件に応じた実務上の基準や注意点を確認する入口になる。",
    appUse: "餌代、水道代、電気代、人件費を日次またはロット単位で入れ、販売価格と照合して現場改善に使う。",
  },
  {
    id: "mississippi-disease",
    title: "病気チェックは確定診断ではなく早期発見の補助に限定する",
    sourceLabel: "Mississippi State University Extension Catfish disease information",
    sourceUrl: "https://extension.msstate.edu/agriculture/catfish/diseases-catfish",
    insight: "米国の普及機関は、ナマズ疾病で外観、行動、水質、死亡状況を総合して判断する重要性を示している。写真だけで病名を断定するのは危険である。",
    appUse: "写真チェック結果には注意喚起と専門家相談の文言を残し、水温・水質・給餌履歴と一緒に確認する。",
  },
  {
    id: "mekong-conservation",
    title: "成長データは長期比較できる形式で残す",
    sourceLabel: "Natural History Bulletin of the Siam Society: Mekong giant catfish research",
    sourceUrl: "https://so04.tci-thaijo.org/index.php/nhbss/article/view/170006",
    insight: "メコンオオナマズなどの研究は、個体群、成長、分布、保全の情報を長期的に蓄積する価値を示している。養殖でも短期の見た目だけではなく時系列データが重要になる。",
    appUse: "体長・体重・写真・販売重量・コストを時系列に残し、ロットごとの成長効率と利益を比較する。",
  },
];
