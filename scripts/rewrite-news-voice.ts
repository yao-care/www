#!/usr/bin/env -S npx tsx
/*
 * 去 AI 味 backfill —— 把既有語料分批重寫成人話（保留所有事實），當「持續內容更新」來做。
 *
 * 為什麼這樣設計：
 * - 原地更新、同 URL、不刪文；改完蓋 updatedAt → 餵 NewsArticle JSON-LD dateModified + sitemap <lastmod>，
 *   向 Google 發「這頁更新了」的新鮮度訊號（Google 不收 IndexNow，靠 lastmod/dateModified）。
 * - 穩定每日更新：每天 15–18 篇（由每日 cron 帶著跑），約 3 週把全部舊文刷完。
 * - 可續跑（冪等）：只改 voiceRev < VOICE_REV 的舊文；改完蓋 voiceRev，跳過已改的。
 *
 * 由 fetch-news.sh 在抓新聞後呼叫（與新文同批 commit/build/deploy/IndexNow）。也可手動：
 *   ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts --dry            # 不寫檔，印新舊對照
 *   ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts --limit 1 --debug
 *   ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts --target yaocare
 *   ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts --all           # 忽略週上限，跑完所有待改（謹慎）
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEWS_TARGETS } from '../src/news.config';
import { STYLE_RULES, VOICE_REV, checkVoice, findTics } from './style-guide.mjs';
import { checkRegexGuards, checkLengths, checkSimplified } from './news-guards.mjs';
import { fixTerms } from './zh-tw.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');
const NEWS_DIR = resolve(repo, 'src/content/news');

const MODEL = process.env.VOICE_MODEL || 'claude-sonnet-5';
const PER_RUN = Number(process.env.VOICE_PER_RUN || 16); // 每次（＝每日 cron）改幾篇，落在 15–18
const DAILY_CAP = Number(process.env.VOICE_DAILY_CAP || 18); // 每日上限（防手動重跑當天超量）
const MAX_ATTEMPTS = 2;

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const DEBUG = argv.includes('--debug');
const ALL = argv.includes('--all');
const limitArg = argv.includes('--limit') ? Number(argv[argv.indexOf('--limit') + 1]) : null;
const targetArg = argv.includes('--target') ? argv[argv.indexOf('--target') + 1] : null;

const targetBySlug = new Map(NEWS_TARGETS.map((t: any) => [t.slug, t]));
const dlog = (s: string) => DEBUG && console.log(s);

const _twFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
});
function twDay(d: Date): string { return _twFmt.format(d); } // 台灣日期 YYYY-MM-DD

type Entry = { file: string; slug: string; data: any };

function loadAll(): Entry[] {
  const out: Entry[] = [];
  for (const slug of readdirSync(NEWS_DIR)) {
    const dir = join(NEWS_DIR, slug);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const file = join(dir, f);
      try { out.push({ file, slug, data: JSON.parse(readFileSync(file, 'utf8')) }); } catch { /* skip */ }
    }
  }
  return out;
}

function callClaude(prompt: string): any {
  const env: Record<string, string> = { ...process.env, IS_SANDBOX: '1' } as any;
  delete env.CLAUDECODE; delete env.CLAUDE_CODE_ENTRYPOINT; delete env.CLAUDE_CODE_SSE_PORT;
  const r = spawnSync('claude', ['-p', prompt, '--output-format', 'json', '--model', MODEL], {
    env, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20, timeout: 300000,
  });
  if (r.status !== 0) throw new Error(`claude exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 300)}`);
  const inner = JSON.parse(r.stdout).result as string;
  const s = inner.indexOf('{'), e = inner.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error(`JSON parse fail: ${inner.slice(0, 200)}`);
  return JSON.parse(inner.slice(s, e + 1));
}

function rewritePrompt(target: any, data: any): string {
  const proofList = target.proofPoints.map((p: string, i: number) => `  #${i + 1}. ${p}`).join('\n');
  return `你是「${target.title}」的資深編輯。任務：把下面這篇議題評論文「去掉 AI 腔、改寫成人話」，但**事實一個都不能變**。

${STYLE_RULES}

【絕對不可變動（硬規則）】
- 三段的「意思、事實、立場」完全保留，只改寫法與語氣；不可新增任何事實或數字。
- designResponse 原本引用了哪些 proofPoint (#N) 就沿用哪些，數量不可變少（仍至少 2 條）；可用素材：
${proofList}
- 一律繁體中文（台灣用語），不可出現簡體字。
- 不可出現戰績語（已協助/已導入/成功/客戶…）、具名醫院/縣市、未來空話（未來將/規劃中…）、一手宣稱（我們發現…）。
- 字數：newsBrief 60–100、issueAnalysis 100–180、designResponse 150–250（中文字數）。

【原文】
newsBrief：${data.newsBrief}
issueAnalysis：${data.issueAnalysis}
designResponse：${data.designResponse}

僅輸出 JSON，不要任何前後文字：
{ "newsBrief": "...", "issueAnalysis": "...", "designResponse": "..." }`;
}

