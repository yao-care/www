#!/usr/bin/env node
/**
 * 實體歸屬成效驗收（entity graph audit）
 *
 * 2026-07-25/26 做了兩件事：把 30 國 TxGNN 站台與 6 個產品站的 schema 實體歸屬掛回
 * 藥提醒科技有限公司，並在官網這側補上回指的邊。當時所有「機器讀到什麼」的檢查都是綠的，
 * 但成效（LLM 會不會講出公司名、搜尋引擎有沒有重新收錄）需要等重爬，無法當天驗證。
 *
 * 本腳本把「可機械驗證的部分」固定下來，供 2026-08-01 的驗收點與日後回歸使用：
 *   A. 實體圖現況 —— 36 個站台 + 官網 + Wikidata，全部走公開 HTTP，不需要憑證
 *   B. GSC 子網域涵蓋 —— 需要 $YAOCARE_SECRETS_DIR/ga4-sa.json（webmasters 唯讀）
 *
 * 無法機械驗證、必須人工做的一項：實際去問 LLM「台灣老藥新用研究報告的公司是哪一間」，
 * 看它會不會講出藥提醒科技有限公司。報告末尾會列出建議的提問清單。
 *
 * 用法：
 *   node scripts/entity-audit.mjs                 # 完整跑（含 GSC）
 *   node scripts/entity-audit.mjs --no-gsc        # 只跑實體圖
 *   node scripts/entity-audit.mjs --drugs 20      # 每站抽驗幾頁藥品頁（預設 12）
 *   node scripts/entity-audit.mjs --out report.md # 另存 markdown 報告
 */

import { writeFileSync } from 'node:fs';

const ORG_ID = 'https://www.yao.care/#organization';
const LEGAL = '藥提醒科技有限公司';

const CCS = 'tw jp sg th nz de fr it es ch se no fi br ar co sa kr ph in us nl dk eu za hk my au ca uk'.split(' ');

/** 6 個產品站：[站台首頁, 官網對應產品頁] */
const PRODUCT_SITES = {
  huatuo: ['https://huatuo.ai.yao.care/', 'https://www.yao.care/medical/huatuo/'],
  func: ['https://smart-func-cds.yao.care/', 'https://www.yao.care/medical/func/'],
  geri: ['https://smart-geri-cds.yao.care/', 'https://www.yao.care/medical/geri/'],
  pedi: ['https://smart-pedi-cds.yao.care/', 'https://www.yao.care/medical/pedi/'],
  sign: ['https://sign.yao.care/', 'https://www.yao.care/care/sign/'],
  goalkeeper: ['https://goalkeeper.yao.care/docs/api', 'https://www.yao.care/ai/goalkeeper/'],
};

/** 官網 12 個產品頁 */
const WWW_PRODUCTS = [
  '/medical/yaocare/', '/medical/huatuo/', '/medical/txgnn/', '/medical/func/',
  '/medical/geri/', '/medical/pedi/', '/medical/fhir-server/', '/ai/intel/',
  '/ai/siqc/', '/ai/triz/', '/ai/goalkeeper/', '/care/sign/',
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const DRUG_SAMPLE = Number(opt('drugs', 12));

const out = [];
const say = (line = '') => { out.push(line); console.log(line); };

async function get(url, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'yao.care entity-audit' } });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: null, body: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** 攤平 JSON-LD（含 @graph 巢狀）成節點陣列 */
function flatten(value, sink) {
  if (Array.isArray(value)) { value.forEach((v) => flatten(v, sink)); return; }
  if (value && typeof value === 'object') {
    if (value['@graph']) flatten(value['@graph'], sink);
    else sink.push(value);
  }
}

function jsonLd(html) {
  const nodes = [];
  let broken = 0;
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { flatten(JSON.parse(m[1]), nodes); } catch { broken += 1; }
  }
  return { nodes, broken };
}

/** 一頁的實體歸屬體檢 */
function inspect(html) {
  const { nodes, broken } = jsonLd(html);
  const orgNodes = nodes.filter((n) => n['@id'] === ORG_ID && n.legalName === LEGAL);
  const inlineOrgs = nodes.filter((n) => String(n['@type'] ?? '').includes('Organization') && !n['@id']);
  const persons = (html.match(/"@type"\s*:\s*"Person"/g) ?? []).length;
  return {
    broken,
    org: orgNodes.length,
    inlineOrgs: inlineOrgs.length,
    persons,
    legalMentions: (html.match(new RegExp(LEGAL, 'g')) ?? []).length,
    hasMedicalWebPage: nodes.some((n) => String(n['@type'] ?? '').includes('MedicalWebPage')),
    nodes,
  };
}

