#!/usr/bin/env node
// IndexNow — 手動提交任意路徑/URL。
//
// 補缺口：`npm run deploy`（手動上線非新聞頁，如 glossary/guides/產品頁/hub）不會觸發
// IndexNow（自動 ping 只在 fetch-news.sh 裡、且僅限當天變動的 /news 文章）。改動這些頁面後
// 用本腳本主動通知 Bing/Yandex/Naver/Seznam 當天收錄。
//
//   node scripts/indexnow-urls.mjs /glossary/triz-theory/ /medical/txgnn/ ...
//   node scripts/indexnow-urls.mjs https://www.yao.care/guides/foo/   # 完整 URL 亦可
//
// 金鑰需與 public/<KEY>.txt 檔名一致（與 indexnow.mjs 同一把）。
const HOST = 'www.yao.care';
const KEY = '1be01cbeef8111fdeccbc36e95ec07c1';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const urlList = [
  ...new Set(
    args.map((u) => (u.startsWith('http') ? u : `${ORIGIN}${u.startsWith('/') ? u : `/${u}`}`)),
  ),
];

if (urlList.length === 0) {
  console.log('用法: node scripts/indexnow-urls.mjs <path|url> [...]');
  process.exit(1);
}

const body = { host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList };

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow: 提交 ${urlList.length} 筆 → HTTP ${res.status} ${res.statusText}`);
  urlList.forEach((u) => console.log('  ·', u));
  if (res.status >= 400) {
    console.log('  回應:', (await res.text()).slice(0, 300));
    process.exit(1);
  }
} catch (e) {
  console.log('IndexNow: 提交失敗:', e.message);
  process.exit(1);
}
