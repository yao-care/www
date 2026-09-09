#!/usr/bin/env tsx
/**
 * 自動議題評論引擎主腳本
 *
 * 流程：
 *   1. 對每個 target 的每個 query 抓 Google News RSS
 *   2. 合併、URL 去重 → 每 target ~30–50 筆 candidate
 *   3. Filter pass: claude -p (Haiku) → 留下 relevance ≥ 0.6 的相關新聞
 *   4. 對每篇相關新聞跑 Writer + Critic 迴圈：
 *        writer (Sonnet) → regex guards 預檢 → critic (Sonnet 語意複審)
 *        通過 → 寫入 src/content/news/<target>/<id>.json
 *        最多 MAX_WRITER_ATTEMPTS 次重生，仍失敗則丟棄
 *   （不再刪文：常青議題分析長期累積，無 prune）
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
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';
import {
  NEWS_TARGETS,
  type NewsTarget,
  type NewsTargetSlug,
} from '../src/news.config';
import {
  filterPrompt,
  writerPrompt,
  rewritePrompt,
  criticPrompt,
} from './news-prompts.mjs';
import {
  checkRegexGuards,
  checkLengths,
  checkSimplified,
  checkVoice,
  normTitle,
  findNearDuplicate,
  titleSimilarity,
} from './news-guards.mjs';
import { VOICE_REV, findTics, checkTakeaway } from './style-guide.mjs';
import { TOPICS } from '../src/topics.config';
import { fixTerms } from './zh-tw.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const NEWS_DIR = join(PROJECT_ROOT, 'src/content/news');
const FEED_DIR = join(PROJECT_ROOT, 'src/content/topicFeed');

// target → 主題（feed 路由；映射唯一來源＝topics.config 的 newsTargets）
const TARGET_TOPIC = new Map<NewsTargetSlug, { slug: string; title: string }>();
for (const tp of TOPICS) {
  for (const nt of tp.newsTargets) TARGET_TOPIC.set(nt as NewsTargetSlug, { slug: tp.slug, title: tp.title });
}

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

// ─── 產線模式（內容重構 Phase 2，2026-07-15）─────────────────
// feed（預設）：新聞 → 主題頁「近期動態」條目（src/content/topicFeed/<topic>/<id>.json），不再生獨立文章頁。
// legacy：舊行為（寫 src/content/news/<target>/ 三段短文）。回滾保險絲：NEWS_MODE=legacy。
const NEWS_MODE = (process.env.NEWS_MODE || 'feed') as 'feed' | 'legacy';

const FILTER_MODEL = 'claude-haiku-4-5';
const WRITER_MODEL = 'claude-sonnet-5';
/** 相關度門檻（提高 → 只寫真的切題的；「精準少量」策略） */
const RELEVANCE_THRESHOLD = 0.8; // 2026-08-03 0.72→0.80：GSC 顯示 feed 動態邊際點擊趨零，額度收斂到精選（近14天寫入 p25=0.82）
const MAX_WRITER_ATTEMPTS = 3;
const PER_QUERY_DELAY_MS = 400;
/** 每個 query 取最新幾筆 — Google News 預設回 ~50–100，但我們只關心新近的 */
const PER_QUERY_LIMIT = 12;
/** 送進 filter LLM 的最大 candidate 數 */
const FILTER_BATCH_SIZE = 25;
/** 一次 cron 全部 target 加總最多寫幾篇（不砍文後改少量精選） */
const MAX_WRITE_TOTAL = 5;
/** feed 模式日上限 */
const MAX_FEED_TOTAL = 3; // 2026-08-03 12→3：站流量高原期＋動態邊際點擊趨零，改「每日 ≤3 則精選」，額度移往常青頁優化
/** 單一 target 一天最多寫幾篇（避免單線洗版，保留多樣性） */
const PER_TARGET_DAILY_CAP = 2; // 2026-08-03 3→2：總量降到 3 後，防單一主題吃滿當日全部額度
/** 命中 GSC 真實搜尋字的需求加成（疊在 relevance 上影響「挑哪篇」） */
const DEMAND_BOOST = 0.15;
/** GA/GSC target 權重（1–3）換算成選題分數的係數 */
const WEIGHT_SCORE_FACTOR = 0.2;
/** 題目層級去重門檻（bigram Jaccard；保守，寧可少跳） */
const DUP_TITLE_THRESHOLD = 0.6;

