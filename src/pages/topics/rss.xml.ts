// /topics/rss.xml — 九個主題的「近期動態」合併訂閱源（2026-07-28）。
// 每則對應一筆 topicFeed 條目，連結指向我們主題頁的該則錨點（#feed-<id>），
// 原始報導網址放在描述裡，讓訂閱者先看到我們的判讀角度再決定要不要點外連。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../../site.config';
import { TOPIC_BY_SLUG } from '../../topics.config';
import { renderRss, type FeedItem } from '../../lib/rss';
import { feedAnchorId, feedItemHtml } from '../../lib/topic-feed';

const MAX_ITEMS = 50;

export const GET: APIRoute = async () => {
  const feed = await getCollection('topicFeed');
  const items: FeedItem[] = feed
    .sort((a, b) => b.data.fetchedAt.getTime() - a.data.fetchedAt.getTime())
    .slice(0, MAX_ITEMS)
    .map((e) => {
      const topic = TOPIC_BY_SLUG[e.data.topic];
      const link = new URL(`/topics/${e.data.topic}/#${feedAnchorId(e.id)}`, SITE.url).toString();
      return {
        title: e.data.title,
        link,
        guid: link,
        date: e.data.fetchedAt,
        category: topic?.title ?? e.data.topic,
        description: feedItemHtml(e.data, topic?.title ?? e.data.topic),
      };
    });

  return renderRss({
    title: `主題動態 · ${SITE.name}`,
    description:
      '用藥安全、高齡照護、兒童發展、預防醫學、醫療 AI、合規治理、產業情報、創新方法、行銷法規。九個主題每天追蹤到的公開新聞，各配我們的一句判讀。',
    siteUrl: new URL('/topics/', SITE.url).toString(),
    feedUrl: new URL('/topics/rss.xml', SITE.url).toString(),
    items,
  });
};
