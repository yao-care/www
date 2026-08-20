// GA4 互動事件層：捲動深度 / 讀完 / 互動時間 / CTA 點擊。
// 由 Analytics.astro 以打包 <script> 全站載入；內容分類來自 window.__ya（inline 已算好）。
const w = window as any;
const ya = w.__ya || { page: { type: 'page', category: '', item: '', group: '其他' } };
const page = ya.page as { type: string; category: string; item: string; group: string };

function send(name: string, params: Record<string, unknown>) {
  if (typeof w.gtag !== 'function') return;
  w.gtag('event', name, {
    content_type: page.type,
    content_category: page.category,
    content_item: page.item,
    content_group: page.group,
    ...params,
  });
}

// ── 互動時間（看多久）：僅在「分頁可見且使用者活躍」累加 ───────────────
let engaged = 0;
let activeUntil = Date.now() + 30_000;
const markActive = () => { activeUntil = Date.now() + 30_000; };
['scroll', 'mousemove', 'keydown', 'click', 'touchstart'].forEach((e) =>
  window.addEventListener(e, markActive, { passive: true }),
);
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() < activeUntil) engaged += 1;
}, 1000);

// ── 捲動深度（看多深）：25/50/75/100 各送一次 ──────────────────────────
const marks = [25, 50, 75, 100];
const seen = new Set<number>();
let maxPct = 0;
let raf = 0;
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const pct = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    if (pct > maxPct) maxPct = pct;
    for (const m of marks) {
      if (pct >= m && !seen.has(m)) {
        seen.add(m);
        send('scroll_depth', { percent: m });
      }
    }
    if (seen.has(100)) window.removeEventListener('scroll', onScroll);
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ── 讀完（看完沒）：內容到底 → read_complete + 當下互動秒數 ─────────────
const contentEl = document.querySelector('article') || document.querySelector('main');
let readSent = false;
function sendRead() {
  if (readSent) return;
  readSent = true;
  send('read_complete', { engaged_seconds: Math.round(engaged), max_scroll: maxPct });
}
if (contentEl && 'IntersectionObserver' in window) {
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'height:1px;width:100%';
  contentEl.appendChild(sentinel);
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { sendRead(); io.disconnect(); }
      });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  io.observe(sentinel);
}

// ── 離開時補送整體互動（看多久 / 最深捲動），即使沒讀完 ─────────────────
let flushed = false;
function flush() {
  if (flushed) return;
  flushed = true;
  send('page_engagement', { engaged_seconds: Math.round(engaged), max_scroll: maxPct, completed: readSent });
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
window.addEventListener('pagehide', flush);

// ── CTA / 外連點擊（轉換意圖）──────────────────────────────────────────
const self = location.hostname.replace(/^www\./, '');
document.addEventListener(
  'click',
  (e) => {
    const t = e.target as HTMLElement | null;
    const a = t && t.closest ? (t.closest('a[href]') as HTMLAnchorElement | null) : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    let host = '';
    try { host = new URL(href, location.href).hostname.replace(/^www\./, ''); } catch (_) {}
    let type = '';
    if (href.startsWith('mailto:')) type = 'mail';
    else if (/lin\.ee|line\.me/.test(href)) type = 'line';
    else if (host === 'github.com') type = 'github';
    else if (host === 'ods.yao.care') type = 'ods';
    else if (host === 'app.ods.yao.care') type = 'ods_self_register';
    else if (host && host !== self) type = /yao\.care$/.test(host) ? 'demo' : 'external';
    if (!type) return; // 站內導覽不送
    // 入口位置改由 data-cta 帶（連 ODS 的連結不再掛 UTM，見 src/pages/ai/ods.astro）；
    // utm_content 留作 fallback，站外帶參數進來的連結一樣量得到。
    let linkContent = a.getAttribute('data-cta') || '';
    if (!linkContent) {
      try { linkContent = new URL(href, location.href).searchParams.get('utm_content') || ''; } catch (_) {}
    }
    send('cta_click', {
      link_url: href.slice(0, 200),
      link_domain: host,
      cta_type: type,
      ...(linkContent ? { link_content: linkContent.slice(0, 80) } : {}),
    });
  },
  { passive: true, capture: true },
);
