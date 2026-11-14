#!/usr/bin/env -S npx tsx
/*
 * yao.care 週報（📈，純資料、無 AI）。對齊 folk.tw 的 seo-weekly.mjs。
 * 由 ga-report.sh 尾段在週訊號重產後呼叫（台灣週一 03:00）；亦可手動單跑。
 *
 * 內容：台灣 GA/GSC 週對週 + 本週語料增長 + per-target 表現（讀 news-insights.json）→ Slack 發重點。
 * 用法：
 *   ./node_modules/.bin/tsx scripts/seo-weekly.ts            # 發 Slack
 *   ./node_modules/.bin/tsx scripts/seo-weekly.ts --dry      # 只印、不發
 * 憑證：GA SA 金鑰 + GSC 同把。頻道 env SLACK_CHANNEL（主機設定）。
 */
import { secretPath, requireEnv } from './lib/host-env.mjs';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || secretPath('ga4-sa.json');
const PROPERTY_ID = requireEnv('GA_PROPERTY_ID');
const SITE = process.env.GSC_SITE_URL || 'sc-domain:yao.care';
const HOST = 'www.yao.care';
const CHANNEL = requireEnv('SLACK_CHANNEL');
const TOKEN_FILE = secretPath('slack-bot-token');
const DRY = process.argv.includes('--dry');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');
const ymd = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const sh = (cmd: string) => { try { return execSync(cmd, { cwd: repo, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function delta(now: number, prev: number) {
  if (prev === 0 && now === 0) return '持平';
  if (prev === 0) return `↑ +${now}（上週 0）`;
  const d = now - prev;
  const sign = d > 0 ? '↑' : d < 0 ? '↓' : '＝';
  return `${now}（上週 ${prev}，${sign}${d >= 0 ? '+' : ''}${d}）`;
}

// ── GA4 台灣週對週 ─────────────────────────────────────────
async function gaWeek() {
  try {
    const client = new BetaAnalyticsDataClient({ keyFilename: KEY });
    const property = `properties/${PROPERTY_ID}`;
    const TW = { filter: { fieldName: 'country', stringFilter: { value: 'Taiwan' } } };
    const pull = async (start: string, end: string) => {
      const [r] = await client.runReport({
        property, dateRanges: [{ startDate: start, endDate: end }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], dimensionFilter: TW,
      } as any);
      const row = r.rows?.[0];
      return { active: Number(row?.metricValues?.[0]?.value || 0), sessions: Number(row?.metricValues?.[1]?.value || 0) };
    };
    const thisW = await pull('7daysAgo', 'today');
    const lastW = await pull('14daysAgo', '8daysAgo');
    return { thisW, lastW };
  } catch (e: any) { return { error: (e?.message || String(e)).split('\n')[0] }; }
}

// ── GSC 台灣週對週 + top movers ───────────────────────────
async function gscWeek() {
  try {
    const auth = new GoogleAuth({ keyFilename: KEY, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
    const client = await auth.getClient();
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
    const pageFilter = { dimension: 'page', operator: 'contains', expression: HOST };
    const post = async (start: string, end: string, body: any = {}) => {
      const res: any = await client.request({ url, method: 'POST', data: { startDate: start, endDate: end, dimensionFilterGroups: [{ filters: [pageFilter] }], ...body } });
      return res.data.rows || [];
    };
    // 收斂窗：本週 = 9~3 天前，上週 = 16~10 天前（避開 2–3 天延遲）
    const totThis = (await post(ymd(9), ymd(3)))[0] || {};
    const totPrev = (await post(ymd(16), ymd(10)))[0] || {};
    const qThis = await post(ymd(9), ymd(3), { dimensions: ['query'], rowLimit: 250 });
    const qPrev = await post(ymd(16), ymd(10), { dimensions: ['query'], rowLimit: 250 });
    const prevMap = new Map(qPrev.map((r: any) => [r.keys[0], r.clicks]));
    const movers = qThis
      .map((r: any) => ({ query: r.keys[0], clicks: r.clicks, prev: Number(prevMap.get(r.keys[0]) || 0), impressions: r.impressions, position: r.position }))
      .filter((r: any) => r.clicks > 0)
      .map((r: any) => ({ ...r, gain: r.clicks - r.prev }))
      .sort((a: any, b: any) => b.gain - a.gain)
      .slice(0, 5);
    return {
      thisW: { clicks: totThis.clicks || 0, impressions: totThis.impressions || 0, ctr: totThis.ctr || 0, position: totThis.position || 0 },
      lastW: { clicks: totPrev.clicks || 0, impressions: totPrev.impressions || 0 },
      movers,
    };
  } catch (e: any) { return { error: (e?.response?.data?.error?.message || e?.message || String(e)).split('\n')[0] }; }
}

function corpusGrowth() {
  // 本週（7 天內）新增的 news 文章數 + 總數
  const added = new Set(
    sh(`git log --since="7 days ago" --diff-filter=A --name-only --pretty=format: -- src/content/news`)
      .split('\n').map((f) => f.trim()).filter((f) => /^src\/content\/news\/.+\.json$/.test(f)),
  );
  let total = 0;
  const root = resolve(repo, 'src/content/news');
  try { for (const t of readdirSync(root)) { try { total += readdirSync(resolve(root, t)).filter((f) => f.endsWith('.json')).length; } catch { /* noop */ } } } catch { /* noop */ }
  return { added: added.size, total };
}

function loadInsights() {
  const f = resolve(repo, 'reports/news-insights.json');
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
}

function buildMessage(ga: any, gsc: any, corpus: any, insights: any) {
  const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' });
  const L: string[] = [];
  L.push(`📈 *yao.care 週報 · ${today}*（過去一週回顧，本機自動產出）`);

  L.push('', '*【台灣訪客（GA4）】*');
  if (ga.error) L.push('・⚠️ GA 數據抓取失敗');
  else {
    L.push(`・活躍訪客:${delta(ga.thisW.active, ga.lastW.active)} 人`);
    L.push(`・造訪次數:${delta(ga.thisW.sessions, ga.lastW.sessions)} 次`);
    L.push('　（GA4 自 6/15 起累積，週對週隨資料變多會更穩）');
  }

  L.push('', '*【Google 搜尋（GSC，本站）】*');
  if (gsc.error) L.push('・⚠️ GSC 數據抓取失敗');
  else {
    L.push(`・被看到:${delta(gsc.thisW.impressions, gsc.lastW.impressions)} 次`);
    L.push(`・有人點:${delta(gsc.thisW.clicks, gsc.lastW.clicks)} 次・點擊率 ${pct(gsc.thisW.ctr)}・平均排第 ${gsc.thisW.position ? gsc.thisW.position.toFixed(1) : '—'} 名`);
    if ((gsc.movers || []).length) {
      L.push('・本週成長最多的字:' + gsc.movers.slice(0, 3).map((m: any) => `「${m.query}」${m.clicks} 點（+${m.gain}）`).join('、'));
    }
  }

  L.push('', '*【內容累積】*');
  L.push(`・本週新增 ${corpus.added} 篇議題分析・語料累積 ${corpus.total} 篇`);

  if (insights && insights.targets) {
    const tg = Object.entries(insights.targets) as [string, any][];
    const weighted = tg.filter(([, v]) => (v.weight || 1) > 1).sort((a, b) => b[1].weight - a[1].weight).slice(0, 3);
    const demand = tg.filter(([, v]) => v.demandOpportunity).map(([k]) => k);
    L.push('', '*【大腦選題訊號】*');
    L.push(`・回饋資料:${insights.enoughData ? '已就緒' : '累積中（權重暫等基準）'}`);
    if (weighted.length) L.push('・本週加權題目:' + weighted.map(([k, v]) => `${k} ×${(v.weight).toFixed(1)}`).join('、'));
    if (demand.length) L.push('・高曝光待補（需求機會）:' + demand.join('、'));
  }

  L.push('', '🤖 大腦層每天會依這些訊號自動優化頁面;明細看每日 🤖 通報。');
  return L.join('\n');
}

async function postSlack(text: string) {
  const token = process.env.SLACK_BOT_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '');
  if (!token) throw new Error(`缺 Slack token`);
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: CHANNEL, text, unfurl_links: false, unfurl_media: false }),
  });
  const j: any = await res.json();
  if (!j.ok) throw new Error(`Slack 發送失敗：${j.error}`);
  return j.ts;
}

async function main() {
  const [ga, gsc] = await Promise.all([gaWeek(), gscWeek()]);
  const corpus = corpusGrowth();
  const insights = loadInsights();
  const text = buildMessage(ga, gsc, corpus, insights);
  if (DRY) { console.log('─── 預覽（未發送）───\n' + text); return; }
  const ts = await postSlack(text);
  console.log(`✓ 已發週報 Slack（ts=${ts}）`);
}
main().catch((e) => { console.error('✗ ' + (e?.message || e)); process.exit(1); });
