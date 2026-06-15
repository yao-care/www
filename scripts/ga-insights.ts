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
import { getGscInsights, type GscInsights } from './gsc.ts';

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
async function buildNewsInsights(gsc: GscInsights | null) {
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
  const totalCtaAll = [...cta.values()].reduce((a, b) => a + b, 0);
  const globalRate = totalPv > 0 ? totalRc / totalPv : 0;        // 先驗平均完成率
  const globalCtaRate = totalPv > 0 ? totalCtaAll / totalPv : 0; // 先驗平均 CTA 率
  const enoughData = totalPv >= MIN_TOTAL_PV && totalRc >= MIN_TOTAL_RC;

  // ── 需求面（GSC）門檻 ──
  const MIN_IMPR = 50;        // 單議題最低曝光，未達不算需求機會
  const MIN_TOTAL_IMPR = 500; // 全站最低曝光，未達不啟用需求加成
  const gscEnough = !!gsc && gsc.totals.impressions >= MIN_TOTAL_IMPR;

  const slugs = new Set<string>([
    ...pv.keys(), ...rc.keys(), ...cta.keys(),
    ...Object.keys(gsc?.perTopic ?? {}), ...Object.keys(gsc?.perTopicQueries ?? {}),
  ]);
  const targets: Record<string, {
    pageViews: number; readComplete: number; cta: number;
    completionRate: number; smoothedRate: number; qualityTier: number; lowCompletion: boolean;
    ctaRate: number; ctaStrong: boolean;
    impressions: number; clicks: number; ctr: number; position: number; demandOpportunity: boolean;
    topQueries: string[]; weight: number;
  }> = {};
  for (const s of slugs) {
    const pageViews = pv.get(s) ?? 0;
    const readComplete = rc.get(s) ?? 0;
    const ctaClick = cta.get(s) ?? 0;
    const eligible = enoughData && pageViews >= MIN_PV;
    // 品質（完成率，貝氏收縮，相對全站平均；只加重、地板 1）
    const completionRate = pageViews > 0 ? readComplete / pageViews : 0;
    const smoothedRate = (readComplete + ALPHA * globalRate) / (pageViews + ALPHA);
    let qualityTier = 1;
    if (eligible && globalRate > 0) {
      const ratio = smoothedRate / globalRate;
      qualityTier = ratio >= 1.3 ? 3 : ratio >= 1.1 ? 2 : 1;
    }
    const lowCompletion = !!(eligible && globalRate > 0 && smoothedRate / globalRate <= 0.8); // C：讀者常讀不完
    // 轉換（B：CTA 率，收縮，相對全站平均）
    const ctaRate = pageViews > 0 ? ctaClick / pageViews : 0;
    const smoothedCta = (ctaClick + ALPHA * globalCtaRate) / (pageViews + ALPHA);
    const ctaStrong = !!(eligible && globalCtaRate > 0 && smoothedCta / globalCtaRate >= 1.3);
    // 需求機會（GSC）：有人搜、曝光夠，但「排名差(>10)或點擊率明顯偏低」＝該補的題目
    const d = gsc?.perTopic?.[s];
    const impressions = d?.impressions ?? 0;
    const clicks = d?.clicks ?? 0;
    const ctr = d?.ctr ?? 0;
    const position = d?.position ?? 0;
    const demandOpportunity = !!(gscEnough && impressions >= MIN_IMPR && (position > 10 || ctr < 0.5 * gsc!.globalCtr));
    // A：讀者實際搜尋字（給 writer 參考）
    const topQueries = (gsc?.perTopicQueries?.[s] ?? []).map((q) => q.query);
    // 合併權重：品質級距 + CTA 加成(B) + 需求機會加成(GSC)，上限 3、地板 1
    const weight = Math.max(1, Math.min(3, qualityTier + (ctaStrong ? 1 : 0) + (demandOpportunity ? 1 : 0)));
    targets[s] = {
      pageViews, readComplete, cta: ctaClick,
      completionRate: Math.round(completionRate * 1000) / 1000,
      smoothedRate: Math.round(smoothedRate * 1000) / 1000,
      qualityTier, lowCompletion,
      ctaRate: Math.round(ctaRate * 1000) / 1000, ctaStrong,
      impressions, clicks, ctr, position, demandOpportunity,
      topQueries, weight,
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    days: DAYS,
    enoughData: enoughData || gscEnough, // 品質或需求任一就緒就讓 fetch-news 參考
    quality: { ready: enoughData, globalCompletionRate: Math.round(globalRate * 1000) / 1000, pageViews: totalPv, readComplete: totalRc },
    demand: { ready: gscEnough, site: gsc?.siteUrl ?? null, impressions: gsc?.totals.impressions ?? 0, clicks: gsc?.totals.clicks ?? 0 },
    targets,
  };
  await mkdir(dirname(NEWS_OUT), { recursive: true });
  await writeFile(NEWS_OUT, JSON.stringify(out, null, 2));
  console.log(`  ✓ 寫入 ${NEWS_OUT}（品質就緒=${enoughData} 需求就緒=${gscEnough}）`);
  if (out.enoughData) {
    Object.entries(targets)
      .sort((a, b) => b[1].weight - a[1].weight || b[1].smoothedRate - a[1].smoothedRate)
      .forEach(([s, t]) => console.log(
        `    ${s.padEnd(12)} 完成率=${t.completionRate} 曝光=${t.impressions} 排名=${t.position}${t.demandOpportunity ? ' [需求機會]' : ''} → 權重 ×${t.weight}`,
      ));
  } else {
    console.log('    （品質與需求皆未達門檻，fetch-news 將用預設權重＝現狀）');
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

  // 7) 搜尋需求（Search Console）
  console.log('\n▼ 搜尋需求（Search Console）');
  let gsc: GscInsights | null = null;
  try {
    gsc = await getGscInsights();
  } catch (e: any) {
    console.log(`  ⚠ GSC 取得失敗：${(e?.message || e).split('\n')[0]}`);
  }
  if (!gsc) {
    console.log('  （無 GSC 資源或尚無資料）');
  } else {
    console.log(`  資源：${gsc.siteUrl}　曝光=${gsc.totals.impressions} 點擊=${gsc.totals.clicks}`);
    console.log('  熱門搜尋查詢（曝光排序，可拿來訂題目）：');
    gsc.topQueries.slice(0, 10).forEach((r) =>
      console.log(`    "${r.keys[0]}"  曝光=${r.impressions} 點擊=${r.clicks} 排名=${Math.round(r.position * 10) / 10}`));
    console.log('  熱門頁面：');
    gsc.topPages.slice(0, 10).forEach((r) =>
      console.log(`    ${r.keys[0].replace(/^https?:\/\/[^/]+/, '')}  曝光=${r.impressions} 點擊=${r.clicks}`));
  }

  await buildNewsInsights(gsc);
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
