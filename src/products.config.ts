// Products & categories configuration
// 三大分類：智慧醫療 / AI 系統 / 數位行銷
// 替代舊的 works.config.ts；舊檔在所有頁面遷移後刪除。

export const LINE_PERSONAL = 'https://line.me/ti/p/i0_EpxFQVc';
export const LINE_TEAM = 'https://line.me/ti/p/zruKr3pyPK';

export type CategorySlug = 'medical' | 'ai' | 'marketing';

export type Category = {
  slug: CategorySlug;
  label: string;
  kicker: string;
  href: string;
  tagline: string;
  description: string;
};

export const CATEGORIES: readonly Category[] = [
  {
    slug: 'medical',
    label: '智慧醫療',
    kicker: 'Smart Healthcare',
    href: '/medical',
    tagline: '以病人為中心，AI 從用藥提醒到診斷推理',
    description:
      '結合 LINE/Telegram 通訊軟體、ATC 藥品編碼、SMART on FHIR 互通協定，從基層用藥到醫療 AI 一條龍。',
  },
  {
    slug: 'ai',
    label: 'AI 系統',
    kicker: 'AI Systems',
    href: '/ai',
    tagline: '把專業知識變成自動化、可重複跑的 AI 系統',
    description:
      '情報追蹤、合規自動化、創新方法庫 — 用 RAG + 多角色 Agent 把專業領域的決策結構化。',
  },
  {
    slug: 'marketing',
    label: '數位行銷',
    kicker: 'Digital Marketing',
    href: '/marketing',
    tagline: '醫友 × 節氣 × 合規 — 不靠硬廣的整合行銷閉環',
    description:
      '與 GCM 預防醫學發展協會 900+ 醫療專業合作，從策略診斷、內容製作、KOL 操盤、廣告投放到法規合規一條龍。',
  },
] as const;

export const CATEGORY_BY_SLUG: Record<CategorySlug, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

export type ProductSlug =
  | 'yaocare'
  | 'huatuo'
  | 'txgnn'
  | 'intel'
  | 'siqc'
  | 'triz';

export type Product = {
  slug: ProductSlug;
  category: CategorySlug;
  title: string;
  tagline: string;
  description: string;
  ogTitle: string;
  ogStat: string;
  ogStatLabel: string;
  cardKicker: string;
  cardBullets: readonly string[];
  /** 子網域 / 外部入口（有的話） */
  externalUrl?: string;
  cta: { label: string; href: string };
};

