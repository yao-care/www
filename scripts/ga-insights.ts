#!/usr/bin/env -S npx tsx
/*
 * GA4 議題表現 / 流量來源 拉取（B 回饋迴路第一步）。
 *
 * 認證：service account 金鑰（repo 外）。Property ID 非機密，可留在原始碼。
 *   GOOGLE_APPLICATION_CREDENTIALS / GA_PROPERTY_ID / GA_DAYS 可用環境變數覆寫。
 *
 * 用法：
 *   ./node_modules/.bin/tsx scripts/ga-insights.ts            # 近 28 天報告
 *   GA_DAYS=7 ./node_modules/.bin/tsx scripts/ga-insights.ts  # 近 7 天
 *
 * 內建維度/指標一定能跑；自訂維度（content_category / traffic_category…）
 * 需先在 GA4 註冊且有資料，未就緒時會標示「尚未就緒」而非中斷。
 */
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || '$YAOCARE_SECRETS_DIR/ga4-sa.json';
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '$GA_PROPERTY_ID';
const DAYS = Number(process.env.GA_DAYS || 28);
const property = `properties/${PROPERTY_ID}`;
const dateRanges = [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }];

const client = new BetaAnalyticsDataClient({ keyFilename: KEY });
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../reports/ga-insights.json');
const NEWS_OUT = resolve(__dirname, '../reports/news-insights.json');

type Row = Record<string, string | number>;

async function report(
  label: string,
  req: Record<string, unknown>,
  optional = false,
): Promise<Row[] | null> {
  try {
    const [res] = await client.runReport({ property, dateRanges, ...req } as any);
    const dims = (res.dimensionHeaders || []).map((h) => h.name!);
    const mets = (res.metricHeaders || []).map((h) => h.name!);
    const rows: Row[] = (res.rows || []).map((r) => {
      const o: Row = {};
      dims.forEach((d, i) => (o[d] = r.dimensionValues![i].value!));
      mets.forEach((m, i) => (o[m] = Number(r.metricValues![i].value)));
      return o;
    });
    return rows;
  } catch (e: any) {
    const msg = (e?.message || String(e)).split('\n')[0];
    console.log(`  ⚠ ${label}：${optional ? '尚未就緒（自訂維度未註冊或無資料）' : msg}`);
    return null;
  }
}

function table(rows: Row[] | null, max = 15) {
  if (!rows || rows.length === 0) { console.log('  （無資料）'); return; }
  for (const r of rows.slice(0, max)) {
    console.log('  ' + Object.entries(r).map(([k, v]) => `${k}=${v}`).join('  ·  '));
  }
}

/**
 * 產生「議題權重訊號」reports/news-insights.json，供 fetch-news 依讀者喜好加重選題。
 *
 * 計分以「品質」為準，避免長尾/爆款偏差：
 *   - 用「完成率」= read_complete / page_view（per 議題），抵銷曝光差異（量大≠好）。
 *   - 貝氏收縮：(rc + α×全站率) / (pv + α)，樣本少的議題往全站平均拉回，防小樣本雜訊。
 *   - 比較對象＝全站平均率（非最大值），爆款不會壓掉其他議題。
 *   - 最低曝光門檻（MIN_PV）前權重一律 1；只加重、不懲罰，地板 ×1（不餓死冷門）。
 *   - 全站資料不足時 enoughData=false → 全部 ×1（等同現狀）。
 *   （僅統計 content_type=news_article 的事件，對齊 news target slug。）
 */
