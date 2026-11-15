// SMART App Gallery 上架清單的共用摘要（2026-11-15 新增）
// 資料由 .github/workflows/smart-gallery.yml 每天同步到 src/data/smart-gallery.json；這裡只做整理，各頁不要寫死國別或數量。
import gallery from '../data/smart-gallery.json';
import countries from '../data/txgnn-countries.json';

const zhName = Object.fromEntries(countries.map((c) => [c.iso2, c.zh]));

/** TxGNN 各國站已上架的 App，依上架日排序 */
export const TXGNN_GALLERY_APPS = gallery.apps
  .filter((a) => a.product === 'txgnn' && a.site)
  .map((a) => ({ ...a, label: zhName[a.site as string] ?? (a.site as string) }))
  .sort((x, y) => (x.listedAt ?? '').localeCompare(y.listedAt ?? '') || x.label.localeCompare(y.label));

/** 例：「台灣、日本、巴西、泰國」 */
export const TXGNN_GALLERY_SITES = TXGNN_GALLERY_APPS.map((a) => a.label).join('、');

/** Gallery 上本公司名下全部 App 的搜尋頁 */
export const GALLERY_ORG_URL = gallery.source;

/** 例：「台灣、日本、巴西、泰國 4 個國家站的 SMART App 已上架 SMART App Gallery」 */
export const TXGNN_GALLERY_SENTENCE = `${TXGNN_GALLERY_SITES} ${TXGNN_GALLERY_APPS.length} 個國家站的 SMART App 已上架 SMART App Gallery`;
