#!/usr/bin/env node
// yao.care 資料層「每日心跳」（純 node、無 AI）：✍️ 文章撰寫 + 📊 數據心跳 → 發 Slack。
// 對齊 folk.tw 的 seo-report-slack.mjs，但 yao.care 多一段 ✍️（news 引擎每天的產出）。
//
// 資料來源：
//   ・reports/seo-daily/<台灣日>.json（GA4+GSC，seo-daily.ts 產；缺則標 🟡 數據暫缺）
//   ・/var/log/yaocare-news.log（解析當日 fetched/filter/written 計數）
//   ・git（當日 auto-fetch commit 變動的文章 → 標題/relevance）
//   ・src/news.policy.mjs（relevance 索引門檻，標每篇 ✓索引/noindex）
//
// 用法：
//   node scripts/slack-heartbeat.mjs           # 讀今天、發 Slack
//   node scripts/slack-heartbeat.mjs --dry      # 只印訊息、不發送
//   node scripts/slack-heartbeat.mjs 2026-06-30 # 指定日期
// 憑證：env SLACK_BOT_TOKEN，否則 $YAOCARE_SECRETS_DIR/slack-bot-token。
// 頻道：env SLACK_CHANNEL（主機設定）。

import { secretPath, requireEnv } from './lib/host-env.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNewsIndexable } from '../src/news.policy.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const DRY = process.argv.includes('--dry');
const dateArg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

const TOKEN_FILE = secretPath('slack-bot-token');
const CHANNEL = requireEnv('SLACK_CHANNEL');
const NEWS_LOG = process.env.YAOCARE_NEWS_LOG || '/var/log/yaocare-news.log';
const BASE = 'https://www.yao.care';

