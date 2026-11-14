#!/usr/bin/env node
// 比對兩次 build 產物，列出內容真的變了的頁面路徑（給 IndexNow 用；2026-11-14 新增）
//
//   node scripts/changed-pages.mjs <新 dist> <舊 dist>
//
// 輸出：每行一個路徑（/topics/foo/），只含 index.html 頁；排除轉址頁（meta refresh）。
// 舊 dist 不存在（第一次部署）→ 不輸出任何東西，免得把整站送給 IndexNow。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [newDir, oldDir] = process.argv.slice(2);
if (!newDir || !oldDir) {
  console.error('用法: node scripts/changed-pages.mjs <新 dist> <舊 dist>');
  process.exit(2);
}
if (!fs.existsSync(path.join(oldDir, 'index.html'))) {
  console.error('沒有上次的 build 產物，這次不列變動頁');
  process.exit(0);
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
  });
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const out = [];
for (const f of walk(newDir)) {
  const rel = path.relative(newDir, f);
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes('http-equiv="refresh"')) continue; // 轉址頁不送
  const old = path.join(oldDir, rel);
  if (fs.existsSync(old) && hash(old) === hash(f)) continue;
  out.push(`/${rel.replace(/index\.html$/, '')}`);
}
out.sort();
console.log(out.join('\n'));
console.error(`變動頁 ${out.length} 個`);
