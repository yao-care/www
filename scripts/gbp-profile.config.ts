/*
 * Google 商家檔案（Business Profile）內容設定 — 單一 source。
 *  - 既供「手動貼上」對照，也供日後 scripts/gbp-update.ts 程式化同步（待 API 核可後建）。
 *  - 產品清單直接衍生自 src/products.config.ts → 官網改產品時，商家檔案內容同步更新。
 *
 * GCP 專案：yaocare（專案編號與擁有者帳號見主機設定 GCP_PROJECT_NUMBER、OWNER_EMAIL）。
 * Maps 既有 listing CID：12025785010180313919。
 */
import { PRODUCTS, CATEGORY_BY_SLUG } from '../src/products.config';

export const SITE_URL = 'https://www.yao.care';

export const GBP_PROFILE = {
  name: '藥提醒科技有限公司', // GBP 名稱欄＝真實法人名，不可加副標
  brand: 'yao.care',
  website: SITE_URL,
  phone: null as string | null, // TODO 用戶提供公開電話
  address: {
    addressLines: ['台灣大道二段239號13樓'],
    locality: '台中市西區',
    administrativeArea: '台中市',
    postalCode: '403',
    regionCode: 'TW',
  },
  // GBP 類別以類別 ID（gcid:...）表示；下列為對應名稱，實際 ID 待 API categories 端點解析
  primaryCategory: 'Software company',
  additionalCategories: [
    'Software development company',
    'Business to business service',
    'Marketing agency',
  ],
  description:
    '藥提醒科技（yao.care）是位於台中的醫療與 AI 科技公司，橫跨四條業務線：智慧醫療（用藥提醒、AI 華佗中醫問診、TxGNN 老藥新用、Smart Func/Geri/Pedi 全齡預防醫學評估，對接 ATC 編碼與 SMART on FHIR 標準）、AI 系統（情報自動化、ISO/ESG/醫院評鑑、TRIZ 知識庫、醫療 AI 內容合規）、高齡友善（長者無接觸報到、高齡周全性評估）、數位行銷。以可解釋、可驗證、與既有醫療系統互通為原則；部分產品開源並上架 SMART on FHIR App Gallery，老藥新用平台涵蓋 30 個國家/地區。',
  hours: null, // TODO 營業時間
  serviceArea: null as string | null, // TODO 全台 / 僅預約 / 臨櫃
};

// 產品條目：name = 產品標題、description = tagline、url = 官網產品頁（衍生自 products.config）
export const GBP_PRODUCTS = PRODUCTS.map((p) => ({
  name: p.title,
  description: p.tagline,
  url: `${SITE_URL}${CATEGORY_BY_SLUG[p.category].href}/${p.slug}`,
}));

export const GBP_SERVICES = [
  '醫療資訊系統開發',
  'SMART on FHIR / FHIR R4 整合',
  '臨床決策支援系統（CDSS）',
  'AI 系統導入',
  'RAG 知識庫建置',
  'ISO 27001 / ESG / 醫院評鑑自動化',
  '高齡友善科技',
  '數位行銷',
];

export const GBP_QNA = [
  { q: '藥提醒怎麼開始用？', a: '加官方 LINE（lin.ee/1F7s4pP）即可，免裝 App。' },
  { q: '有免費的線上工具嗎？', a: 'Smart Func / Geri / Pedi 三套自評免費、免註冊，資料留在你的裝置。' },
  { q: '你們服務哪些對象？', a: '醫院 / 診所 / 藥局、長照據點，以及需要 AI 系統或數位行銷的企業。' },
];
