/**
 * Wikidata：建立 TwTxGNN 平台項目，並與公司項目 Q140265007 雙向連結。
 *
 * 為什麼要做：LLM 認得 TwTxGNN（站台內容夠強），但從 TwTxGNN 這一側找不到任何回到
 * 藥提醒科技有限公司的邊 —— 站台 schema 把自己宣告成獨立 Organization、正文不提公司、
 * Wikidata 也沒有這條產品關係。Wikidata 是 LLM 做實體消歧最先吃的節點，補這條邊槓桿最高。
 *
 * 建立的關係（雙向，缺一邊都不算成立）：
 *   TwTxGNN --P178 developer--> Q140265007
 *   TwTxGNN --P127 owned by---> Q140265007
 *   Q140265007 --P1830 owner of--> TwTxGNN
 *
 * 憑證讀自 repo 外的 $YAOCARE_SECRETS_DIR/wikidata.json（Bot password，600，不入版控）。
 * 用法：
 *   ./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --dry-run   # 只印 payload，不寫
 *   ./node_modules/.bin/tsx scripts/wikidata-txgnn.ts             # 實際寫入
 *
 * 冪等：先用 label 搜尋既有項目；已存在的 claim 值一律跳過，重跑不會產生重複。
 */
import { secretPath, requireEnv } from './lib/host-env.mjs';
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
/** 輸出 QuickStatements V1 批次語法（供未被封鎖的網路在瀏覽器執行） */
const QS = process.argv.includes('--quickstatements');
const CRED = JSON.parse(readFileSync(secretPath('wikidata.json'), 'utf8'));
const API: string = CRED.apiUrl;
/** 公司項目（藥提醒科技有限公司） */
const ORG_QID: string = CRED.entity;
const ORG_NUMERIC = Number(ORG_QID.replace(/^Q/, ''));

// ─── 目標項目內容 ────────────────────────────────────────────
const SITE_URL = 'https://twtxgnn.yao.care/';
const REPO_URL = 'https://github.com/yao-care/TwTxGNN';
/** 佐證用：公司官網明列本平台為自家資產的頁面 */
const REF_URL = 'https://www.yao.care/medical/txgnn/';
/** 第三方目錄上架頁（SMART Health IT）——唯一的非自家來源 */
const SMART_GALLERY_URL = 'https://apps.smarthealthit.org/app/twtxgnn-smart-app';

const LABELS: Record<string, string> = {
  en: 'TwTxGNN',
  'zh-hant': 'TwTxGNN',
  'zh-tw': 'TwTxGNN',
};
const DESCRIPTIONS: Record<string, string> = {
  en: 'drug repurposing prediction platform for Taiwan-approved medicines, developed by yao.care',
  'zh-hant': '藥提醒科技有限公司開發的台灣核准藥品老藥新用預測平台',
  'zh-tw': '藥提醒科技有限公司開發的台灣核准藥品老藥新用預測平台',
};
const ALIASES: Record<string, string[]> = {
  en: ['yao.care TxGNN', 'TxGNN Taiwan', 'TwTxGNN drug repurposing report'],
  'zh-hant': ['TwTxGNN 老藥新用驗證報告', 'TxGNN 老藥新用', '老藥新用驗證報告'],
};

/** 要建立的 item 型 claim：[property, 目標 QID 數字, 說明] */
const ITEM_CLAIMS: [string, number, string][] = [
  ['P31', 189210, 'instance of: web application'],
  ['P31', 7094076, 'instance of: online database'],
  ['P178', ORG_NUMERIC, 'developer: 藥提醒科技有限公司'],
  ['P127', ORG_NUMERIC, 'owned by: 藥提醒科技有限公司'],
  ['P17', 865, 'country: Taiwan'],
  ['P921', 5308921, 'main subject: drug repositioning'],
  ['P2283', 107750691, 'uses: graph neural network'],
  ['P275', 334661, 'copyright license: MIT License（repo LICENSE 確認）'],
];
/** 要建立的 url 型 claim */
const URL_CLAIMS: [string, string, string][] = [
  ['P856', SITE_URL, 'official website'],
  ['P1324', REPO_URL, 'source code repository URL'],
  ['P973', REF_URL, 'described at URL: 官網產品頁（Wikidata → 官網的回指）'],
  // 第三方目錄（SMART Health IT，哈佛醫學院孵化）——非自家來源，notability 的主要辯護
  ['P973', SMART_GALLERY_URL, 'described at URL: SMART on FHIR App Gallery 上架頁'],
];
/**
 * 要建立的 time 型 claim。
 * P571 用 GitHub Pages 首次部署時間 2026-02-09T02:17:51Z（deployments API 翻到最後一頁的
 * 最早一筆），那是站台第一次真的存在於網路上的時刻，且第三方可查證。
 * 刻意不用 repo 建立日 2026-01-11（只是開始寫程式）或 head_custom.html 寫死的
 * 2026-02-19（那是內容審核基準日，套用在所有藥品頁上，不是上線日）。
 */
