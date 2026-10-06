// Products & categories configuration
// 三大分類：智慧醫療 / AI 系統 / 數位行銷
// 替代舊的 works.config.ts；舊檔在所有頁面遷移後刪除。

export const LINE_PERSONAL = 'https://line.me/ti/p/i0_EpxFQVc';
export const LINE_TEAM = 'https://line.me/ti/p/zruKr3pyPK';

export type CategorySlug = 'medical' | 'ai' | 'care' | 'marketing';

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
    href: '/medical/',
    tagline: '用藥提醒、診斷推理、全齡評估，都對得上國際標準碼',
    description:
      '用 LINE、Telegram 送提醒，靠 ATC 藥品編碼與 SMART on FHIR 跟醫院系統對接，藥師不必重打一次處方。',
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
    href: '/ai/',
    tagline: '老手才做得來的判斷，寫成每天自己會跑的系統',
    description:
      '情報追蹤、合規稽核、創新方法庫三條線，都用 RAG 加多角色 Agent 把判斷流程寫下來。',
    caretag: {
      yao: '鑰',
      word: '洞察',
      motto: '專業判斷鎖在老手腦裡，解開才用得上',
    },
  },
  {
    slug: 'care',
    label: '高齡友善',
    kicker: 'Age-Friendly Care',
    href: '/care/',
    tagline: '長者走過鏡頭就完成報到，衰弱的徵兆也能提早篩出來',
    description:
      '台灣 2025 年邁入超高齡社會。長照據點用無接觸報到省掉簽名手續，Smart Geri 幫忙篩出衰弱的長輩，兩邊的資料都能以 SMART on FHIR 送進收案後端。這條線呼應 GCM 預防醫學發展協會的公益使命。',
    caretag: {
      yao: '耀',
      word: '陪伴',
      motto: '讓晚年發光，有人陪伴',
    },
  },
  {
    slug: 'marketing',
    label: '數位行銷',
    kicker: 'Digital Marketing',
    href: '/marketing/',
    tagline: '不靠硬廣：醫療專業出面、節氣內容鋪陳、法規先過一輪',
    description:
      '與 GCM 預防醫學發展協會的 900+ 醫療專業合作，策略診斷、內容製作、KOL 操盤、廣告投放、法規合規五段都接。',
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
  | 'func'
  | 'geri'
  | 'pedi'
  | 'fhir-server'
  | 'intel'
  | 'siqc'
  | 'triz'
  | 'goalkeeper'
  | 'ods'
  | 'sign';

/** 智慧醫療分類下的子分組（其他分類不分組） */
export type MedicalGroupSlug = 'clinical' | 'assessment';

export type ProductGroup = {
  slug: MedicalGroupSlug;
  label: string;
  kicker: string;
  description: string;
};

export const MEDICAL_GROUPS: readonly ProductGroup[] = [
  {
    slug: 'clinical',
    label: '用藥與診療',
    kicker: 'Clinical & Medication',
    description: '用藥提醒與診斷推理這兩件事，都對齊 ATC、SMART on FHIR、TWCM 等國際標準。',
  },
  {
    slug: 'assessment',
    label: '全齡預防醫學評估',
    kicker: 'Preventive Assessment · SMART on FHIR',
    description:
      '成人、高齡、兒童三套自評工具，結果一律紅黃綠分級並附衛教轉介，可送進 GCM 收案後端。',
  },
] as const;

export type Product = {
  slug: ProductSlug;
  category: CategorySlug;
  /** 僅 medical 分類使用，決定在 hub 內歸入哪個子分組 */
  group?: MedicalGroupSlug;
  title: string;
  tagline: string;
  description: string;
  ogTitle: string;
  ogStat: string;
  ogStatLabel: string;
  cardKicker: string;
  cardBullets: readonly string[];
  /**
   * 對外別名 — 使用者與 LLM 實際會講出口的名字（例：TwTxGNN）。
   * 用於 SoftwareApplication.alternateName 與 /llms.txt，讓「品牌名 → 公司」對得起來。
   */
  alternateNames?: readonly string[];
  /** 子網域 / 外部 demo 入口（有的話） */
  externalUrl?: string;
  /** GitHub 開源 repo（有的話） */
  repoUrl?: string;
  /** 額外的官方據點（Wikidata 項目、上架頁等），併入 SoftwareApplication.sameAs */
  extraSameAs?: readonly string[];
  /** content：入口位置代號，會以 data-cta 送進 GA4 的 cta_click（取代舊的 utm_content）。 */
  cta: { label: string; href: string; content?: string };
};

export const PRODUCTS: readonly Product[] = [
  // ─── 智慧醫療 ────────────────────────────────────────
  {
    slug: 'yaocare',
    category: 'medical',
    group: 'clinical',
    title: '藥提醒',
    tagline: '依 ATC 編碼，用 LINE、Telegram 提醒病人吃藥',
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
    group: 'clinical',
    title: 'AI 華佗',
    tagline: '可驗證的中醫問診 AI：每一步辨證都追得到規則與證據',
    description:
      '可驗證醫療推理系統：每一步辨證都能追溯到規則、證據與標準碼。三層架構：L1 四診收集（GPT-4o Vision 舌診、Audio 聞診、rPPG 指尖測脈）、L2 規則 128 條 × 0.6 + LLM × 0.4 混合辨證、L3 RAG 經方推薦。/clinician 工作站供中醫師作為 CDSS 使用，輸出 FHIR R4 Bundle、對應 ICD-11 TM。',
    ogTitle: 'AI 華佗',
    ogStat: '128',
    ogStatLabel: 'VERIFIABLE TCM AI',
    cardKicker: '可驗證醫療推理 · CDSS · TWCM',
    cardBullets: [
      '規則 128 + LLM 混合辨證，可審查',
      'GPT-4o Vision/Audio + rPPG 指尖測脈',
      'TWCM FSH 5 Profile 輸出 FHIR R4，對應 ICD-11 TM',
    ],
    externalUrl: 'https://huatuo.ai.yao.care/',
    cta: { label: '到 huatuo.ai.yao.care 體驗', href: 'https://huatuo.ai.yao.care/' },
  },
  {
    slug: 'txgnn',
    category: 'medical',
    group: 'clinical',
    title: 'TxGNN 老藥新用',
    tagline: '老藥是否還有其他用途，TxGNN 用 AI 跑過 30+ 國核准藥品清單去預測候選，原始碼開源（台灣站 TwTxGNN）',
    description:
      '老藥新用（drug repurposing）用 AI 從已上市藥物裡找其他疾病的治療線索，不必重新做新藥研發。TxGNN 以哈佛大學團隊的模型建置，藥提醒科技有限公司（yao.care）做成公開平台，台灣站 TwTxGNN（twtxgnn.yao.care）可直接查詢。涵蓋 30+ 國 FDA 藥品資料，整合 PubMed 文獻與 ClinicalTrials 臨床試驗證據，產出 16,700+ 藥物頁面與 FHIR 資源，並與 Epic、Cerner 等 EHR 系統整合，已上架 SMART on FHIR Gallery，原始碼於 GitHub 開源。',
    alternateNames: [
      'TwTxGNN',
      'TwTxGNN 老藥新用驗證報告',
      'yao.care TxGNN',
      'TxGNN Drug Repurposing Platform',
    ],
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
    // Wikidata 的 TwTxGNN 項目（P178 developer → Q140265007 公司項目，公司側 P1830 回指）。
    // 官網 → Wikidata 這條邊是實體鏈的最後一環，見 docs/wikidata-txgnn.md
    extraSameAs: [
      'https://www.wikidata.org/wiki/Q140692750',
      'https://apps.smarthealthit.org/app/twtxgnn-smart-app',
    ],
    cta: { label: '討論技術合作', href: LINE_PERSONAL },
  },
  {
    slug: 'func',
    category: 'medical',
    group: 'assessment',
    title: 'Smart Func 成人功能健康評估',
    tagline: '依 WHO 內在能力(IC)框架，10–15 分鐘自評成人五大功能，紅黃綠分級 + 衛教轉介',
    description:
      '依世界衛生組織「內在能力（Intrinsic Capacity）」框架設計的成人功能健康自評工具，涵蓋活力、行動、認知、心理、感官五大功能。智慧分支題型讓健康者快速通過、有警訊者才深入；結果頁以紅黃綠分級給出自我觀察或就醫建議，並附個人化衛教與轉介；偵測到憂鬱／自傷訊號時顯示求助專線。100% 在瀏覽器端運算，可選擇以 SMART on FHIR 上傳合作院所或 GCM 收案。',
    ogTitle: 'Smart Func',
    ogStat: '5',
    ogStatLabel: 'IC DOMAINS · FHIR',
    cardKicker: '成人功能評估 · WHO 內在能力',
    cardBullets: [
      '活力 / 行動 / 認知 / 心理 / 感官 五大功能',
      '智慧分支題型，健康者快速通過',
      '紅黃綠分級 + 衛教轉介，含自傷訊號安全網',
    ],
    externalUrl: 'https://smart-func-cds.yao.care/',
    repoUrl: 'https://github.com/yao-care/smart-func-cds',
    cta: { label: '免費自我評估', href: 'https://smart-func-cds.yao.care' },
  },
  {
    slug: 'geri',
    category: 'medical',
    group: 'assessment',
    title: 'Smart Geri 高齡周全性評估',
    tagline: 'CFS 衰弱量表 + 多面向 CGA，公眾自篩與專業臨床雙模式，SMART on FHIR',
    description:
      'Smart Geri 的 Geri 取自老年醫學（Geriatric Medicine）；這是針對高齡長者的周全性評估（CGA）系統，先用臨床衰弱量表（CFS 1–9）分級，再評估認知、情緒、營養、行動步態、用藥、社會支持等多個面向。提供「公眾／家屬自篩」與「專業臨床」雙模式，智慧分支由短篩到深評；含五次坐站等相機計時功能測驗，結果以紅黃綠分級給出轉介建議，並自動配對衛教內容。離線可用 PWA，資料留在裝置，可選擇上傳醫院 FHIR 或 GCM 收案。',
    ogTitle: 'Smart Geri',
    ogStat: 'CGA',
    ogStatLabel: 'CFS 1–9 · FRAILTY',
    cardKicker: '高齡周全性評估 · CFS / CGA',
    cardBullets: [
      'CFS 1–9 衰弱分級 + 多面向評估',
      '公眾自篩 / 專業臨床 雙模式',
      '五次坐站等功能測驗，紅黃綠轉介',
    ],
    externalUrl: 'https://smart-geri-cds.yao.care/',
    repoUrl: 'https://github.com/yao-care/smart-geri-cds',
    cta: { label: '免費自我評估', href: 'https://smart-geri-cds.yao.care/' },
  },
  {
    slug: 'pedi',
    category: 'medical',
    group: 'assessment',
    title: 'Smart Pedi 兒童發展評估',
    tagline: '2 月–6 歲 ASQ-3 對標，六大發展領域常模化分級，3–5 分鐘篩檢',
    description:
      '針對 2 個月至 6 歲兒童的發展篩檢工具，依年齡帶（7 段）給出對應問卷，涵蓋粗動作、精細動作、語言理解、語言表達、認知、社會情緒六大領域，對齊國健署兒童健康手冊與 ASQ-3。可選互動測驗（圖卡辨識、繪圖描摹、語音錄製、動作影片）；以常模化分數判讀，−2SD 為紅旗，並以雷達圖對比同齡基準，紅黃綠分級給出觀察或轉介建議。資料留在瀏覽器，可選擇上傳醫療院所或 GCM 收案。',
    ogTitle: 'Smart Pedi',
    ogStat: '6',
    ogStatLabel: 'DOMAINS · ASQ-3',
    cardKicker: '兒童發展篩檢 · ASQ-3 常模',
    cardBullets: [
      '7 個年齡帶，各查六大發展領域（對齊國健署手冊）',
      '互動測驗：圖卡 / 語音 / 繪圖 / 動作影片',
      '−2SD 紅旗，雷達圖對比同齡常模',
    ],
    externalUrl: 'https://smart-pedi-cds.yao.care/',
    repoUrl: 'https://github.com/yao-care/smart-pedi-cds',
    cta: { label: '免費自我評估', href: 'https://smart-pedi-cds.yao.care/' },
  },
  {
    slug: 'fhir-server',
    category: 'medical',
    group: 'assessment',
    title: 'SMART on FHIR 收案伺服器',
    tagline: '通用收案與個案管理後端：Smart Func、Geri、Pedi 三套自評都能送進來，GCM 預防醫學發展協會是導入案例',
    description:
      '通用的 SMART on FHIR 收案與個案管理後端：Smart Func（成人）、Smart Geri（高齡）、Smart Pedi（兒童）三套自評工具都能把結果以 FHIR R4 QuestionnaireResponse 送來收案。民眾僅填暱稱、由系統產生收案碼（免帳號密碼），重複評估自動歸戶；後台提供個案狀態追蹤、團隊指派、危險訊號自動升級。隱私優先：先去識別化，原文與個資原值不寫入稽核。全程可稽核，每日加密備份並異地備援；以 OAuth 2.0 + PKCE 交付、符合 Inferno FHIR 測試。GCM 預防醫學發展協會為目前的導入案例。',
    ogTitle: 'SMART on FHIR 收案伺服器',
    ogStat: 'FHIR',
    ogStatLabel: 'R4 · OAUTH2 PKCE',
    cardKicker: '通用收案後端 · SMART on FHIR',
    cardBullets: [
      'Smart Func / Geri / Pedi 三系統皆可收案（FHIR R4）',
      '暱稱 + 收案碼免帳密，重複評估自動歸戶',
      '個案管理 + 危險訊號升級；GCM 協會為導入案例',
    ],
    cta: { label: '談收案串接 / 合作', href: 'mailto:service@yao.care' },
  },
  // ─── AI 系統 ────────────────────────────────────────
  {
    slug: 'intel',
    category: 'ai',
    title: '情報自動化系統',
    tagline: '新聞抓取、財務告警、投資回測，都由 GitHub Actions 每天自己跑',
    description:
      '用 GitHub Actions 做資訊搜集自動化。參考實例：23 條產業供應鏈情報追蹤系統，每日自動監控 500 + 上中下游公司，產出新聞事件、財務異常告警與投資回測分析。可擴展到任何資訊密集領域。',
    ogTitle: 'Intel',
    ogStat: '23',
    ogStatLabel: 'SUPPLY CHAINS',
    cardKicker: '資訊搜集自動化',
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
      '用 GitHub 做稽核與評鑑自動化，12 個 Actions workflow 串成一條管線：SAST、SBOM、CVE 掃描，64+ 份 ISMS 文件自動修復，最後交付離線稽核助理。框架可延伸至 ISO 27001/9001/14001、ESG（GRI/TCFD/SASB）、醫院評鑑（醫策會/JCI）等多種稽核情境。',
    ogTitle: 'SIQC',
    ogStat: 'AUDIT',
    ogStatLabel: 'ISO · ESG · 醫院評鑑',
    cardKicker: '稽核與評鑑自動化',
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
      'TRIZ（發明問題解決理論）AI 知識庫系統。涵蓋 40 發明原則（含 169 副原則）、39 工程參數、263 條矛盾矩陣、4 分離原理、Oxford Effects、AutoTRIZ Cases。多角色 AI 自動分析：先描述問題，找出矛盾，對到適用的原則，再生成解法。',
    ogTitle: 'triz-ai',
    ogStat: '263',
    ogStatLabel: 'CONTRADICTION MATRIX',
    cardKicker: 'TRIZ 方法庫 · 多角色 Agent',
    cardBullets: [
      '40 原則 + 39 參數 + 263 矩陣',
      'crawl / chunk / embed 的 RAG 管線',
      '多角色 SYSTEM_PROMPT 協作',
    ],
    cta: { label: '想用在我們公司', href: LINE_PERSONAL },
  },
  {
    slug: 'goalkeeper',
    category: 'ai',
    title: 'goalkeeper 醫療 AI 合規守門',
    tagline: '醫療 AI 內容的合規守門 API：回報五道檢查的法規符合狀態，放行與否由你決定',
    description:
      '醫療 AI 內容的合規「查核器」：送進 AI 產出的醫療內容，依台灣醫療法規回報五道檢查（揭露免責、來源標註、越權診斷、個資外洩、幻覺查核）各自的狀態與依據法條，但不替你做整體放行決定。依據衛福部《醫療機構應用生成式人工智慧指引》(115.05.29) 等多部法律，每道檢查綁多條法源、規範版本可鎖定可重現。提供 REST API 與 MCP Server（AI agent 串接），隱私優先：呼叫端送原文後服務先在內部去識別化，原文與個資原值永不寫入稽核。',
    ogTitle: 'goalkeeper',
    ogStat: '5',
    ogStatLabel: 'CHECKS · API · MCP',
    cardKicker: '醫療 AI 合規 · API / MCP',
    cardBullets: [
      '五道檢查：揭露 / 來源 / 越權診斷 / 個資 / 幻覺',
      '每道綁台灣法源，規範版本可鎖定、可稽核重現',
      'REST API + MCP Server；隱私優先，原文不入稽核',
    ],
    externalUrl: 'https://goalkeeper.yao.care/',
    cta: { label: '申請串接 / API 金鑰', href: 'mailto:service@yao.care' },
  },
  {
    slug: 'ods',
    category: 'ai',
    title: 'ODS 公文 AI',
    tagline: '公文範例加上 24 條格式檢核，讓機關與小型單位更快開案',
    description:
      'ODS 公文 AI 提供補助核銷、陳情轉請、開會通知、公告與簽稿等公文範例，並附 24 條格式檢核逐條結果。公開網站先讓承辦找得到可參考的寫法；機關可申請試用，小型單位可直接自助註冊使用服務。',
    ogTitle: 'ODS 公文 AI',
    ogStat: '24',
    ogStatLabel: '格式檢核 · 公文範例',
    cardKicker: '公文 AI · 導入服務',
    cardBullets: [
      '補助核銷、陳情轉請、開會通知等公文範例',
      '24 條格式檢核，逐條指出不通過項目',
      '機關申請試用；小型單位可自助註冊',
    ],
    alternateNames: ['ODS', '公文 AI', 'ODS 公文 AI'],
    externalUrl: 'https://www.ods.yao.care/',
    cta: {
      label: '前往 ODS 公文 AI',
      // 乾淨網址：跨站 linker 已保留來源，UTM 只會覆寫歸因（理由見 src/pages/ai/ods.astro）。
      href: 'https://www.ods.yao.care/',
      content: 'product_cta',
    },
  },
  // ─── 高齡友善 ────────────────────────────────────────
  {
    slug: 'sign',
    category: 'care',
    title: '長者友善無接觸報到',
    tagline: '純前端人臉辨識報到，零雲端、零安裝，自動語音問候 + 風險分級警示',
    description:
      '給長照據點、日照中心、社區關懷站用的無接觸報到系統。長者走過鏡頭即自動辨識身分並依時段語音問候，免按鈕、免簽名、免安裝 App。所有臉部與紀錄資料 100% 留在裝置瀏覽器、零雲端傳輸；內建失蹤、失智、黑白名單、VIP 等風險分級警示，並自動產出每日簽到名冊，可直接複製貼上政府社政平台。離線可用 PWA。',
    ogTitle: '長者友善無接觸報到',
    ogStat: 'FACE',
    ogStatLabel: 'ZERO-CLOUD PWA',
    cardKicker: '長照場域 · 高齡友善報到',
    cardBullets: [
      '走過鏡頭自動辨識 + 分時段語音問候',
      '資料 100% 留在裝置，零雲端傳輸',
      '失蹤 / 失智 / 黑白名單風險分級警示',
      '自動產出每日簽到名冊，可貼政府平台',
    ],
    externalUrl: 'https://sign.yao.care/',
    repoUrl: 'https://github.com/yao-care/agent.facial.signature',
    cta: { label: '看線上服務站', href: 'https://sign.yao.care/' },
  },
];

export const PRODUCT_BY_SLUG: Record<ProductSlug, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.slug, p]),
) as Record<ProductSlug, Product>;

export const productsByCategory = (slug: CategorySlug): readonly Product[] =>
  PRODUCTS.filter((p) => p.category === slug);

/** 取得智慧醫療某子分組的產品（依 PRODUCTS 順序） */
export const productsByGroup = (group: MedicalGroupSlug): readonly Product[] =>
  PRODUCTS.filter((p) => p.category === 'medical' && p.group === group);
