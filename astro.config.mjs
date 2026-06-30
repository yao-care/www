import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { isNewsIndexable } from './src/news.policy.mjs';

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

export default defineConfig({
  site: 'https://www.yao.care',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) =>
        !noindexNewsPaths.has(new URL(page).pathname.replace(/\/$/, '')),
      serialize(item) {
        const p = new URL(item.url).pathname.replace(/\/$/, '');
        const lm = newsLastmod.get(p);
        if (lm) item.lastmod = lm; // 每篇 news 用自己的 updatedAt 當 lastmod，非 build 時間
        return item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/works': '/',
    '/works/twtxgnn': '/medical/txgnn',
    '/works/intel': '/ai/intel',
    '/works/siqc': '/ai/siqc',
    '/works/marketing': '/marketing',
    '/cases': '/medical/yaocare',
    '/medical/gcm': '/medical/fhir-server',
  },
});
