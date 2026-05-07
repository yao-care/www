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
/** 每 target 最多寫幾篇（filter 通過再寫，超過上限的丟掉） */
const MAX_WRITE_PER_TARGET = 5;

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
  headers: { 'User-Agent': 'yao.care-news-bot/1.0' },
});

async function fetchOneQuery(query: string): Promise<RawItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
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
    log(`  ⚠ RSS query "${query}" 失敗：${e?.message ?? e}`);
    return [];
  }
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
  // strip markdown code fences
  inner = inner
    .replace(/^\s*```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(inner);
  } catch (e: any) {
    throw new Error(`Claude inner JSON parse fail: ${inner.slice(0, 300)}`);
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

async function processTarget(target: NewsTarget): Promise<Stats> {
  const stats: Stats = {
    fetched: 0,
    unique: 0,
    filterKept: 0,
    written: 0,
    dropped: 0,
    dropReasons: [],
  };
  log(`\n═══ ${target.title} (${target.slug}) ═══`);

  // 1) RSS
  log(`  → 抓 RSS（${target.queries.length} queries）`);
  const candidates = await fetchTargetCandidates(target);
  stats.fetched = candidates.length;
  stats.unique = candidates.length;
  log(`  共 ${candidates.length} 筆 unique candidate`);
  if (candidates.length === 0) return stats;

  // 1.5) 排除已存在的 URL
  const existing = existingUrls(target);
  const fresh = candidates.filter((c) => !existing.has(c.link));
  log(`  扣掉已存在 ${candidates.length - fresh.length} 筆，剩 ${fresh.length} 筆要審`);
  if (fresh.length === 0) {
    pruneOld(target);
    return stats;
  }

  // 2) Filter pass
  log(`  → Filter pass (Haiku)`);
  const kept = await filterCandidates(target, fresh);
  stats.filterKept = kept.length;
  log(`  filter 留下 ${kept.length} 筆 (relevance ≥ ${RELEVANCE_THRESHOLD})`);

  // 3) Writer + regex loop（每 target 上限 MAX_WRITE_PER_TARGET 或 CLI 指定）
  const cap = Math.min(MAX_ITEMS, MAX_WRITE_PER_TARGET);
  const toProcess = kept.slice(0, cap);
  for (const k of toProcess) {
    log(`  ▸ "${k.item.title.slice(0, 40)}..." (rel=${k.relevance.toFixed(2)})`);
    const result = await writeOne(target, k.item, k.relevance, k.highlight);
    if (result.ok) {
      writeNewsFile(target, k.item, result.draft, k.relevance, k.highlight, result.passes);
      stats.written++;
    } else {
      log(`    ✗ DROP: ${result.reason}`);
      stats.dropped++;
      stats.dropReasons.push(`${target.slug}:${result.reason}`);
    }
  }

  // 4) prune
  pruneOld(target);
  return stats;
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

  const totals: Stats = {
    fetched: 0,
    unique: 0,
    filterKept: 0,
    written: 0,
    dropped: 0,
    dropReasons: [],
  };
  for (const t of targets) {
    const s = await processTarget(t);
    totals.fetched += s.fetched;
    totals.unique += s.unique;
    totals.filterKept += s.filterKept;
    totals.written += s.written;
    totals.dropped += s.dropped;
    totals.dropReasons.push(...s.dropReasons);
  }

  log(`\n══════ 每日報告 ══════`);
  log(`  fetched: ${totals.fetched}`);
  log(`  unique:  ${totals.unique}`);
  log(`  filter kept: ${totals.filterKept}`);
  log(`  written: ${totals.written}`);
  log(`  dropped: ${totals.dropped}`);
  if (totals.dropReasons.length > 0) {
    log(`  drop 原因：`);
    for (const r of totals.dropReasons) log(`    - ${r}`);
  }
  log(`══════════════════════`);
}

main().catch((e) => {
  log(`FATAL: ${e?.stack ?? e}`);
  process.exit(1);
});
