#!/usr/bin/env node
// 檢查／替換 repo 裡的主機專屬資訊（2026-11-14 新增；repo 公開前置作業）
//
//   node scripts/redact-host-details.mjs --check   # 有任何一個值還留在追蹤中的檔案 → 列出並 exit 1
//   node scripts/redact-host-details.mjs --apply   # 把追蹤中檔案裡的值換成代稱（例如 $WWW_SITE_DIR）
//
// 對照表在主機的 /etc/yaocare/redact-rules.txt（不進 git；格式與 git filter-repo --replace-text 相同：
// 每行「實際值==>代稱」，由長到短排）。可用 YAOCARE_REDACT_RULES 指定別的位置。
// 同一份對照表也拿來改寫 git 歷史（scripts/rewrite-history.sh），所以目前檔案與歷史換成同樣的代稱。
// 代稱的意思見 docs/HOST-CONFIG.md。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const RULES = process.env.YAOCARE_REDACT_RULES || '/etc/yaocare/redact-rules.txt';
const mode = process.argv[2];
if (!['--check', '--apply'].includes(mode)) {
  console.error('用法: node scripts/redact-host-details.mjs --check | --apply');
  process.exit(2);
}
if (!existsSync(RULES)) {
  console.error(`找不到對照表 ${RULES}（只放主機，見 docs/HOST-CONFIG.md）`);
  process.exit(2);
}
const rules = readFileSync(RULES, 'utf8')
  .split('\n')
  .filter((l) => l.includes('==>') && !l.startsWith('#'))
  .map((l) => {
    const i = l.indexOf('==>');
    return [l.slice(0, i), l.slice(i + 3)];
  })
  .filter(([from]) => from.length > 0);

const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let hits = 0;
for (const f of files) {
  if (!existsSync(f)) continue;
  const buf = readFileSync(f);
  if (buf.includes(0)) continue; // 二進位檔
  let text = buf.toString('utf8');
  const found = rules.filter(([from]) => text.includes(from));
  if (found.length === 0) continue;
  if (mode === '--check') {
    for (const [from, to] of found) {
      const n = text.split(from).length - 1;
      hits += n;
      console.log(`${f}：${n} 處應換成 ${to}`);
    }
  } else {
    for (const [from, to] of rules) text = text.split(from).join(to);
    writeFileSync(f, text);
    hits += found.length;
    console.log(`已替換 ${f}`);
  }
}
if (mode === '--check') {
  if (hits > 0) {
    console.error(`\n❌ 還有 ${hits} 處主機資訊留在 repo（不能公開）`);
    process.exit(1);
  }
  console.log(`✅ ${files.length} 個追蹤中的檔案都沒有主機資訊（對照表 ${rules.length} 條）`);
}