/**
 * 引用價值先驗（GEO）：民眾真的會拿去問 LLM、且有對外可被引用站點的消費者醫療題目加分；
 * 純 B2B / 無對外消費者站的內部產品降權 —— 讓每日有限的寫作額度往「會被 LLM 引用」的主題傾斜。
 * 加在選題分數上（與 relevance 同尺度，約 0.72–1.x）；GA/GSC 學到的權重仍疊加其上，
 * 故日後若資料顯示某 B2B 題目其實有讀者，學習訊號可部分抵銷此先驗（靜態先驗 + 動態學習）。
 *   Tier A（消費者醫療、公開站、民眾高頻問）：用藥 / 長者 / 功能 / 兒童發展 / 報到
 *   Tier B（公開但較技術）：中醫 AI / 老藥新用
 *   Tier C（B2B / 無對外消費者站，壓低）：稽核評鑑 / 情報 / TRIZ / 合規守門 API
 */
const CITATION_PRIORITY: Record<NewsTargetSlug, number> = {
  yaocare: 0.25,
  geri: 0.25,
  func: 0.25,
  pedi: 0.25,
  sign: 0.2,
  huatuo: 0.1,
  txgnn: 0.1,
  marketing: 0,
  goalkeeper: -0.3,
  siqc: -0.3,
  intel: -0.3,
  triz: -0.3,
  // fhir-server 未開 news target（無對外消費者站）；列出僅為型別完整，實際不會被選
  'fhir-server': -0.3,
};
/**
 * 每日每 target 上限覆寫（未列者用 PER_TARGET_DAILY_CAP）。
 * Tier C 收緊到 1，避免候選量大時（如 siqc 新聞多）灌爆當日額度、排擠消費者醫療題目。
 */
const TARGET_DAILY_CAP: Partial<Record<NewsTargetSlug, number>> = {
  goalkeeper: 1,
  siqc: 1,
  intel: 1,
  triz: 1,
  marketing: 2,
};
const dailyCapFor = (slug: NewsTargetSlug): number =>
  TARGET_DAILY_CAP[slug] ?? PER_TARGET_DAILY_CAP;

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
  dupSkipped: number;
  written: number;
  dropped: number;
  dropReasons: string[];
};

