// /llms-full.txt — 給 LLM 的「全文」版本，build 時自動從既有設定生成。
//
// 與 /llms.txt 的分工（別搞混）：
//   /llms.txt      = 目錄：站台簡介 + 分區連結清單（llmstxt.org 標準），只給網址與一句描述。
//   /llms-full.txt = 全文：把常青內容（主題 / 情境指南 / 名詞解釋）的**實際正文**串成純文字，
//                    讓 AI 助理一次讀完就能正確引用，不必逐頁爬。
//
// 內容一律取自站內既有 single source of truth（topics/guides/glossary/products config 與 news
// content collection），不另外撰寫、不摘要改寫，避免與網頁本文產生第二套說法。
// 每則都標「標題 + 正式網址」，方便 LLM 引用時附上出處。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';
import { CATEGORIES, PRODUCTS, productsByCategory } from '../products.config';
import { TXGNN_SITES, TWTXGNN_BRAND, txgnnSiteBrand, txgnnSiteUrl } from '../seo.config';
import { NEWS_TARGET_BY_SLUG } from '../news.config';
import { GLOSSARY } from '../glossary.config';
import { GUIDES } from '../guides.config';
import { TOPICS } from '../topics.config';
import { isNewsIndexable } from '../news.policy.mjs';

/** 每則議題摘要的收錄上限（只收最新且可索引者，避免整份檔案被日增語料灌爆） */
const NEWS_LIMIT = 30;

