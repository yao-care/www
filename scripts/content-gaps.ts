/*
 * GSC 內容缺口偵測 + 草稿生成（固定頻次補題機制）。
 *
 * 策略（2026-06，呼應 news 引擎「精準少量 + 永久累積」）：
 *   guides / glossary 是常青、要查事實、要對應產品的「手工頁」，不該想到就灌。
 *   → 每兩週跑一次（cron 1,15 號），自動：
 *      1. 從 GSC 找「高曝光 × 排名差 × 站上無對應內容」的真實查詢 → 排序成補題候選佇列
 *      2. （--draft）只為「最高價值的 1 個」候選自動產『草稿』，落到 drafts/ 供人工審查
 *   ⚠ 草稿不自動上線、不自動 commit。人工查證事實 → 貼進 guides/glossary.config → build → deploy。
 *
 * 用法：
 *   tsx scripts/content-gaps.ts                  只列候選 → reports/content-gaps.json
 *   tsx scripts/content-gaps.ts --draft          另為 top1 候選產草稿 → drafts/
 *   tsx scripts/content-gaps.ts --debug          印 Claude 完整 I/O
 *   tsx scripts/content-gaps.ts --min-impr 5     覆寫曝光門檻
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGscInsights } from './gsc';
import { STYLE_RULES } from './style-guide.mjs';
import { GUIDES } from '../src/guides.config';
import { GLOSSARY } from '../src/glossary.config';
import { PRODUCTS } from '../src/products.config';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── 可調參數（檔內常數）─────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const opt = (name: string, dflt: number) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
};
const DEBUG = flag('--debug');
const DO_DRAFT = flag('--draft');
const MIN_IMPRESSIONS = opt('--min-impr', 8); // 至少這麼多曝光才算「真的有人搜」
const MIN_POSITION = opt('--min-pos', 6); // 平均排名比這差（數字大）才算「答得不夠好」
const COVERED_THRESHOLD = 0.5; // 與既有內容的 bigram Jaccard ≥ 此值 → 視為已涵蓋，跳過
const MAX_CANDIDATES = 15;
const PER_RUN_DRAFT_CAP = 1; // 每次最多產 1 篇草稿（固定頻次、不瘋狂新增）
const MODEL = 'claude-sonnet-5';

const dlog = (...a: any[]) => DEBUG && console.error('[debug]', ...a);

// ── 文字正規化 + bigram Jaccard（CJK 友善，與 news 去重同調）──────
function norm(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}
function bigrams(s: string): Set<string> {
  const n = norm(s);
  const g = new Set<string>();
  for (let i = 0; i < n.length - 1; i++) g.add(n.slice(i, i + 2));
  if (n.length === 1) g.add(n);
  return g;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── 既有內容覆蓋語料（guides + glossary 的所有「會被搜到」的字串）──
function coverageCorpus(): { label: string; grams: Set<string> }[] {
  const out: { label: string; grams: Set<string> }[] = [];
  for (const g of GUIDES) {
    for (const phrase of [g.question, ...g.searchPhrases, g.slug.replace(/-/g, ' ')]) {
      out.push({ label: `guide:${g.slug}`, grams: bigrams(phrase) });
    }
  }
  for (const t of GLOSSARY) {
    for (const phrase of [t.term, t.en, t.slug.replace(/-/g, ' ')]) {
      out.push({ label: `glossary:${t.slug}`, grams: bigrams(phrase) });
    }
  }
  return out;
}

function bestCoverage(query: string, corpus: { label: string; grams: Set<string> }[]) {
  const qg = bigrams(query);
  let best = { label: '', sim: 0 };
  for (const c of corpus) {
    const sim = jaccard(qg, c.grams);
    if (sim > best.sim) best = { label: c.label, sim };
  }
  return best;
}

// ── 判斷查詢比較像「名詞定義」還是「情境問題」──────────────────
function classifyChannel(query: string): 'glossary' | 'guide' {
  const definitional = /(是什麼|什麼是|意思|定義|介紹|wiki|縮寫|英文|whats?\b|what\s+is|definition|meaning)/i;
  // 純單一名詞（很短、無動詞語氣）也偏 glossary
  if (definitional.test(query)) return 'glossary';
  if (norm(query).length <= 8 && !/怎麼|如何|要不要|可不可以|哪|嗎|多少/.test(query)) return 'glossary';
  return 'guide';
}

// ── 對應最相關產品（用產品 title/slug 與 query 的 bigram 相似度）──
function guessProduct(query: string): string | null {
  const qg = bigrams(query);
  let best = { slug: '', sim: 0 };
  for (const p of PRODUCTS as any[]) {
    const sim = Math.max(jaccard(qg, bigrams(p.title)), jaccard(qg, bigrams(p.slug)));
    if (sim > best.sim) best = { slug: p.slug, sim };
  }
  return best.sim >= 0.12 ? best.slug : null;
}

// ── Claude 呼叫（沿用 fetch-news.ts 慣例）─────────────────────
function callClaude(prompt: string): any {
  dlog(`Claude prompt (${prompt.length} bytes)`);
  const r = spawnSync('claude', ['-p', prompt, '--output-format', 'json', '--model', MODEL], {
    encoding: 'utf8',
    timeout: 240_000,
    maxBuffer: 1024 * 1024 * 16,
  });
  if (r.error) throw new Error(`Claude spawn error: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`Claude exit ${r.status}: ${r.stderr || r.stdout}`);
  const wrapper = JSON.parse(r.stdout || '{}');
  if (wrapper.is_error) throw new Error(`Claude error: ${wrapper.result}`);
  let inner = wrapper.result;
  if (typeof inner !== 'string') return inner;
  inner = inner.replace(/^\s*```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  try {
    return JSON.parse(inner);
  } catch {
    const s = inner.indexOf('{');
    const e = inner.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error(`Claude JSON parse fail: ${inner.slice(0, 300)}`);
    return JSON.parse(inner.slice(s, e + 1));
  }
}

function draftPrompt(c: Candidate): string {
  const product = c.product ? (PRODUCTS as any[]).find((p) => p.slug === c.product) : null;
  const productCtx = product
    ? `最相關的自家產品（草稿可在最後「帶入工具」段引用，僅能用以下事實，不可加油添醋）：\n${product.slug} — ${product.title}：${product.description}`
    : '（找不到明確對應的自家產品；toolIntro 可留空或寫成中立建議，切勿杜撰產品功能。）';
  const styleGuide =
    c.channel === 'guide'
      ? `產出一則「情境指南（guide）」JSON，欄位：slug, question(使用者原話為題), searchPhrases[3-6], audience(caregiver|parent|adult|b2b|all), answer(answer-first 直接解答，2-4句), sections[{heading, bullets[] 或 paragraphs[]}], toolIntro(接在內容後、引用上面產品事實；無對應產品則省略), faqs[{q,a}](2-3), related(產品 slug[]), relatedTerms(glossary slug[])。`
      : `產出一則「名詞解釋（glossary）」JSON，欄位：slug, term, en, category(medical|ai|care), oneLiner(一句話精準定義), paragraphs[2-3], keyPoints[3], related(產品 slug[]), sources[{label,url}](權威外部來源，URL 必須真實存在、不可杜撰)。`;
  return [
    `你在為醫療科技公司 yao.care 的官網補一則「回答真實搜尋需求」的內容。`,
    `讀者真的在 Google 搜尋這個查詢，但本站目前沒有好的對應內容：`,
    `  查詢：「${c.query}」（近28天曝光 ${c.impressions}、點擊 ${c.clicks}、平均排名 ${c.position}）`,
    ``,
    `鐵則（YMYL 醫療內容）：`,
    `1. 只寫你有把握、可查證的事實；不確定就保守、寧可不寫，不可杜撰數據/文獻/網址。`,
    `2. answer-first：開頭直接回答問題。語氣中立、衛教取向，不下診斷、不取代專業。`,
    `3. 自然語言、繁體中文台灣用語。`,
    productCtx,
    ``,
    STYLE_RULES,
    ``,
    styleGuide,
    ``,
    `另外回傳兩個欄位協助人工審查：`,
    `  "factCheckNotes": string[]  // 列出需要人工查證的具體主張（數字、來源、產品功能等）`,
    `  "uncertain": boolean        // 若你對主題事實把握不足、建議人工重寫，設 true`,
    ``,
    `只輸出單一 JSON 物件，不要其他文字。`,
  ].join('\n');
}

// ── 主流程 ──────────────────────────────────────────────────
type Candidate = {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  score: number;
  channel: 'glossary' | 'guide';
  product: string | null;
  nearest: string;
  nearestSim: number;
};

(async () => {
  const gsc = await getGscInsights();
  if (!gsc) {
    console.error('GSC 無資料（確認 SA 金鑰仍在 GSC 使用者）。');
    process.exit(0);
  }
  const corpus = coverageCorpus();

  const candidates: Candidate[] = [];
  for (const row of gsc.topQueries) {
    const query = row.keys[0];
    if (row.impressions < MIN_IMPRESSIONS) continue;
    if (row.position < MIN_POSITION) continue; // 排名已夠好，不需補
    const cov = bestCoverage(query, corpus);
    if (cov.sim >= COVERED_THRESHOLD) continue; // 已有對應內容
    candidates.push({
      query,
      impressions: row.impressions,
      clicks: row.clicks,
      position: Math.round(row.position * 10) / 10,
      // 價值分數：曝光 × 排名差距（越差越有上升空間）
      score: Math.round(row.impressions * Math.min(row.position / 10, 5)),
      channel: classifyChannel(query),
      product: guessProduct(query),
      nearest: cov.label,
      nearestSim: Math.round(cov.sim * 100) / 100,
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, MAX_CANDIDATES);

  mkdirSync(resolve(ROOT, 'reports'), { recursive: true });
  const report = { generatedFor: gsc.siteUrl, thresholds: { MIN_IMPRESSIONS, MIN_POSITION, COVERED_THRESHOLD }, candidates: top };
  writeFileSync(resolve(ROOT, 'reports/content-gaps.json'), JSON.stringify(report, null, 2));

  console.log(`\n▼ 補題候選（高曝光 × 排名差 × 站上無對應內容）— 共 ${top.length} 個`);
  for (const c of top) {
    console.log(
      `  [${c.channel}] 「${c.query}」 曝光=${c.impressions} 點擊=${c.clicks} 排名=${c.position} ` +
        `→ 建議產品=${c.product ?? '無'} (最近既有 ${c.nearest || '無'} sim=${c.nearestSim})`,
    );
  }
  if (!top.length) {
    console.log('  （本期無缺口，不補題 — 這是正常、健康的結果）');
    return;
  }

  if (!DO_DRAFT) {
    console.log('\n（未加 --draft，僅列候選。要產草稿請加 --draft）');
    return;
  }

  // 只為「對應得到自家產品」且最高價值的 1 個候選產草稿（固定頻次、人工把關）。
  // 無對應產品的高曝光字（如品牌混淆「法律偵探」）一律不自動產稿，避免逼模型杜撰無關內容。
  const draftable = top.filter((c) => c.product);
  const picks = draftable.slice(0, PER_RUN_DRAFT_CAP);
  if (!picks.length) {
    console.log('\n本期候選都對應不到自家產品 → 不自動產草稿，改由人工審查上面候選清單決定。');
    return;
  }
  mkdirSync(resolve(ROOT, 'drafts'), { recursive: true });
  for (const c of picks) {
    console.log(`\n▼ 為「${c.query}」產草稿（${c.channel}）…`);
    let draft: any;
    try {
      draft = callClaude(draftPrompt(c));
    } catch (e: any) {
      console.error(`  草稿生成失敗：${e.message}`);
      continue;
    }
    const slug = (draft.slug || norm(c.query)).toString();
    const md = [
      `# 草稿（待人工審查）— ${c.channel}`,
      ``,
      `> ⚠ 這是自動產生的草稿，**尚未查證、尚未上線**。`,
      `> 流程：人工查證事實 → 貼進 \`src/${c.channel === 'guide' ? 'guides' : 'glossary'}.config.ts\` → \`npm run deploy\` → IndexNow。`,
      ``,
      `- 來源查詢：「${c.query}」（曝光 ${c.impressions}、點擊 ${c.clicks}、排名 ${c.position}）`,
      `- 建議頻道：${c.channel}　建議產品：${c.product ?? '無'}`,
      `- 模型自評 uncertain：**${draft.uncertain ? 'true（建議人工重寫）' : 'false'}**`,
      ``,
      `## 需人工查證的主張`,
      ...(Array.isArray(draft.factCheckNotes) && draft.factCheckNotes.length
        ? draft.factCheckNotes.map((n: string) => `- [ ] ${n}`)
        : ['- （模型未列出，仍請逐句查證）']),
      ``,
      `## 草稿內容（JSON，可整理後貼進 config）`,
      '```json',
      JSON.stringify(draft, null, 2),
      '```',
    ].join('\n');
    const file = resolve(ROOT, `drafts/${c.channel}-${slug}.md`);
    writeFileSync(file, md);
    console.log(`  ✓ 草稿寫入 ${file}（uncertain=${draft.uncertain ? 'true' : 'false'}）`);
  }
  console.log(`\n完成。請人工審查 drafts/ 後再決定是否採用。`);
})().catch((e) => {
  console.error('content-gaps 失敗：', e.message);
  process.exit(1);
});
