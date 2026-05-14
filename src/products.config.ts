// Products & categories configuration
// 三大分類：智慧醫療 / AI 系統 / 數位行銷
// 替代舊的 works.config.ts；舊檔在所有頁面遷移後刪除。

export const LINE_PERSONAL = 'https://line.me/ti/p/i0_EpxFQVc';
export const LINE_TEAM = 'https://line.me/ti/p/zruKr3pyPK';

export type CategorySlug = 'medical' | 'ai' | 'marketing';

export type CareTag = {
  /** yao 同音字（藥/鑰/邀） */
  yao: string;
  /** 與 care 對應的中文詞（提醒/洞察/共鳴） */
  word: string;
  /** 一句話延伸解釋（hub hero 副標可用） */
  motto: string;
};

export type Category = {
  slug: CategorySlug;
  label: string;
  kicker: string;
  href: string;
  tagline: string;
  description: string;
  caretag: CareTag;
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
    caretag: {
      yao: '藥',
      word: '提醒',
      motto: '用藥的提醒，是最日常的照護',
    },
  },
  {
    slug: 'ai',
    label: 'AI 系統',
    kicker: 'AI Systems',
    href: '/ai',
    tagline: '把專業知識變成自動化、可重複跑的 AI 系統',
    description:
      '情報追蹤、合規自動化、創新方法庫 — 用 RAG + 多角色 Agent 把專業領域的決策結構化。',
    caretag: {
      yao: '鑰',
      word: '洞察',
      motto: '把專業知識解鎖成可重複的洞察',
    },
  },
  {
    slug: 'marketing',
    label: '數位行銷',
    kicker: 'Digital Marketing',
    href: '/marketing',
    tagline: '醫友 × 節氣 × 合規 — 不靠硬廣的整合行銷閉環',
    description:
      '與 GCM 預防醫學發展協會 900+ 醫療專業合作，從策略診斷、內容製作、KOL 操盤、廣告投放到法規合規一條龍。',
    caretag: {
      yao: '邀',
      word: '共鳴',
      motto: '邀請對的人，讓對的事被在乎',
    },
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
  /** 子網域 / 外部 demo 入口（有的話） */
  externalUrl?: string;
  /** GitHub 開源 repo（有的話） */
  repoUrl?: string;
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
    tagline: '可驗證的中醫問診 AI — 規則 + 證據 + FHIR 三道驗證',
    description:
      '可驗證醫療推理系統：每一步辨證都能追溯到規則、證據與標準碼。三層架構：L1 四診收集（GPT-4o Vision 舌診、Audio 聞診、rPPG 指尖測脈）、L2 規則 128 條 × 0.6 + LLM × 0.4 混合辨證、L3 RAG 經方推薦。/clinician 工作站供中醫師作為 CDSS 使用，輸出 FHIR R4 Bundle、對應 ICD-11 TM。',
    ogTitle: 'AI 華佗',
    ogStat: '128',
    ogStatLabel: 'VERIFIABLE TCM AI',
    cardKicker: '可驗證醫療推理 · CDSS · TWCM',
    cardBullets: [
      '規則 128 + LLM 混合辨證，可審查',
      'GPT-4o Vision/Audio + rPPG 指尖測脈',
      'TWCM FSH 5 Profile → FHIR R4 + ICD-11 TM',
    ],
    externalUrl: 'https://huatuo.ai.yao.care/',
    cta: { label: '到 huatuo.ai.yao.care 體驗', href: 'https://huatuo.ai.yao.care/' },
  },
  {
    slug: 'txgnn',
    category: 'medical',
    title: 'TxGNN 老藥新用',
    tagline: '知識圖譜 × 圖神經網路，30+ 國 FDA 藥品自動化預測 · 開源',
    description:
      '基於哈佛 TxGNN 模型，覆蓋 30+ 國 FDA 藥品，整合 PubMed、ClinicalTrials 證據，產出 16,700+ 藥物頁面與 FHIR 資源，與 Epic、Cerner 等 EHR 系統整合提供臨床決策支援。已上架 SMART on FHIR Gallery，原始碼在 GitHub 開源。',
    ogTitle: 'TxGNN',
    ogStat: '30+',
    ogStatLabel: 'COUNTRIES · OPEN SOURCE',
    cardKicker: '醫療 AI · 開源 · 國際上架',
    cardBullets: [
      '30+ 國 × 9 Phase 自動化',
      '142K+ AI 候選 / 16.7K 藥物頁',
      'SMART on FHIR Gallery + GitHub 開源',
    ],
    externalUrl: 'https://twtxgnn.yao.care/',
    repoUrl: 'https://github.com/yao-care/TwTxGNN',
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
    title: 'SIQC 稽核 / 評鑑 AI 系統',
    tagline: 'AI 驅動的合規稽核、ESG 評鑑、醫院評鑑文件交付平台',
    description:
      '以 GitHub 為核心的稽核 / 評鑑自動化系統，12 個 Actions workflow 串成一條管線：從 SAST、SBOM、CVE 到 64+ 份 ISMS 文件自動修復，再到離線稽核助理交付。框架可延伸至 ISO 27001/9001/14001、ESG（GRI/TCFD/SASB）、醫院評鑑（醫策會/JCI）等多種稽核情境。',
    ogTitle: 'SIQC',
    ogStat: 'AUDIT',
    ogStatLabel: 'ISO · ESG · 醫院評鑑',
    cardKicker: '稽核 × 評鑑 × 自動化',
    cardBullets: [
      '13 條掃描管線 / 64+ 份 ISMS 文件',
      'ISO / ESG / 醫院評鑑通用框架',
      'AI 稽核助理離線可用、稽核包自動發行',
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
