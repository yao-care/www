// 新聞抓取與站內呈現的單一來源設定
// 7 個 target = 6 產品 + 1 個數位行銷
// queries: Google News RSS 搜尋關鍵字
// voicePoints: Claude 寫 issueAnalysis 時可參考的「我們關心的痛點」
// proofPoints: 白名單 — designResponse 段落只能引用這些事實，每條附 #N 索引
// ctaText/ctaHref: 全文頁底部 CTA

import type { ProductSlug } from './products.config';
import { LINE_PERSONAL, LINE_TEAM } from './products.config';

export type CategorySlug = 'medical' | 'ai' | 'marketing';
export type NewsTargetSlug = ProductSlug | 'marketing';

export type NewsTarget = {
  slug: NewsTargetSlug;
  title: string;
  pageUrl: string;
  category: CategorySlug;
  categoryLabel: string;
  serviceContext: string;
  queries: readonly string[];
  voicePoints: readonly string[];
  proofPoints: readonly string[];
  ctaText: string;
  ctaHref: string;
};

export const NEWS_TARGETS: readonly NewsTarget[] = [
  {
    slug: 'yaocare',
    title: '藥提醒',
    pageUrl: '/medical/yaocare',
    category: 'medical',
    categoryLabel: '智慧醫療',
    serviceContext:
      '以病人為中心、依 ATC 編碼，從 LINE/Telegram 提供用藥提醒，協助藥師追蹤服藥成效；整合健保與醫院資訊系統，無須 keyin 處方。',
    queries: [
      '用藥提醒',
      'ATC 編碼',
      '慢性處方箋',
      '藥師服務',
      '長者用藥',
      '健保藥事',
    ],
    voicePoints: [
      '慢性處方箋第二、三次領藥率長期偏低',
      '老年患者對 App 安裝門檻高',
      '藥師缺乏跨領藥週期的追蹤工具',
      '多重用藥的混淆與交互作用風險',
      '健保藥物資源浪費議題',
    ],
    proofPoints: [
      '採用 ATC 編碼對接健保處方資料，不需藥師人工 keyin',
      '透過 LINE 與 Telegram 推播提醒，無需安裝 App',
      '提醒訊息附藥品外觀圖片，降低多重藥品混淆',
      '藥師端介面可批次查看追蹤對象的服藥達成率',
      '可與 SMART on FHIR 標準互通',
      '提供居家回診評估資訊鏈',
    ],
    ctaText: '想試看看 → 加入藥提醒 LINE',
    ctaHref: 'https://lin.ee/1F7s4pP',
  },
  {
    slug: 'huatuo',
    title: 'AI 華佗',
    pageUrl: '/medical/huatuo',
    category: 'medical',
    categoryLabel: '智慧醫療',
    serviceContext:
      '可驗證的中醫問診 AI 系統 — 規則 128 條 + LLM 混合辨證，每一步都能追溯到規則、證據與標準碼；輸出 FHIR R4 + ICD-11 TM。',
    queries: [
      '中醫 AI',
      '智慧中醫',
      '中醫資訊化',
      '醫療 AI 可解釋',
      'FHIR 中醫',
      'ICD-11 TM',
    ],
    voicePoints: [
      'LLM 黑箱在醫療場景無法被信任',
      '中醫四診標準化困難',
      '中醫與西醫資訊系統難以互通',
      '中醫師缺乏結構化的決策支援工具',
      '中醫教育與傳承的標準化挑戰',
    ],
    proofPoints: [
      '128 條八綱與臟腑規則寫在 syndromes.json，可被中醫師逐條檢視',
      '採用規則 ×0.6 + LLM ×0.4 的混合辨證權重',
      '每個結論都記錄完整推理路徑與 RAG 證據',
      '證型對應 ICD-11 TM 章節、輸出 FHIR R4 Bundle',
      'L1 四診含 GPT-4o Vision 舌診 / Audio 聞診 / rPPG 指尖測脈',
      '提供 /clinician 中醫師工作站作為 CDSS',
      '已建構 TWCM Implementation Guide 5 Profile + 6 Extension',
    ],
    ctaText: '到 huatuo.ai.yao.care 體驗',
    ctaHref: 'https://huatuo.ai.yao.care/',
  },
  {
    slug: 'txgnn',
    title: 'TxGNN 老藥新用',
    pageUrl: '/medical/txgnn',
    category: 'medical',
    categoryLabel: '智慧醫療',
    serviceContext:
      '以哈佛 TxGNN 模型為基礎的老藥新用平台，覆蓋 30+ 國 FDA 藥品；整合 PubMed、ClinicalTrials 證據；上架 SMART on FHIR Gallery、開源於 GitHub。',
    queries: [
      '老藥新用',
      'drug repurposing',
      '藥物 圖神經網路',
      'SMART on FHIR',
      'EHR 臨床決策',
      '藥物再利用',
    ],
    voicePoints: [
      '新藥研發成本與時間極高',
      '已上市藥物的潛在新適應症未被系統性探索',
      'EHR 系統與 AI 模型整合度低',
      '臨床決策支援工具缺乏跨國藥品資料',
      '預測結果缺乏文獻證據佐證的問題',
    ],
    proofPoints: [
      '雙引擎並行：知識圖譜方法 + 深度學習方法',
      '覆蓋 30+ 國 FDA 藥品資料',
      '產出 16,700+ 藥物頁面與 FHIR 資源',
      '每個預測都附帶 PubMed 文獻 + ClinicalTrials 證據包',
      '已上架 SMART on FHIR App Gallery，相容 Epic 與 Cerner',
      '原始碼以 MIT-style 授權於 GitHub 開源',
      '採 OAuth + PKCE 認證流程接入 EHR',
    ],
    ctaText: '討論技術合作 → LINE 私訊',
    ctaHref: LINE_PERSONAL,
  },
  {
    slug: 'intel',
    title: '情報自動化系統',
    pageUrl: '/ai/intel',
    category: 'ai',
    categoryLabel: 'AI 系統',
    serviceContext:
      '以 GitHub Actions 為核心的資訊搜集自動化能力 — 從爬取、清洗、標註到視覺化全流程自動化，可移植到任何資訊密集領域。',
    queries: [
      '產業情報',
      '供應鏈追蹤',
      '競爭情報',
      'GitHub Actions 自動化',
      'AI 投資分析',
      '產業研究 自動化',
    ],
    voicePoints: [
      '產業情報資料散落各處',
      '人工搜集跟不上更新速度',
      '財務、新聞、機構持倉等資料分屬不同系統',
      '異常事件偵測需要主動性而非被動翻閱',
      '可重複跑的情報生產線在中小團隊普遍缺乏',
    ],
    proofPoints: [
      '以 RSS、HTTP、Playwright 三模式並行爬取',
      '事件自動標註關鍵字、情緒分數、重要性評分',
      '監控季度財報 AR 與庫存變化，超過 ±20% 自動告警',
      '基礎設施全部跑在 GitHub Actions 免費方案',
      '參考案例覆蓋 23 條供應鏈、500+ 公司',
      '可重組到政策追蹤、競品情報、研究綜述等場景',
    ],
    ctaText: '我也想要一套 → LINE 私訊',
    ctaHref: LINE_TEAM,
  },
  {
    slug: 'siqc',
    title: 'SIQC 稽核 AI',
    pageUrl: '/ai/siqc',
    category: 'ai',
    categoryLabel: 'AI 系統',
    serviceContext:
      'AI 驅動的合規稽核、ESG 評鑑、醫院評鑑文件交付平台 — 12 個 GitHub Actions workflow 串成自動化管線，從掃描到 ISMS 文件自動修復、再到離線稽核包交付。',
    queries: [
      'ISO 27001',
      'ESG 評鑑',
      '醫院評鑑',
      'JCI',
      '資安合規 自動化',
      'ISMS',
    ],
    voicePoints: [
      '中小團隊取得 ISO 27001 認證成本極高',
      'ISMS 文件 60+ 份的人工維護不可持續',
      '安全掃描散落 SAST、滲透測試、SBOM 各跑各的',
      '稽核準備需要手動彙整文件耗時',
      '醫院與企業評鑑文件版控與條文對應困難',
    ],
    proofPoints: [
      '以 12 個 GitHub Actions workflow 串成自動化管線',
      '提供 13 條安全掃描管線 + 64 份 ISMS 文件框架',
      '對齊 ISO 27001、SOC 2 TSC、OWASP ASVS、OWASP LLM Top 10',
      '每 15 分鐘輪詢 OSV API，Critical 自動 email 告警',
      '稽核包以 GitHub Release 打包離線交付',
      '同框架可重組為 ESG（GRI/TCFD/SASB）與醫院評鑑（醫策會/JCI）',
      'AI 稽核助理為單頁離線 HTML，內嵌全部文件與報告',
    ],
    ctaText: '想要這套？聊聊 → LINE 私訊',
    ctaHref: LINE_PERSONAL,
  },
  {
    slug: 'triz',
    title: 'TRIZ AI 知識庫',
    pageUrl: '/ai/triz',
    category: 'ai',
    categoryLabel: 'AI 系統',
    serviceContext:
      'TRIZ（發明問題解決理論）AI 知識庫系統 — 涵蓋 40 發明原則、39 工程參數、263 矛盾矩陣等，多角色 AI 自動完成「描述問題 → 識別矛盾 → 推薦原則 → 生成解法」。',
    queries: [
      'TRIZ',
      '創新方法',
      '矛盾矩陣',
      '發明原則',
      'RAG 知識庫',
      'AI Agent 協作',
    ],
    voicePoints: [
      '傳統 TRIZ 工具操作門檻高、需專家陪伴',
      '創新方法在中小團隊難以系統化導入',
      '工程矛盾與物理矛盾的識別缺乏自動化工具',
      '科學效應跨領域借力的知識管理困難',
      'AI Agent 與專業知識庫整合的工程實務經驗不普及',
    ],
    proofPoints: [
      '建構 40 發明原則、39 工程參數、263 矛盾矩陣的完整向量庫',
      '涵蓋 4 分離原理、Oxford Effects、AutoTRIZ Cases',
      '採 crawl → chunk → embed 的三階段 RAG 管線',
      '多角色 SYSTEM_PROMPT 協作 + onStep callback 即時回報',
      '前端 React + Vite，後端 Express + SQLite',
      '可客製為製造業、IT 產品、商業模式創新等情境',
    ],
    ctaText: '想用在我們公司 → LINE 私訊',
    ctaHref: LINE_PERSONAL,
  },
  {
    slug: 'marketing',
    title: '數位行銷',
    pageUrl: '/marketing',
    category: 'marketing',
    categoryLabel: '數位行銷',
    serviceContext:
      '與 GCM 預防醫學發展協會 900+ 醫療專業合作的整合行銷服務 — 醫友、節氣、合規三個閉環；從策略、內容、KOL、廣告到法規一條龍。',
    queries: [
      '醫療廣告法規',
      '醫療 KOL',
      '健康內容行銷',
      '節氣行銷',
      '預防醫學 行銷',
      '保健食品 廣告',
    ],
    voicePoints: [
      '醫療相關產品的廣告法規裁罰風險高',
      '一般 KOL 缺乏專業背書、轉換率有限',
      '節氣與健康話題的內容週期性高、可規劃',
      '中小品牌缺乏跨類別投放數據',
      '素材生產速度跟不上 A/B 測試節奏',
    ],
    proofPoints: [
      '與 GCM 預防醫學發展協會 900+ 醫療專業會員合作',
      '醫友資格門檻為國家醫療專業考試 + 1,000+ 粉絲',
      '24 節氣為內容週期、4 類試作模板加速生產',
      '律師團隊把關酒類、食品、醫療廣告法規',
      'L1 一般留言、L2 客訴 2 小時內、L3 即時危機處理 SOP',
      '參考案例：跨美妝、親子、旅遊三類別 4,634 筆表單成果',
      'Meta + Google + LINE 三平台投放，導購與品牌曝光分軌',
    ],
    ctaText: '聊聊行銷需求 → LINE 私訊',
    ctaHref: LINE_TEAM,
  },
];

export const NEWS_TARGET_BY_SLUG: Record<NewsTargetSlug, NewsTarget> =
  Object.fromEntries(NEWS_TARGETS.map((t) => [t.slug, t])) as Record<
    NewsTargetSlug,
    NewsTarget
  >;

/** 每個 target 保留新聞數上限 */
export const KEEP_PER_TARGET = 8;
/** 產品頁底顯示新聞數 */
export const SHOW_PER_PRODUCT = 4;
/** 首頁 highlight 區塊顯示新聞數 */
export const SHOW_HIGHLIGHT = 3;