const TIME_CLAIMS: [string, string, string][] = [
  ['P571', '+2026-02-09T00:00:00Z', 'inception: GitHub Pages 首次部署'],
];

// ─── 極簡 cookie jar（MediaWiki 登入需要帶 cookie）────────────
const cookies = new Map<string, string>();
function cookieHeader(): string {
  return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(res: Response) {
  const list = (res.headers as any).getSetCookie?.() ?? [];
  for (const c of list) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

async function api(params: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const body = new URLSearchParams({ format: 'json', ...params });
  const url = method === 'GET' ? `${API}?${body}` : API;
  const res = await fetch(url, {
    method,
    headers: {
      Cookie: cookieHeader(),
      'User-Agent': 'yaocare-enrich/1.0 (service@yao.care)',
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(method === 'POST' ? { body: body.toString() } : {}),
  });
  storeCookies(res);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
  return json;
}

async function login() {
  const t = await api({ action: 'query', meta: 'tokens', type: 'login' });
  const r = await api(
    {
      action: 'login',
      lgname: CRED.username,
      lgpassword: CRED.password,
      lgtoken: t.query.tokens.logintoken,
    },
    'POST',
  );
  if (r.login?.result !== 'Success') throw new Error(`登入失敗：${JSON.stringify(r.login)}`);
  console.log(`✅ 登入成功：${r.login.lgusername}`);
}

async function csrf(): Promise<string> {
  const t = await api({ action: 'query', meta: 'tokens' });
  return t.query.tokens.csrftoken;
}

/**
 * 只有在帳號實際具備 bot 權限時才標記 bot 編輯。
 * 這組 Bot password 的 grant 未含 high-volume editing（rights 無 `bot`），
 * 硬傳 bot=1 會被 API 以 permissiondenied 擋下。
 */
let canBot = false;
async function checkRights() {
  const u = await api({ action: 'query', meta: 'userinfo', uiprop: 'rights' });
  const rights: string[] = u.query.userinfo.rights ?? [];
  canBot = rights.includes('bot');
  const missing = ['createpage', 'edit', 'item-term'].filter((r) => !rights.includes(r));
  if (missing.length) {
    throw new Error(
      `Bot password 缺少必要權限：${missing.join(', ')}。` +
        `請至 https://www.wikidata.org/wiki/Special:BotPasswords 補 grant 後重跑。`,
    );
  }
  console.log(`ℹ️  權限檢查通過（bot 標記：${canBot ? '可用' : '不可用，將以一般編輯寫入'}）`);
}
const botFlag = () => (canBot ? { bot: '1' } : {});

/** 佐證來源：公司官網明列本平台歸屬的頁面 */
const reference = {
  snaks: {
    P854: [
      {
        snaktype: 'value',
        property: 'P854',
        datavalue: { value: REF_URL, type: 'string' },
      },
    ],
  },
};

function itemSnak(property: string, numericId: number, withRef = false) {
  return {
    mainsnak: {
      snaktype: 'value',
      property,
      datavalue: {
        value: { 'entity-type': 'item', 'numeric-id': numericId },
        type: 'wikibase-entityid',
      },
    },
    type: 'statement',
    rank: 'normal',
    ...(withRef ? { references: [reference] } : {}),
  };
}
function urlSnak(property: string, value: string) {
  return {
    mainsnak: { snaktype: 'value', property, datavalue: { value, type: 'string' } },
    type: 'statement',
    rank: 'normal',
  };
}
/** precision 11 = 精確到「日」 */
function timeSnak(property: string, time: string) {
  return {
    mainsnak: {
      snaktype: 'value',
      property,
      datavalue: {
        value: {
          time,
          timezone: 0,
          before: 0,
          after: 0,
          precision: 11,
          calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
        },
        type: 'time',
      },
    },
    type: 'statement',
    rank: 'normal',
  };
}

/** 以 label 搜尋既有的 TwTxGNN 項目（冪等：重跑不重複建立） */
async function findExisting(): Promise<string | null> {
  for (const lang of ['en', 'zh-hant']) {
    const r = await api({
      action: 'wbsearchentities',
      search: 'TwTxGNN',
      language: lang,
      uselang: lang,
      type: 'item',
      limit: '10',
    });
    const hit = (r.search ?? []).find(
      (s: any) => String(s.label).toLowerCase() === 'twtxgnn',
    );
    if (hit) return hit.id;
  }
  return null;
}

/**
 * 產生 QuickStatements V1 批次語法。
 *
 * 分隔符用 `|` 而非 Tab：兩者 QuickStatements 都吃，但 Tab 經過網頁／聊天視窗複製時
 * 常被轉成空格，整批就失敗；pipe 沒有這個風險。
 *
 * 為什麼需要這條路：本主機（Linode）的 IPv4 與 IPv6 皆在 Wikimedia 全域封鎖名單內
 * （2026-07-23 起，理由 Open proxy/Webhost），API 寫入一律回 permissiondenied ——
 * 連編輯既有項目都不行。規避封鎖違反 Wikimedia 政策，所以改由人在未被封鎖的網路執行。
 * 語法一律從本檔上方同一組常數生成，不另抄一份，避免兩邊 drift。
 */
function printQuickStatements(existingQid: string | null) {
  const T = '|'; // 欄位分隔符，見上方註解
  const q = (v: string) => `"${v}"`;
  // 項目已存在 → 主語直接用它的 QID（QuickStatements 遇到既有 statement 會補
  // reference 而非重複建立）；尚未存在 → CREATE + LAST。
  const S = existingQid ?? 'LAST';
  const rows: string[] = existingQid ? [] : ['CREATE'];

  if (!existingQid) {
    for (const [lang, v] of Object.entries(LABELS)) rows.push(`${S}${T}L${lang}${T}${q(v)}`);
    for (const [lang, v] of Object.entries(DESCRIPTIONS)) rows.push(`${S}${T}D${lang}${T}${q(v)}`);
    for (const [lang, vs] of Object.entries(ALIASES))
      for (const v of vs) rows.push(`${S}${T}A${lang}${T}${q(v)}`);
  }
  for (const [prop, id] of ITEM_CLAIMS) {
    const ref = prop === 'P178' || prop === 'P127' ? `${T}S854${T}${q(REF_URL)}` : '';
    rows.push(`${S}${T}${prop}${T}Q${id}${ref}`);
  }
  for (const [prop, v] of URL_CLAIMS) rows.push(`${S}${T}${prop}${T}${q(v)}`);
  for (const [prop, t] of TIME_CLAIMS) rows.push(`${S}${T}${prop}${T}${t}/11`);
  // 反向邊（含出處）+ 公司項目缺的 zh-tw label
  rows.push(`${ORG_QID}${T}P1830${T}${existingQid ?? '<QID>'}${T}S854${T}${q(REF_URL)}`);
  rows.push(`${ORG_QID}${T}Lzh-tw${T}${q('藥提醒科技有限公司')}`);

  console.log(
    existingQid
      ? `=== 補強既有項目 ${existingQid}（已存在的敘述會自動跳過，不會重複）===`
      : '=== 建立 TwTxGNN 項目 ===',
  );
  console.log('用法見 docs/wikidata-txgnn.md「怎麼加」一節。\n');
  console.log(rows.join('\n'));
  console.log(
    `\n關係成立的判準：TwTxGNN 項目有 P178/P127 → ${ORG_QID}，且 ${ORG_QID} 有 P1830 → TwTxGNN 項目。`,
  );
}

async function main() {
  // QS 模式也要先查（只讀，不受 IP 封鎖影響），才知道該產 CREATE 還是補強語法
  const existingQid = await findExisting();
  if (QS) return printQuickStatements(existingQid);

  // ── 1. 建立或補強 TwTxGNN 項目 ────────────────────────────
  let appQid = existingQid;
  let appData: any;

  if (existingQid) {
    console.log(`ℹ️  已存在 TwTxGNN 項目：${existingQid} —— 只補缺漏的 claim。`);
    const cur = await api({
      action: 'wbgetentities',
      ids: existingQid,
      props: 'claims|labels|descriptions|aliases',
    });
    const ent = cur.entities[existingQid];
    const claims = ent.claims ?? {};
    const hasItemValue = (prop: string, id: number) =>
      (claims[prop] ?? []).some((c: any) => c.mainsnak?.datavalue?.value?.['numeric-id'] === id);
    const hasUrlValue = (prop: string, v: string) =>
      (claims[prop] ?? []).some((c: any) => c.mainsnak?.datavalue?.value === v);

    const newClaims: any[] = [];
    for (const [prop, id, note] of ITEM_CLAIMS) {
      if (!hasItemValue(prop, id)) {
        newClaims.push(itemSnak(prop, id, prop === 'P178' || prop === 'P127'));
        console.log(`   + ${prop} → Q${id}（${note}）`);
      }
    }
    for (const [prop, v, note] of URL_CLAIMS) {
      if (!hasUrlValue(prop, v)) {
        newClaims.push(urlSnak(prop, v));
        console.log(`   + ${prop} → ${v}（${note}）`);
      }
    }
    for (const [prop, t, note] of TIME_CLAIMS) {
      if (!(claims[prop] ?? []).length) {
        newClaims.push(timeSnak(prop, t));
        console.log(`   + ${prop} → ${t}（${note}）`);
      }
    }
    appData = newClaims.length ? { claims: newClaims } : null;
  } else {
    console.log('ℹ️  Wikidata 上尚無 TwTxGNN 項目 —— 將新建。');
    appData = {
      labels: Object.fromEntries(
        Object.entries(LABELS).map(([l, v]) => [l, { language: l, value: v }]),
      ),
      descriptions: Object.fromEntries(
        Object.entries(DESCRIPTIONS).map(([l, v]) => [l, { language: l, value: v }]),
      ),
      aliases: Object.fromEntries(
        Object.entries(ALIASES).map(([l, vs]) => [
          l,
          vs.map((v) => ({ language: l, value: v })),
        ]),
      ),
      claims: [
        ...ITEM_CLAIMS.map(([p, id]) => itemSnak(p, id, p === 'P178' || p === 'P127')),
        ...URL_CLAIMS.map(([p, v]) => urlSnak(p, v)),
        ...TIME_CLAIMS.map(([p, t]) => timeSnak(p, t)),
      ],
    };
  }

  console.log('\n=== TwTxGNN 項目 payload ===');
  console.log(appData ? JSON.stringify(appData, null, 2) : '（無需變更）');

  if (DRY) {
    console.log(
      `\n[dry-run] 未寫入。實際執行時會在 ${ORG_QID} 補 P1830 owner of → TwTxGNN 項目。`,
    );
    return;
  }

  await login();
  await checkRights();
  let token = await csrf();

  if (appData) {
    const r = await api(
      {
        action: 'wbeditentity',
        ...(existingQid ? { id: existingQid } : { new: 'item' }),
        token,
        ...botFlag(),
        summary: existingQid
          ? 'Add developer/owner and platform claims for TwTxGNN'
          : 'Create item for TwTxGNN, drug repurposing platform developed by yao.care (Q140265007)',
        data: JSON.stringify(appData),
      },
      'POST',
    );
    appQid = r.entity?.id ?? existingQid;
    console.log(`\n✅ TwTxGNN 項目寫入成功：${appQid}（rev ${r.entity?.lastrevid}）`);
  }

  if (!appQid) throw new Error('未取得 TwTxGNN 項目 QID，無法建立反向連結');
  const appNumeric = Number(appQid.replace(/^Q/, ''));

  // ── 2. 公司項目補 P1830 owner of → TwTxGNN（反向邊）────────
  const orgCur = await api({ action: 'wbgetentities', ids: ORG_QID, props: 'claims' });
  const orgClaims = orgCur.entities[ORG_QID].claims ?? {};
  const alreadyOwns = (orgClaims['P1830'] ?? []).some(
    (c: any) => c.mainsnak?.datavalue?.value?.['numeric-id'] === appNumeric,
  );

  if (alreadyOwns) {
    console.log(`✓ ${ORG_QID} 已有 P1830 → ${appQid}，不重複寫入。`);
  } else {
    token = await csrf();
    const r2 = await api(
      {
        action: 'wbeditentity',
        id: ORG_QID,
        token,
        ...botFlag(),
        summary: `Add P1830 owner of → ${appQid} (TwTxGNN)`,
        data: JSON.stringify({ claims: [itemSnak('P1830', appNumeric, true)] }),
      },
      'POST',
    );
    console.log(`✅ ${ORG_QID} 已補 P1830 owner of → ${appQid}（rev ${r2.entity?.lastrevid}）`);
  }

  console.log(`\n檢視：https://www.wikidata.org/wiki/${appQid}`);
  console.log(`      https://www.wikidata.org/wiki/${ORG_QID}`);
}

main().catch((e) => {
  console.error('✗ 失敗：', e.message);
  if (/permissiondenied/.test(e.message)) {
    console.error(
      '\n本主機的 IP 在 Wikimedia 全域封鎖名單內（Linode 位址段，2026-07-23 起），' +
        '所有寫入都會被擋，包含編輯既有項目。\n' +
        '改用以下任一方式：\n' +
        '  1. 在未被封鎖的網路執行：./node_modules/.bin/tsx scripts/wikidata-txgnn.ts\n' +
        '  2. 產生 QuickStatements 語法、在瀏覽器貼上執行：\n' +
        '     ./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --quickstatements\n' +
        '  3. 為帳號申請 IP block exemption（IPBE）後，本主機即可恢復 API 寫入。\n' +
        '詳見 docs/wikidata-txgnn.md',
    );
  }
  process.exit(1);
});
