# yao.care 官網 — 對外平台互動與曝光成效

> **這份文件的角色**：記錄本站**與外部平台的互動事項與成效** —— GEO / LLM 推薦力、搜尋與流量分析、實體權威、站外曝光（情境 B）。
> **開發／build／deploy／改版／news 引擎機制／排錯**（情境 A）請看 **`CLAUDE.md`**（Claude 每次 session 自動載入的維運手冊）。
> 機密憑證不寫在本檔，集中於 repo 外：`$YAOCARE_SECRETS_DIR/`、`$HOST_SECRETS_NOTE`。

---

## § 文件分工（先讀這段，再決定看哪一份）

本專案維護分兩種情境，兩份主文件各管一邊；**不論你先讀到哪一份，照下表跳到對的地方**：

| 你想做的事 | 看哪份 |
|-----------|--------|
| **A. 開發／優化專案** — 改版面/文案、build & deploy、改設定、新增頁面、排錯（502/build）、news 引擎**機制與除錯**、cron/腳本內部 | **`CLAUDE.md`**（`$WWW_REPO_DIR/CLAUDE.md`，Claude session 自動載入） |
| **B. 對外平台互動與曝光成效** — GEO/LLM 推薦力、GSC/GA4/Bing/IndexNow、Wikidata、Google 商家、站外目錄/合作夥伴/新聞稿、**看曝光到哪了** | **本檔 `README.md`** ＋ `GEO-CHECKLIST.md` ＋ `docs/` |

> 兩份文件最上方都有「**這段相同的路由**」；更新分工時兩邊一起改，避免走散。
> 界線速記：**「機器怎麼跑」在 CLAUDE.md；「對外做了什麼、效果如何」在 README.md。** 例：`fetch-news.ts` 的選題邏輯/cron → CLAUDE.md；它產出的文章被哪些平台收錄、搜尋曝光多少 → README.md。

---

## § 一眼看現況（成效快照）

> ⚠ 下列數字是 **2026-06-19 的快照、會過時**；每段都附「**重新產生指令**」，看現況請重跑，別信舊數字。

| 面向 | 現況（2026-06-19） | 重新產生 |
|------|-------------------|----------|
| 自動發文累積 | **291 篇**（12 個 target，永久累積不砍文） | `find src/content/news -name '*.json' \| wc -l` |
| 每日產量 | ~10 篇/天（貼著上限 `MAX_WRITE_TOTAL`） | 見 CLAUDE.md「News 議題追蹤模組」 |
| 最後一次自動發文 | 2026-06-19 05:05（台北）成功，IndexNow 提交 8 筆 200 | `tail -20 /var/log/yaocare-news.log` |
| GEO / LLM 推薦力 checklist | **19 項 ✅ / 13 項 ⬜**（站內技術＋實體權威已完成；待辦集中在站外第三方提及） | `grep -c '\- \[x\]' GEO-CHECKLIST.md` |
| 搜尋曝光（GSC，近 28 天） | 曝光 **1,525** / 點擊 **64**（需求訊號已生效） | `./node_modules/.bin/tsx scripts/gsc.ts` |
| 流量品質回饋（GA4） | **尚未達門檻**（埋點 2026-06-16 才修好，`readComplete` 仍 0；約 1–2 週後才有完整資料） | `./node_modules/.bin/tsx scripts/ga-insights.ts` |

---

## § 外部平台帳號總表

> 認證金鑰一律放 repo 外（下表只標位置、不寫值）。負責腳本的**內部機制**見 `CLAUDE.md`，本檔只談「對外做什麼、看什麼成效」。

