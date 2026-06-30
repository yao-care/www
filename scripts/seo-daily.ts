#!/usr/bin/env -S npx tsx
/*
 * yao.care 資料層「每日數據快拉」（純資料、無 AI）。對齊 folk.tw 的 seo-daily.mjs。
 *
 * 拉 GA4（台灣活躍/來源/國別）+ GSC（totals / strikingDistance 排5-15 / topQueries / 旗艦頁索引覆蓋）
 *   → 寫 reports/seo-daily/<台灣日>.json。下游：slack-heartbeat.mjs（📊）、seo-brain-cron.sh（🤖）讀此檔。
 *
 * 認證：service account 金鑰（repo 外）。GA Property / GSC 資源非機密。
 * 用法：
 *   ./node_modules/.bin/tsx scripts/seo-daily.ts            # 產今日 JSON
 *   ./node_modules/.bin/tsx scripts/seo-daily.ts --dry      # 印 JSON 不寫檔
 */
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || '$YAOCARE_SECRETS_DIR/ga4-sa.json';
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '$GA_PROPERTY_ID';
const SITE = process.env.GSC_SITE_URL || 'sc-domain:yao.care'; // 鎖死 yao.care（SA 同時掛多站，勿誤抓 vuko.life）
const HOST = 'www.yao.care';
const DRY = process.argv.includes('--dry');

const __dirname = dirname(fileURLToPath(import.meta.url));

// 旗艦頁（索引覆蓋要盯的錢頁）
const FLAGSHIP: Record<string, string> = {
  'https://www.yao.care/': '首頁',
  'https://www.yao.care/medical/yaocare/': '藥提醒',
  'https://www.yao.care/medical/txgnn/': '老藥新用 TxGNN',
  'https://www.yao.care/medical/huatuo/': 'AI 華佗',
  'https://www.yao.care/care/sign/': '長者無接觸報到',
  'https://www.yao.care/news/': '議題追蹤',
};