function rewriteOne(e: Entry): { ok: boolean; reason?: string; out?: any } {
  const target = targetBySlug.get(e.slug);
  if (!target) return { ok: false, reason: `無 target 設定 ${e.slug}` };
  let last = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let out: any;
    try { out = callClaude(rewritePrompt(target, e.data)); }
    catch (err: any) { last = err.message; continue; }
    const draft = {
      titleZh: e.data.title, // 用既有繁中標題滿足 checkSimplified 的必填檢查、並一併掃簡體
      newsBrief: fixTerms(String(out.newsBrief || '')),
      issueAnalysis: fixTerms(String(out.issueAnalysis || '')),
      designResponse: fixTerms(String(out.designResponse || '')),
      tags: e.data.tags || [],
    };
    const fails = [
      ...checkSimplified(draft),
      ...checkRegexGuards(draft, target.proofPoints),
      ...checkLengths(draft),
      ...checkVoice(draft),
    ];
    if (fails.length) { last = fails.map((v) => v.rule).join(','); dlog(`    attempt ${attempt} fail: ${last}`); continue; }
    return { ok: true, out: draft };
  }
  return { ok: false, reason: last || 'unknown' };
}

function main() {
  const all = loadAll();
  const today = twDay(new Date());
  // 本日已 backfill 篇數＝updatedAt 落在今天、但 fetchedAt 不在今天（＝舊文被刷新，非當天新文）
  const todayDone = all.filter((e) => {
    if (!e.data.updatedAt) return false;
    if (twDay(new Date(e.data.updatedAt)) !== today) return false;
    return !e.data.fetchedAt || twDay(new Date(e.data.fetchedAt)) !== today;
  }).length;

  let candidates = all
    .filter((e) => (e.data.voiceRev ?? 0) < VOICE_REV)
    .filter((e) => !targetArg || e.slug === targetArg)
    .sort((a, b) => new Date(a.data.fetchedAt).valueOf() - new Date(b.data.fetchedAt).valueOf()); // 最舊先刷

  const totalPending = candidates.length;
  const budget = ALL ? Infinity : Math.max(0, DAILY_CAP - todayDone);
  const cap = limitArg ?? PER_RUN;
  const n = Math.min(cap, budget, candidates.length);

  console.log(`══ voice backfill ══ 待改 ${totalPending} 篇 · 本日已改 ${todayDone}/${DAILY_CAP} · 本次處理 ${n} 篇${DRY ? ' (DRY)' : ''}`);
  if (n <= 0) { console.log(ALL ? '（無待改）' : '（本日額度已滿或無待改，跳過）'); return; }

  let okCount = 0, skipCount = 0;
  const nowISO = new Date().toISOString();
  for (const e of candidates.slice(0, n)) {
    const rel = e.file.replace(repo + '/', '');
    const r = rewriteOne(e);
    if (!r.ok) { console.log(`  ⨯ ${rel} 跳過（${r.reason}）`); skipCount++; continue; }
    const before = findTics(`${e.data.newsBrief}\n${e.data.issueAnalysis}\n${e.data.designResponse}`).length;
    const after = findTics(`${r.out.newsBrief}\n${r.out.issueAnalysis}\n${r.out.designResponse}`).length;
    if (DRY) {
      console.log(`  ◎ ${rel}  tic ${before}→${after}（DRY，未寫）`);
      if (DEBUG) console.log(`     新 designResponse：${r.out.designResponse}`);
    } else {
      const merged = {
        ...e.data,
        newsBrief: r.out.newsBrief,
        issueAnalysis: r.out.issueAnalysis,
        designResponse: r.out.designResponse,
        updatedAt: nowISO,
        voiceRev: VOICE_REV,
      };
      writeFileSync(e.file, JSON.stringify(merged, null, 2) + '\n', 'utf8');
      console.log(`  ✓ ${rel}  tic ${before}→${after}`);
    }
    okCount++;
  }
  console.log(`── 完成：改 ${okCount} 篇、跳過 ${skipCount} 篇；剩 ${totalPending - okCount} 篇待改 ──`);
}
main();