async function buildNewsInsights() {
  console.log('\n▼ 產生議題權重訊號（news-insights.json）');
  const ALPHA = 20;        // 貝氏收縮強度（等效「先驗樣本數」）
  const MIN_PV = 30;       // 單議題最低瀏覽數，未達不調權重
  const MIN_TOTAL_PV = 200; // 全站最低瀏覽數，未達 enoughData=false
  const MIN_TOTAL_RC = 30;  // 全站最低讀完數

  const byCat = (rows: Row[] | null): Map<string, number> => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const slug = String(r['customEvent:content_category'] ?? '');
      if (slug) m.set(slug, Number(r['eventCount'] ?? 0));
    }
    return m;
  };
  const evByCat = (event: string) =>
    report(`insight_${event}`, {
      dimensions: [{ name: 'customEvent:content_category' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { value: event } } },
            { filter: { fieldName: 'customEvent:content_type', stringFilter: { value: 'news_article' } } },
          ],
        },
      },
    }, true);

  const pv = byCat(await evByCat('page_view'));
  const rc = byCat(await evByCat('read_complete'));
  const cta = byCat(await evByCat('cta_click'));

  const totalPv = [...pv.values()].reduce((a, b) => a + b, 0);
  const totalRc = [...rc.values()].reduce((a, b) => a + b, 0);
  const globalRate = totalPv > 0 ? totalRc / totalPv : 0; // 先驗平均完成率
  const enoughData = totalPv >= MIN_TOTAL_PV && totalRc >= MIN_TOTAL_RC;

  const slugs = new Set<string>([...pv.keys(), ...rc.keys(), ...cta.keys()]);
  const targets: Record<string, {
    pageViews: number; readComplete: number; cta: number;
    completionRate: number; smoothedRate: number; weight: number;
  }> = {};
  for (const s of slugs) {
    const pageViews = pv.get(s) ?? 0;
    const readComplete = rc.get(s) ?? 0;
    const ctaClick = cta.get(s) ?? 0;
    const completionRate = pageViews > 0 ? readComplete / pageViews : 0;
    // 貝氏收縮：樣本少 → 接近全站平均；樣本多 → 接近自身完成率
    const smoothedRate = (readComplete + ALPHA * globalRate) / (pageViews + ALPHA);
    let weight = 1;
    if (enoughData && pageViews >= MIN_PV && globalRate > 0) {
      const ratio = smoothedRate / globalRate; // 相對「全站平均」，非最大值
      weight = ratio >= 1.3 ? 3 : ratio >= 1.1 ? 2 : 1; // 只加重、不懲罰；地板 ×1
    }
    targets[s] = {
      pageViews, readComplete, cta: ctaClick,
      completionRate: Math.round(completionRate * 1000) / 1000,
      smoothedRate: Math.round(smoothedRate * 1000) / 1000,
      weight,
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    days: DAYS,
    enoughData,
    globalCompletionRate: Math.round(globalRate * 1000) / 1000,
    totals: { pageViews: totalPv, readComplete: totalRc },
    targets,
  };
  await mkdir(dirname(NEWS_OUT), { recursive: true });
  await writeFile(NEWS_OUT, JSON.stringify(out, null, 2));
  console.log(`  ✓ 寫入 ${NEWS_OUT}（enoughData=${enoughData}；全站瀏覽=${totalPv} 讀完=${totalRc} 平均完成率=${out.globalCompletionRate}）`);
  if (enoughData) {
    Object.entries(targets)
      .sort((a, b) => b[1].smoothedRate - a[1].smoothedRate)
      .forEach(([s, t]) => console.log(`    ${s.padEnd(12)} 瀏覽=${t.pageViews} 完成率=${t.completionRate}(收縮 ${t.smoothedRate}) → 權重 ×${t.weight}`));
  } else {
    console.log('    （資料量未達門檻，fetch-news 將用預設權重＝現狀）');
  }
}

async function main() {
  console.log(`\n=== GA4 報告　property=${PROPERTY_ID}　近 ${DAYS} 天 ===\n`);

  // 0) 連線煙霧測試（純內建指標，一定能跑）
  console.log('▼ 連線測試 / 總覽');
  const overview = await report('overview', {
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'userEngagementDuration' }],
  });
  if (!overview) { console.log('\n✗ 連線失敗 —— 多半是「服務帳戶未加入該資源的檢視者」或 Property ID 錯誤。\n'); process.exit(1); }
  console.log('  ✅ 連線成功'); table(overview);

  // 1) 流量來源（內建）：頻道 + 來源；AI 工具會出現在 referral，host 如 chatgpt.com / perplexity.ai
  console.log('\n▼ 流量來源（內建頻道 / 來源）');
  table(await report('channels', {
    dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  }));

  // 2) 流量來源（自訂）：我們標記的 traffic_category（ai/organic_search/...）
  console.log('\n▼ 流量來源分類（自訂 traffic_category）');
  table(await report('traffic_category', {
    dimensions: [{ name: 'customUser:traffic_category' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  }, true));

  // 3) 議題表現（內建 contentGroup）：哪些主題被看 + 互動時間
  console.log('\n▼ 議題表現（內建 contentGroup）');
  table(await report('contentGroup', {
    dimensions: [{ name: 'contentGroup' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  }));

  // 4) 我們的互動事件量（內建 eventName）：確認事件有進來
  console.log('\n▼ 互動事件量');
  table(await report('events', {
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['page_view', 'scroll_depth', 'read_complete', 'page_engagement', 'cta_click'] } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  }));

  // 5) 讀完數 × 議題（自訂 content_category，事件 read_complete）
  console.log('\n▼ 讀完數 × 議題（自訂 content_category）');
  table(await report('read_complete_by_topic', {
    dimensions: [{ name: 'customEvent:content_category' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'read_complete' } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  }, true));

  // 6) CTA 點擊 × 類型（自訂 cta_type）
  console.log('\n▼ CTA 點擊 × 類型（自訂 cta_type）');
  table(await report('cta_by_type', {
    dimensions: [{ name: 'customEvent:cta_type' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'cta_click' } } },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  }, true));

  // 寫出機器可讀檔（日後餵 fetch-news 用）
  const out = {
    property: PROPERTY_ID,
    days: DAYS,
    generatedAt: new Date().toISOString(),
    overview: overview?.[0] ?? null,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`\n✓ 摘要已寫入 ${OUT}`);

  await buildNewsInsights();
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
