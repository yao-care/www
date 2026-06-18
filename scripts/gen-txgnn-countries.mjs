#!/usr/bin/env node
// 從「30 國老藥新用」專案匯出的 country_profiles.json 產生網站用的精簡資料檔
// src/data/txgnn-countries.json（餵 /medical/txgnn/methodology 透明度頁）。
//
//   node scripts/gen-txgnn-countries.mjs <path/to/country_profiles.json>
//
// 只取頁面需要的欄位、推導 EMA 代理旗標、依分析藥物數排序。資料一律照來源，不補值。
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('用法: node scripts/gen-txgnn-countries.mjs <country_profiles.json>');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

const out = raw.map((c) => {
  const ds = c.regulator?.drug_dataset ?? {};
  return {
    iso2: c.iso2,
    zh: c.country_zh,
    en: c.country_en,
    url: c.site_url,
    langs: c.languages ?? null,
    regulator: {
      abbrev: c.regulator?.abbrev ?? null,
      name_en: c.regulator?.name_en ?? null,
      name_local: c.regulator?.name_local ?? null,
    },
    dataset: {
      name: ds.name ?? null,
      url: ds.url ?? null,
      license: ds.license ?? null,
      last_updated: ds.last_updated ?? null,
      record_count: ds.record_count ?? null,
      ema_proxy: typeof ds.name === 'string' && /EMA Medicines Data \(proxy/i.test(ds.name),
    },
    drugs: c.pipeline?.unique_drugs ?? null,
    kg_candidates: c.pipeline?.kg_candidates ?? null,
    very_high: c.pipeline?.confidence?.very_high ?? null,
    pubmed: c.pipeline?.evidence?.pubmed ?? null,
    clinicaltrials: c.pipeline?.evidence?.clinicaltrials ?? null,
    evidence_bundles: c.pipeline?.evidence_bundles ?? null,
    drug_pages: c.pipeline?.drug_pages ?? null,
    phase: {
      P5: c.pipeline?.phase_status?.P5 ?? null,
      P7: c.pipeline?.phase_status?.P7 ?? null,
      P8: c.pipeline?.phase_status?.P8 ?? null,
    },
    stats_date: c._meta?.stats_date ?? null,
    disclaimer_local: c.disclaimer_local ?? null,
  };
});
out.sort((a, b) => (b.drugs ?? -1) - (a.drugs ?? -1));

const dest = path.join(process.cwd(), 'src/data/txgnn-countries.json');
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`寫入 ${dest}（${out.length} 國，分析藥物總數 ${out.reduce((a, b) => a + (b.drugs ?? 0), 0)}）`);
