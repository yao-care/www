// 設計規範守門 v2（團隊共用；v1 源自 dreamer868，v2 加 css 白名單＋掃 .svelte）：
// 掃 src/ 下所有 .css/.astro/.svelte，違規即 exit 1（npm run build 前自動跑）。
// 規則（見 src/styles/variables.css 檔頭）：
// 1. font-size 禁用 px（一律 var(--text-*) 階梯）
// 2. 顏色（hex / rgb() / hsl()）只准出現在 src/styles/variables.css
// 3. 禁 !important
// 4. 禁外部 CDN（fonts.googleapis / cdnjs / unpkg / jsdelivr）
// 5. 統一 css 檔案：src/ 下的 .css 只准 src/styles/ 白名單那幾檔，新增即 fail
//    （元件樣式寫 Astro scoped <style> 或進 global.css）
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, basename } from "node:path";

const ROOT = "src";
const TOKEN_FILE = join("src", "styles", "variables.css");
// 舊站遷移期可暫加既有檔（凍結用，禁再擴充）；新站一律只有這兩檔。
const STYLE_WHITELIST = new Set(["variables.css", "global.css"]);
const exts = new Set([".css", ".astro", ".svelte"]);

// TODO(遷移遞延 2026-07-20)：規則 2 存量凍結預算——接手守門時本站已有 64 處
// token 外硬編色（多為 D3 圖表 JS 字串與 Tailwind arbitrary 色值 bg-[#...]，
// 需視覺判斷不宜機械代換）。凍結為 per-檔上限：低於上限（有人清理）即自動收緊
// 需同步下修；**超過上限即 fail，禁再擴充**；不在表上的檔一律 0 容忍。
// 清完某檔請把該行刪掉；全部清完請整段刪掉，回到全站 0 容忍。
const LEGACY_COLOR_BUDGET = new Map([
  ["src/components/SmartHealthcare.astro", 4],
  ["src/pages/ai/intel.astro", 13],
  ["src/pages/marketing.astro", 14],
  ["src/pages/news/index.astro", 4],
]);

const violations = [];
const colorHits = new Map(); // file -> [violation strings]

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (exts.has(extname(p))) scan(p);
  }
}

function scan(file) {
  const rel = relative(".", file);
  if (extname(file) === ".css") {
    const inStyles = rel.startsWith(join("src", "styles") + "/");
    if (!inStyles || !STYLE_WHITELIST.has(basename(file)))
      violations.push(
        `${rel} css 檔不在白名單（統一 css：src/styles/{${[...STYLE_WHITELIST].join(",")}}；元件樣式用 scoped <style>）`
      );
  }
  const isTokenFile = rel === TOKEN_FILE;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const loc = `${rel}:${i + 1}`;
    if (/font-size\s*:\s*[0-9.]+px/i.test(line))
      violations.push(`${loc} px 字級（改用 var(--text-*)）: ${line.trim()}`);
    if (!isTokenFile && /(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/.test(line) && !/url\(/.test(line)) {
      if (!colorHits.has(rel)) colorHits.set(rel, []);
      colorHits.get(rel).push(`${loc} token 外硬編顏色（改用 var(--color-*)）: ${line.trim()}`);
    }
    if (/!important/.test(line))
      violations.push(`${loc} 禁用 !important: ${line.trim()}`);
    if (/(fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare|unpkg\.com|cdn\.jsdelivr)/.test(line))
      violations.push(`${loc} 外部 CDN（字型/資源一律自託管或系統堆疊）: ${line.trim()}`);
  });
}

walk(ROOT);

// 規則 2 結算：凍結預算內放行（遷移遞延），超出或不在表上即違規。
let frozen = 0;
for (const [file, hits] of colorHits) {
  const budget = LEGACY_COLOR_BUDGET.get(file) ?? 0;
  if (hits.length > budget) {
    violations.push(...hits);
    if (budget > 0)
      violations.push(
        `${file} 硬編色 ${hits.length} 處超過遷移凍結預算 ${budget}（禁再擴充；新增顏色一律用 var(--color-*)）`
      );
  } else {
    frozen += hits.length;
  }
}

if (violations.length) {
  console.error(`設計規範違規 ${violations.length} 處：\n` + violations.join("\n"));
  process.exit(1);
}
console.log(
  `設計規範檢查通過：css 白名單、無 px 字級、無 token 外顏色、無 !important、無外部 CDN。` +
    (frozen ? `（遷移凍結預算內存量硬編色 ${frozen} 處，見 LEGACY_COLOR_BUDGET TODO）` : "")
);
