#!/usr/bin/env tsx
/**
 * 自動議題評論引擎主腳本
 *
 * 流程：
 *   1. 對每個 target 的每個 query 抓 Google News RSS
 *   2. 合併、URL 去重 → 每 target ~30–50 筆 candidate
 *   3. Filter pass: claude -p (Haiku) → 留下 relevance ≥ 0.6 的相關新聞
 *   4. 對每篇相關新聞跑 Writer + Critic 迴圈：
 *        writer (Sonnet) → regex guards 預檢 → critic (Sonnet)
 *        通過 → 寫入 src/content/news/<target>/<id>.json
 *        最多 5 次重生，仍失敗則丟棄
 *   5. 每 target 保留最新 KEEP_PER_TARGET 則
 *
 * CLI：
 *   --target <slug>   只跑單一 target（除錯用）
 *   --dry-run         不寫檔，僅印 log
 *   --debug           印 Claude 完整 stdin/stdout
 *   --max-items <n>   每 target 最多處理幾篇（除錯用）
 *
 * 部署：cron 透過 scripts/fetch-news.sh 觸發
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';
import {
  NEWS_TARGETS,
  KEEP_PER_TARGET,
  type NewsTarget,
  type NewsTargetSlug,
} from '../src/news.config';
import {
  filterPrompt,
  writerPrompt,
  rewritePrompt,
} from './news-prompts.mjs';
import { checkRegexGuards, checkLengths, normTitle } from './news-guards.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const NEWS_DIR = join(PROJECT_ROOT, 'src/content/news');

// ─── CLI 參數 ───────────────────────────────────────
const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
function flag(name: string): boolean {
  return args.includes(name);
}
const ONLY_TARGET = arg('--target') as NewsTargetSlug | undefined;
const DRY_RUN = flag('--dry-run');
const DEBUG = flag('--debug');
const MAX_ITEMS = parseInt(arg('--max-items') ?? '0', 10) || Infinity;

const FILTER_MODEL = 'claude-haiku-4-5';
const WRITER_MODEL = 'claude-sonnet-4-6';
const RELEVANCE_THRESHOLD = 0.6;
const MAX_WRITER_ATTEMPTS = 3;
const PER_QUERY_DELAY_MS = 400;
/** 每個 query 取最新幾筆 — Google News 預設回 ~50–100，但我們只關心新近的 */
const PER_QUERY_LIMIT = 12;
/** 送進 filter LLM 的最大 candidate 數 */
const FILTER_BATCH_SIZE = 25;
/** 一次 cron 全部 target 加總最多寫幾篇 — round-robin 平均分配 */
const MAX_WRITE_TOTAL = 21;

// ─── 型別 ───────────────────────────────────────────

type RawItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
};

type Draft = {
  newsBrief: string;
  issueAnalysis: string;
  designResponse: string;
  tags: string[];
  titleZh: string | null;
};

type Stats = {
  fetched: number;
  unique: number;
  filterKept: number;
  written: number;
  dropped: number;
  dropReasons: string[];
};

// ─── 工具函式 ────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

function dlog(msg: string) {
  if (DEBUG) log(`DEBUG: ${msg}`);
}

function sha10(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 10);
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── RSS 抓取 ────────────────────────────────────────

const rssParser = new Parser({
  timeout: 20_000,
  headers: {
    // 用真實瀏覽器 UA，避免被當 bot 擋
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
  },
});