export const PRODUCTS: readonly Product[] = [
  // ─── 智慧醫療 ────────────────────────────────────────
  {
    slug: 'yaocare',
    category: 'medical',
    title: '藥提醒',
    tagline: '以病人為中心、依 ATC 編碼，從 LINE/Telegram 提醒用藥',
    description:
      '依循藥品使用標準碼與 ATC 編碼，透過 LINE、Telegram 等通訊軟體提供用藥提醒，協助藥師追蹤服藥成效。整合健保與醫院資訊系統，無須 keyin 處方；以藥品外觀圖片提醒減少吃錯藥風險。',
    ogTitle: 'yao.care',
    ogStat: 'LINE',
    ogStatLabel: 'TELEGRAM · ATC',
    cardKicker: '基層用藥 · 通訊軟體整合',
    cardBullets: [
      'ATC 標準碼 / 健保處方整合',
      'LINE / Telegram 不用裝 App',
      '藥品外觀圖片防錯吃',
    ],
    cta: { label: '加入 LINE 體驗', href: 'https://lin.ee/1F7s4pP' },
  },
  {
    slug: 'huatuo',
    category: 'medical',
    title: 'AI 華佗',
    tagline: '中醫問診 AI · 四診合參 × 辨證論治',
    description:
      '面向民眾的中醫問診 AI 系統，模擬望聞問切流程；三層架構：L1 四診收集（GPT-4o Vision 舌診、Audio 聞診、rPPG 指尖測脈）、L2 規則 128 條 × 0.6 + LLM × 0.4 混合辨證、L3 RAG 經方推薦。/clinician 工作站供中醫師作為 CDSS 使用。',
    ogTitle: 'AI 華佗',
    ogStat: '128',
    ogStatLabel: 'TCM RULES · L1·L2·L3',
    cardKicker: '中醫 AI · CDSS · TWCM IG',
    cardBullets: [
      '128 條規則 + LLM 混合辨證',
      'GPT-4o Vision/Audio + rPPG',
      'TWCM FSH 5 Profile → FHIR R4',
    ],
    externalUrl: 'https://huatuo.ai.yao.care/',
    cta: { label: '到 huatuo.ai.yao.care 體驗', href: 'https://huatuo.ai.yao.care/' },
  },
  {
    slug: 'txgnn',
    category: 'medical',
    title: 'TxGNN 老藥新用',
    tagline: '知識圖譜 × 圖神經網路，30 國 FDA 藥品自動化預測',
    description:
      '基於哈佛 TxGNN 模型，覆蓋 30 國 FDA 藥品，整合 PubMed、ClinicalTrials 證據，產出 16,700 + 藥物頁面與 FHIR 資源，與 Epic、Cerner 等 EHR 系統整合提供臨床決策支援。已上架 SMART on FHIR Gallery。',
    ogTitle: 'TxGNN',
    ogStat: '30',
    ogStatLabel: 'COUNTRIES',
    cardKicker: '醫療 AI · 國際曝光',
    cardBullets: [
      '30 國 × 9 Phase 自動化',
      '3.1M DL 預測 / 16.7K 藥物頁',
      'SMART on FHIR Gallery 上架',
    ],
    externalUrl: 'https://twtxgnn.yao.care/',
    cta: { label: '討論技術合作', href: LINE_PERSONAL },
  },
  // ─── AI 系統 ────────────────────────────────────────
  {
    slug: 'intel',
    category: 'ai',
    title: '情報自動化系統',
    tagline: '從新聞抓取到投資分析，全流程 GitHub Actions 自動化',
    description:
      '以 GitHub Actions 為核心的資訊搜集自動化能力。參考實例：23 條產業供應鏈情報追蹤系統，每日自動監控 500 + 上中下游公司，產出新聞事件、財務異常告警與投資回測分析。可擴展到任何資訊密集領域。',
    ogTitle: 'Intel',
    ogStat: '23',
    ogStatLabel: 'SUPPLY CHAINS',
    cardKicker: '資訊搜集 × 自動化',
    cardBullets: [
      '23 條供應鏈 / 500+ 公司',
      '每日自動產出情報報告',
      'GitHub 免費方案零成本維運',
    ],
    cta: { label: '我也想要一套', href: LINE_TEAM },
  },
  {
    slug: 'siqc',
    category: 'ai',
    title: 'SIQC ISO 27001 合規系統',
    tagline: 'AI 驅動的安全掃描、文件管理、稽核包交付',
    description:
      '以 GitHub 為核心的 ISO 27001 合規自動化系統，12 個 Actions workflow 串成一條管線：從 SAST、SBOM、CVE 到 64 份 ISMS 文件自動修復，再到離線稽核助理交付。完整對照 ISO 27001:2022 / SOC 2 / OWASP ASVS / OWASP LLM Top 10。',
    ogTitle: 'SIQC',
    ogStat: 'ISO',
    ogStatLabel: '27001 · AUTOMATION',
    cardKicker: '合規 × 自動化',
    cardBullets: [
      '13 條掃描管線 / 64 份 ISMS 文件',
      '每月稽核包自動發行',
      'AI 稽核助理離線可用',
    ],
    cta: { label: '想要這套？聊聊', href: LINE_PERSONAL },
  },
  {
    slug: 'triz',
    category: 'ai',
    title: 'TRIZ 創新方法 AI 知識庫',
    tagline: '40 發明原則 × 263 矛盾矩陣，多角色 AI 協作解題',
    description:
      'TRIZ（發明問題解決理論）AI 知識庫系統。涵蓋 40 發明原則（含 169 副原則）、39 工程參數、263 條矛盾矩陣、4 分離原理、Oxford Effects、AutoTRIZ Cases。多角色 AI 自動分析：描述問題 → 識別矛盾 → 推薦原則 → 生成解法。',
    ogTitle: 'triz-ai',
    ogStat: '263',
    ogStatLabel: 'CONTRADICTION MATRIX',
    cardKicker: 'TRIZ × 多角色 Agent',
    cardBullets: [
      '40 原則 + 39 參數 + 263 矩陣',
      'crawl → chunk → embed RAG 管線',
      '多角色 SYSTEM_PROMPT 協作',
    ],
    cta: { label: '想用在我們公司', href: LINE_PERSONAL },
  },
];

export const PRODUCT_BY_SLUG: Record<ProductSlug, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.slug, p]),
) as Record<ProductSlug, Product>;

export const productsByCategory = (slug: CategorySlug): readonly Product[] =>
  PRODUCTS.filter((p) => p.category === slug);
