#!/usr/bin/env -S npx tsx
/*
 * 用 GA4 Admin API 一鍵設定後台（自訂維度 / 自訂指標 / 關鍵事件）。
 * 冪等：已存在的會略過，可重複執行。需 service account 具「編輯者」權限 + Admin API 啟用。
 *
 *   ./node_modules/.bin/tsx scripts/ga-setup.ts
 */
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || '$YAOCARE_SECRETS_DIR/ga4-sa.json';
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '$GA_PROPERTY_ID';
const parent = `properties/${PROPERTY_ID}`;
const client = new AnalyticsAdminServiceClient({ keyFilename: KEY });

const DIMS = [
  { parameterName: 'content_category', displayName: '內容議題', scope: 'EVENT' as const },
  { parameterName: 'content_type', displayName: '內容類型', scope: 'EVENT' as const },
  { parameterName: 'content_item', displayName: '內容項目', scope: 'EVENT' as const },
  { parameterName: 'ai_source', displayName: 'AI 來源', scope: 'EVENT' as const },
  { parameterName: 'cta_type', displayName: 'CTA 類型', scope: 'EVENT' as const },
  { parameterName: 'link_content', displayName: 'CTA 位置', scope: 'EVENT' as const },
  { parameterName: 'app_route', displayName: 'ODS 應用路由', scope: 'EVENT' as const },
  { parameterName: 'traffic_category', displayName: '流量分類', scope: 'USER' as const },
];
const METRICS = [
  { parameterName: 'engaged_seconds', displayName: '互動秒數', scope: 'EVENT' as const, measurementUnit: 'SECONDS' as const },
];
// generate_lead 供各產品／行銷站在表單成功送達後共用；表單內容不得當事件參數送出。
const KEY_EVENTS = ['read_complete', 'cta_click', 'generate_lead'];

async function setupDimensions() {
  console.log('▼ 自訂維度');
  const [existing] = await client.listCustomDimensions({ parent });
  const have = new Set((existing || []).map((d) => d.parameterName));
  for (const d of DIMS) {
    if (have.has(d.parameterName)) { console.log(`  = 已存在 ${d.parameterName}`); continue; }
    try {
      await client.createCustomDimension({ parent, customDimension: d });
      console.log(`  + 建立 ${d.parameterName}（${d.scope}）`);
    } catch (e: any) { console.log(`  ✗ ${d.parameterName}：${(e.message || e).split('\n')[0]}`); }
  }
}

async function setupMetrics() {
  console.log('▼ 自訂指標');
  const [existing] = await client.listCustomMetrics({ parent });
  const have = new Set((existing || []).map((m) => m.parameterName));
  for (const m of METRICS) {
    if (have.has(m.parameterName)) { console.log(`  = 已存在 ${m.parameterName}`); continue; }
    try {
      await client.createCustomMetric({ parent, customMetric: m });
      console.log(`  + 建立 ${m.parameterName}（${m.measurementUnit}）`);
    } catch (e: any) { console.log(`  ✗ ${m.parameterName}：${(e.message || e).split('\n')[0]}`); }
  }
}

async function setupKeyEvents() {
  console.log('▼ 關鍵事件');
  // 新版 API 用 KeyEvent，舊版用 ConversionEvent；兩者都試
  let have = new Set<string>();
  let create: (name: string) => Promise<unknown>;
  try {
    const [list] = await client.listKeyEvents({ parent });
    have = new Set((list || []).map((k: any) => k.eventName));
    create = (name) => client.createKeyEvent({ parent, keyEvent: { eventName: name, countingMethod: 'ONCE_PER_EVENT' } as any });
  } catch {
    const [list] = await (client as any).listConversionEvents({ parent });
    have = new Set((list || []).map((k: any) => k.eventName));
    create = (name) => (client as any).createConversionEvent({ parent, conversionEvent: { eventName: name } });
  }
  for (const e of KEY_EVENTS) {
    if (have.has(e)) { console.log(`  = 已存在 ${e}`); continue; }
    try { await create(e); console.log(`  + 標記 ${e}`); }
    catch (err: any) { console.log(`  ✗ ${e}：${(err.message || err).split('\n')[0]}`); }
  }
}

async function main() {
  console.log(`\n=== GA4 後台設定　property=${PROPERTY_ID} ===\n`);
  await setupDimensions();
  await setupMetrics();
  await setupKeyEvents();
  console.log('\n✓ 完成（冪等，可重複執行）\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
