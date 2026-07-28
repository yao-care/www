// /rss.xml — 全站訂閱源（2026-07-28）。
//
// 與 /topics/rss.xml 的分工：那支只有主題動態（每天更新、量大）；這支是「站上所有新內容」，
// 除了主題動態，還收情境指南（guides）與名詞解釋（glossary）的新增／更新。
// 若這支只放主題動態，就會跟 /topics/rss.xml 幾乎完全重複，那樣不如不出。
//
// guides/glossary 的時間軸靠各自 config 的 updatedAt 欄位（2026-07-28 以 git 歷史回填初值）；
// 改內容時要一併更新該欄位，否則新版本不會浮上 feed。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';
import { TOPIC_BY_SLUG } from '../topics.config';
import { GUIDES } from '../guides.config';
import { GLOSSARY } from '../glossary.config';
import { renderRss, type FeedItem } from '../lib/rss';
import { feedAnchorId, feedItemHtml } from '../lib/topic-feed';

const MAX_ITEMS = 50;
const MAX_FEED_ITEMS = 30; // 主題動態每天都在長，限額避免把指南/名詞整個擠掉

export const GET: APIRoute = async () => {
  const feed = await getCollection('topicFeed');

  const feedItems: FeedItem[] = feed
    .sort((a, b) => b.data.fetchedAt.getTime() - a.data.fetchedAt.getTime())
    .slice(0, MAX_FEED_ITEMS)
    .map((e) => {
      const topic = TOPIC_BY_SLUG[e.data.topic];
      const link = new URL(`/topics/${e.data.topic}/#${feedAnchorId(e.id)}`, SITE.url).toString();
      return {
        title: e.data.title,
        link,
        guid: link,
        date: e.data.fetchedAt,
        category: `主題動態 · ${topic?.title ?? e.data.topic}`,
        description: feedItemHtml(e.data, topic?.title ?? e.data.topic),
      };
    });

  const guideItems: FeedItem[] = GUIDES.map((g) => {
    const link = new URL(`/guides/${g.slug}/`, SITE.url).toString();
    return {
      title: g.question,
      link,
      guid: link,
      date: new Date(`${g.updatedAt}T00:00:00+08:00`),
      category: '情境指南',
      description: `<p>${g.answer}</p>`,
    };
  });

  const termItems: FeedItem[] = GLOSSARY.map((t) => {
    const link = new URL(`/glossary/${t.slug}/`, SITE.url).toString();
    return {
      title: `${t.term}是什麼`,
      link,
      guid: link,
      date: new Date(`${t.updatedAt}T00:00:00+08:00`),
      category: '名詞解釋',
      description: `<p>${t.oneLiner}</p>`,
    };
  });

  const items = [...feedItems, ...guideItems, ...termItems]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, MAX_ITEMS);

  return renderRss({
    title: SITE.name,
    description: `${SITE.description} 本訂閱源收錄主題動態、情境指南與名詞解釋的新增與更新。`,
    siteUrl: SITE.url,
    feedUrl: new URL('/rss.xml', SITE.url).toString(),
    items,
  });
};
