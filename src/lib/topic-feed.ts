// 主題動態條目的頁內錨點（2026-07-28）——主題頁的 <li id> 與兩支 RSS 的連結共用，
// 兩邊算法必須一致，否則訂閱者點進來會落在頁首而不是那一則。
//
// 注意：topicFeed 是分目錄存放的 data collection，Astro 給的 entry.id 形如
// `child-development/f618e27a5c`（含目錄）。錨點只取檔名部分，避免 id 裡出現斜線。
export const feedAnchorId = (entryId: string) => `feed-${entryId.split('/').pop()}`;

/**
 * RSS <description> 的內容（HTML）。RSS 2.0 的慣例是把 HTML 跳脫後放進 description，
 * 閱讀器會還原並算繪——這樣「看原始報導」才會是可點的連結，而非一串裸網址。
 * 跳脫由 lib/rss.ts 的 esc() 統一處理，這裡只組 HTML。
 */
export const feedItemHtml = (
  data: { takeaway: string; source: string; url: string },
  topicTitle: string,
) =>
  `<p>${data.takeaway}</p>` +
  `<p>主題：${topicTitle}｜來源：${data.source}</p>` +
  `<p><a href="${data.url}">看原始報導</a></p>`;
