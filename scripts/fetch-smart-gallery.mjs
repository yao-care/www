#!/usr/bin/env node
// 抓 SMART App Gallery 上「藥提醒科技有限公司」名下已發布的 App，寫成 src/data/smart-gallery.json（2026-11-15 新增）
//
//   node scripts/fetch-smart-gallery.mjs           # 抓取並寫檔（清單沒變就不改檔，避免無意義 commit）
//   node scripts/fetch-smart-gallery.mjs --check   # 只比對，有差異 exit 1
//
// 由 .github/workflows/smart-gallery.yml 每天跑；清單有變就 commit 並觸發網站部署。
// 資料來源：Gallery 搜尋頁內嵌的 window.__preloadedState（伺服器輸出，沒有公開 API）。
// 國別由 App 名稱判斷（「TwTxGNN …」→ tw），不信任 App 自填的網站網址：
// 2026-11-15 發現巴西站那筆填成了泰國站網址，這類不一致會印成警告，請到 Gallery 後台修正。
import fs from 'node:fs';

const ORG = '藥提醒科技有限公司';
const BASE = 'https://apps.smarthealthit.org';
const OUT = 'src/data/smart-gallery.json';
const searchUrl = (page) =>
  `${BASE}/apps/search?q=${encodeURIComponent(ORG)}&organization=${encodeURIComponent(ORG)}${page > 1 ? `&page=${page}` : ''}`;

const preloaded = (html) => {
  const key = 'window.__preloadedState = ';
  const i = html.indexOf(key);
  if (i < 0) throw new Error('頁面裡找不到 window.__preloadedState，Gallery 可能改版了');
  // 從 { 開始找出對應的 }，跳過字串內容
  let depth = 0, inStr = false, esc = false, start = i + key.length;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, j + 1));
  }
  throw new Error('window.__preloadedState 解析失敗');
};

const items = [];
for (let page = 1; page <= 20; page++) {
  const res = await fetch(searchUrl(page), { headers: { 'user-agent': 'yao.care-site-build' } });
  if (!res.ok) throw new Error(`Gallery 回 HTTP ${res.status}`);
  const state = preloaded(await res.text());
  const apps = state.apps ?? {};
  items.push(...(apps.items ?? []));
  if (page >= (apps.pageCount ?? 1)) break;
}

const warnings = [];
const apps = items
  .filter((a) => a.status === 'published' && (a.org_name ?? '').trim() === ORG)
  .map((a) => {
    const name = (a.name ?? '').trim();
    const m = name.match(/^([A-Za-z]{2})TxGNN\b/);
    const site = m ? m[1].toLowerCase() : null;
    const url = (a.url ?? '').trim();
    if (site && url && !url.includes(`${site}txgnn.yao.care`)) {
      warnings.push(`「${name}」的網站網址填成 ${url}，應為 https://${site}txgnn.yao.care/（請到 Gallery 後台修正）`);
    }
    if (site && a.demo_launch_url && !a.demo_launch_url.includes(`${site}txgnn.yao.care`)) {
      warnings.push(`「${name}」的試用啟動網址填成 ${a.demo_launch_url}，應為 https://${site}txgnn.yao.care/smart/launch.html（請到 Gallery 後台修正）`);
    }
    return {
      slug: a.slug,
      name,
      galleryUrl: `${BASE}/app/${a.slug}`,
      product: site ? 'txgnn' : null, // 非 TxGNN 的 App 先留 null，日後要顯示在哪個產品頁再對應
      site,
      launchUrl: a.demo_launch_url ?? null,
      listedAt: (a.created_at ?? '').slice(0, 10) || null,
    };
  })
  .sort((x, y) => x.slug.localeCompare(y.slug));

if (apps.length === 0) throw new Error('一個 App 都沒抓到，可能是 Gallery 改版或暫時異常；不覆寫既有資料');

const data = { source: searchUrl(1), organization: ORG, apps };
const json = `${JSON.stringify(data, null, 2)}\n`;
for (const w of warnings) console.log(`::warning::${w}`);

const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
if (process.argv.includes('--check')) {
  if (cur !== json) { console.error(`${OUT} 與 Gallery 現況不同`); process.exit(1); }
  console.log(`✅ ${OUT} 與 Gallery 一致（${apps.length} 個 App）`);
} else if (cur === json) {
  console.log(`沒有變化（${apps.length} 個 App）`);
} else {
  fs.writeFileSync(OUT, json);
  console.log(`已更新 ${OUT}：${apps.length} 個 App｜${apps.map((a) => a.name).join('、')}`);
}