| 平台 | 識別 / 資源 | 認證位置 | 負責腳本/檔 | 用途 |
|------|-------------|----------|-------------|------|
| **Google Search Console** | `sc-domain:yao.care`（網域資源，含所有子網域） | SA 金鑰 `$YAOCARE_SECRETS_DIR/ga4-sa.json`（scope `webmasters`，Full） | `scripts/gsc.ts` | sitemap 提交/列出、搜尋需求（曝光/點擊/查詢） |
| **Google Analytics 4** | 評估 ID `G-W7ZNBYKJHJ`／Property `$GA_PROPERTY_ID` | 同上 SA 金鑰 | `scripts/ga-insights.ts`、`scripts/ga-setup.ts` | 讀者行為、完成率回饋、自訂維度/指標 |
| **Bing Webmaster** | 同網域（由 GSC/DNS 匯入） | — | —（被動） | Bing 收錄；IndexNow 同步 |
| **IndexNow** | 金鑰即檔名 `public/1be01cbeef8111fdeccbc36e95ec07c1.txt` | 金鑰公開（設計如此） | `scripts/indexnow.mjs` | 部署後即時推送變動 URL 給 Bing/Yandex/Naver/Seznam |
| **Wikidata** | 實體 [Q140265007](https://www.wikidata.org/wiki/Q140265007) | `$YAOCARE_SECRETS_DIR/wikidata.json` | `scripts/wikidata-enrich.ts` | 公司實體權威（statements/sameAs） |
| **Google 商家檔案（GBP）** | canonical CID（已進 `seo.config.ts` 的 `sameAs`） | 見 `$HOST_SECRETS_NOTE` / memory | （API 同步） | 本地權威、NAP 一致性 |
| **GitHub 組織** | [github.com/yao-care](https://github.com/yao-care) | repo 部署帳號（見主機手冊） | — | 開源露出、`sameAs` 互連 |

三節點互相指認：**Wikidata ⇄ 官網 ⇄ Google 商家**（GEO 的實體錨點，勿拆斷）。

---

## § 各平台：怎麼看成效 / 怎麼更新

### 1. 搜尋曝光（GSC）— 需求面，已即時生效
- **看成效**：`./node_modules/.bin/tsx scripts/gsc.ts` → 列出搜尋查詢/頁面、每議題搜尋字（限 `www.yao.care` page filter，因資源是 `sc-domain`）。
- **sitemap 要逐站維護**：網域資源只整合驗證/報表，各子網域要有自己的 sitemap + robots（`Sitemap:` 指自己）。目前已提交 **35 個**（www + 30 國 TxGNN + smart-func/geri/pedi-cds + sign）。`huatuo.ai` 刻意不收錄、goalkeeper（API）不需。
- **更新**：新增子站要在 GSC 提交該站 sitemap；用同把 SA 金鑰可程式化提交（見 `gsc.ts`）。

### 2. 流量與讀者回饋（GA4）— 品質面，資料回流中
- **看成效**：`./node_modules/.bin/tsx scripts/ga-insights.ts`（印報告 + 重產 `reports/news-insights.json`）。週一 03:00（台北）cron 自動跑，log `/var/log/yaocare-ga.log`。
- **怎麼解讀**：計分用**完成率**（read_complete / page_view）非絕對數，貝氏收縮防小樣本雜訊、比全站平均、只加重不懲罰。`enoughData=false` 或某 target `weight=1` ＝ 資料未達門檻、屬正常。
- **現況**：互動事件埋點 **2026-06-16 才修好**（先前 `gtag` 沒掛上 window，只有 page_view 進得來）→ 品質訊號（`quality.readComplete`）約該日起才累積。GSC 需求訊號早已生效。
- **這如何回頭影響發文**：見下方「§ 成效如何回饋自動發文」。

### 3. 即時收錄（IndexNow）
- 每日部署後自動 POST 當天變動的**可索引**文章 URL（共用 `src/news.policy.mjs` 的 relevance 門檻，不送低相關文）。提交失敗不阻擋部署。
- **換金鑰要兩邊一起改**：`public/<KEY>.txt` 檔名 ＋ `scripts/indexnow.mjs` 的 `KEY` 常數。

### 4. 實體權威（Wikidata / Google 商家 / GitHub）
- **Wikidata**：條目已具備統編、成立日、產業、官網、GitHub 等 claims。重跑充實：`./node_modules/.bin/tsx scripts/wikidata-enrich.ts --dry-run`（預覽）/ 去掉 `--dry-run`（套用）。細項清單見 **`docs/wikidata-enrichment.md`**。
- **Google 商家檔案**：官網欄位雙向已填；待充實類別、營業時間、簡介、相片、貼文、評論（人工/API）。
- **NAP 一致性**：公司名/地址/電話在所有平台**字字一致**（見 `docs/offsite-copy-pack.md` 標準資料卡）。

### 5. LLM 推薦力（GEO）— 總帳在 `GEO-CHECKLIST.md`
- 站內技術（schema、llms.txt、soft-404、robots 歡迎 AI 爬蟲、glossary/guides）與實體權威**已完成 19 項**。
- **最高槓桿待辦＝站外第三方提及**（別人引用你才是 LLM 主動推薦的根本動力）：見下「§ 站外曝光素材」。

---

## § 站外曝光素材（拿了就用）

這些是**情境 B 的執行彈藥**，把現成文案貼到外部平台即可（皆已與官網 / Wikidata / llms.txt 同調、NAP 一致）：

| 檔案 | 內容 | 何時用 |
|------|------|--------|
| `docs/directory-list.md` | 要登哪些目錄（LinkedIn/Crunchbase/FINDIT/Product Hunt/G2…）＋優先序 | 要擴增「別人提到你」的可信來源時 |
| `docs/offsite-copy-pack.md` | 每個欄位的現成文案（中英都備，英文尤重要） | 申請目錄/建公司頁時逐欄貼上 |
| `docs/partner-linking.md` | 給合作夥伴貼的介紹文（換反向連結） | 與導入/學術/通路/公協會洽談時 |
| `docs/press-release.md` | 新聞稿範本（綁時間點最易被報） | 產品上線/里程碑/合作簽署 |

---

## § 成效如何回饋自動發文（B → A 的接點）

對外平台的**成效會自動回頭影響選題與寫作**（閉環），但**機制細節在 `CLAUDE.md`**，這裡只給對外視角：

1. `scripts/ga-insights.ts` + `scripts/gsc.ts` 把 GA 完成率 / CTA 率 + GSC 搜尋需求 → 寫成 `reports/news-insights.json`（gitignored）。
2. 每日 `scripts/fetch-news.ts` 讀它：高需求議題在全域選題**加分**，並把**讀者真實搜尋字注入 filter/writer**。
3. 無訊號/資料不足時，選題與寫作等同原行為（安全降級）。

> 想調「對外曝光策略」（哪些題目該多寫、引用價值傾斜）→ 改 `CLAUDE.md` 指的 `fetch-news.ts` 常數（`CITATION_PRIORITY` / `TARGET_DAILY_CAP` 等）。本檔負責記錄「改了之後成效如何」。

---

## § 最高槓桿待辦（站外，需人工 — 程式做不到）

摘自 `GEO-CHECKLIST.md`（完整清單與打勾在那）：

- [ ] **第三方獨立提及 / 報導 / 反向連結** —— LLM 主動推薦的根本動力。投稿新聞稿、目錄收錄、合作夥伴互放連結、研討會露出、開源 repo README 互連回官網。
- [ ] **Google 商家檔內容充實** —— 類別、營業時間、簡介、相片、貼文、評論。
- [ ] **（可選）具名作者升級** —— 目前機構掛名；有合適真人（醫師/負責人＋資歷）可升級 `Person` author，醫療 YMYL 權重更高。
- [ ] **（可選）Wikipedia 條目** —— 門檻高，等第三方報導累積後再評估。

> 站內技術與「機器怎麼跑」的待辦在 `CLAUDE.md` 的「§ 改進待辦」。

---

## § 相關文件

- **`CLAUDE.md`** —— 開發/維運手冊（情境 A）＋ news 引擎、GA/GSC 腳本機制、檔案結構、故障排除。
- **`GEO-CHECKLIST.md`** —— GEO/LLM 推薦力逐項勾選（站內技術 / 站外權威 / 主動推送 / 內容閘門 / 維運注意）。
- **`docs/`** —— 站外登錄與合作的現成素材（目錄清單、文案包、夥伴互連、新聞稿、Wikidata 補強）。
- **`$HOST_RUNBOOK`** —— 主機維運手冊（nginx/NPM/容器/憑證地圖）。
