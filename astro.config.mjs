import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { isNewsIndexable } from './src/news.policy.mjs';
import { createPageGitDate } from './scripts/lib/page-git-date.mjs';

// 詞彙表與指南頁的 <lastmod>：條目自己就帶 updatedAt（人工維護的逐條更新日），
// 比 git 日期更貼近「這一條的內容什麼時候變的」。
// 🔴 用文字掃描而不是 import：本檔一律以 fs 讀資料（見下方 news/topicFeed 的作法），
//    而且 glossary.config.ts / guides.config.ts 是 TS，從 .mjs import 會多一層編譯相依。
//    結構固定為每個條目先 `slug:` 後 `updatedAt:`，所以掃到 slug 後取下一個 updatedAt
//    （遇到下一個 slug 就放棄，避免跨條目誤配）。
const entryLastmod = (file, prefix) => {
  const out = new Map();
  if (!fs.existsSync(file)) return out;
  const re = /slug:\s*'([^']+)'|updatedAt:\s*'([^']+)'/g;
  let pending = null;
  for (const m of fs.readFileSync(file, 'utf8').matchAll(re)) {
    if (m[1] !== undefined) pending = m[1];
    else if (pending) { out.set(`${prefix}/${pending}`, m[2]); pending = null; }
  }
  return out;
};
const glossaryLastmod = entryLastmod('src/glossary.config.ts', '/glossary');
const guideLastmod = entryLastmod('src/guides.config.ts', '/guides');
// 靜態頁沒有 news/topic 時間，改取該頁 .astro 的 git commit 日期（2026-08-22）。
const pageGitDate = createPageGitDate(import.meta.url);

// 低相關新聞文章設了 noindex（見 news.policy.mjs）→ 同步從 sitemap 排除，
// 避免「sitemap 收錄 vs noindex」互相矛盾的訊號。讀同一份政策，門檻不會 drift。
const NEWS_DIR = 'src/content/news';
const noindexNewsPaths = new Set();
// 每篇 news 的真實「最後更新」時間 → 餵 sitemap <lastmod>（updatedAt 優先，否則 fetchedAt）。
// 去 AI 味重寫 / 大腦優化會蓋 updatedAt，使 lastmod 反映實際更新，對 Google 發新鮮度訊號。
const newsLastmod = new Map();
for (const target of fs.readdirSync(NEWS_DIR)) {
  const dir = path.join(NEWS_DIR, target);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const slugPath = `/news/${target}/${file.replace(/\.json$/, '')}`;
    if (!isNewsIndexable(data.relevance)) noindexNewsPaths.add(slugPath);
    const lm = data.updatedAt || data.fetchedAt;
    if (lm) newsLastmod.set(slugPath, new Date(lm).toISOString());
  }
}

// 主題頁 <lastmod> = 該主題最新一筆動態的 fetchedAt（真實內容變更；產線每日餵 topicFeed 即每日更新）。
const FEED_DIR = 'src/content/topicFeed';
const topicLastmod = new Map();
if (fs.existsSync(FEED_DIR)) {
  for (const topic of fs.readdirSync(FEED_DIR)) {
    const dir = path.join(FEED_DIR, topic);
    if (!fs.statSync(dir).isDirectory()) continue;
    let latest = '';
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (data.fetchedAt && data.fetchedAt > latest) latest = data.fetchedAt;
    }
    if (latest) topicLastmod.set(`/topics/${topic}`, new Date(latest).toISOString());
  }
}

export default defineConfig({
  site: 'https://www.yao.care',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) =>
        !noindexNewsPaths.has(new URL(page).pathname.replace(/\/$/, '')),
      // news 用自己的 updatedAt、主題頁用最新動態時間；靜態頁兩者都沒有，
      // 改取該頁 .astro 原始檔的 git commit 日期。全部對不到才留白——
      // **絕不用 build 時間**，那會讓每次部署都宣稱全站更新。
      // （2026-08-22：此前靜態頁一律留白，217 個網址有 51 個沒有 lastmod。）
      serialize(item) {
        const p = new URL(item.url).pathname.replace(/\/$/, '');
        const lm = newsLastmod.get(p) || topicLastmod.get(p)
          || glossaryLastmod.get(p) || guideLastmod.get(p) || pageGitDate(p);
        if (lm) item.lastmod = lm;
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    // 已收斂的 /news/<分類>/ 舊網址（250 篇＋7 個分類首頁）→ 主題頁。清單由 scripts/gen-news-redirects.mjs
    // 從 git 歷史產生。主機上 NPM #46 的 301 前綴規則會先攔下這些路徑；搬到 GitHub Pages 後由這些靜態轉址頁接手。
    ...JSON.parse(fs.readFileSync('./src/data/news-redirects.json', 'utf8')),
    '/works': '/',
    '/works/twtxgnn': '/medical/txgnn/',
    '/works/intel': '/ai/intel/',
    '/works/siqc': '/ai/siqc/',
    '/works/marketing': '/marketing/',
    '/cases': '/medical/yaocare/',
    '/medical/gcm': '/medical/fhir-server/',
  },
});
