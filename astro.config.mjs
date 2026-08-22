import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { isNewsIndexable } from './src/news.policy.mjs';
import { createPageGitDate } from './scripts/lib/page-git-date.mjs';
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
        const lm = newsLastmod.get(p) || topicLastmod.get(p) || pageGitDate(p);
        if (lm) item.lastmod = lm;
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/works': '/',
    '/works/twtxgnn': '/medical/txgnn/',
    '/works/intel': '/ai/intel/',
    '/works/siqc': '/ai/siqc/',
    '/works/marketing': '/marketing/',
    '/cases': '/medical/yaocare/',
    '/medical/gcm': '/medical/fhir-server/',
  },
});
