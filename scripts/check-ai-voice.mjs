// 去 AI 味守門（文案層；2026-09-05）——掃 src/ 下**人看得到的中文文案**的結構性 AI 腔。
//
// 為什麼要有這支：scripts/style-guide.mjs 的 BANNED_PHRASES 抓的是**逐字口頭禪**
// （「面對這類議題」「本質上是」…），而且只在 fetch-news 產線對 draft 物件跑。
// 但本站靜態文案（首頁 / hub / 產品卡 / tagline）命中那份黑名單是 0 —— AI 味不在詞彙，
// 在**標點與句型的模具**：改版前每個產品的 tagline 都是同一個模子壓出來的
// （破折號接續、× 連接概念、→ 串流程、「從 A 到 B」涵蓋句型、「閉環／一條龍」收尾），
// 這正是 LLM「統計上最安全的句子」的指紋。這支專收那一類。
//
// 分工（三層，勿互相取代）：
//   style-guide.mjs checkVoice → 產線 runtime，擋 news JSON draft（產文當下）
//   check-content.mjs          → build gate，擋 src/**/*.md(x) 檔案
//   本檔 check-ai-voice.mjs    → build gate，擋 .astro / *.config.ts 裡的靜態文案
//
// ⚠ 核心設計：**AI 味是密度與重複，不是單次出現。**
// 破折號夾註、「從 1 到 9 級」、bullet 裡的 A → B 都是正當中文；同一段裡出現六次才是模具。
// 故「有正當用法」的規則（DASH / ARROW / FROM_TO）給每千中文字 1 次的額度，
// 「幾乎只有行銷腔會用」的規則（CROSS / BUZZ / CORE / TRIPLE / PASSIVE3）零容忍。
// 校準基準：src/topics.config.ts（22k 字，2026-07-15 刻意去 AI 味寫成）密度 0.3‰；
// 改版前的首頁與 hub 頁是 33–36‰。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = "src";
const exts = new Set([".astro", ".ts"]);
const SKIP = new Set([join("src", "content", "config.ts")]);
// --all：連額度內的命中一起列出（盤點用；gate 本身不看這個旗標）
const ALL = process.argv.includes("--all");
// 逐行豁免：真的是流程圖標註／技術管線步驟時，在該行或前一行標 ai-voice-ok 並寫理由。
// 比用「每檔容許 N 處」的數字預算誠實 —— 豁免看得到、審得到、不會隨改動漂移。
const OK_MARK = /ai-voice-ok/;

const RULES = [
  {
    id: "DASH",
    re: /[一-鿿）)]\s*—{1,2}\s*[一-鿿A-Za-z]/g,
    why: "破折號當萬用接續（下定義 / 補語 / 換句話說）",
    fix: "拆成兩句，或改用冒號、逗號。一句講一件事。",
    allowPerK: 1, // 破折號夾註是正當中文，滿篇才是問題
    // 「頁名 — 副標」是標題分隔號的排版慣例，不是行文。
    skipLine: /pageTitle|title:/,
    ignoreCtx: /—\s*yao\.care\s*(['"`]|$)/,
  },
  {
    id: "ARROW",
    re: /[一-鿿A-Za-z0-9]\s*→\s*[一-鿿A-Za-z]/g,
    why: "箭頭串流程（A → B → C），簡報腔",
    fix: "寫成句子講先後：「先 A，再 B」。真的是流程圖或對照表再用箭頭。",
    allowPerK: 1, // bullet 裡的「症狀 → 後果」對照是正當寫法
    skipLine: /ctaText:/, // CTA 按鈕的 → 是導引箭頭（UI 慣例，等同「前往」）
  },
  {
    id: "FROM_TO",
    re: /從[^，。；、！？]{2,20}到[^，。；、！？]{2,20}/g,
    why: "「從 A 到 B」涵蓋句型，是 LLM 表達「範圍很廣」的預設模具",
    fix: "一段裡只留一處。改成舉一個具體例子，比列舉範圍有說服力。",
    allowPerK: 1, // 「CFS 分 1 到 9 級，從非常健壯到末期」是在陳述事實，不是誇範圍
  },
  {
    id: "CROSS",
    re: /[一-鿿]\s*[×✕]\s*[一-鿿A-Za-z]/g,
    why: "「×」當概念連接號（A × B），標語模具",
    fix: "用「和」「加上」，或直接寫清楚兩者的關係。乘號留給真的數字。",
  },
  {
    id: "TRIPLE",
    re: /可[一-鿿]{1,3}[、，]\s*可[一-鿿]{1,3}[、，]\s*可[一-鿿]{1,3}/g,
    why: "「可 A、可 B、可 C」三連對仗",
    fix: "挑最重要的一個講，其他刪掉或寫成具體行為。",
  },
  {
    id: "BUZZ",
    re: /(閉環|一條龍|生態系|賦能|串起|打造|深耕|全方位|一站式|無縫|一次到位|全流程|可重複的(系統|洞察))/g,
    why: "抽象收尾名詞／行銷套語，講完等於沒講",
    fix: "換成具體做了什麼、對誰有什麼差別。",
  },
  {
    id: "CORE",
    // 不收「以病人為中心」：那是 patient-centered care 的正規醫學譯法，不是 AI 腔。
    re: /以[^，。；「」]{1,16}為(核心|基準|框架)/g,
    why: "「以 X 為核心」公式開頭",
    fix: "直接說做了什麼：「先用 CFS 量表分級」勝過「以 CFS 為基準」。",
  },
  {
    id: "PASSIVE3",
    re: /被[一-鿿]{1,6}[、，]\s*被[一-鿿]{1,6}/g,
    why: "「被 A、被 B」被動排比",
    fix: "改主動語態，講清楚誰對誰做了什麼。",
  },
];

/**
 * 去掉註解與程式碼，只留人看得到的文案（避免掃到 code 與 TODO 註解）。
 * 換行一律保留，行號才對得上原始碼（豁免標記要回頭查原始行）。
 */
const keepLines = (m) => m.replace(/[^\n]/g, " ");
function copyOnly(src, file) {
  let t = src;
  t = t.replace(/<!--[\s\S]*?-->/g, keepLines); // HTML 註解
  t = t.replace(/\/\*[\s\S]*?\*\//g, keepLines); // 區塊註解
  t = t.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + " "); // 行註解（避開 https://）
  if (extname(file) === ".astro") {
    // frontmatter（--- … ---）留著：pageTitle / description 等文案都在裡面。
    t = t.replace(/<style[\s\S]*?<\/style>/g, keepLines);
    t = t.replace(/<script[\s\S]*?<\/script>/g, keepLines);
  }
  return t;
}

const report = [];
let scanned = 0;
let withinQuota = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "content") continue; // news / topicFeed 由產線 checkVoice 顧
      walk(p);
    } else if (exts.has(extname(p))) scan(p);
  }
}

