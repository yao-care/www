// 新聞文章「索引政策」單一 source of truth。
//
// 為什麼：/news 是每天自動累積的衍生議題評論，量大。低相關/薄內容若全被搜尋引擎
// 索引，會稀釋整站品質訊號、分散爬取預算，反而拖累主力頁面（產品/指南/名詞）的權重。
// 對策：低於門檻的文章發 <meta name="robots" content="noindex, follow">，並從 sitemap 排除，
// 把索引權重集中到強內容。noindex 不影響使用者瀏覽，也不擋站內連結權重流動（follow）。
//
// 調整：改下面這個門檻即可（改完 npm run deploy）。相關寫稿門檻見 fetch-news.ts 的 RELEVANCE_THRESHOLD(0.80，2026-08-03 起)。
export const NEWS_INDEX_MIN_RELEVANCE = 0.78;

/**
 * 這篇新聞該被搜尋引擎索引嗎？
 * relevance 低於門檻 → 不索引（noindex + 排除 sitemap），但仍對使用者與 AI 爬蟲開放。
 * relevance 缺值時 fail-open（視為可索引），避免意外把正常文章藏起來。
 * @param {number|undefined} relevance
 * @returns {boolean}
 */
export function isNewsIndexable(relevance) {
  return (relevance ?? 1) >= NEWS_INDEX_MIN_RELEVANCE;
}
