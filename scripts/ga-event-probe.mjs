// 一次性診斷：實際用無頭瀏覽器載入一篇 news 文章，捲到底、停留、離開，
// 攔截送往 GA4 的 /collect 請求，印出實際送出的事件名（en=...）。
// 目的：判斷 read_complete / page_engagement 等自訂事件「有沒有真的送進 GA4」。
// 用法：node scripts/ga-event-probe.mjs [url]
import { chromium } from 'playwright';

const URL =
  process.argv[2] || 'https://www.yao.care/news/txgnn/08a2a06bc8/';

// 從 GA4 collect 請求（URL query 或 POST body）抽出所有 en=事件名
function extractEvents(urlStr, postData) {
  const events = [];
  try {
    const u = new URL(urlStr);
    const en = u.searchParams.get('en');
    if (en) events.push(en);
  } catch {}
  if (postData) {
    // GA4 batch：每行一個事件，含 en=xxx
    for (const line of String(postData).split('\n')) {
      const m = line.match(/(?:^|&)en=([^&]+)/);
      if (m) events.push(decodeURIComponent(m[1]));
    }
  }
  return events;
}

const hits = [];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 720 } });
const page = await ctx.newPage();

page.on('pageerror', (e) => console.log(`  [JS ERROR] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`  [console.error] ${m.text().slice(0, 120)}`);
});

page.on('request', (req) => {
  const url = req.url();
  // 廣捕：任何 analytics / googletagmanager 相關（含 region1.* 等區域端點）
  if (/google-analytics\.com|analytics\.google\.com|googletagmanager\.com|\/g\/collect|\/collect\?/.test(url)) {
    const isCollect = /\/(g\/)?collect/.test(url);
    const evs = isCollect ? extractEvents(url, req.postData()) : [];
    for (const e of evs) hits.push(e);
    const host = (() => { try { return new URL(url).host; } catch { return url.slice(0, 40); } })();
    // beacon/POST 的事件名常在 body：把 body 裡所有 en= 也撈出來
    const body = req.postData() || '';
    const bodyEvents = [...body.matchAll(/(?:^|&|\n)en=([^&\n]+)/g)].map((m) => decodeURIComponent(m[1]));
    for (const e of bodyEvents) if (!hits.includes(e)) hits.push(e);
    const all = [...new Set([...evs, ...bodyEvents])];
    if (isCollect) console.log(`  [collect] ${host} → ${all.length ? all.join(', ') : '(en 在別處)'} ${body ? `[body ${body.length}b]` : ''}`);
  }
});
page.on('requestfailed', (req) => {
  const url = req.url();
  if (/google-analytics|googletagmanager|analytics\.google/.test(url)) {
    console.log(`  [FAILED] ${url.slice(0, 80)} — ${req.failure()?.errorText}`);
  }
});

console.log(`載入 ${URL}`);
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(3000); // 讓 gtag 初始化 + 自動 page_view

// 確認 gtag / dataLayer / 我們的分類物件是否就緒
const state = await page.evaluate(() => ({
  winGtag: typeof window.gtag,
  bareGtag: (() => { try { return typeof gtag; } catch { return 'ReferenceError'; } })(),
  inWindow: 'gtag' in window,
  dataLayerLen: Array.isArray(window.dataLayer) ? window.dataLayer.length : -1,
  ya: typeof window.__ya,
}));
console.log(`  window.gtag=${state.winGtag}  (bare)gtag=${state.bareGtag}  'gtag' in window=${state.inWindow}  dataLayer=${state.dataLayerLen}  __ya=${state.ya}`);

// 捲到最底（觸發 scroll_depth 各階段 + read_complete sentinel）
await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = Math.max(300, Math.floor(window.innerHeight * 0.6));
  for (let y = 0; y <= document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await sleep(250);
  }
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(800);
});
// 把文章底部 sentinel 明確帶進視窗（觸發 read_complete）
await page.evaluate(() => {
  const el = document.querySelector('article') || document.querySelector('main');
  if (el) el.lastElementChild?.scrollIntoView({ block: 'end' });
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(2500); // 累積 engaged 秒數 + 讓 read_complete 觸發

// 真實離開：導到另一頁 → 觸發 pagehide → page_engagement（beacon）
await page.goto('https://www.yao.care/', { waitUntil: 'commit' }).catch(() => {});
await page.waitForTimeout(2000);

await browser.close();

const uniq = [...new Set(hits)];
console.log('\n══════ 結果 ══════');
console.log(`攔截到的 GA 事件（去重）：${uniq.length ? uniq.join(', ') : '（無）'}`);
for (const want of ['page_view', 'scroll_depth', 'read_complete', 'page_engagement']) {
  console.log(`  ${uniq.includes(want) ? '✅' : '❌'} ${want}`);
}
console.log(`\n總攔截次數：${hits.length}`);