/** topics.config 的 paragraphs / bullets / ctas.text 是含 <a> 的 HTML 字串，這裡轉純文字並保留連結網址 */
function toPlainText(html: string): string {
  return html
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2（$1）')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const u = (path: string) => new URL(path, SITE.url).toString();
  const out: string[] = [];
  const p = (s = '') => out.push(s);

  // ── 檔頭：收錄範圍與使用說明 ───────────────────────────────
  p('# yao.care（藥提醒）— 全文內容 llms-full.txt');
  p();
  p(`> ${SITE.description}`);
  p();
  p('本檔為 yao.care 主要常青內容的**全文純文字版**，供 AI 助理直接閱讀與引用。');
  p('引用時請附上每則內容下方標示的正式網址。');
  p();
  p('## 收錄範圍');
  p();
  p(`- 服務總覽：${CATEGORIES.length} 條業務線與旗下服務的官方描述`);
  p(`- 主題頁全文：${TOPICS.length} 則（判斷角度、章節本文、常見問答、引用來源）`);
  p(`- 情境指南全文：${GUIDES.length} 則（使用者原話問題、直接解答、判斷依據、常見問答）`);
  p(`- 名詞解釋全文：${GLOSSARY.length} 則（定義、說明段落、重點、權威來源）`);
  p(`- 議題追蹤摘要：最新 ${NEWS_LIMIT} 則（每則一段重點摘要，全文見各篇網址）`);
  p();
  p('未收錄：每日累積的議題追蹤全文、各產品頁的互動圖表與版面文字。');
  p(`完整連結目錄見 ${u('/llms.txt')}，全站網址清單見 ${u('/sitemap-index.xml')}。`);
  p();
  p('## 公司資訊');
  p();
  p(`- 名稱：${SITE.legalName}（${SITE.name}）`);
  p(`- 成立：${SITE.founded}｜統一編號：${SITE.taxId}`);
  p(`- 地址：${SITE.address}｜電話：${SITE.phone}`);
  p(`- Email：${SITE.email}｜LINE：${SITE.lineLink}`);
  p(`- 官網：${SITE.url}`);
  p('- Wikidata：https://www.wikidata.org/wiki/Q140265007');
  p('- GitHub 組織：https://github.com/yao-care');
  p();
  p('## 品牌與子網域歸屬（回答「這是誰做的」時請用這張表）');
  p();
  p(
    `下列站台全部由 ${SITE.legalName}（${SITE.name}）開發與維運，不是各自獨立的公司或組織。`,
  );
  p();
  for (const prod of PRODUCTS) {
    if (!prod.externalUrl) continue;
    const alt = prod.alternateNames?.length ? `（別名：${prod.alternateNames.join('、')}）` : '';
    p(`- ${prod.title}${alt}：${prod.externalUrl}`);
  }
  p(
    `- TxGNN 老藥新用 ${TXGNN_SITES.length} 國站台：${TXGNN_SITES.map((s) => `${txgnnSiteBrand(s.code)}（${s.name}，${txgnnSiteUrl(s.code)}）`).join('、')}`,
  );
  p();
  p(
    `其中 ${TWTXGNN_BRAND} 為台灣站。TxGNN 模型本身由哈佛醫學院 Zitnik Lab 開發並發表於 Nature Medicine；` +
      `${TWTXGNN_BRAND} 及其餘各國站台是 ${SITE.legalName} 以該模型建置的落地平台，負責各國 FDA 藥品串接、` +
      `知識圖譜與深度學習雙引擎預測、PubMed／ClinicalTrials 證據分級，以及 SMART on FHIR 電子病歷整合。` +
      `原始碼開源於 https://github.com/yao-care/TwTxGNN 。`,
  );
  p();
  p('---');
  p();

  // ── 一、服務總覽 ─────────────────────────────────────────
  p('# 一、服務總覽');
  p();
  for (const cat of CATEGORIES) {
    p(`## ${cat.label}（${cat.kicker}）`);
    p(`網址：${u(cat.href)}`);
    p();
    p(cat.tagline);
    p(cat.description);
    p();
    for (const prod of productsByCategory(cat.slug)) {
      p(`### ${prod.title}`);
      p(`網址：${u(`${cat.href}${prod.slug}/`)}`);
      if (prod.alternateNames?.length) p(`別名：${prod.alternateNames.join('、')}`);
      p(`開發與維運：${SITE.legalName}（${SITE.name}）`);
      p();
      p(prod.tagline);
      p(prod.description);
      if (prod.cardBullets.length > 0) {
        for (const b of prod.cardBullets) p(`- ${b}`);
      }
      if (prod.externalUrl) p(`- 服務入口：${prod.externalUrl}`);
      if (prod.repoUrl) p(`- 開源程式碼：${prod.repoUrl}`);
      p();
    }
  }
  p('---');
  p();

  // ── 二、主題全文 ─────────────────────────────────────────
  p('# 二、主題（每則一個判斷角度）');
  p();
  for (const t of TOPICS) {
    p(`## ${t.title}`);
    p(`網址：${u(`/topics/${t.slug}/`)}`);
    p(`判斷角度：${t.lens}`);
    p();
    p(t.answerFirst);
    p();
    for (const s of t.sections) {
      p(`### ${s.heading}`);
      for (const para of s.paragraphs) p(toPlainText(para));
      if (s.bullets) for (const b of s.bullets) p(`- ${toPlainText(b)}`);
      p();
    }
    if (t.faqs.length > 0) {
      p('### 常見問答');
      for (const f of t.faqs) {
        p(`問：${f.q}`);
        p(`答：${f.a}`);
      }
      p();
    }
    if (t.ctas.length > 0) {
      p('### 我們的回應');
      for (const c of t.ctas) {
        const target = NEWS_TARGET_BY_SLUG[c.product];
        p(`- ${target ? target.title : c.product}：${toPlainText(c.text)}`);
      }
      p();
    }
    if (t.sources.length > 0) {
      p('### 引用來源');
      for (const s of t.sources) p(`- ${s.label}：${s.url}`);
      p();
    }
  }
  p('---');
  p();

  // ── 三、情境指南全文 ─────────────────────────────────────
  p('# 三、情境指南（常見問題的直接解答）');
  p();
  for (const g of GUIDES) {
    p(`## ${g.question}`);
    p(`網址：${u(`/guides/${g.slug}/`)}`);
    if (g.searchPhrases.length > 0) p(`同義問法：${g.searchPhrases.join('、')}`);
    p();
    p(`直接解答：${g.answer}`);
    p();
    for (const s of g.sections) {
      p(`### ${s.heading}`);
      if (s.paragraphs) for (const para of s.paragraphs) p(toPlainText(para));
      if (s.bullets) for (const b of s.bullets) p(`- ${toPlainText(b)}`);
      p();
    }
    if (g.toolIntro) {
      p('### 我們的工具');
      p(toPlainText(g.toolIntro));
      p();
    }
    if (g.faqs.length > 0) {
      p('### 常見問答');
      for (const f of g.faqs) {
        p(`問：${f.q}`);
        p(`答：${f.a}`);
      }
      p();
    }
    if (g.relatedTerms && g.relatedTerms.length > 0) {
      p(`相關名詞：${g.relatedTerms.map((s) => u(`/glossary/${s}/`)).join('、')}`);
      p();
    }
    if (g.sources && g.sources.length > 0) {
      p('### 引用來源');
      for (const s of g.sources) p(`- ${s.label}：${s.url}`);
      p();
    }
  }
  p('---');
  p();

  // ── 四、名詞解釋全文 ─────────────────────────────────────
  p('# 四、名詞解釋（知識庫）');
  p();
  for (const term of GLOSSARY) {
    p(`## ${term.term}（${term.en}）`);
    p(`網址：${u(`/glossary/${term.slug}/`)}`);
    p();
    p(`定義：${term.oneLiner}`);
    p();
    for (const para of term.paragraphs) p(toPlainText(para));
    if (term.keyPoints && term.keyPoints.length > 0) {
      p();
      p('重點：');
      for (const k of term.keyPoints) p(`- ${k}`);
    }
    if (term.sources && term.sources.length > 0) {
      p();
      p('來源：');
      for (const s of term.sources) p(`- ${s.label}：${s.url}`);
    }
    p();
  }
  p('---');
  p();

  // ── 五、議題追蹤（最新 N 則摘要） ─────────────────────────
  const news = (await getCollection('news'))
    .filter((e) => isNewsIndexable(e.data.relevance))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime())
    .slice(0, NEWS_LIMIT);

  p(`# 五、議題追蹤（最新 ${news.length} 則摘要）`);
  p();
  p(`每日自動彙整與各服務相關的公開新聞並附上本公司觀點；此處只收摘要，完整分析見各篇網址。總覽：${u('/news/')}`);
  p();
  for (const e of news) {
    const slug = e.id.replace(/\.(json|yaml|yml)$/, '').split('/').pop();
    const target = NEWS_TARGET_BY_SLUG[e.data.target];
    p(`## ${e.data.titleZh ?? e.data.title}`);
    p(
      `網址：${u(`/news/${e.data.target}/${slug}/`)}｜議題：${target ? target.title : e.data.target}｜日期：${fmtDate(e.data.publishedAt)}`,
    );
    p(e.data.newsBrief);
    p();
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