function twDate(offset = 0): string {
  const tw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  tw.setDate(tw.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${tw.getFullYear()}-${p(tw.getMonth() + 1)}-${p(tw.getDate())}`;
}

// ── GA4 ───────────────────────────────────────────────────
async function ga4(): Promise<any> {
  try {
    const client = new BetaAnalyticsDataClient({ keyFilename: KEY });
    const property = `properties/${PROPERTY_ID}`;
    const range = [{ startDate: '7daysAgo', endDate: 'today' }];
    const TW = { filter: { fieldName: 'country', stringFilter: { value: 'Taiwan' } } };

    const [twTotal] = await client.runReport({
      property, dateRanges: range, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }],
      dimensionFilter: TW,
    } as any);
    const [twChan] = await client.runReport({
      property, dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'activeUsers' }], dimensionFilter: TW,
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 6,
    } as any);
    const [countries] = await client.runReport({
      property, dateRanges: range, dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 6,
    } as any);
    const [twPages] = await client.runReport({
      property, dateRanges: range, dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }], dimensionFilter: TW,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8,
    } as any);

    const m = (r: any, i = 0) => Number(r?.metricValues?.[i]?.value || 0);
    const tot = twTotal.rows?.[0];
    const chan = (twChan.rows || []).map((r: any) => ({ channel: r.dimensionValues[0].value, activeUsers: m(r) }));
    const organic = chan.find((c: any) => /Organic/.test(c.channel))?.activeUsers || 0;
    return {
      taiwanActiveUsers: m(tot, 0),
      taiwanSessions: m(tot, 1),
      taiwanNewUsers: m(tot, 2),
      taiwanOrganicActive: organic,
      channels: chan,
      countries: (countries.rows || []).map((r: any) => ({ country: r.dimensionValues[0].value, activeUsers: m(r) })),
      topPages: (twPages.rows || []).map((r: any) => ({ page: r.dimensionValues[0].value, sessions: m(r) })),
    };
  } catch (e: any) {
    return { error: (e?.message || String(e)).split('\n')[0] };
  }
}

// ── GSC ───────────────────────────────────────────────────
async function gscClient() {
  const auth = new GoogleAuth({ keyFilename: KEY, scopes: ['https://www.googleapis.com/auth/webmasters'] });
  return auth.getClient();
}
async function gsc(): Promise<any> {
  try {
    const client = await gscClient();
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
    const ymd = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const range = { startDate: ymd(9), endDate: ymd(2) }; // 收斂 7 天窗、避開最後 2 天延遲噪音
    const pageFilter = { filters: [{ dimension: 'page', operator: 'contains', expression: HOST }] };

    const post = async (body: any) => {
      const res: any = await client.request({ url, method: 'POST', data: { ...range, dimensionFilterGroups: [pageFilter], ...body } });
      return res.data.rows || [];
    };
    const totalsRows = await post({});
    const t = totalsRows[0] || {};
    const queries = await post({ dimensions: ['query'], rowLimit: 200 });
    const pageQuery = await post({ dimensions: ['query', 'page'], rowLimit: 250 });

    const strikingDistance = pageQuery
      .filter((r: any) => r.position >= 5 && r.position <= 15)
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 6)
      .map((r: any) => ({ query: r.keys[0], page: r.keys[1], position: r.position, impressions: r.impressions, clicks: r.clicks }));

    const highImpZeroClick = queries
      .filter((r: any) => r.clicks === 0 && r.impressions >= 15)
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((r: any) => ({ query: r.keys[0], impressions: r.impressions, position: r.position }));

    return {
      range: `${range.startDate}~${range.endDate}`,
      totals: { impressions: t.impressions || 0, clicks: t.clicks || 0, ctr: t.ctr || 0, position: t.position || 0 },
      topQueries: queries.slice(0, 10).map((r: any) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: r.position })),
      strikingDistance,
      highImpZeroClick,
    };
  } catch (e: any) {
    return { error: (e?.response?.data?.error?.message || e?.message || String(e)).split('\n')[0] };
  }
}

// ── 旗艦頁索引覆蓋（URL Inspection API）────────────────────
async function indexCoverage(): Promise<any> {
  try {
    const client = await gscClient();
    const url = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
    const coverage: any[] = [];
    for (const inspectionUrl of Object.keys(FLAGSHIP)) {
      try {
        const res: any = await client.request({ url, method: 'POST', data: { inspectionUrl, siteUrl: SITE, languageCode: 'zh-TW' } });
        const r = res.data?.inspectionResult?.indexStatusResult || {};
        coverage.push({ url: inspectionUrl, coverageState: r.coverageState || 'unknown', verdict: r.verdict || '' });
      } catch (e: any) {
        coverage.push({ url: inspectionUrl, coverageState: 'error', error: (e?.message || '').split('\n')[0] });
      }
    }
    return { coverage };
  } catch (e: any) {
    return { error: (e?.message || String(e)).split('\n')[0] };
  }
}

async function main() {
  const date = twDate(0);
  const [ga, sc, idx] = await Promise.all([ga4(), gsc(), indexCoverage()]);
  const out = { date, generatedAt: new Date().toISOString(), ga4: ga, gsc: sc, index: idx };

  if (DRY) { console.log(JSON.stringify(out, null, 2)); return; }
  const dir = resolve(__dirname, '../reports/seo-daily');
  await mkdir(dir, { recursive: true });
  const f = resolve(dir, `${date}.json`);
  await writeFile(f, JSON.stringify(out, null, 2));
  console.log(`✓ 已寫 ${f}`);
  console.log(`  台灣活躍(7d): ${ga.error ? '✗' : ga.taiwanActiveUsers} ・ GSC 曝光: ${sc.error ? '✗' : sc.totals.impressions} ・ striking: ${sc.error ? '✗' : sc.strikingDistance.length}`);
}
main().catch((e) => { console.error('✗ ' + (e?.message || e)); process.exit(1); });