function twDate(offset = 0) {
  const tw = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  tw.setDate(tw.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${tw.getFullYear()}-${p(tw.getMonth() + 1)}-${p(tw.getDate())}`;
}
const prevDate = (iso) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
const mdShort = (iso) => { const [, m, d] = iso.split('-'); return `${Number(m)}/${Number(d)}`; };
const sh = (cmd) => { try { return execSync(cmd, { cwd: repo, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

function loadDaily(date) {
  const f = join(repo, 'reports', 'seo-daily', `${date}.json`);
  if (existsSync(f)) { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { /* noop */ } }
  return null;
}

// ── 解析 news log：取「指定日期 run」的計數 ───────────────────
function parseNewsRun(date) {
  if (!existsSync(NEWS_LOG)) return { ran: false };
  const lines = readFileSync(NEWS_LOG, 'utf8').split('\n');
  // 找最後一個 start 行屬於該台灣日期
  let startIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes(`fetch-news start: ${date}`)) { startIdx = i; break; }
  }
  if (startIdx < 0) return { ran: false };
  const seg = lines.slice(startIdx);
  const num = (re) => { for (const l of seg) { const m = l.match(re); if (m) return Number(m[1]); } return null; };
  return {
    ran: true,
    fetched: num(/fetched:\s+(\d+)/),
    kept: num(/filter kept:\s+(\d+)/),
    written: num(/written:\s+(\d+)/),
    dropped: num(/dropped:\s+(\d+)/),
    ended: seg.some((l) => l.includes('fetch-news end:')),
    noChanges: seg.some((l) => l.includes('no changes; skip')),
  };
}

// ── 當日 auto-fetch commit 變動的文章 → 標題/relevance ──────
function articlesOfDay(date) {
  const sha = sh(`git log --pretty=%H -1 --grep="auto fetch ${date}"`);
  if (!sha) return [];
  const files = sh(`git show --name-only --pretty=format: ${sha}`)
    .split('\n').map((s) => s.trim())
    .filter((f) => /^src\/content\/news\/.+\.json$/.test(f));
  const out = [];
  for (const f of files) {
    const abs = join(repo, f);
    if (!existsSync(abs)) continue; // 已被刪
    try {
      const d = JSON.parse(readFileSync(abs, 'utf8'));
      const m = f.match(/news\/([^/]+)\/([^/]+)\.json$/);
      const target = d.target || (m && m[1]);
      const slug = m && m[2];
      out.push({ title: d.title || d.titleZh || slug, target, slug, relevance: d.relevance, url: `${BASE}/news/${target}/${slug}/` });
    } catch { /* skip */ }
  }
  return out;
}

function corpusCount() {
  let n = 0;
  const root = join(repo, 'src', 'content', 'news');
  try { for (const t of readdirSync(root)) { try { n += readdirSync(join(root, t)).filter((f) => f.endsWith('.json')).length; } catch { /* noop */ } } } catch { /* noop */ }
  return n;
}

const arrow = (now, prev) => {
  if (prev == null || now == null) return '';
  if (now > prev) return `↑ +${now - prev}`;
  if (now < prev) return `↓ ${now - prev}`;
  return '持平';
};
function coverageLabel(state) {
  if (!state) return '❔';
  if (/建立索引|已收錄|indexed/i.test(state) && !/未/.test(state)) return '✅ 已收錄';
  if (/未收錄|找不到|未編入|Discovered|Crawled|not indexed/i.test(state)) return '🟡 未收錄';
  if (/error/i.test(state)) return '❔';
  return `· ${state}`;
}

function buildMessage(date, news, daily, prevDaily) {
  const L = [];
  // 🚦 行動標籤
  const dataMissing = !daily || daily.ga4?.error || daily.gsc?.error;
  const newsFailed = news.ran && news.ended === false; // 開始了沒結束 = 可能中斷
  const newsMissing = !news.ran;
  let flag = '🟢 系統自理,不用你出手';
  if (newsMissing) flag = '🟡 看一下:今晨 news 沒跑到（log 無當日 start）';
  else if (newsFailed) flag = '🟡 看一下:news 可能中斷（有 start 無 end），查 /var/log/yaocare-news.log';
  else if (dataMissing) flag = '🟡 看一下:GA/GSC 數據暫缺,文章面正常';
  L.push(`🚦 ${flag}`);
  L.push('', `📊 *yao.care 系統心跳 · ${mdShort(date)}*（本機自動產出）`);

  // ✍️ 文章撰寫
  L.push('', '✍️ *今天寫了什麼*');
  if (newsMissing) {
    L.push('・今晨 news 引擎沒有執行紀錄（請查 cron / log）');
  } else {
    const f = news.fetched ?? '—', k = news.kept ?? '—', w = news.written ?? 0;
    L.push(`・抓 ${f} 則 → 過濾後 ${k} 篇達標 → 寫 *${w}* 篇${w === 0 ? '（零篇＝當天無夠相關題,精準少量策略下屬正常）' : ''}`);
    const arts = articlesOfDay(date);
    for (const a of arts.slice(0, 10)) {
      const idx = isNewsIndexable(a.relevance) ? '✓索引' : 'noindex';
      const rel = a.relevance != null ? `rel ${a.relevance}` : '';
      L.push(`・〈${a.title}〉（${a.target}·${rel}·${idx}）${a.url}`);
    }
  }
  L.push(`・語料累積 *${corpusCount()}* 篇（永久累積、不砍文）`);

  // 📊 數據心跳
  L.push('', '📊 *數據心跳*');
  if (!daily) {
    L.push('・今日 GA/GSC 數據尚未就緒（reports/seo-daily 無當日檔）');
  } else {
    const g = daily.ga4 || {}, s = daily.gsc || {};
    const gp = (prevDaily && prevDaily.ga4) || {};
    if (g.error) L.push('・⚠️ GA 流量數據抓取失敗');
    else {
      L.push(`・台灣 Google 搜尋訪客（7天）:${g.taiwanOrganicActive} 人　${arrow(g.taiwanOrganicActive, gp.taiwanOrganicActive)}${prevDaily ? `（昨 ${gp.taiwanOrganicActive ?? '—'}）` : ''}`);
      const c = (g.countries || []).slice(0, 4).map((x) => `${x.country} ${x.activeUsers}`).join('・');
      if (c) L.push(`・活躍訪客國別:${c}`);
    }
    if (s.error) L.push('・⚠️ Google 搜尋數據抓取失敗');
    else if (s.totals) {
      const t = s.totals;
      L.push(`・網站被看到 ${t.impressions} 次・有人點 ${t.clicks} 次・平均排第 ${t.position ? t.position.toFixed(1) : '—'} 名`);
      L.push(`　（資料 ${s.range}，Google 有 2–3 天延遲;看趨勢別看絕對值）`);
      if ((s.strikingDistance || []).length) {
        L.push('・快擠進第一頁的字:' + s.strikingDistance.slice(0, 3).map((r) => `「${r.query}」排 ${r.position.toFixed(1)}（被看到 ${r.impressions} 次）`).join('、'));
      }
    }
    // 旗艦頁索引:只在有未收錄時示警,否則一句帶過
    const cov = daily.index?.coverage || [];
    if (cov.length && !daily.index.error) {
      const bad = cov.filter((c) => coverageLabel(c.coverageState).includes('未收錄'));
      if (bad.length) L.push('・⚠️ 旗艦頁未收錄:' + bad.map((b) => b.url.replace(BASE, '')).join('、'));
      else L.push('・旗艦頁 Google 收錄狀態:全數 ✅ 已收錄');
    }
  }

  L.push('', `🤖 大腦層接著會自動優化既有頁面、上線後另發一則`);
  return L.join('\n');
}

async function postSlack(text) {
  const token = process.env.SLACK_BOT_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '');
  if (!token) throw new Error(`缺 Slack token（env SLACK_BOT_TOKEN 或 ${TOKEN_FILE}）`);
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: CHANNEL, text, unfurl_links: false, unfurl_media: false }),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`Slack 發送失敗：${j.error}`);
  return j.ts;
}

async function main() {
  const date = dateArg || twDate(0);
  const news = parseNewsRun(date);
  const daily = loadDaily(date);
  const prevDaily = loadDaily(prevDate(date));
  const text = buildMessage(date, news, daily, prevDaily);

  if (DRY) { console.log('─── 預覽（未發送）───\n' + text); return; }
  const ts = await postSlack(text);
  console.log(`✓ 已發 Slack（${date}，ts=${ts}）`);
}
main().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
