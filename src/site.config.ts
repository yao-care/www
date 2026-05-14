export const SITE = {
  name: 'yao.care',
  url: 'https://www.yao.care',
  title: 'yao.care — 用 AI 把硬問題變成可重複的系統',
  description:
    '智慧醫療、AI 系統、數位行銷三條業務線：可驗證的中醫問診 AI、老藥新用知識圖譜、用藥提醒、產業情報自動化、ISO/ESG/醫院評鑑稽核、TRIZ 創新方法庫、整合行銷與節氣內容 — yao.care 用 AI 與自動化把硬問題變成可重複的系統。',
  keywords:
    'yao.care,智慧醫療,AI 系統,數位行銷,藥提醒,AI 華佗,中醫 AI,TxGNN,老藥新用,SMART on FHIR,ATC 編碼,LINE 用藥提醒,情報自動化,GitHub Actions,ISO 27001,ESG,醫院評鑑,SIQC,TRIZ,RAG,AI Agent,知識工程,整合行銷,KOL,GCM',
  ogImage: '/assets/images/og/home.png',
  email: 'service@yao.care',
  address: '台中市西區台灣大道二段239號13樓 (遠東金融商業大樓)',
  lineLink: 'https://lin.ee/1F7s4pP',
  pptxLink: '/藥提醒Line民眾服務.ppsx',
  txgnnLink: 'https://twtxgnn.yao.care/',
  mapsLink: 'https://goo.gl/maps/ZkbwDs6SoqaGHjPo8',
} as const;

export const NAV = [
  { href: '/', label: '首頁' },
  { href: '/medical', label: '智慧醫療' },
  { href: '/ai', label: 'AI 系統' },
  { href: '/marketing', label: '數位行銷' },
  { href: '/news', label: '議題追蹤' },
  { href: '/#contact', label: '聯絡' },
] as const;