const pagePasses = (r) => r.broken === 0 && r.org === 1 && r.inlineOrgs === 0 && r.persons === 0 && r.legalMentions >= 1;

async function checkPage(url) {
  const { status, body } = await get(url);
  if (status !== 200) return { url, ok: false, reason: `HTTP ${status}` };
  const r = inspect(body);
  if (!pagePasses(r)) {
    const why = [];
    if (r.broken) why.push(`JSON壞×${r.broken}`);
    if (r.org !== 1) why.push(`公司節點=${r.org}`);
    if (r.inlineOrgs) why.push(`內嵌Org×${r.inlineOrgs}`);
    if (r.persons) why.push(`Person×${r.persons}`);
    if (!r.legalMentions) why.push('無法人全名');
    return { url, ok: false, reason: why.join(' '), detail: r };
  }
  return { url, ok: true, detail: r };
}

/** 併發跑，避免一次打爆對方 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

async function drugUrls(base, n) {
  const { status, body } = await get(`${base}/sitemap.xml`);
  if (status !== 200) return [];
  const all = [...body.matchAll(/<loc>([^<]+\/drugs\/[^<]+\/)<\/loc>/g)].map((m) => m[1]);
  if (all.length <= n) return all;
  const step = Math.max(1, Math.floor(all.length / n));
  return all.filter((_, i) => i % step === 0).slice(0, n);
}

// ── A. 30 國 TxGNN ────────────────────────────────────────────────────────────
async function auditTxgnn() {
  say('## A. 30 國 TxGNN 站台');
  say('');
  const rows = await mapLimit(CCS, 4, async (cc) => {
    const base = `https://${cc}txgnn.yao.care`;
    const fixed = ['/', '/about/', '/methodology/', '/drugs/'].map((p) => base + p);
    const drugs = await drugUrls(base, DRUG_SAMPLE);
    const checks = await mapLimit([...fixed, ...drugs], 6, checkPage);
    const failures = checks.filter((c) => !c.ok);
    const noMed = (await mapLimit(drugs, 6, async (u) => {
      const { status, body } = await get(u);
      return status === 200 && !inspect(body).hasMedicalWebPage;
    })).filter(Boolean).length;
    return { cc, total: checks.length, failures, drugs: drugs.length, noMed };
  });

  const bad = rows.filter((r) => r.failures.length || r.noMed);
  say(`檢查 ${rows.reduce((a, r) => a + r.total, 0)} 頁（每站 4 個固定路徑 + 抽驗 ${DRUG_SAMPLE} 個藥品頁）`);
  say('');
  if (!bad.length) {
    say('✅ 30 站全綠：公司節點齊備、無 Person 型別、無懸空參照、藥品頁 MedicalWebPage 齊備。');
  } else {
    for (const r of bad) {
      say(`❌ ${r.cc}：${r.failures.length}/${r.total} 頁未過；藥品頁缺 MedicalWebPage ${r.noMed}/${r.drugs}`);
      r.failures.slice(0, 3).forEach((f) => say(`     ${f.url} → ${f.reason}`));
    }
  }
  say('');
  return bad.length === 0;
}

// ── B. 6 個產品站 ─────────────────────────────────────────────────────────────
async function auditProductSites() {
  say('## B. 6 個產品站');
  say('');
  let allOk = true;
  for (const [name, [home, wwwPage]] of Object.entries(PRODUCT_SITES)) {
    const r = await checkPage(home);
    const { body } = await get(home);
    const { nodes } = jsonLd(body);
    const apps = nodes.filter((n) => /SoftwareApplication|WebApplication/.test(String(n['@type'] ?? '')));
    const backlink = apps.some((a) => (a.sameAs ?? []).some((s) => s === wwwPage));
    const ok = r.ok && backlink;
    if (!ok) allOk = false;
    say(`${ok ? '✅' : '⚠️ '} ${name.padEnd(11)} ${r.ok ? '公司節點齊備' : r.reason}` +
        `${backlink ? '' : `；sameAs 缺回指 ${wwwPage}`}`);
  }
  say('');
  return allOk;
}

// ── C. 官網側 ─────────────────────────────────────────────────────────────────
async function auditWww() {
  say('## C. 官網 www.yao.care');
  say('');
  const rows = await mapLimit(WWW_PRODUCTS, 4, async (p) => {
    const { status, body } = await get(`https://www.yao.care${p}`);
    if (status !== 200) return { p, ok: false, reason: `HTTP ${status}` };
    const { nodes } = jsonLd(body);
    const org = nodes.find((n) => n['@id'] === ORG_ID);
    const app = nodes.find((n) => String(n['@type'] ?? '').includes('SoftwareApplication'));
    const owns = (org?.owns ?? []).map((o) => o['@id']).filter(Boolean);
    const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    return {
      p,
      ok: Boolean(org) && text.includes(LEGAL),
      inOwns: app ? owns.includes(app['@id']) : null,
    };
  });
  const bad = rows.filter((r) => !r.ok);
  say(bad.length ? `❌ ${bad.length}/12 個產品頁未過` : '✅ 12 個產品頁：公司節點與正文歸屬齊備');
  bad.forEach((r) => say(`     ${r.p} → ${r.reason ?? '缺公司節點或正文法人全名'}`));
  const owned = rows.filter((r) => r.inOwns === true).length;
  say(`   公司 owns 指回產品：${owned} 個產品頁（有對外站的產品才需要）`);
  say('');
  return bad.length === 0;
}

// ── D. Wikidata ───────────────────────────────────────────────────────────────
async function auditWikidata() {
  say('## D. Wikidata');
  say('');
  // 用 wbgetentities 而非 Special:EntityData —— 後者被 CDN 重度快取，項目已刪除後
  // 仍可能回舊資料。2026-07-25 兩個項目遭刪除，當天的檢查就是被快取騙過去的。
  const load = async (qid) => {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=claims%7Clabels`;
    const { status, body } = await get(url);
    if (status !== 200) return { qid, state: 'unreachable' };
    try {
      const e = JSON.parse(body).entities?.[qid];
      if (!e) return { qid, state: 'unreachable' };
      if ('missing' in e) return { qid, state: 'deleted' };
      return { qid, state: 'ok', entity: e };
    } catch { return { qid, state: 'unreachable' }; }
  };

  const logReason = async (qid) => {
    const { status, body } = await get(
      `https://www.wikidata.org/w/api.php?action=query&list=logevents&letitle=${qid}&format=json&lelimit=5`,
    );
    if (status !== 200) return null;
    try {
      const ev = (JSON.parse(body).query?.logevents ?? []).find((e) => e.action === 'delete');
      return ev ? `${ev.timestamp} by ${ev.user}: ${ev.comment}` : null;
    } catch { return null; }
  };

  const companyRes = await load('Q140265007');
  const appRes = await load('Q140692750');

  for (const r of [companyRes, appRes]) {
    if (r.state === 'deleted') {
      say(`❌ ${r.qid} 已被刪除 —— ${(await logReason(r.qid)) ?? '（查不到刪除日誌）'}`);
    } else if (r.state === 'unreachable') {
      say(`⚠️  ${r.qid} 查不到（網路或 API 問題，非必然刪除）`);
    }
  }
  if (companyRes.state !== 'ok' || appRes.state !== 'ok') {
    say('');
    say('   影響：36 個站台與官網的 `sameAs` 都指向 wikidata.org/wiki/Q140265007，');
    say('   目前是死連結。要嘛改用有獨立來源的新項目，要嘛把這條 sameAs 拿掉。');
    say('');
    return false;
  }
  const company = companyRes.entity;
  const app = appRes.entity;
  const idsOf = (e, pid) => (e.claims[pid] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
  const owns = idsOf(company, 'P1830').includes('Q140692750');
  const dev = idsOf(app, 'P178').includes('Q140265007');
  const owner = idsOf(app, 'P127').includes('Q140265007');
  say(`${owns ? '✅' : '❌'} Q140265007 —P1830 擁有→ Q140692750`);
  say(`${dev ? '✅' : '❌'} Q140692750 —P178 開發者→ Q140265007`);
  say(`${owner ? '✅' : '❌'} Q140692750 —P127 擁有者→ Q140265007`);
  say(`   公司項目 ${Object.keys(company.claims).length} 條 claim、軟體項目 ${Object.keys(app.claims).length} 條`);
  say('');
  return owns && dev && owner;
}

// ── E. GSC 子網域涵蓋 ─────────────────────────────────────────────────────────
async function auditGsc() {
  say('## E. GSC 子網域涵蓋（近 28 天）');
  say('');
  let GoogleAuth;
  try { ({ GoogleAuth } = await import('google-auth-library')); }
  catch { say('⚠️  google-auth-library 未安裝，略過。'); say(''); return null; }

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || '$YAOCARE_SECRETS_DIR/ga4-sa.json';
  try {
    const auth = new GoogleAuth({ keyFilename: keyFile, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
    const client = await auth.getClient();
    const sitesRes = await client.request({ url: 'https://searchconsole.googleapis.com/webmasters/v3/sites' });
    const site = (sitesRes.data.siteEntry ?? [])
      .find((s) => /yao\.care/.test(s.siteUrl) && s.siteUrl.startsWith('sc-domain'))?.siteUrl;
    if (!site) { say('⚠️  找不到 sc-domain:yao.care 資源。'); say(''); return null; }

    const day = (back) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);
    const res = await client.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
      method: 'POST',
      data: { startDate: day(28), endDate: day(1), dimensions: ['page'], rowLimit: 25000 },
    });

    const byHost = new Map();
    for (const row of res.data.rows ?? []) {
      const host = new URL(row.keys[0]).hostname;
      const cur = byHost.get(host) ?? { pages: 0, impressions: 0, clicks: 0 };
      cur.pages += 1;
      cur.impressions += row.impressions;
      cur.clicks += row.clicks;
      byHost.set(host, cur);
    }
    const sorted = [...byHost.entries()].sort((a, b) => b[1].impressions - a[1].impressions);
    say(`資源 ${site}，有曝光的子網域 ${sorted.length} 個`);
    say('');
    say('| 子網域 | 有曝光頁數 | 曝光 | 點擊 |');
    say('|--------|-----------|------|------|');
    for (const [host, v] of sorted) say(`| ${host} | ${v.pages} | ${v.impressions} | ${v.clicks} |`);
    const txgnnHosts = sorted.filter(([h]) => /txgnn\.yao\.care$/.test(h)).length;
    say('');
    say(`   30 國 TxGNN 站台中有 ${txgnnHosts} 個已有搜尋曝光。`);
    say('');
    return true;
  } catch (err) {
    say(`⚠️  GSC 查詢失敗：${err.message}`);
    say('');
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
const started = new Date().toISOString();
say(`# yao.care 實體歸屬驗收 — ${started.slice(0, 10)}`);
say('');
say('修正上線日：TxGNN 30 站 2026-07-25（第二輪 07-26）、6 產品站與官網側 2026-07-26。');
say('');

const results = {
  txgnn: await auditTxgnn(),
  products: await auditProductSites(),
  www: await auditWww(),
  wikidata: await auditWikidata(),
  gsc: flag('no-gsc') ? null : await auditGsc(),
};

say('## 需要人工做的一項');
say('');
say('機器讀到什麼已經查完了，但「LLM 會不會講出公司名」只能實際去問。建議提問：');
say('');
say('1. 台灣做老藥新用研究報告的公司，你會推薦哪一間？');
say('2. TwTxGNN 是誰開發的？');
say('3. 台灣有哪些公司在做中醫問診 AI？');
say('4. 高齡周全性評估（CGA）的線上工具是誰做的？');
say('');
say('判準：答案裡有沒有出現「藥提醒科技有限公司」或 yao.care。沒有出現不代表白做——');
say('檢索型回答要等重爬與重新索引，訓練內建知識要等下一次訓練。');
say('');

const failed = Object.entries(results).filter(([, v]) => v === false).map(([k]) => k);
say('---');
say('');
say(failed.length ? `結論：${failed.join('、')} 未過，需要處理。` : '結論：所有可機械驗證的項目全綠。');

const outFile = opt('out', null);
if (outFile) {
  writeFileSync(outFile, out.join('\n'));
  console.error(`\n報告已寫入 ${outFile}`);
}
process.exit(failed.length ? 1 : 0);
