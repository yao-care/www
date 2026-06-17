# GEO / LLM 推薦力 — 現況 Checklist

> 目標：讓各大 LLM（ChatGPT / Claude / Perplexity / Gemini / Copilot…）願意**主動引用、推薦** yao.care 的內容。
> 最後更新：2026-06-17。維護方式：完成一項就打勾、補上日期；新項目往對應區塊加。

---

## ✅ 站內技術（已完成，2026-06-17 一批）

- [x] **品牌定義正確** — 對外 description / Organization schema 由「三條業務線」改為**四條**（補回高齡友善）。`src/site.config.ts`
- [x] **WebSite schema** — 首頁 `@graph`：Organization + WebSite，`@id` 互連、`inLanguage` zh-TW。`src/layouts/BaseLayout.astro`
- [x] **醫療 E-E-A-T（機構掛名）** — Organization 與 news author/publisher 皆 `['Organization','MedicalOrganization']`，強化 YMYL 權重。`BaseLayout` / `news/[target]/[slug].astro`
- [x] **登記實體資訊** — `legalName` 藥提醒科技有限公司、統編 83620786、成立 2020-05-08、`hasMap` 連商家檔。
- [x] **robots.txt 明確歡迎 AI 爬蟲** — GPTBot / OAI-SearchBot / ClaudeBot / PerplexityBot / Google-Extended / CCBot…。`public/robots.txt`
- [x] **soft-404 修復** — 不存在路徑回真 404 + 品牌頁（原本回 200+首頁）。`src/pages/404.astro` + NPM host #46 nginx
- [x] **llms.txt** — 給 LLM 的站點地圖（`/llms.txt`，build 自動生成）。
- [x] **各頁結構化資料** — 產品 SoftwareApplication/FAQPage、news NewsArticle、glossary DefinedTerm、guides Article+FAQ、BreadcrumbList。
- [x] **GEO 內容資產** — `/glossary`(名詞) `/guides`(情境指南) `seo.config.ts`(knowsAbout / 各產品 FAQ)。

## ✅ 站外實體權威（已完成）

- [x] **Wikidata 條目** — [Q140265007](https://www.wikidata.org/wiki/Q140265007)（instance of business、統編、成立日、產業、官網…齊全）。官網 `sameAs` ⇄ Wikidata `official website` 雙向。
- [x] **Google 商家檔案** — canonical CID 進 `sameAs`；商家後台官網欄位已填（雙向）。
- [x] **GitHub 組織** — github.com/yao-care 在 `sameAs`。
- [x] 三節點互相指認：**Wikidata ⇄ 官網 ⇄ Google 商家**。

## ✅ 主動推送 / 收錄（已完成）

- [x] **GSC** — 網域資源 `sc-domain:yao.care`，sitemap 已提交（含 www + 各子站）。
- [x] **Bing Webmaster** — 已接（DNS / GSC 匯入，站上無痕跡屬正常）。
- [x] **IndexNow** — 每日部署後自動 POST 變動文章給 Bing/Yandex/Naver/Seznam。`scripts/indexnow.mjs`，金鑰 `public/1be01cbeef8111fdeccbc36e95ec07c1.txt`

## ✅ 內容品質閘門（已完成）

- [x] **新聞低相關自動 noindex** — relevance < 0.78 → noindex + 排除 sitemap，集中索引權重。`src/news.policy.mjs`（單一門檻，sitemap + 頁面 + IndexNow 共用）。
- [x] **精準少量選題** — RELEVANCE_THRESHOLD 0.72 / 每日上限 10 / 每 target 3 + critic 複審。`scripts/fetch-news.ts`
- [x] **需求驅動回饋** — GA 完成率 + GSC 搜尋需求 → 自動選題與寫作洞察。`scripts/ga-insights.ts` / `gsc.ts`

---

## 🔴 待辦 — 需要你（站外，無法用程式做）／最高槓桿

- [ ] **第三方獨立提及 / 報導 / 反向連結** — LLM 主動推薦的根本動力是「**別人引用你**」。可做：投稿與新聞稿、業界目錄收錄、合作夥伴官網互放連結、研討會/演講露出、開源 repo README 互連回官網。
- [ ] **Google 商家檔內容充實** — 類別（軟體/資訊科技公司）、營業時間、簡介、相片、貼文、累積評論。
- [ ] **（可選）具名作者升級** — 目前機構掛名；若有合適真人（醫師/負責人＋資歷）可升級為 `Person` author，醫療 YMYL 權重更高。
- [ ] **（可選）Wikipedia 條目** — 門檻高（需獨立來源具備關注度），等第三方報導累積後再評估。
- [ ] **（可選）Wikidata 再充實** — logo(P154，需上傳 Commons)、產品 brand 子項目。邊際效益遞減。

## 🟡 等時間回流（已做，數據未到）

- [ ] **GA B/C 訊號** — 互動事件埋點 2026-06-16 才修好；約 1–2 週後 `reports/news-insights.json` 的 `quality.readComplete` 才有完整資料。
- [ ] **新 schema / Wikidata 被各引擎吸收** — 數天到數週。
- [ ] **IndexNow / sitemap 變動生效** — Bing/Google 重爬後反映。

## ⚙️ 維運注意（別踩雷）

- [ ] **soft-404 會被還原** — 修改在 NPM **自動產生**的 `46.conf`；若在 NPM UI 重存 host #46 會被覆蓋，需重跑 sed + `docker exec $NPM_CONTAINER nginx -s reload`。備份 `46.conf.bak-softfix`。
- [ ] **IndexNow 換金鑰要兩邊一起改** — `public/<KEY>.txt` 檔名 與 `scripts/indexnow.mjs` 的 `KEY` 常數。
- [ ] **noindex 門檻調整** — 只改 `src/news.policy.mjs` 的 `NEWS_INDEX_MIN_RELEVANCE`，重新 `npm run deploy`。

---

## （選）下一步可做的技術項
- [ ] GSC「高曝光但無內容」查詢 → 自動建議/補新題目（目前只在週報列出）。
- [ ] TxGNN 寫死統計數字（191 / 142,328 / 5）動態化。
