#!/usr/bin/env node
// 內鏈網址形式守門：dist/ 內所有 HTML 的站內連結必須以 / 結尾（目錄式路由）。
// 背景：本站由 nginx 服務目錄式產物，無斜線形式會吃一跳 301；歷史上 canonical/內鏈
// 混用兩種形式曾造成 GSC 把同一頁拆成兩個網址（glossary 06 月、news 07-16 修復）。
// 規則：href/src/meta-refresh 中以 / 開頭的站內路徑，最後一段不含「.」（非檔案）者必須以 / 結尾，
// 且不得含 //。違規則非零退出、列出來源檔，擋下 build/deploy。
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync('dist/**/*.html');
if (files.length === 0) {
  console.error('check-internal-links: dist/ 沒有 HTML（先跑 astro build）');
  process.exit(1);
}

const bad = new Map(); // path -> Set(files)
const record = (url, file) => {
  if (!url.startsWith('/') || url.startsWith('//')) return;
  const path = url.split('#')[0].split('?')[0];
  if (!path || path === '/') return;
  const last = path.replace(/\/+$/, '').split('/').pop();
  if (last.includes('.')) return; // 檔案（.txt/.xml/.png/.html…）
  if (!path.endsWith('/') || path.includes('//')) {
    if (!bad.has(path)) bad.set(path, new Set());
    bad.get(path).add(file);
  }
};

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) record(m[1], f);
  for (const m of html.matchAll(/content="\d+;\s*url=(\/[^"]*)"/gi)) record(m[1], f); // redirect 頁
}

if (bad.size) {
  console.error(`❌ 內鏈網址形式檢查失敗：${bad.size} 個站內路徑缺結尾斜線或含雙斜線`);
  for (const [p, fs] of bad) console.error(`  ${p}  （${fs.size} 檔，如 ${[...fs][0]}）`);
  console.error('站內目錄式連結一律以 / 結尾；修 href 來源（config/元件/頁面），勿改 dist。');
  process.exit(1);
}
console.log(`✅ 內鏈網址形式檢查通過（${files.length} 個 HTML）。`);
