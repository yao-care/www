/*
 * Search Console（搜尋需求）抓取模組。供 ga-insights.ts 取用。
 * 用同一把 service account 金鑰（已加入 GSC 使用者）。scope: webmasters.readonly。
 */
import { GoogleAuth } from 'google-auth-library';
import { NEWS_TARGETS } from '../src/news.config';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || '$YAOCARE_SECRETS_DIR/ga4-sa.json';
const DAYS = Number(process.env.GA_DAYS || 28);
const SITE_HOST = 'www.yao.care'; // 網域資源涵蓋所有子網域 → 只取主站
const TARGET_SLUGS = new Set<string>(NEWS_TARGETS.map((t) => t.slug));

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type TopicDemand = { impressions: number; clicks: number; ctr: number; position: number };
export type TopicQuery = { query: string; impressions: number; clicks: number; position: number };
export type GscInsights = {
  siteUrl: string;
  topQueries: GscRow[];
  topPages: GscRow[];
  perTopic: Record<string, TopicDemand>;
  perTopicQueries: Record<string, TopicQuery[]>; // 每議題讀者實際搜尋字（給 writer 參考）
  totals: { impressions: number; clicks: number };
  globalCtr: number;
};

function ymd(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

/** /news/<slug>/… 或 /{medical|ai|care}/<slug> 或 /marketing → 對應 news target slug */
export function topicFromUrl(url: string): string | null {
  let path = url;
  try { path = new URL(url).pathname; } catch { /* 已是 path */ }
  const s = path.replace(/\/+$/, '').split('/').filter(Boolean);
  let slug: string | null = null;
  if (s[0] === 'news' && s[1]) slug = s[1];
  else if ((s[0] === 'medical' || s[0] === 'ai' || s[0] === 'care') && s[1]) slug = s[1];
  else if (s[0] === 'marketing') slug = 'marketing';
  // 白名單：只認真正的 news target slug，擋掉其他子網域/路徑誤判
  return slug && TARGET_SLUGS.has(slug) ? slug : null;
}

export async function getGscInsights(): Promise<GscInsights | null> {
  const auth = new GoogleAuth({ keyFilename: KEY, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const client = await auth.getClient();

  // 找資源：優先 sc-domain，其次第一個
  const sitesRes: any = await client.request({ url: 'https://searchconsole.googleapis.com/webmasters/v3/sites' });
  const sites: any[] = sitesRes.data.siteEntry || [];
  if (!sites.length) return null;
  const site =
    sites.find((s) => /yao\.care/.test(s.siteUrl) && s.siteUrl.startsWith('sc-domain'))?.siteUrl ||
    sites.find((s) => /yao\.care/.test(s.siteUrl))?.siteUrl ||
    sites[0].siteUrl;

  const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const startDate = ymd(DAYS);
  const endDate = ymd(0);
  // 網域資源涵蓋所有子網域 → 用 page filter 限定只取 www 主站
  const queryBody = (dimensions: string[], rowLimit = 1000) => ({
    startDate,
    endDate,
    dimensions,
    rowLimit,
    dimensionFilterGroups: [
      { filters: [{ dimension: 'page', operator: 'contains', expression: `://${SITE_HOST}/` }] },
    ],
  });

  const run = async (dimensions: string[], rowLimit?: number): Promise<GscRow[]> => {
    const res: any = await client.request({ url: base, method: 'POST', data: queryBody(dimensions, rowLimit) });
    return (res.data.rows || []) as GscRow[];
  };

  const byQuery = await run(['query'], 1000);
  const byPage = await run(['page'], 1000);
  const byPageQuery = await run(['page', 'query'], 5000);

  // 每議題的搜尋查詢（用頁面對應 target，同字跨頁面合併，取曝光前 5）
  const tq: Record<string, Map<string, { impressions: number; clicks: number; position: number }>> = {};
  for (const r of byPageQuery) {
    const slug = topicFromUrl(r.keys[0]);
    if (!slug) continue;
    const q = r.keys[1];
    const m = (tq[slug] ??= new Map());
    const cur = m.get(q) ?? { impressions: 0, clicks: 0, position: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.position += r.position * r.impressions; // 曝光加權
    m.set(q, cur);
  }
  const perTopicQueries: Record<string, TopicQuery[]> = {};
  for (const slug of Object.keys(tq)) {
    perTopicQueries[slug] = [...tq[slug].entries()]
      .map(([query, v]) => ({
        query,
        impressions: v.impressions,
        clicks: v.clicks,
        position: v.impressions > 0 ? Math.round((v.position / v.impressions) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
  }

  // 每議題聚合（用頁面網址對應）
  const perTopic: Record<string, TopicDemand> = {};
  for (const r of byPage) {
    const slug = topicFromUrl(r.keys[0]);
    if (!slug) continue;
    const t = (perTopic[slug] ??= { impressions: 0, clicks: 0, ctr: 0, position: 0 });
    t.impressions += r.impressions;
    t.clicks += r.clicks;
    // position 用曝光加權平均
    t.position += r.position * r.impressions;
  }
  for (const slug of Object.keys(perTopic)) {
    const t = perTopic[slug];
    t.position = t.impressions > 0 ? Math.round((t.position / t.impressions) * 10) / 10 : 0;
    t.ctr = t.impressions > 0 ? Math.round((t.clicks / t.impressions) * 1000) / 1000 : 0;
  }

  const totalImpr = byPage.reduce((a, b) => a + b.impressions, 0);
  const totalClicks = byPage.reduce((a, b) => a + b.clicks, 0);

  const sortByImpr = (rows: GscRow[]) => [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 25);

  return {
    siteUrl: site,
    topQueries: sortByImpr(byQuery),
    topPages: sortByImpr(byPage),
    perTopic,
    perTopicQueries,
    totals: { impressions: totalImpr, clicks: totalClicks },
    globalCtr: totalImpr > 0 ? totalClicks / totalImpr : 0,
  };
}
