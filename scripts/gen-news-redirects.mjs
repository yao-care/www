#!/usr/bin/env node
// 產生 src/data/news-redirects.json：已收斂的 /news/<分類>/ 舊網址 → 主題頁（2026-11-14 新增）
//
// 為什麼：網站搬到 GitHub Pages 後沒有伺服器端 301，NPM #46 那 7 條「前綴」規則
// （整個 /news/<分類>/ 都轉）要展開成逐一網址，由 astro.config.mjs 的 redirects 產生靜態轉址頁
// （0 秒 meta refresh＋canonical＋noindex）。在主機上，NPM 的 301 規則先攔下這些路徑，這些頁不會被讀到。
//
// 清單來源：git 歷史裡被刪掉的 src/content/news/<分類>/<id>.json（需完整歷史，淺層 clone 會漏）。
// 用法：node scripts/gen-news-redirects.mjs        # 重產 json
//       node scripts/gen-news-redirects.mjs --check  # 只比對，有差異就 exit 1
//
// 要收斂新的分類（例如批次三 geri／intel／goalkeeper）：先從 src/content/news/ 刪掉該分類的檔並 commit，
// 在下面 BUCKETS 加一行，重跑本腳本，commit 產生的 json。不用再改 NPM。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BUCKETS = {
  sign: '/topics/elder-care-frailty/',
  func: '/topics/preventive-function-health/',
  triz: '/topics/innovation-methods/',
  siqc: '/topics/medical-ai-governance/',
  yaocare: '/topics/medication-safety/',
  pedi: '/topics/child-development/',
  huatuo: '/topics/explainable-medical-ai/',
};
const OUT = 'src/data/news-redirects.json';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('淺層 clone 看不到完整歷史，請先 git fetch --unshallow');
  process.exit(2);
}

const map = {};
for (const [bucket, target] of Object.entries(BUCKETS)) {
  map[`/news/${bucket}/`] = target;
  const files = git('-c', 'core.quotepath=false', 'log', '--all', '--diff-filter=D', '--name-only', '--format=', '--', `src/content/news/${bucket}/*.json`)
    .split('\n')
    .filter(Boolean);
  for (const f of new Set(files)) {
    if (fs.existsSync(f)) continue; // 刪了又加回來的不算
    const id = f.split('/').pop().replace(/\.json$/, '');
    map[`/news/${bucket}/${id}/`] = target;
  }
}
const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
const json = `${JSON.stringify(sorted, null, 2)}\n`;

const counts = Object.keys(BUCKETS).map((b) => `${b} ${Object.keys(sorted).filter((k) => k.startsWith(`/news/${b}/`) && k !== `/news/${b}/`).length}`);
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== json) {
    console.error(`${OUT} 跟 git 歷史算出來的不一致，請重跑 node scripts/gen-news-redirects.mjs`);
    process.exit(1);
  }
  console.log(`✅ 舊新聞轉址清單一致（${Object.keys(sorted).length} 條：${counts.join('、')}，加 ${Object.keys(BUCKETS).length} 個分類首頁）`);
} else {
  fs.writeFileSync(OUT, json);
  console.log(`寫入 ${OUT}：${Object.keys(sorted).length} 條（${counts.join('、')}，加 ${Object.keys(BUCKETS).length} 個分類首頁）`);
}
