// /sitemap.xml — 慣用入口別名。
// @astrojs/sitemap 實際產生的是 sitemap-index.xml + sitemap-0.xml，
// 但很多人/工具（含 Google Search Console 提交）習慣用 /sitemap.xml；
// 若該路徑不存在，主機會回退成首頁 HTML，導致 GSC 報「Sitemap 為 HTML 網頁」。
// 這裡提供一個指向實際 urlset 的合法 sitemap index，讓 /sitemap.xml 也回傳 XML。
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';

export const GET: APIRoute = () => {
  const loc = new URL('/sitemap-0.xml', SITE.url).toString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${loc}</loc></sitemap>
</sitemapindex>`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
