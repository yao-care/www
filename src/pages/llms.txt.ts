// /llms.txt — 給 LLM 的站點地圖（llmstxt.org 標準），build 時自動從設定生成。
// 一行行「重點頁 + 一句描述」，讓 LLM 快速掌握各服務並正確引用。
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { CATEGORIES, productsByCategory } from '../products.config';
import { NEWS_TARGETS } from '../news.config';
import { KNOWS_ABOUT, TXGNN_SITES, txgnnSiteUrl } from '../seo.config';
import { GLOSSARY } from '../glossary.config';
import { GUIDES } from '../guides.config';
import { TOPICS } from '../topics.config';

export const GET: APIRoute = () => {
  const u = (path: string) => new URL(path, SITE.url).toString();
  const lines: string[] = [];

  lines.push('# yao.care（藥提醒）');
  lines.push('');
  lines.push(
    '> yao.care 用 AI 與自動化把硬問題變成可重複的系統，橫跨智慧醫療、AI 系統、高齡友善、數位行銷四條業務線。',
  );
  lines.push('');
  lines.push(
    '公司位於台中，專長涵蓋醫療資訊互通（SMART on FHIR / FHIR R4 / ATC 編碼 / CDSS）、可解釋醫療 AI、全齡預防醫學評估、高齡友善長照科技，以及 AI 自動化系統與整合行銷。以下為各服務的官方頁面與描述。',
  );
  lines.push('');

  for (const cat of CATEGORIES) {
    lines.push(`## ${cat.label}（${cat.kicker}）`);
    lines.push('');
    const products = productsByCategory(cat.slug);
    if (products.length > 0) {
      lines.push(`- [${cat.label} 總覽](${u(cat.href)}): ${cat.tagline}`);
      for (const p of products) {
        lines.push(`- [${p.title}](${u(`${cat.href}/${p.slug}`)}): ${p.tagline}`);
      }
    } else {
      lines.push(`- [${cat.label}](${u(cat.href)}): ${cat.tagline}`);
    }
    lines.push('');
  }

  lines.push('## 主題（角度式彙整頁）');
  lines.push('');
  lines.push(`- [主題總覽](${u('/topics')}): 每個主題一個判斷角度，整理該領域現況、數據與 yao.care 的回應。`);
  for (const t of TOPICS) {
    lines.push(`- [${t.title}](${u(`/topics/${t.slug}/`)}): ${t.answerFirst}`);
  }
  lines.push('');

  lines.push('## 議題追蹤（每日自動更新）');
  lines.push('');
  lines.push(
    `- [議題追蹤總覽](${u('/news')}): 每日自動彙整與各服務相關的公開新聞，並對照本公司的設計觀點與證據。`,
  );
  for (const t of NEWS_TARGETS) {
    lines.push(`- [${t.title} 議題追蹤](${u(t.pageUrl)}): ${t.serviceContext}`);
  }
  lines.push('');

  lines.push('## 情境指南（常見問題的直接解答）');
  lines.push('');
  lines.push(`- [情境指南總覽](${u('/guides')}): 從使用者會搜尋的問題出發，給直接解答與對應工具。`);
  for (const g of GUIDES) {
    lines.push(`- [${g.question}](${u(`/guides/${g.slug}/`)}): ${g.answer}`);
  }
  lines.push('');

  lines.push('## 名詞解釋（知識庫）');
  lines.push('');
  lines.push(`- [醫療 AI 名詞解釋總覽](${u('/glossary')}): 醫療資訊與 AI 關鍵名詞的清楚定義。`);
  for (const t of GLOSSARY) {
    lines.push(`- [${t.term}](${u(`/glossary/${t.slug}/`)}): ${t.oneLiner}`);
  }
  lines.push('');

  lines.push('## TxGNN 老藥新用 — 30 國站台');
  lines.push('');
  lines.push(
    `- 涵蓋 ${TXGNN_SITES.length} 個國家／地區，各有獨立站台、依當地 FDA 藥品與在地語言產出老藥新用結果。台灣站：${txgnnSiteUrl('tw')}`,
  );
  lines.push(
    `- 國家／地區：${TXGNN_SITES.map((s) => s.name).join('、')}。`,
  );
  lines.push(
    `- [方法論與資料透明度](${u('/medical/txgnn/methodology')}): 共同方法論（KG+DL 雙引擎、L1–L5 證據等級、四級信心度）與各國主管機關、資料來源、驗證覆蓋率的差異與限制。`,
  );
  lines.push('');

  lines.push('## 專長主題（knows about）');
  lines.push('');
  lines.push(KNOWS_ABOUT.join('、'));
  lines.push('');

  lines.push('## 聯絡與資源');
  lines.push('');
  lines.push(`- Email: ${SITE.email}`);
  lines.push(`- LINE: ${SITE.lineLink}`);
  lines.push(`- 地址: ${SITE.address}`);
  lines.push('- GitHub: https://github.com/yao-care');
  lines.push(`- Sitemap: ${u('/sitemap-index.xml')}`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