function scan(file) {
  const rel = relative(".", file);
  if (SKIP.has(rel)) return;
  const raw = readFileSync(file, "utf8");
  const rawLines = raw.split("\n");
  const text = copyOnly(raw, file);
  const zh = (text.match(/[一-鿿]/g) || []).length;
  if (zh < 40) return; // 幾乎沒文案的純程式檔跳過
  scanned++;

  const over = [];
  for (const r of RULES) {
    const re = new RegExp(r.re.source, "g");
    const hits = [];
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split("\n").length;
      if (r.ignoreCtx && r.ignoreCtx.test(text.slice(m.index, m.index + 30))) continue;
      if (r.skipLine && r.skipLine.test(rawLines[line - 1] || "")) continue;
      if (OK_MARK.test(rawLines[line - 1] || "") || OK_MARK.test(rawLines[line - 2] || "")) continue;
      hits.push({ line, evidence: m[0].replace(/\s+/g, " ").trim() });
    }
    if (!hits.length) continue;
    const quota = ALL ? 0 : r.allowPerK ? Math.max(1, Math.round((zh / 1000) * r.allowPerK)) : 0;
    if (hits.length <= quota) {
      withinQuota += hits.length;
      continue;
    }
    over.push({ rule: r, hits, quota });
  }
  if (over.length) report.push({ rel, zh, over });
}

walk(ROOT);

if (report.length) {
  console.error("✖ 去 AI 味守門未通過（結構性 AI 腔）：\n");
  for (const { rel, zh, over } of report.sort((a, b) => a.rel.localeCompare(b.rel))) {
    const n = over.reduce((s, o) => s + o.hits.length, 0);
    console.error(`${rel}（${n} 處 / ${zh} 中文字，密度 ${((n / zh) * 1000).toFixed(1)}‰）`);
    for (const { rule, hits, quota } of over) {
      console.error(`  [${rule.id}] ${hits.length} 處${quota ? `（每千字容許 ${quota}）` : ""}：${rule.why}`);
      for (const h of hits) console.error(`    ${rel}:${h.line} 「${h.evidence}」`);
      console.error(`    改法：${rule.fix}`);
    }
    console.error("");
  }
  console.error(
    "對照組：src/topics.config.ts 22k 字密度 0.3‰ —— 那是本站自己寫得最像人話的內容，照那個標準改。\n" +
      "真的是流程圖標註／技術管線步驟，在該行或前一行加註解 ai-voice-ok 並寫明理由。\n"
  );
  process.exit(1);
}

console.log(
  `✓ 去 AI 味守門通過（掃 ${scanned} 檔${withinQuota ? `；${withinQuota} 處在正當用法額度內，明細見 --all` : ""}）`
);
