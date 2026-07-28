// RSS 2.0 產生器（2026-07-28）—— /rss.xml 與 /topics/rss.xml 共用。
//
// 為什麼手寫而不裝 @astrojs/rss：本站既有慣例是用 endpoint 手寫輸出（llms.txt.ts /
// llms-full.txt.ts / sitemap.xml.ts 皆是），且只需要 RSS 2.0 最小集合，不值得多一個相依。
// 代價是**跳脫字元要自己顧**——所有進 XML 的文字一律經 esc()，新聞標題常含 & < >。
import { SITE } from '../site.config';

export type FeedItem = {
  /** 條目標題 */
  title: string;
  /** 站內連結（絕對網址） */
  link: string;
  /** 全域唯一識別（用站內網址即可；含錨點以區分同頁多則） */
  guid: string;
  /** 純文字摘要 */
  description: string;
  /** 發布/更新時間 */
  date: Date;
  /** 分類標籤（主題名等） */
  category?: string;
};

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** RSS 規格要求 RFC 822 日期；用 UTC 表示（toUTCString 已符合格式） */
const rfc822 = (d: Date) => d.toUTCString();

export function renderRss(opts: {
  title: string;
  description: string;
  /** 這支 feed 對應的人類可讀頁面 */
  siteUrl: string;
  /** feed 自己的網址（atom:link self，訂閱器據此判斷來源） */
  feedUrl: string;
  items: readonly FeedItem[];
}): Response {
  const { title, description, siteUrl, feedUrl, items } = opts;
  const latest = items[0]?.date;

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${esc(title)}</title>`,
    `<link>${esc(siteUrl)}</link>`,
    `<description>${esc(description)}</description>`,
    '<language>zh-TW</language>',
    `<generator>${esc(SITE.name)}</generator>`,
    ...(latest ? [`<lastBuildDate>${rfc822(latest)}</lastBuildDate>`] : []),
    `<atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items.map((it) =>
      [
        '<item>',
        `<title>${esc(it.title)}</title>`,
        `<link>${esc(it.link)}</link>`,
        `<guid isPermaLink="false">${esc(it.guid)}</guid>`,
        `<pubDate>${rfc822(it.date)}</pubDate>`,
        ...(it.category ? [`<category>${esc(it.category)}</category>`] : []),
        `<description>${esc(it.description)}</description>`,
        '</item>',
      ].join(''),
    ),
    '</channel>',
    '</rss>',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
