/**
 * www.yao.care 產品詢問表單收件 Worker。
 *
 * 站台是 nginx 直接提供的純靜態檔，收不了 POST；這支 Worker 負責：
 *   1. Turnstile siteverify（action=inquiry，hostname 必須是本站）——不過就 403
 *   2. 寫進 D1（單一真實來源；寫失敗才算送出失敗）
 *   3. 用 Brevo API 寄通知信到 NOTIFY_TO（失敗只記 log 與 mail_ok=0，不讓填表人重送；資料已在 D1）
 *      寄件人用 Brevo 帳號已驗證的 service@weiqi.kids（service@yao.care 未驗證，當寄件人會被丟棄，見 ops/connections.md）
 *
 * secret（`wrangler secret put <名稱>`，值不進 repo）：
 *   TURNSTILE_SECRET  Turnstile widget 的 secret
 *   BREVO_API_KEY     Brevo HTTP API 金鑰（主機來源 secrets.md § SMTP 的 xkeysib）
 */

const MAX_BODY = 16 * 1024;
const EXPECTED_ACTION = 'inquiry';

const FIELDS = [
  { key: 'org', label: '機構名稱', required: true, max: 120 },
  { key: 'contact', label: '聯絡人', required: true, max: 60 },
  { key: 'reach', label: 'Email／電話', required: true, max: 120 },
  { key: 'product', label: '想了解的產品', required: false, max: 80 },
  { key: 'message', label: '留言', required: false, max: 2000 },
  { key: 'page', label: '來源頁', required: false, max: 200 },
];

const list = (s) => new Set(String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean));

function cors(origin, allowed) {
  const h = { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
  if (origin && allowed.has(origin)) h['access-control-allow-origin'] = origin;
  return h;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

async function verifyTurnstile(env, token, ip) {
  const hosts = list(env.TURNSTILE_HOSTNAMES);
  if (typeof token !== 'string' || !token || token.length > 2048 || hosts.size === 0 || !env.TURNSTILE_SECRET) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    const res = await r.json();
    return res.success === true && res.action === EXPECTED_ACTION && hosts.has(res.hostname);
  } catch (err) {
    console.error('siteverify_failed', String(err));
    return false;
  }
}

async function notifyEmail(env, v, id) {
  if (!env.BREVO_API_KEY || !env.NOTIFY_TO) return false;
  const textContent = [
    `產品詢問 #${id}`,
    `機構名稱：${v.org}`,
    ...FIELDS.filter((f) => f.key !== 'org').map((f) => `${f.label}：${v[f.key] || '（未填）'}`),
  ].join('\n');
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.reach);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'yao.care 產品詢問', email: 'service@weiqi.kids' },
        to: [{ email: env.NOTIFY_TO }],
        ...(isEmail ? { replyTo: { email: v.reach } } : {}),
        subject: `【產品詢問 #${id}】${v.org}`,
        textContent,
      }),
    });
    if (!r.ok) console.error('mail_failed', r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('mail_failed', String(err));
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const allowed = list(env.ALLOWED_ORIGINS);
    const origin = request.headers.get('origin');
    const headers = cors(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
    if (!origin || !allowed.has(origin)) return json({ error: 'bad_origin' }, 403, headers);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413, headers);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400, headers); }

    // 蜜罐：真人看不到，填了就靜默回 200
    if (body.website) return json({ ok: true }, 200, headers);

    const v = {};
    for (const f of FIELDS) {
      const s = typeof body[f.key] === 'string' ? body[f.key].trim() : '';
      if (f.required && !s) return json({ error: 'missing_field', field: f.key }, 400, headers);
      if (s.length > f.max) return json({ error: 'too_long', field: f.key }, 400, headers);
      v[f.key] = s;
    }
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.reach);
    const isPhone = /^[+()\d\s#-]{8,}$/.test(v.reach) && (v.reach.match(/\d/g) || []).length >= 8;
    if (!isEmail && !isPhone) return json({ error: 'bad_reach', field: 'reach' }, 400, headers);

    const ip = request.headers.get('cf-connecting-ip') || '';
    if (!(await verifyTurnstile(env, body['cf-turnstile-response'], ip))) return json({ error: 'turnstile' }, 403, headers);

    let id;
    try {
      const row = await env.DB.prepare(
        'INSERT INTO inquiries (created_at, org, contact, reach, product, message, page, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      ).bind(new Date().toISOString(), v.org, v.contact, v.reach, v.product, v.message, v.page, request.cf?.country ?? null).first();
      id = row.id;
    } catch (err) {
      console.error('d1_failed', String(err));
      return json({ error: 'store_failed' }, 500, headers);
    }

    ctx.waitUntil((async () => {
      const ok = await notifyEmail(env, v, id);
      if (ok) await env.DB.prepare('UPDATE inquiries SET mail_ok = 1 WHERE id = ?').bind(id).run();
    })());

    return json({ ok: true }, 200, headers);
  },
};
