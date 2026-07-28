// 主導覽單一來源。導覽/內鏈屬經營層，已列入 seo-ops reflect:scope；站內連結一律結尾斜線（check-internal-links gate 會擋）。
// ⚠ 2026-07-28：不得把 /news/ 放回 NAV（已凍結為歷史封存，議題追蹤入口＝/topics/）。
//    這條由 scripts/check-nav.mjs 在 build gate 機械擋下，反思若動它會 gate fail 並自行撤回。
export const NAV = [
  { href: '/', label: '首頁' },
  { href: '/medical/', label: '智慧醫療' },
  { href: '/ai/', label: 'AI 系統' },
  { href: '/care/', label: '高齡友善' },
  { href: '/marketing/', label: '數位行銷' },
  { href: '/topics/', label: '議題追蹤' },
  { href: '/#contact', label: '聯絡' },
] as const;
