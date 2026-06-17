#!/usr/bin/env node
// IndexNow — 內容更新「即時」通知 Bing / Yandex / Naver / Seznam（同一 endpoint 一次全到）。
//
// 由 fetch-news.sh 在每日部署後呼叫，argv 傳入當天變動的 news JSON 檔路徑（git diff 結果）：
//   node scripts/indexnow.mjs src/content/news/yaocare/abc123.json ...
//
// 只提交「可索引」的文章（relevance ≥ 門檻，見 news.policy.mjs），與 noindex 政策一致 ——
// 不會把已 noindex 的低相關文章送去要求收錄（否則自相矛盾）。
//
// 金鑰：KEY 必須與 public/<KEY>.txt 的檔名一致；IndexNow 會抓 keyLocation 驗證網站擁有權。
import fs from 'node:fs';
import path from 'node:path';
import { isNewsIndexable } from '../src/news.policy.mjs';

const HOST = 'www.yao.care';
const KEY = '1be01cbeef8111fdeccbc36e95ec07c1';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const changed = process.argv.slice(2).filter((f) => f.endsWith('.json'));

const urls = new Set();
urls.add(`${ORIGIN}/news/`); // 總覽頁內容每天變，一律 ping

for (const f of changed) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    continue; // 檔案被刪或讀不到 → 跳過
  }
  if (!isNewsIndexable(data.relevance)) continue; // 與 noindex 政策一致
  const id = path.basename(f).replace(/\.json$/, '');
  urls.add(`${ORIGIN}/news/${data.target}/${id}/`);
}

const urlList = [...urls];
if (urlList.length === 0) {
  console.log('IndexNow: 無可提交 URL，略過');
  process.exit(0);
}

const body = { host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList };

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  // IndexNow 成功為 200（已接受）或 202（已接收待驗證）
  console.log(`IndexNow: 提交 ${urlList.length} 筆 → HTTP ${res.status} ${res.statusText}`);
  if (res.status >= 400) {
    console.log('  回應:', (await res.text()).slice(0, 300));
    process.exit(1);
  }
} catch (e) {
  console.log('IndexNow: 提交失敗（不阻擋部署）:', e.message);
  process.exit(1);
}
