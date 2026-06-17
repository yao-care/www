/**
 * Wikidata 實體補強：套用 docs/wikidata-enrichment.md 的改動到 Q140265007。
 *
 * 憑證讀自 repo 外的 $YAOCARE_SECRETS_DIR/wikidata.json（Bot password，600，不入版控）。
 * 用法：
 *   ./node_modules/.bin/tsx scripts/wikidata-enrich.ts --dry-run   # 只印 payload，不寫
 *   ./node_modules/.bin/tsx scripts/wikidata-enrich.ts             # 實際寫入
 *
 * 設計為冪等：已存在的 claim 值會跳過；別名修正會移除「含全形頓號的整串壞別名」並補上乾淨別名。
 */
import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry-run');
const CRED = JSON.parse(
  readFileSync('$YAOCARE_SECRETS_DIR/wikidata.json', 'utf8'),
);
const API: string = CRED.apiUrl;
const QID: string = CRED.entity;

// ─── 極簡 cookie jar（MediaWiki 登入需要帶 cookie）────────────
const cookies = new Map<string, string>();
function cookieHeader(): string {
  return [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(res: Response) {
  // Node 18.14+ undici 提供 getSetCookie()
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
      ...(method === 'POST'
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : {}),
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
  const lgtoken = t.query.tokens.logintoken;
  const r = await api(
    {
      action: 'login',
      lgname: CRED.username,
      lgpassword: CRED.password,
      lgtoken,
    },
    'POST',
  );
  if (r.login?.result !== 'Success') {
    throw new Error(`登入失敗：${JSON.stringify(r.login)}`);
  }
  console.log(`✅ 登入成功：${r.login.lgusername}`);
}

async function csrf(): Promise<string> {
  const t = await api({ action: 'query', meta: 'tokens' });
  return t.query.tokens.csrftoken;
}

function itemSnak(property: string, numericId: number) {
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
  };
}
function stringSnak(property: string, value: string) {
  return {
    mainsnak: { snaktype: 'value', property, datavalue: { value, type: 'string' } },
    type: 'statement',
    rank: 'normal',
  };
}
function monolingualSnak(property: string, language: string, text: string) {
  return {
    mainsnak: {
      snaktype: 'value',
      property,
      datavalue: { value: { text, language }, type: 'monolingualtext' },
    },
    type: 'statement',
    rank: 'normal',
  };
}

async function main() {
  // 先抓現況 → 決定哪些 claim 要加、哪些壞別名要刪
  const cur = await api({
    action: 'wbgetentities',
    ids: QID,
    props: 'claims|aliases',
  });
  const ent = cur.entities[QID];
  const claims = ent.claims ?? {};
  const aliases = ent.aliases ?? {};

  const hasItemValue = (prop: string, id: number) =>
    (claims[prop] ?? []).some(
      (c: any) => c.mainsnak?.datavalue?.value?.['numeric-id'] === id,
    );
  const hasProp = (prop: string) => (claims[prop] ?? []).length > 0;

  const newClaims: any[] = [];
  if (!hasProp('P2037')) newClaims.push(stringSnak('P2037', 'yao-care'));
  if (!hasItemValue('P31', 1058914)) newClaims.push(itemSnak('P31', 1058914)); // 軟體公司
  if (!hasItemValue('P452', 31207)) newClaims.push(itemSnak('P452', 31207)); // 醫療衛生
  if (!hasProp('P1813')) {
    newClaims.push(monolingualSnak('P1813', 'en', 'yao.care'));
    newClaims.push(monolingualSnak('P1813', 'zh-hant', '藥提醒'));
  }

  // 別名修正：移除任何含全形頓號/逗號的「整串壞別名」，補上乾淨別名
  const CLEAN: Record<string, string[]> = {
    'zh-hant': ['藥提醒', '藥提醒科技有限公司', 'yao.care'],
    zh: ['藥提醒', '藥提醒科技有限公司', 'yao.care'],
    en: ['yao.care', 'yao.care Technology'],
    mul: ['yao.care'],
  };
  const aliasOps: Record<string, any[]> = {};
  const isMangled = (v: string) => /[、，]/.test(v);
  // 移除壞的
  for (const [lang, arr] of Object.entries(aliases) as [string, any[]][]) {
    for (const a of arr) {
      if (isMangled(a.value)) {
        (aliasOps[lang] ??= []).push({ language: lang, value: a.value, remove: '' });
      }
    }
  }
  // 補乾淨的（跳過已存在且非壞的）
  for (const [lang, vals] of Object.entries(CLEAN)) {
    const existing = new Set((aliases[lang] ?? []).map((a: any) => a.value));
    for (const v of vals) {
      if (!existing.has(v)) (aliasOps[lang] ??= []).push({ language: lang, value: v });
    }
  }

  const data: any = {};
  if (newClaims.length) data.claims = newClaims;
  if (Object.keys(aliasOps).length) data.aliases = aliasOps;

  if (!data.claims && !data.aliases) {
    console.log('✓ 沒有需要變更的項目（已是目標狀態）。');
    return;
  }

  console.log('=== 將套用的變更 ===');
  console.log(JSON.stringify(data, null, 2));

  if (DRY) {
    console.log('\n[dry-run] 未寫入。移除 --dry-run 即實際套用。');
    return;
  }

  await login();
  const token = await csrf();
  const r = await api(
    {
      action: 'wbeditentity',
      id: QID,
      token,
      bot: '1',
      summary: 'Enrich org entity: GitHub username, software company, healthcare industry, short name, fix mangled aliases',
      data: JSON.stringify(data),
    },
    'POST',
  );
  console.log(`\n✅ 寫入成功，revision: ${r.entity?.lastrevid}`);
  console.log(`   檢視：https://www.wikidata.org/wiki/${QID}`);
}

main().catch((e) => {
  console.error('✗ 失敗：', e.message);
  process.exit(1);
});