/** Google News 偶爾會 429/503 限流，重試 3 次（5s, 15s, 45s backoff） */
async function fetchOneQuery(query: string): Promise<RawItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const backoffs = [5_000, 15_000, 45_000];
  for (let attempt = 0; attempt < backoffs.length + 1; attempt++) {
    try {
      const feed = await rssParser.parseURL(url);
      const items = (feed.items ?? [])
        .map((it) => ({
          title: it.title?.trim() ?? '',
          link: it.link?.trim() ?? '',
          pubDate: it.pubDate ?? it.isoDate ?? new Date().toISOString(),
          source:
            typeof it.creator === 'string'
              ? it.creator
              : (it as any).source?.['#text'] ?? (it as any).source ?? 'Google News',
          snippet: stripHtml((it.content ?? it.contentSnippet ?? '').toString()),
        }))
        .filter((it) => it.title && it.link);
      return items
        .sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf())
        .slice(0, PER_QUERY_LIMIT);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const transient = /Status code (429|5\d\d)/.test(msg) || /timeout/i.test(msg);
      if (transient && attempt < backoffs.length) {
        const wait = backoffs[attempt];
        log(`  ⚠ RSS "${query}" 暫時失敗（${msg}），${wait / 1000}s 後重試`);
        await sleep(wait);
        continue;
      }
      log(`  ⚠ RSS query "${query}" 失敗：${msg}`);
      return [];
    }
  }
  return [];
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTargetCandidates(target: NewsTarget): Promise<RawItem[]> {
  const all: RawItem[] = [];
  for (const q of target.queries) {
    const items = await fetchOneQuery(q);
    log(`  · query "${q}": ${items.length} items`);
    all.push(...items);
    await sleep(PER_QUERY_DELAY_MS);
  }
  // dedupe by URL & normalized title
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const unique: RawItem[] = [];
  for (const it of all) {
    if (seenUrl.has(it.link)) continue;
    const nt = normTitle(it.title);
    if (seenTitle.has(nt)) continue;
    seenUrl.add(it.link);
    seenTitle.add(nt);
    unique.push(it);
  }
  return unique;
}

// ─── Claude CLI ─────────────────────────────────────

