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
for (const target of fs.readdirSync(NEWS_DIR)) {
  const dir = path.join(NEWS_DIR, target);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!isNewsIndexable(data.relevance)) {
      noindexNewsPaths.add(`/news/${target}/${file.replace(/\.json$/, '')}`);
    }
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