/** 給 writer 的讀者洞察：搜尋字（A）+ 是否常讀不完（C） */
type WriterHint = { queries: string[]; lowCompletion: boolean };

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
  demandQueries: string[] = [],
): Promise<{ item: RawItem; relevance: number; highlight: boolean }[]> {
  if (candidates.length === 0) return [];
  const sorted = [...candidates].sort(
    (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
  );
  const sliced = sorted.slice(0, FILTER_BATCH_SIZE);
  const prompt = filterPrompt(target, sliced, {
    threshold: RELEVANCE_THRESHOLD,
    demandQueries,
  });
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
  hint?: WriterHint,
): Promise<{ ok: true; draft: Draft; passes: number } | { ok: false; reason: string }> {
  // 寫作迴圈：writer → regex guards 預檢 → critic（Sonnet 語意複審）→ 不過則 rewrite。
  // regex 擋機械式違規（戰績語/簡體/字數…），critic 補抓 regex 抓不到的幻覺/空泛/離題。
  // 每日產量降到精選量後 quota 有餘裕，故重新開啟 critic（曾為省 quota 關閉）。
  let prevDraft: Draft | null = null;
  let lastViolations: any[] | null = null;

  for (let attempt = 1; attempt <= MAX_WRITER_ATTEMPTS; attempt++) {
    let draft: Draft;
    try {
      const prompt =
        lastViolations && prevDraft
          ? rewritePrompt(target, item, prevDraft, lastViolations)
          : writerPrompt(target, item, hint);
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
      ...checkSimplified(draft),
      ...checkVoice(draft),
    ];
    if (regexFails.length > 0) {
      log(`    regex fail (attempt ${attempt}): ${regexFails.map((v) => v.rule).join(',')}`);
      lastViolations = regexFails;
      continue;
    }

    // 通過 regex → critic 語意複審
    let critic: any;
    try {
      critic = callClaude(WRITER_MODEL, criticPrompt(target, item, draft));
    } catch (e: any) {
      // critic 掛掉時 fail-open：已過 regex（硬規則）即接受，不因 critic 抖動全數丟棄
      log(`    ⚠ critic 失敗，已過 regex 故接受 (attempt ${attempt}): ${e.message}`);
      return { ok: true, draft, passes: attempt };
    }
    if (critic?.pass) {
      return { ok: true, draft, passes: attempt };
    }
    const cviol =
      Array.isArray(critic?.violations) && critic.violations.length
        ? critic.violations
        : [{ rule: 'CRITIC', evidence: 'critic 判定不通過但未給明細', fix: '依嚴格規則重寫' }];
    log(`    critic fail (attempt ${attempt}): ${cviol.map((v: any) => v.rule).join(',')}`);
    lastViolations = cviol;
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
  // title 一律存繁體（台灣用語）：優先用 writer 改寫的 titleZh（LLM 能正確處理人名/簡繁），
  // 沒有才退回原標題。fixTerms 再補大陸詞彙。titleZh 因此不再需要另存。
  const twTitle =
    draft.titleZh && draft.titleZh.trim() ? draft.titleZh.trim() : item.title;
  const data = {
    target: target.slug,
    title: fixTerms(twTitle),
    titleZh: null,
    url: item.link,
    source: item.source || 'Google News',
    publishedAt: new Date(item.pubDate).toISOString(),
    fetchedAt: new Date().toISOString(),
    newsBrief: fixTerms(draft.newsBrief),
    issueAnalysis: fixTerms(draft.issueAnalysis),
    designResponse: fixTerms(draft.designResponse),
    tags: (draft.tags ?? []).map(fixTerms),
    relevance: Math.round(relevance * 100) / 100,
    highlight,
    criticPasses: passes,
    // 新文章已是去 AI 味 writer 的產出：updatedAt=fetchedAt、voiceRev 蓋當前版號 → 不會被 backfill 重刷
    updatedAt: new Date().toISOString(),
    voiceRev: VOICE_REV,
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

/** 既有語料：來源 URL（精確去重）+ 標題清單（題目層級近似去重） */
function existingCorpus(target: NewsTarget): { urls: Set<string>; titles: string[] } {
  // ⚠ 去重必須讀「這次實際會寫進去的那個目錄」。
  // 2026-07-15 Phase 2 把產線改成 feed 模式（寫 topicFeed/<topic>/）之後，這裡仍只讀
  // legacy 的 news/<target>/，等於對 feed 產出完全沒有去重；Phase 4 又把 yaocare/pedi/
  // huatuo/func/sign/triz/siqc 七桶的 news/ 刪掉，那幾個 target 的既有標題直接歸零。
  // 後果（2026-09-05 盤點）：topicFeed 累積出 21 組近似重複、29 則多餘，且明顯集中在
  // 被刪桶對應的主題（child-development 7 組、explainable-medical-ai 4 組…）。
  // 修法：feed 模式改讀該 target 對應主題的 topicFeed 目錄。門檻 DUP_TITLE_THRESHOLD
  // 不動——實測 0.6 對存量重複可擋下 20 對，壞的是語料來源不是門檻。
  // 依主題（非依 target）比對也更正確：多個 target 餵同一個主題頁，讀者看到的是同一頁。
  //
  // ⚠ 2026-09-09 補修：上面那版把 feed 模式改成「只讀 topicFeed」，但 legacy 的
  // news/<target>/ 仍有 202 篇**還在線上 serve** 的文章（txgnn/marketing/intel/geri/
  // goalkeeper 五桶尚未 301）。只讀 feed 的結果是同一則新聞被寫進主題動態、跟既有的
  // /news/ 文章頁變成跨區塊重複——09-06 那次 cron 實際發生 2 則（txgnn 的
  // 3888ff4e1e、80ad505121）。故兩份語料的用途要拆開：
  //   urls   → **聯集**。同一個 URL 全站只該出現一次，精確比對不可能誤殺。
  //   titles → **只取 feed**。標題近似比對若把幾個月前的封存文章算進來，會把當下
  //            合理的新報導誤判成重複（例：7 月寫過肌少症，9 月的新研究就進不來）。
  const feedDir = join(FEED_DIR, TARGET_TOPIC.get(target.slug)?.slug ?? '__none__');
  const legacyDir = join(NEWS_DIR, target.slug);
  const urls = new Set<string>();
  const titles: string[] = [];

  const scanDir = (dir: string, collectTitles: boolean) => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      try {
        const obj = JSON.parse(readFileSync(join(dir, f), 'utf8'));
        if (obj.url) urls.add(obj.url);
        if (collectTitles && obj.title) titles.push(String(obj.title));
      } catch {
        /* ignore */
      }
    }
  };

  if (NEWS_MODE === 'feed') {
    scanDir(feedDir, true); // 標題比對的對象＝正在成長的那份語料
    scanDir(legacyDir, false); // 只借它的 URL，擋掉與尚未 301 的舊文章撞題
  } else {
    scanDir(legacyDir, true);
  }
  return { urls, titles };
}

// ─── 主流程 ─────────────────────────────────────────

type KeptItem = {
  target: NewsTarget;
  item: RawItem;
  relevance: number;
  /** 選題分數 = relevance + 需求加成（命中 GSC 搜尋字）；決定「挑哪篇」 */
  score: number;
  highlight: boolean;
};

/** 候選 title/snippet 是否命中任一 GSC 搜尋字 → 需求加成 */
function demandBoostFor(item: RawItem, demandQueries: string[]): number {
  if (!demandQueries.length) return 0;
  const hay = `${item.title} ${item.snippet || ''}`.toLowerCase();
  const hit = demandQueries.some((q) => {
    const needle = q.trim().toLowerCase();
    return needle.length >= 2 && hay.includes(needle);
  });
  return hit ? DEMAND_BOOST : 0;
}

/** Phase 1: 對單一 target 跑 RSS + filter pass + 去重，回傳 kept items（不寫檔）*/
async function fetchAndFilter(
  target: NewsTarget,
  stats: Stats,
  hint?: WriterHint,
): Promise<KeptItem[]> {
  log(`\n═══ ${target.title} (${target.slug}) — Filter ═══`);

  log(`  → 抓 RSS（${target.queries.length} queries）`);
  const candidates = await fetchTargetCandidates(target);
  stats.fetched += candidates.length;
  stats.unique += candidates.length;
  log(`  共 ${candidates.length} 筆 unique candidate`);
  if (candidates.length === 0) return [];

  const { urls: existingUrlSet, titles: existingTitles } = existingCorpus(target);
  const fresh = candidates.filter((c) => !existingUrlSet.has(c.link));
  log(`  扣掉已存在 URL ${candidates.length - fresh.length} 筆，剩 ${fresh.length} 筆要審`);
  if (fresh.length === 0) return [];

  const demandQueries = hint?.queries ?? [];
  log(`  → Filter pass (Haiku)${demandQueries.length ? ` [+需求字 ${demandQueries.length}]` : ''}`);
  const kept = await filterCandidates(target, fresh, demandQueries);
  stats.filterKept += kept.length;
  log(`  filter 留下 ${kept.length} 筆 (relevance ≥ ${RELEVANCE_THRESHOLD})`);

  // 題目層級去重：剔除與既有語料近似重複的（不砍文後避免薄內容累積）
  const deduped = kept.filter((k) => {
    const dup = findNearDuplicate(k.item.title, existingTitles, DUP_TITLE_THRESHOLD);
    if (dup) {
      stats.dupSkipped++;
      log(`    ↩ DUP 跳過「${k.item.title.slice(0, 30)}…」≈ 既有「${dup.slice(0, 30)}…」`);
      return false;
    }
    return true;
  });

  // 計算選題分數（relevance + 需求加成），依 score desc 排序
  return deduped
    .map((k) => ({
      target,
      item: k.item,
      relevance: k.relevance,
      score: k.relevance + demandBoostFor(k.item, demandQueries),
      highlight: k.highlight,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * 讀 reports/news-insights.json（每週 GA+GSC cron 產出），回傳：
 *   - weights：高互動/高需求議題 → 權重 >1（加權選題）
 *   - hints：每議題的讀者搜尋字 + 低完成率旗標（餵 writer prompt）
 * 無檔/資料不足 → 皆空（選題與寫作都等同現狀）。
 */
function loadInsights(): {
  weights: Map<NewsTargetSlug, number>;
  hints: Map<NewsTargetSlug, WriterHint>;
} {
  const weights = new Map<NewsTargetSlug, number>();
  const hints = new Map<NewsTargetSlug, WriterHint>();
  const p = join(PROJECT_ROOT, 'reports/news-insights.json');
  try {
    if (!existsSync(p)) return { weights, hints };
    const j = JSON.parse(readFileSync(p, 'utf8'));
    if (!j?.enoughData || !j?.targets) return { weights, hints };
    for (const [slug, t] of Object.entries<any>(j.targets)) {
      const weight = Math.max(1, Math.min(3, Math.round(Number(t?.weight) || 1)));
      if (weight > 1) weights.set(slug as NewsTargetSlug, weight);
      const queries = Array.isArray(t?.topQueries) ? t.topQueries.slice(0, 5).map(String) : [];
      const lowCompletion = !!t?.lowCompletion;
      if (queries.length || lowCompletion) hints.set(slug as NewsTargetSlug, { queries, lowCompletion });
    }
    if (weights.size) {
      log(`  讀者喜好權重（產於 ${j.generatedAt?.slice(0, 10)}）：${[...weights].map(([s, n]) => `${s}×${n}`).join(', ')}`);
    }
    if (hints.size) log(`  寫作洞察（搜尋字/低完成率）：${[...hints.keys()].join(', ')}`);
  } catch (e: any) {
    log(`  ⚠ 讀 news-insights.json 失敗，用預設（不影響發文）：${e.message}`);
  }
  return { weights, hints };
}

/**
 * 跨 target 去重：同一則新聞可能同時命中多個 target（如肌少症新聞同時落在
 * func 成人功能評估與 geri 高齡評估），各寫一篇會撞題並浪費每日額度。
 * 去重鍵 = 同 URL，或標題 bigram Jaccard ≥ DUP_TITLE_THRESHOLD（涵蓋不同來源同新聞）。
 * 每群只留「引用價值較高」者：先比 CITATION_PRIORITY，同分再比選題分數 score。
 * 貪婪保留 —— 依 (CITATION_PRIORITY desc, score desc) 掃描，後到且撞群者捨棄並 log。
 * 單 target 路徑（--target）不經此函式。
 */
function dedupeAcrossTargets(items: KeptItem[]): KeptItem[] {
  const ranked = [...items].sort((a, b) => {
    const pa = CITATION_PRIORITY[a.target.slug] ?? 0;
    const pb = CITATION_PRIORITY[b.target.slug] ?? 0;
    if (pb !== pa) return pb - pa;
    return b.score - a.score;
  });
  const kept: KeptItem[] = [];
  let dropped = 0;
  for (const it of ranked) {
    const dup = kept.find(
      (k) =>
        k.item.link === it.item.link ||
        titleSimilarity(k.item.title, it.item.title) >= DUP_TITLE_THRESHOLD,
    );
    if (dup) {
      dropped++;
      log(
        `    ↩ 跨target DUP 捨棄 [${it.target.slug}]「${it.item.title.slice(0, 26)}…」` +
          ` → 讓給引用價值較高的 [${dup.target.slug}]`,
      );
      continue;
    }
    kept.push(it);
  }
  if (dropped) log(`  跨 target 去重：${items.length} → ${kept.length}（捨棄 ${dropped}）`);
  return kept;
}

/**
 * 需求感知全域選題：把所有 target 的候選彙整成單一池，依
 *   選題分數 = score（relevance + 需求加成）+ (targetWeight−1) × 係數 + 引用價值先驗
 * 由高到低排序，取前 totalCap；同時每個 target 不超過 min(perTargetCap, 該 target 日上限)。
 * 引用價值先驗（CITATION_PRIORITY）讓消費者醫療題目優先、B2B 內部產品降權並收緊上限。
 * 零需求且無高相關候選的 target 當天自然寫 0 篇 —— 即「精準少量」要的行為。
 */
function selectDemandAware(
  items: KeptItem[],
  totalCap: number,
  perTargetCap: number,
  weights?: Map<NewsTargetSlug, number>,
): KeptItem[] {
  const scored = items.map((it) => {
    const w = weights?.get(it.target.slug) ?? 1;
    const prior = CITATION_PRIORITY[it.target.slug] ?? 0;
    return { it, sel: it.score + (w - 1) * WEIGHT_SCORE_FACTOR + prior };
  });
  scored.sort((a, b) => b.sel - a.sel);

  const perTarget = new Map<NewsTargetSlug, number>();
  const picked: KeptItem[] = [];
  for (const { it } of scored) {
    if (picked.length >= totalCap) break;
    const c = perTarget.get(it.target.slug) ?? 0;
    if (c >= Math.min(perTargetCap, dailyCapFor(it.target.slug))) continue;
    perTarget.set(it.target.slug, c + 1);
    picked.push(it);
  }
  return picked;
}

// ─── Feed 模式（Phase 2）：一句 takeaway → 主題「近期動態」────────────

function takeawayPrompt(topicTitle: string, item: RawItem): string {
  return [
    `你替 yao.care 官網主題頁「${topicTitle}」維護「近期動態」清單。針對下面這則新聞，用台灣繁體中文寫一句 60–120 字的重點。`,
    `寫法：講清楚發生了什麼，保留具體主詞、機構、數字。平實敘述，像懂行的人隨手記重點。`,
    `與主題的關聯**不必每則都寫**——只有真的補得出資訊時才帶一句，寫不出就停在事實上，寧可短。`,
    `禁止：醫療結論或療效判斷；「不是X而是Y」「不僅」「值得注意的是」「隨著…」開頭等腔調；驚嘆號；粗體或用引號框住全句。`,
    `收尾特別禁止這幾種套路（整頁看下來每則同一個尾巴最像機器寫的）：`,
    `「…與 X 相呼應／呼應了 X」「…與 X 相通／相近／契合／一致」「…正是 X 的核心／關鍵」「…的方向／邏輯／思路。」。`,
    `也少用「反映／凸顯／顯示…的趨勢／方向／需求／重點」這種抽象名詞收尾——那等於沒講。`,
    `要嘛收在具體判斷上（「凸顯醫療 AI 不說明推論依據，收費正當性也站不住腳」），要嘛就停在事實，不硬加一句總結。`,
    `⚠ 這幾條是文風建議，沒有對應的機械守門（規則精準度不夠、硬擋會退掉好句子）——靠你自己拿捏。`,
    `只輸出 JSON：{"takeaway":"..."}`,
    ``,
    `新聞標題：${item.title}`,
    `來源：${item.source || 'Google News'}（${item.pubDate}）`,
    `摘要：${(item.snippet || '').slice(0, 300)}`,
  ].join('\n');
}

/** 常見簡體字快篩（takeaway 層級的最後防線；主要靠 prompt 要求台灣繁體） */
const SIMPLIFIED_CHARS = /[们东华发达见识药医疗经过说难题应该网络问务动实现观点买卖办广据]/;

async function writeFeedItem(picked: KeptItem, stats: Stats) {
  const { target, item, relevance } = picked;
  const topic = TARGET_TOPIC.get(target.slug);
  if (!topic) {
    log(`    ✗ DROP: ${target.slug} 無對應主題`);
    stats.dropped++;
    stats.dropReasons.push(`${target.slug}:no-topic`);
    return;
  }
  const id = sha10(item.link);
  const dir = join(FEED_DIR, topic.slug);
  const file = join(dir, `${id}.json`);
  if (existsSync(file)) {
    log(`    ↩ feed 已有同 URL 條目，跳過`);
    return;
  }
  log(`  ▸ [feed:${topic.slug} ← ${target.slug}] "${item.title.slice(0, 40)}..." (rel=${relevance.toFixed(2)})`);

  let takeaway = '';
  let lastErr = 'unknown';
  // 3 次（原 2 次）：收尾模具守門收緊後，多給一次重寫機會，避免整則被丟掉。
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = callClaude(WRITER_MODEL, takeawayPrompt(topic.title, item));
      const t = fixTerms(String(raw.takeaway ?? '').trim());
      const tics = findTics(t);
      if (t.length < 20 || t.length > 220) lastErr = `長度 ${t.length}`;
      else if (tics.length > 0) lastErr = `AI 腔：${tics.join('、')}`;
      else if (/不是[^，。]{1,14}，?而是/.test(t)) lastErr = '「不是…而是」句式';
      else if (checkTakeaway(t)) lastErr = `收尾模具：${checkTakeaway(t)}`;
      else if (SIMPLIFIED_CHARS.test(t)) lastErr = '疑似簡體字';
      else {
        takeaway = t;
        break;
      }
      log(`    takeaway fail (attempt ${attempt}): ${lastErr}`);
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  if (!takeaway) {
    log(`    ✗ DROP: takeaway 3 attempts failed（${lastErr}）`);
    stats.dropped++;
    stats.dropReasons.push(`${target.slug}:takeaway:${lastErr}`);
    return;
  }

  const data = {
    topic: topic.slug,
    products: [target.slug],
    title: fixTerms(item.title),
    url: item.link,
    source: item.source || 'Google News',
    publishedAt: new Date(item.pubDate).toISOString(),
    fetchedAt: new Date().toISOString(),
    takeaway,
    relevance: Math.round(relevance * 100) / 100,
  };
  if (DRY_RUN) {
    log(`    [DRY-RUN] would write ${file}`);
    log(`      takeaway: ${takeaway}`);
  } else {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    log(`    ✓ feed wrote ${file}`);
  }
  stats.written++;
}

/** Phase 3: 對單一已選 item 跑 writer + regex，寫檔 */
async function writeOneSelected(picked: KeptItem, stats: Stats, hint?: WriterHint) {
  const { target, item, relevance, highlight } = picked;
  log(`  ▸ [${target.slug}] "${item.title.slice(0, 40)}..." (rel=${relevance.toFixed(2)})${hint ? ' [+洞察]' : ''}`);
  const result = await writeOne(target, item, relevance, highlight, hint);
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
  log(`fetch-news 啟動 mode=${NEWS_MODE} ${DRY_RUN ? '(dry-run)' : ''}`);
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
    dupSkipped: 0,
    written: 0,
    dropped: 0,
    dropReasons: [],
  };

  // 先載入 GA/GSC 訊號：權重（選題）+ 洞察（搜尋字餵 filter & writer、低完成率餵 writer）
  // 無訊號/資料不足時皆空 → 行為等同現狀。
  const insights = loadInsights();

  // ─── Phase 1: 對所有 target 抓 RSS + filter（需求字進 filter）+ 去重 ───
  const byTarget = new Map<NewsTargetSlug, KeptItem[]>();
  const allKept: KeptItem[] = [];
  for (const t of targets) {
    const kept = await fetchAndFilter(t, stats, insights.hints.get(t.slug));
    byTarget.set(t.slug, kept);
    allKept.push(...kept);
  }

  // ─── Phase 2: 需求感知全域選題 ──────────────────────────
  //   - 非單 target：全域評分排序 + per-target 上限，cap = MAX_WRITE_TOTAL
  //   - 單 target（--target）：直接取該 target 前 N（依 score），cap = MAX_ITEMS
  const totalCap = ONLY_TARGET
    ? Math.min(MAX_ITEMS, byTarget.get(ONLY_TARGET)?.length ?? 0)
    : Math.min(MAX_ITEMS, NEWS_MODE === 'feed' ? MAX_FEED_TOTAL : MAX_WRITE_TOTAL);
  // 全域路徑先跨 target 去重（同新聞只留引用價值較高者），再做需求感知選題
  const globalPool = ONLY_TARGET ? allKept : dedupeAcrossTargets(allKept);
  const picked: KeptItem[] = ONLY_TARGET
    ? (byTarget.get(ONLY_TARGET) ?? []).slice(0, totalCap)
    : selectDemandAware(globalPool, totalCap, PER_TARGET_DAILY_CAP, insights.weights);

  log(`\n══════ Phase 2: 排程 ${picked.length} 篇 ══════`);
  const distribution = new Map<NewsTargetSlug, number>();
  for (const p of picked) {
    distribution.set(p.target.slug, (distribution.get(p.target.slug) ?? 0) + 1);
  }
  for (const t of targets) {
    log(`  ${t.slug}: ${distribution.get(t.slug) ?? 0} 篇`);
  }

  // ─── Phase 3: 依序寫每篇 ──────────────────────────────
  log(`\n══════ Phase 3: ${NEWS_MODE === 'feed' ? 'Feed（主題動態）' : 'Writer'} ══════`);
  for (const p of picked) {
    if (NEWS_MODE === 'feed') await writeFeedItem(p, stats);
    else await writeOneSelected(p, stats, insights.hints.get(p.target.slug));
  }

  // ─── 不再刪文 ───
  // 早期版本曾每 target 只保留最新 KEEP_PER_TARGET 則（pruneOld），
  // 那是把這套引擎當「會過期的新聞」的錯誤假設。實際內容是常青議題分析，
  // 該長期累積以建立主題深度與 SEO 權重，故移除所有刪除邏輯。

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
  log(`  dup skipped: ${stats.dupSkipped}`);
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
