#!/usr/bin/env node
/**
 * 導覽不變量守門（build gate，2026-07-28）
 *
 * 為什麼存在：`src/nav.config.ts` 在 seo-ops reflect:scope 白名單內（2026-07-17 站主放寬，
 * 讓反思能自行修導覽/內鏈的網址形式問題），所以每天台北 04:55 的反思**有權改主導覽**。
 * 而 /news/ 自 Phase 2（2026-07-15）起已凍結、Phase 4 正逐批 301 收斂到 /topics/，
 * 主導覽不得再把訪客與爬蟲導去封存區。純靠 playbook 文字約束 LLM 不可靠，故改為機械擋。
 *
 * 反思與大腦的 gate 都含 `npm run build`（seo-ops sites/yao.care.json 的 brain.gates），
 * 因此違反本檔即 gate fail → 依 playbook「部署與收錄推送」規則自行 `git checkout -- src` 撤回。
 *
 * 要退役某條規則時：連同 seo-ops playbooks/yao.care.md 的對應註記一起改，不要只改這裡。
 */
import { readFileSync } from 'node:fs';

const NAV_FILE = 'src/nav.config.ts';

/** 主導覽禁止指向的路由（已凍結／已收斂／即將收斂者） */
const FORBIDDEN_HREFS = [
  {
    href: '/news/',
    why: '/news/ 自 Phase 2（2026-07-15）起不再新增文章，現為歷史封存並逐批 301 收斂到 /topics/；議題追蹤的主導覽入口＝/topics/。封存頁仍可從 footer「議題追蹤封存」與 /topics/ hero 進入，不需要主導覽席位。',
  },
];

const src = readFileSync(NAV_FILE, 'utf8');

// 只看 NAV 陣列裡的 href 字面值，避免誤判註解中提及的路徑
const navBody = src.slice(src.indexOf('export const NAV'));
const hrefs = [...navBody.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]);

const violations = [];
for (const rule of FORBIDDEN_HREFS) {
  if (hrefs.includes(rule.href)) violations.push(rule);
}

if (violations.length > 0) {
  console.error(`\n❌ 導覽守門失敗：${NAV_FILE} 的 NAV 指向了禁用路由\n`);
  for (const v of violations) {
    console.error(`  · ${v.href}`);
    console.error(`    ${v.why}\n`);
  }
  console.error('修法：把該項從 NAV 移除（或改指仍在更新的頁面）。');
  console.error('若這條規則本身該退役，改 scripts/check-nav.mjs 的 FORBIDDEN_HREFS，');
  console.error('並同步更新 $SEO_OPS_DIR/playbooks/yao.care.md 的導覽註記。\n');
  process.exit(1);
}

console.log(`✅ 導覽守門通過（NAV ${hrefs.length} 項，無禁用路由）。`);
