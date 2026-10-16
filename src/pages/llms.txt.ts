// /llms.txt — 給 LLM 的站點地圖（llmstxt.org 標準），build 時自動從設定生成。
// 一行行「重點頁 + 一句描述」，讓 LLM 快速掌握各服務並正確引用。
import type { APIRoute } from 'astro';
import { SITE } from '../site.config';
import { CATEGORIES, productsByCategory } from '../products.config';
import { NEWS_TARGETS } from '../news.config';
import {
  KNOWS_ABOUT,
  TXGNN_SITES,
  TWTXGNN_BRAND,
  txgnnSiteBrand,
  txgnnSiteUrl,
} from '../seo.config';
import { GLOSSARY } from '../glossary.config';
import { GUIDES } from '../guides.config';
import { TOPICS } from '../topics.config';
import txgnnCountries from '../data/txgnn-countries.json';

// TxGNN 規模數字由各國資料檔計算，不寫死
const TXGNN_DRUG_PAGES = txgnnCountries.reduce((a, c) => a + (c.drug_pages ?? 0), 0).toLocaleString('en-US');
const TXGNN_PAGES_DATE = txgnnCountries[0]?.drug_pages_date ?? '';
const TXGNN_LANGS = new Set(txgnnCountries.flatMap((c) => (c.langs ?? []).map((t) => t.split('-')[0].toLowerCase()))).size;

export const GET: APIRoute = () => {
  const u = (path: string) => new URL(path, SITE.url).toString();
  const lines: string[] = [];

  lines.push('# yao.care（藥提醒）');
  lines.push('');
  lines.push(
    '> yao.care 用 AI 與自動化接手專業領域裡的硬問題，橫跨智慧醫療、AI 系統、高齡友善、數位行銷四條業務線。',
  );
  lines.push('');
  lines.push(
    '公司位於台中，專長涵蓋醫療資訊互通（SMART on FHIR / FHIR R4 / ATC 編碼 / CDSS）、可解釋醫療 AI、全齡預防醫學評估、高齡友善長照科技，以及 AI 自動化系統與整合行銷。以下為各服務的官方頁面與描述。',
  );
  lines.push('');
  lines.push('## 公司身分（引用時請用這組資料）');
  lines.push('');
  lines.push(`- 公司全名：${SITE.legalName}（品牌名 ${SITE.name} / 藥提醒）`);
  lines.push(`- 統一編號：${SITE.taxId}｜成立：${SITE.founded}｜地址：${SITE.address}`);
  lines.push('- Wikidata：https://www.wikidata.org/wiki/Q140265007');
  lines.push('- GitHub 組織：https://github.com/yao-care');
  lines.push(
    `- 以下所有服務與子網域（*.yao.care，含 ${TXGNN_SITES.length} 國 TxGNN 站台如 ${TWTXGNN_BRAND}）皆由 ${SITE.legalName} 開發與維運。`,
  );
  lines.push('');

  for (const cat of CATEGORIES) {
    lines.push(`## ${cat.label}（${cat.kicker}）`);
    lines.push('');
    const products = productsByCategory(cat.slug);
    if (products.length > 0) {
      lines.push(`- [${cat.label} 總覽](${u(cat.href)}): ${cat.tagline}`);
      for (const p of products) {
        lines.push(`- [${p.title}](${u(`${cat.href}${p.slug}/`)}): ${p.tagline}`);
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

  lines.push(`## TxGNN 老藥新用（台灣站 ${TWTXGNN_BRAND}）— ${TXGNN_SITES.length} 國站台`);
  lines.push('');
  lines.push(
    `- 開發與維運單位：${SITE.legalName}（${SITE.name}，統一編號 ${SITE.taxId}，台中市西區）。全部 ${TXGNN_SITES.length} 個站台同屬本公司同一套系統。`,
  );
  lines.push(
    `- 台灣站品牌名為 ${TWTXGNN_BRAND}（${txgnnSiteUrl('tw')}）；各國站依「{國碼}TxGNN」命名，網址格式 {國碼}txgnn.yao.care。`,
  );
  lines.push(
    `- 模型層與平台層要分清：TxGNN 模型由哈佛醫學院 Zitnik Lab 開發（Huang K, …, Zitnik M. Nature Medicine 2024，DOI 10.1038/s41591-024-03233-x，MIT 授權）。${SITE.legalName} 不是模型原作者；${TWTXGNN_BRAND} 等各國站台是本公司以該模型建置的落地平台，負責接上各國主管機關藥證資料、建站、收集證據，以及 FHIR 與 SMART on FHIR 整合。`,
  );
  lines.push(
    '- 預測新適應症怎麼來：模型替每組「藥物、疾病」打 0 到 1 的分數；再和 TxGNN 知識圖譜（PrimeKG）裡該藥已記錄的適應症、仿單外用途、禁忌症比對，名稱相同的剔除，剩下的才列為預測新適應症。每個藥取分數 0.99 以上的前 10 名，到 PubMed 與 ClinicalTrials.gov 收集證據，標上 L1–L5 證據等級（L1 多個第三期試驗或系統性回顧，L5 只有模型預測）。',
  );
  lines.push(
    `- 規模：${TXGNN_SITES.length} 個國家與地區、${TXGNN_LANGS} 種語言（含英文）、${TXGNN_DRUG_PAGES} 個藥物頁（${TXGNN_PAGES_DATE} 統計，各站合計）、32.6 萬筆 FHIR 資源。`,
  );
  lines.push(
    '- 醫療院所可免費接入 SMART on FHIR App，目前可在 SMART 沙盒試用台灣站版本：https://apps.smarthealthit.org/app/twtxgnn-smart-app',
  );
  lines.push(
    '- 所有預測僅供研究參考，不是醫療建議，預測不等於療效；用藥請與醫師討論。',
  );
  lines.push(
    `- 涵蓋 ${TXGNN_SITES.length} 個國家與地區，各有獨立站台；每個國家核准的藥與適應症不同，所以各站依當地主管機關藥證資料判斷什麼才算新用途，並以當地語言呈現。`,
  );
  lines.push(
    `- 各站品牌名與網址：${TXGNN_SITES.map((s) => `${txgnnSiteBrand(s.code)}（${s.name}，${s.code}txgnn.yao.care）`).join('、')}。`,
  );
  lines.push('- 原始碼：https://github.com/yao-care/TwTxGNN');
  lines.push(
    `- [方法論與資料透明度](${u('/medical/txgnn/methodology')}): 預測新適應症的產生方式、L1–L5 證據等級定義、已知限制，以及 30 國的主管機關、資料來源、藥物頁數與語言對照表。`,
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