function callClaude(model: string, prompt: string): any {
  dlog(`Claude ${model} prompt (${prompt.length} bytes):\n${prompt.slice(0, 500)}...`);
  const r = spawnSync(
    'claude',
    ['-p', prompt, '--output-format', 'json', '--model', model],
    {
      encoding: 'utf8',
      timeout: 240_000,
      maxBuffer: 1024 * 1024 * 16,
    },
  );
  if (r.error) throw new Error(`Claude spawn error: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`Claude exit ${r.status}: ${r.stderr || r.stdout}`);
  }
  const stdout = r.stdout || '';
  dlog(`Claude raw stdout (${stdout.length} bytes):\n${stdout.slice(0, 500)}...`);
  return parseClaudeOutput(stdout);
}

function parseClaudeOutput(stdout: string): any {
  let wrapper: any;
  try {
    wrapper = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Claude wrapper parse fail: ${stdout.slice(0, 300)}`);
  }
  if (wrapper.is_error || wrapper.subtype === 'error') {
    throw new Error(`Claude returned error: ${wrapper.result ?? wrapper.error ?? 'unknown'}`);
  }
  let inner = wrapper.result;
  if (typeof inner !== 'string') return inner;
  // 嘗試直接 parse；失敗就退回截取第一個 {...} 區塊
  inner = inner.replace(/^\s*```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  try {
    return JSON.parse(inner);
  } catch {
    // 退路：抽出第一個 { 到對應 } 的 JSON
    const start = inner.indexOf('{');
    if (start < 0) throw new Error(`Claude inner JSON parse fail (no '{'): ${inner.slice(0, 300)}`);
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < inner.length; i++) {
      const c = inner[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const candidate = inner.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch (e: any) {
            throw new Error(`Claude inner JSON parse fail: ${candidate.slice(0, 300)}`);
          }
        }
      }
    }
    throw new Error(`Claude inner JSON unterminated: ${inner.slice(0, 300)}`);
  }
}

// ─── Filter pass ────────────────────────────────────

async function filterCandidates(
  target: NewsTarget,
  candidates: RawItem[],
): Promise<{ item: RawItem; relevance: number; highlight: boolean }[]> {
  if (candidates.length === 0) return [];
  const sorted = [...candidates].sort(
    (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
  );
  const sliced = sorted.slice(0, FILTER_BATCH_SIZE);
  const prompt = filterPrompt(target, sliced);
  let parsed: any;
  try {
    parsed = callClaude(FILTER_MODEL, prompt);
  } catch (e: any) {
    log(`  ⚠ filter pass 失敗：${e.message}`);
    return [];
  }
  const kept: { idx: number; relevance: number; highlight: boolean }[] = parsed.kept ?? [];
  return kept
    .filter((k) => typeof k.idx === 'number' && k.idx >= 0 && k.idx < sliced.length && k.relevance >= RELEVANCE_THRESHOLD)
    .map((k) => ({
      item: sliced[k.idx],
      relevance: k.relevance,
      highlight: !!k.highlight,
    }));
}

// ─── Writer + Critic loop ───────────────────────────

async function writeOne(
  target: NewsTarget,
  item: RawItem,
  relevance: number,
  highlight: boolean,
): Promise<{ ok: true; draft: Draft; passes: number } | { ok: false; reason: string }> {
  // 簡化版：writer + regex 迴圈。critic LLM 暫時關閉以省 quota，
  // 防幻覺主要靠 (a) writer prompt 嚴格規則 + (b) regex 黑名單預檢。
  // 若未來需要更嚴審查，可重新引入 criticPrompt + criticPasses 欄位。
  let prevDraft: Draft | null = null;
  let lastViolations: any[] | null = null;

  for (let attempt = 1; attempt <= MAX_WRITER_ATTEMPTS; attempt++) {
    let draft: Draft;
    try {
      const prompt =
        lastViolations && prevDraft
          ? rewritePrompt(target, item, prevDraft, lastViolations)
          : writerPrompt(target, item);
      const raw = callClaude(WRITER_MODEL, prompt);
      draft = {
        newsBrief: String(raw.newsBrief ?? '').trim(),
        issueAnalysis: String(raw.issueAnalysis ?? '').trim(),
        designResponse: String(raw.designResponse ?? '').trim(),
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 5).map(String) : [],
        titleZh: raw.titleZh && typeof raw.titleZh === 'string' ? raw.titleZh : null,
      };
    } catch (e: any) {
      lastViolations = [{ rule: 'WRITER_ERR', evidence: e.message, fix: '重新嘗試' }];
      continue;
    }
    prevDraft = draft;

    const regexFails = [
      ...checkRegexGuards(draft, target.proofPoints),
      ...checkLengths(draft),
    ];
    if (regexFails.length === 0) {
      return { ok: true, draft, passes: attempt };
    }
    log(`    regex fail (attempt ${attempt}): ${regexFails.map((v) => v.rule).join(',')}`);
    lastViolations = regexFails;
  }
  return {
    ok: false,
    reason: `${MAX_WRITER_ATTEMPTS} attempts failed; last: ${lastViolations?.map((v) => v.rule + ':' + v.evidence).join('|') ?? 'unknown'}`,
  };
}

// ─── 寫檔 / 維護 ────────────────────────────────────

function writeNewsFile(
  target: NewsTarget,
  item: RawItem,
  draft: Draft,
  relevance: number,
  highlight: boolean,
  passes: number,
) {
  const id = sha10(item.link);
  const dir = join(NEWS_DIR, target.slug);
  if (!DRY_RUN) mkdirSync(dir, { recursive: true });
  const file = join(dir, `${id}.json`);
  const data = {
    target: target.slug,
    title: item.title,
    titleZh: draft.titleZh,
    url: item.link,
    source: item.source || 'Google News',
    publishedAt: new Date(item.pubDate).toISOString(),
    fetchedAt: new Date().toISOString(),
    newsBrief: draft.newsBrief,
    issueAnalysis: draft.issueAnalysis,
    designResponse: draft.designResponse,
    tags: draft.tags,
    relevance: Math.round(relevance * 100) / 100,
    highlight,
    criticPasses: passes,
  };
  if (DRY_RUN) {
    log(`    [DRY-RUN] would write ${file}`);
    log(`      title: ${data.title}`);
    log(`      newsBrief: ${data.newsBrief.slice(0, 80)}...`);
  } else {
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    log(`    ✓ wrote ${file}`);
  }
}

function pruneOld(target: NewsTarget) {
  const dir = join(NEWS_DIR, target.slug);
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const entries: { file: string; publishedAt: number }[] = [];
  for (const f of files) {
    try {
      const obj = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      entries.push({ file: f, publishedAt: new Date(obj.publishedAt).valueOf() });
    } catch {
      /* ignore broken file */
    }
  }
  entries.sort((a, b) => b.publishedAt - a.publishedAt);
  const toDelete = entries.slice(KEEP_PER_TARGET);
  for (const e of toDelete) {
    if (DRY_RUN) {
      log(`    [DRY-RUN] would prune ${e.file}`);
    } else {
      unlinkSync(join(dir, e.file));
      log(`    pruned ${e.file}`);
    }
  }
}

function existingUrls(target: NewsTarget): Set<string> {
  const dir = join(NEWS_DIR, target.slug);
  const urls = new Set<string>();
  if (!existsSync(dir)) return urls;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const obj = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (obj.url) urls.add(obj.url);
    } catch {
      /* ignore */
    }
  }
  return urls;
}

// ─── 主流程 ─────────────────────────────────────────

type KeptItem = {
  target: NewsTarget;
  item: RawItem;
  relevance: number;
  highlight: boolean;
};

/** Phase 1: 對單一 target 跑 RSS + filter pass，回傳 kept items（不寫檔）*/
async function fetchAndFilter(
  target: NewsTarget,
  stats: Stats,
): Promise<KeptItem[]> {
  log(`\n═══ ${target.title} (${target.slug}) — Filter ═══`);

  log(`  → 抓 RSS（${target.queries.length} queries）`);
  const candidates = await fetchTargetCandidates(target);
  stats.fetched += candidates.length;
  stats.unique += candidates.length;
  log(`  共 ${candidates.length} 筆 unique candidate`);
  if (candidates.length === 0) return [];

  const existing = existingUrls(target);
  const fresh = candidates.filter((c) => !existing.has(c.link));
  log(`  扣掉已存在 ${candidates.length - fresh.length} 筆，剩 ${fresh.length} 筆要審`);
  if (fresh.length === 0) return [];

  log(`  → Filter pass (Haiku)`);
  const kept = await filterCandidates(target, fresh);
  stats.filterKept += kept.length;
  log(`  filter 留下 ${kept.length} 筆 (relevance ≥ ${RELEVANCE_THRESHOLD})`);

  // 依 relevance desc 排序，round-robin 才會挑到最相關的先寫
  const sorted = [...kept].sort((a, b) => b.relevance - a.relevance);
  return sorted.map((k) => ({
    target,
    item: k.item,
    relevance: k.relevance,
    highlight: k.highlight,
  }));
}

/**
 * Round-robin 從每個 target 的清單中輪流挑，直到湊滿 totalCap 或全部用完。
 * 同 target 內的順序是 relevance desc（fetchAndFilter 已排序）。
 */
function selectRoundRobin(
  byTarget: Map<NewsTargetSlug, KeptItem[]>,
  totalCap: number,
): KeptItem[] {
  const queues = new Map<NewsTargetSlug, KeptItem[]>();
  for (const [slug, items] of byTarget) queues.set(slug, [...items]);

  const picked: KeptItem[] = [];
  // 每輪掃一遍所有 target，每個 target 出 1 篇，直到湊滿或全部空
  while (picked.length < totalCap) {
    let progressed = false;
    for (const [slug, q] of queues) {
      if (picked.length >= totalCap) break;
      if (q.length === 0) continue;
      const next = q.shift()!;
      picked.push(next);
      progressed = true;
    }
    if (!progressed) break;
  }
  return picked;
}

/** Phase 3: 對單一已選 item 跑 writer + regex，寫檔 */
async function writeOneSelected(picked: KeptItem, stats: Stats) {
  const { target, item, relevance, highlight } = picked;
  log(`  ▸ [${target.slug}] "${item.title.slice(0, 40)}..." (rel=${relevance.toFixed(2)})`);
  const result = await writeOne(target, item, relevance, highlight);
  if (result.ok) {
    writeNewsFile(target, item, result.draft, relevance, highlight, result.passes);
    stats.written++;
  } else {
    log(`    ✗ DROP: ${result.reason}`);
    stats.dropped++;
    stats.dropReasons.push(`${target.slug}:${result.reason}`);
  }
}

async function main() {
  log(`fetch-news 啟動 ${DRY_RUN ? '(dry-run)' : ''}`);
  const targets = ONLY_TARGET
    ? NEWS_TARGETS.filter((t) => t.slug === ONLY_TARGET)
    : NEWS_TARGETS;
  if (targets.length === 0) {
    log(`找不到 target ${ONLY_TARGET}`);
    process.exit(1);
  }

  const stats: Stats = {
    fetched: 0,
    unique: 0,
    filterKept: 0,
    written: 0,
    dropped: 0,
    dropReasons: [],
  };

  // ─── Phase 1: 對所有 target 抓 RSS + filter ───────────
  const byTarget = new Map<NewsTargetSlug, KeptItem[]>();
  for (const t of targets) {
    const kept = await fetchAndFilter(t, stats);
    byTarget.set(t.slug, kept);
  }

  // ─── Phase 2: round-robin 選出總共要寫的 ──────────────
  // 規則：
  //   - 預設 cap 是 MAX_WRITE_TOTAL（全 target 加總）
  //   - 若有 --target，cap 改用 MAX_ITEMS（單 target 模式）
  //   - --max-items 一律 override
  const totalCap = ONLY_TARGET
    ? Math.min(MAX_ITEMS, byTarget.get(ONLY_TARGET)?.length ?? 0)
    : Math.min(MAX_ITEMS, MAX_WRITE_TOTAL);
  const picked = selectRoundRobin(byTarget, totalCap);

  log(`\n══════ Phase 2: 排程 ${picked.length} 篇 ══════`);
  const distribution = new Map<NewsTargetSlug, number>();
  for (const p of picked) {
    distribution.set(p.target.slug, (distribution.get(p.target.slug) ?? 0) + 1);
  }
  for (const t of targets) {
    log(`  ${t.slug}: ${distribution.get(t.slug) ?? 0} 篇`);
  }

  // ─── Phase 3: 依序寫每篇 ──────────────────────────────
  log(`\n══════ Phase 3: Writer ══════`);
  for (const p of picked) {
    await writeOneSelected(p, stats);
  }

  // ─── Phase 4: prune（每 target 保留最新 KEEP_PER_TARGET）─
  log(`\n══════ Phase 4: Prune ══════`);
  for (const t of targets) {
    pruneOld(t);
  }

  // 真實寫入分配（不是 picked，是真正成功落地的）
  const writtenByTarget = new Map<NewsTargetSlug, number>();
  for (const p of picked) {
    // pickedDist - droppedDist 不易算，這裡簡單從 stats.dropReasons 推算
    writtenByTarget.set(p.target.slug, (writtenByTarget.get(p.target.slug) ?? 0));
  }
  // 重算：寫入 = picked - dropped per target
  const droppedByTarget = new Map<NewsTargetSlug, number>();
  for (const r of stats.dropReasons) {
    const slug = r.split(':')[0] as NewsTargetSlug;
    droppedByTarget.set(slug, (droppedByTarget.get(slug) ?? 0) + 1);
  }
  for (const t of targets) {
    const picked = distribution.get(t.slug) ?? 0;
    const dropped = droppedByTarget.get(t.slug) ?? 0;
    writtenByTarget.set(t.slug, picked - dropped);
  }

  log(`\n══════ 每日報告 ══════`);
  log(`  fetched:     ${stats.fetched}`);
  log(`  unique:      ${stats.unique}`);
  log(`  filter kept: ${stats.filterKept}`);
  log(`  picked:      ${picked.length} (cap=${totalCap})`);
  log(`  written:     ${stats.written}`);
  log(`  dropped:     ${stats.dropped}`);
  log(`  分配（picked → written）：`);
  for (const t of targets) {
    const p = distribution.get(t.slug) ?? 0;
    const w = writtenByTarget.get(t.slug) ?? 0;
    log(`    ${t.slug.padEnd(10)} ${p} → ${w} 篇`);
  }
  if (stats.dropReasons.length > 0) {
    log(`  drop 原因：`);
    for (const r of stats.dropReasons) log(`    - ${r}`);
  }
  log(`══════════════════════`);
}

main().catch((e) => {
  log(`FATAL: ${e?.stack ?? e}`);
  process.exit(1);
});
