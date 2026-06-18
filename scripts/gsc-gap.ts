/*
 * GSC 內容缺口分析（一次性檢視）：拉近 28 天搜尋查詢，標記「高曝光但排名差 / 低 CTR」
 * 的需求缺口，作為新增 glossary / guides 的選題依據。
 *   ./node_modules/.bin/tsx scripts/gsc-gap.ts
 */
import { getGscInsights } from './gsc.ts';

const g = await getGscInsights();
if (!g) {
  console.log('GSC: 無資料或無資源（確認 SA 金鑰仍在 GSC 使用者）');
  process.exit(0);
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(
  `site=${g.siteUrl} | 28d 曝光=${g.totals.impressions} 點擊=${g.totals.clicks} 全站CTR=${pct(g.globalCtr)}`,
);

console.log('\n=== Top 查詢（query | 曝光 | 點擊 | CTR | 平均排名 | 旗標）===');
for (const q of g.topQueries) {
  const opp =
    (q.position > 10 ? '⚠排名差' : '') +
    (q.impressions >= 20 && q.ctr < 0.5 * g.globalCtr ? ' ⚠低CTR' : '');
  console.log(
    `${(q.keys[0] || '').padEnd(26)} ${String(q.impressions).padStart(6)} ${String(q.clicks).padStart(4)} ${pct(q.ctr).padStart(6)} ${q.position.toFixed(1).padStart(5)}  ${opp}`,
  );
}

console.log('\n=== Top 頁面（path | 曝光 | 點擊 | 排名）===');
for (const p of g.topPages.slice(0, 15)) {
  console.log(
    `${(p.keys[0] || '').replace('https://www.yao.care', '').padEnd(38)} ${String(p.impressions).padStart(6)} ${String(p.clicks).padStart(4)}  pos ${p.position.toFixed(1)}`,
  );
}
