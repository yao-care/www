# 藥提醒 yao.care 官網

## § 專案概要

| 項目 | 值 |
|------|-----|
| 網址 | https://www.yao.care / https://yao.care |
| 類型 | 純靜態網站（公司級多產品 hub：智慧醫療 / AI 系統 / 高齡友善 / 數位行銷） |
| 原始碼目錄 | `$WWW_REPO_DIR/`（即本目錄；與其他專案慣例一致） |
| 服務（產物）目錄 | `$WWW_SITE_DIR/`（NPM 唯讀掛載點；build 產物 rsync 到這） |
| 部署方式 | `npm run deploy` → build 到本地 `dist/` → rsync 同步到服務目錄 → nginx 直接提供 |
| 版本控制 | Git → https://github.com/yao-care/www（private） |
| Build 流程 | `npm run build` 產生本地 `dist/`，再 rsync 到 `$WWW_SITE_DIR/`（`npm run publish` 或一鍵 `npm run deploy`） |
| 技術棧 | Astro 5 + Tailwind v4 + D3 v7 + TypeScript |
| NPM Proxy Host ID | 46（憑證 ID 58） |
| 主機維運手冊 | `$HOST_RUNBOOK` |

## § 改版 SOP（最常用）

從乾淨狀態開始改版的標準流程：

```bash
cd $WWW_REPO_DIR

# 0. 確認狀態乾淨、在 main、與遠端同步
git status               # 應該是 clean
git pull                 # 拉同事的更新（如果有）

# 1. （可選）開分支
git checkout -b feature/<topic>

# 2. 本機即時預覽（HMR，不影響線上）
npm run dev              # http://localhost:4321
# 編輯 src/components/*.astro 或 src/pages/index.astro
# 改完後 Ctrl+C 結束 dev server

# 3. build + 發佈 → 上線（一鍵）
npm run deploy           # = astro build && rsync dist/ → $WWW_SITE_DIR/
curl -sI https://www.yao.care/ | head -3   # 驗證 200

# 4. Commit + push
git add -A
git -c user.email="$OWNER_EMAIL" -c user.name="LightChang" \
    commit -m "..."
git push                 # main 直推，或 push -u origin <branch> + PR
```

> ⚠ **原始碼在 `$WWW_REPO_DIR`，產物在 `$WWW_SITE_DIR`**（NPM 掛載點）。兩者已分離 —— 改完 `src/` 只 `npm run build` 還不夠，要 `npm run deploy`（或 build 後 `npm run publish`）把 `dist/` rsync 到服務目錄才會上線。
>
> ⚠ **不要手動編輯產物目錄 `$WWW_SITE_DIR/`**。下次 deploy 會被 `rsync --delete` 覆蓋。本地 `dist/` 同理（gitignored）。
>
> ⚠ **沒設定 git global identity**。每個 commit 都要帶 `-c user.email=... -c user.name=...`，或在這個 repo 設 `git config user.email/name`。

## § 重要事實

### nginx 掛載點
`$PLATFORM_DIR/docker-compose.yml` line 38 把 `$WWW_SITE_DIR`（整個服務目錄，**非** `dist/` 子層）掛進 NPM 容器唯讀為 `/data/static-sites/www.yao.care`。改 mount 路徑要 `cd $PLATFORM_DIR && docker compose up -d npm` 重建容器。平時 `npm run deploy`（rsync 進這個目錄）**不需動容器**。

### LFS（簡報檔）
46MB 的 `public/藥提醒Line民眾服務.ppsx` 透過 Git LFS 管理。clone 後若沒看到實檔，跑 `git lfs pull`。`.gitattributes` 已設定 `*.ppsx` 走 LFS。

## § News 議題追蹤模組（自動議題評論引擎）

`/news/` 區塊每天自動抓 Google News、由 Claude 生成「議題分析 + 設計回應」對照文章，每篇都連回對應產品頁。**這是這個 repo 跑得最多的東西**，但 `src/` 與 `dist/` 都由 cron 自動更新，平時不用手動碰。

### 設定（單一 source of truth）
`src/news.config.ts` — 12 個 target（11 產品 + `marketing`），每個 target 定義：
- `queries`: Google News RSS 搜尋關鍵字
- `voicePoints`: writer 可參考的「我們關心的痛點」
- `proofPoints`: 白名單 — `designResponse` 段落只能引用這些事實，每條附 `#N` 索引（regex guard 會檢查）
- `ctaText / ctaHref`: 文章底部 CTA
- `KEEP_PER_TARGET = 8`（檔尾）：每 target 保留最新幾則

### 內容存放
`src/content/news/<target>/<id>.json` — 走 Astro content collection，schema 定義在 `src/content/config.ts`（含 `newsBrief / issueAnalysis / designResponse / relevance / highlight / criticPasses` 等欄位與長度限制）。檔名 `<id>` 是 URL hash。

### Pipeline（`scripts/fetch-news.ts`, 622 行）
1. 對每個 target 的每個 query 抓 Google News RSS → 合併、URL 去重
2. **Filter pass**（Haiku, `claude -p`）：留下 `relevance ≥ 0.6` 的相關新聞
3. **Writer + Critic 迴圈**（Sonnet）：writer 出稿 → regex guards 預檢（`scripts/news-guards.mjs`）→ critic 審 → 通過寫檔。最多 5 次重生，仍失敗則丟棄
4. 每 target 留最新 `KEEP_PER_TARGET` 則，舊的砍掉

Prompt 模板在 `scripts/news-prompts.mjs`，CLI 旗標：`--target <slug>` / `--dry-run` / `--debug` / `--max-items <n>`。

### Cron + 自動部署
```
30 20 * * *  $WWW_REPO_DIR/scripts/fetch-news.sh
```
台灣時間 04:30 每日跑一次。`fetch-news.sh` wrapper 流程：抓新聞 → 若 `src/content/news` 有變化 → 自動 commit（作者 LightChang）+ push + `npm run build` + `rsync dist/ → $WWW_SITE_DIR/`。Log: `/var/log/yaocare-news.log`。Commit message 格式 `chore(news): auto fetch YYYY-MM-DD`。

> ⚠ wrapper 一開頭會 `unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT`，否則在 Claude Code session 內手動觸發時，子 `claude` CLI 會因為偵測到 nested session 而被擋。

### 頁面 / 元件
- `src/pages/news/index.astro` — 總覽頁（依 target/category 過濾）
- `src/pages/news/[target]/[slug].astro` — 全文頁（含 NewsArticle JSON-LD，`isBasedOn` 標明是衍生評論而非原始報導）
- `src/components/news/` — `HighlightNews` / `NewsCard` / `NewsArticle` / `ProductNews`（產品頁也會嵌相關新聞區塊）

### 手動觸發 / 除錯
```bash
cd $WWW_REPO_DIR

# 只跑單一 target，不寫檔，看完整 Claude I/O
./node_modules/.bin/tsx scripts/fetch-news.ts --target yaocare --dry-run --debug

# 完整跑（會 commit + push + build，跟 cron 一樣）
./scripts/fetch-news.sh

# 看上次 cron 結果
tail -50 /var/log/yaocare-news.log
```

## § 分析追蹤（GA4）

GA4 評估 ID `G-W7ZNBYKJHJ`（在 `src/site.config.ts` 的 `SITE.gaId`，單一 source）。
追蹤碼在 `src/components/Analytics.astro`，BaseLayout 與 ProductLayout 的 `<head>` 都引入 → 全站覆蓋；無 cookie 同意橫幅；只追蹤 www.yao.care（不跨網域）。

- **inline 腳本**（Analytics.astro）：依 `location.pathname` 分類內容、依 referrer/utm 分類來源，存 `window.__ya` 並讓首個 `page_view` 帶 `content_group / content_type / content_category / content_item` 與 user property `traffic_category / ai_source / referrer_host`。
- **`src/scripts/track.ts`**（打包 module，全站內聯）：`scroll_depth`(25/50/75/100)、`read_complete`(含 `engaged_seconds`)、`page_engagement`(離開時補送)、`cta_click`(LINE/mail/demo/github/外連)。
- 內容分類靠 **URL 路徑推導**（零per-page改動）：`/news/<target>/<slug>`→議題追蹤、`/guides`、`/glossary`、`/{medical|ai|care}/<product>`。
- 來源「AI 助理」涵蓋 chatgpt/perplexity/gemini/copilot/claude 等 host 或 utm_source。
- **GA4 後台需手動設**：自訂維度（content_type/category/item、scroll_percent、referrer_host、ai_source、link_domain、cta_type；user-scope traffic_category）、自訂指標 engaged_seconds、關鍵事件 read_complete/cta_click、自訂管道群組「AI Assistants」。
- 加新事件/改分類：只動 `Analytics.astro`（分類）與 `scripts/track.ts`（事件）。

### B 回饋迴路（依讀者喜好自動選題）
- **service account 金鑰**：`$YAOCARE_SECRETS_DIR/ga4-sa.json`（repo 外、600、不入版控）；Property ID `$GA_PROPERTY_ID`（非機密）。
- `scripts/ga-setup.ts`：用 Admin API 冪等建立自訂維度/指標/關鍵事件（已執行）。
- `scripts/ga-insights.ts`：用 Data API 拉報告，並產 **`reports/news-insights.json`**。計分用**完成率**(read_complete/page_view) 而非絕對數，避免長尾/爆款偏差：貝氏收縮(α=20)防小樣本雜訊、比較對象為**全站平均率**(非最大值)、單議題未達 MIN_PV(30) 不調、只加重不懲罰、地板 ×1、上限 ×3；全站量不足 → `enoughData=false` 全 1＝現狀。`reports/` 已 gitignore。
- `scripts/ga-report.sh` + cron：**台灣週一 03:00**（`0 3 * * 1`，Asia/Taipei 區段）每週重產訊號；log `/var/log/yaocare-ga.log`。
- `scripts/fetch-news.ts` 的 `loadInsights()` 讀該訊號 →（a）`selectRoundRobin` **加權選題**（高互動/高需求議題每天多分到幾篇，總量仍受 `MAX_WRITE_TOTAL` 限制）；（b）把每議題的**讀者搜尋字 + 低完成率旗標**當 `WriterHint` 傳進 `writerPrompt`。無訊號/資料不足時選題與寫作都等同原行為。
- **權重三訊號**（合併上限 ×3、地板 ×1）：品質級距（GA 完成率，貝氏收縮、相對全站平均）＋ CTA 加成（GA cta 率，B）＋ 需求機會（GSC 高曝光但排名差/低 CTR，已生效）。
- **`scripts/gsc.ts`**：Search Console API（同金鑰、scope webmasters；資源 `sc-domain:yao.care` 故加 `www.yao.care` page filter）→ 搜尋查詢/頁面 + 每議題搜尋字（A）。GSC 有歷史資料故需求面即刻生效；GA 品質/CTA 待累積（2–4 週）。
- **writer 洞察注入**（`news-prompts.mjs renderHints`）：A 搜尋字 + C 低完成率風格提示；明示「嚴格規則仍全部適用」，且 regex/proofPoint guards 仍為安全網。
- GSC sitemap 提交也走這把金鑰（webmasters scope，Full 權限）。

## § 檔案結構

```
$WWW_REPO_DIR/            ← 原始碼（本目錄）；產物 rsync 到 $WWW_SITE_DIR/
├── astro.config.mjs           ← Astro + sitemap + Tailwind v4 設定
├── tsconfig.json
├── package.json
├── scripts/                   ← 自動議題評論引擎（cron 觸發，見「§ News 議題追蹤模組」）
│   ├── fetch-news.sh          ← cron entry：抓新聞 → 有變化才 commit + push + build
│   ├── fetch-news.ts          ← 主流程（RSS → filter → writer + critic 迴圈）
│   ├── news-prompts.mjs       ← Claude 的 filter / writer / rewrite prompt 模板
│   ├── news-guards.mjs        ← regex 預檢（長度 / proofPoint 引用 / 標題正規化）
│   └── gen-og.mjs             ← OG 圖產生器
├── public/                    ← Astro 直接複製到 dist/ 的靜態檔
│   ├── assets/images/         ← 所有圖片
│   │   └── og/                ← 分產品 OG 圖（home/yaocare/huatuo/txgnn/func/geri/pedi/sign/care/intel/siqc/triz/goalkeeper/marketing.png）
│   ├── contents/              ← BMI/BP/GLU-AC 衛教圖
│   ├── robots.txt
│   └── 藥提醒Line民眾服務.ppsx ← LFS 管理
├── src/
│   ├── site.config.ts         ← 全站設定（公司名/title/description/keywords/NAV）
│   ├── products.config.ts     ← 四大分類 + 11 個產品定義 + medical 子分組（MEDICAL_GROUPS/group/productsByGroup）（單一 source of truth）
│   ├── seo.config.ts          ← GEO/SEO：KNOWS_ABOUT / ORG_SAME_AS / 各產品 FAQ（PRODUCT_FAQS）
│   ├── glossary.config.ts     ← 名詞解釋（10 則）：定義 + 段落 + related 產品 + 來源（GEO 用）
│   ├── guides.config.ts       ← 情境指南（7 則）：使用者搜尋原話為題 + answer-first + 工具帶入（GEO 用）
│   ├── news.config.ts         ← 12 個 news target（queries / voicePoints / proofPoints / CTA）+ KEEP_PER_TARGET
│   ├── content/
│   │   ├── config.ts          ← news collection schema（Zod）
│   │   └── news/<target>/*.json ← 自動產生的議題評論文章（cron 寫入）
│   ├── styles/global.css      ← Tailwind 入口 + 主題變數 + 共用 class
│   ├── layouts/
│   │   ├── BaseLayout.astro   ← <html> + meta + JSON-LD（Organization）+ favicon
│   │   │                         可接 ogImage / ogType / jsonLd props
│   │   └── ProductLayout.astro ← 產品詳情頁專用：含 Nav / breadcrumb / ContactMap / FooterLinks
│   ├── pages/
│   │   ├── index.astro        ← 公司 Hero + 四分類預覽 + ContactCTA + ContactMap
│   │   ├── medical/
│   │   │   ├── index.astro    ← 智慧醫療 hub（產品卡 + capability cloud + ContactMap）
│   │   │   ├── yaocare.astro  ← 藥提醒（保留舊版 D3 force graph、六大服務、carousel）
│   │   │   ├── huatuo.astro   ← AI 華佗（中醫問診 AI）
│   │   │   ├── txgnn.astro    ← TxGNN 老藥新用
│   │   │   ├── func.astro     ← Smart Func 成人功能健康評估（assessment 子分組）
│   │   │   ├── geri.astro     ← Smart Geri 高齡周全性評估（assessment；亦跨列於 /care）
│   │   │   └── pedi.astro     ← Smart Pedi 兒童發展評估（assessment）
│   │   ├── ai/
│   │   │   ├── index.astro    ← AI 系統 hub
│   │   │   ├── intel.astro    ← 情報自動化系統
│   │   │   ├── siqc.astro     ← 稽核 / 評鑑 AI 系統
│   │   │   ├── triz.astro     ← TRIZ 創新方法 AI 知識庫
│   │   │   └── goalkeeper.astro ← 醫療 AI 內容合規守門 API（B2B；private repo，live goalkeeper.yao.care）
│   │   ├── care/             ← 高齡友善（耀・陪伴 wordmark）
│   │   │   ├── index.astro    ← 高齡友善 hub（sign 卡 + Geri 交叉卡 + GcmClosedLoop）
│   │   │   └── sign.astro     ← 長者友善無接觸報到
│   │   ├── marketing.astro    ← 數位行銷整頁（5 環閉環 + D3 圖表）
│   │   ├── news/
│   │   │   ├── index.astro            ← 議題追蹤總覽（依 target / category 過濾）
│   │   │   └── [target]/[slug].astro  ← 全文頁（NewsArticle JSON-LD）
│   │   ├── glossary/
│   │   │   ├── index.astro            ← 名詞解釋總覽（DefinedTermSet）
│   │   │   └── [slug].astro           ← 名詞頁（DefinedTerm + Breadcrumb；交叉連回產品）
│   │   ├── guides/
│   │   │   ├── index.astro            ← 情境指南總覽（ItemList）
│   │   │   └── [slug].astro           ← 情境題頁（Article + FAQPage + Breadcrumb；連回產品/名詞）
│   │   └── llms.txt.ts               ← /llms.txt（llmstxt.org）build 時自動生成，給 LLM 的站點地圖
│   └── components/
│       ├── Nav.astro          ← 固定頂部導覽 + 漢堡選單
│       ├── ContactCTA.astro   ← #cta 首頁公司層級 LINE 加好友 + mailto（與團隊聊聊）
│       ├── CareTag.astro      ← 四條業務線的 yao・care 同音 wordmark pill（藥/鑰/耀/邀・X (care)）
│       ├── ContactMap.astro   ← #contact（地址 + Google Maps；幾乎所有頁底都會放）
│       ├── FooterLinks.astro  ← 全站 footer：多欄連結（醫療/AI/高齡友善/行銷/聯絡）+ 回頂部
│       ├── products/
│       │   ├── ProductCard.astro      ← 各分類 hub + 首頁預覽共用的卡片（href 依 product.category 解析）
│       │   ├── ProductHero.astro      ← 產品詳情頁 hero
│       │   ├── ProductCta.astro       ← 產品詳情頁底部 LINE CTA
│       │   ├── CapabilityCloud.astro  ← hub 頁的能力雲標籤
│       │   └── GcmClosedLoop.astro    ← GCM SMART on FHIR 收案閉環 panel（用於 /medical 評估區塊、/care、三個 CDS 頁）
│       ├── news/
│       │   ├── HighlightNews.astro    ← 議題總覽頁上方精選
│       │   ├── NewsCard.astro         ← 列表卡片
│       │   ├── NewsArticle.astro      ← 全文頁主體
│       │   └── ProductNews.astro      ← 嵌在產品詳情頁的相關議題
│       └── (yaocare 專屬，仍只在 medical/yaocare.astro 引用)
│           SmartHealthcare / Advantages / SixServices / Verification / Screenshots
└── dist/                      ← 本地 build 產物（gitignored）；deploy 時 rsync 到 $WWW_SITE_DIR/（後者才是 nginx mount 點）
```

> 改文案優先順序：先看 `src/products.config.ts`（產品標題、描述、bullets、CTA 都在這） → 再看對應頁面 `src/pages/<category>/<slug>.astro` → 全站共用字串看 `src/site.config.ts`。

## § 常見任務

### 修改文案
- 區塊 → 對應 `src/components/*.astro` 元件
- 全域字串（站名、聯絡、外站連結）→ `src/site.config.ts`
- Build：`npm run build`

### 修改外觀
- 主色 `#c6461c` 已注入 Tailwind theme（`var(--color-brand)`）
- 共用 button class（`.btn-line`、`.btn-brand`）在 `src/styles/global.css`
- 元件內樣式直接用 Tailwind utility classes

### 新增頁面
- 建 `src/pages/<route>.astro`，import `BaseLayout` 包起來
- @astrojs/sitemap 會自動把它加進 `sitemap-index.xml`
- Build 後 `dist/<route>.html` 會出現

### 替換圖片
- 直接覆蓋 `public/assets/images/` 對應檔名（路徑不變）
- OG 分享圖：`public/assets/images/blog/share.jpg`
- Logo：`public/assets/images/logo.png`（含 `logo_2x.png`）

### 換 .ppsx 簡報
- `git rm public/藥提醒Line民眾服務.ppsx`
- 把新檔放到 `public/藥提醒Line民眾服務.ppsx`
- `git add` → LFS 自動接管（見 `.gitattributes`）

### 改 D3 互動
- `SmartHealthcare.astro` 末尾的 `<script>` 標籤是 force graph 邏輯
- `TxGNN.astro` 末尾的 `<script>` 標籤是計數動畫邏輯
- D3 已 `import * as d3 from 'd3'` 直接用

### 調整 news 抓取範圍 / 角度
- 加搜尋關鍵字、改痛點 / 設計 proof：編 `src/news.config.ts` 對應 target
- 改每 target 保留則數：`KEEP_PER_TARGET`（檔尾）
- 改 writer / critic 的 prompt：`scripts/news-prompts.mjs`
- 改長度 / proofPoint 引用規則：`scripts/news-guards.mjs` + `src/content/config.ts` 的 Zod schema 要一致
- 改完不用手動跑；cron 每天 04:30 會自動觸發，要立刻看效果可手動跑 `./scripts/fetch-news.sh`

## § 連結到的相關平台

- `https://twtxgnn.yao.care/` — 老藥新用平台（站外）
- `mailto:service@yao.care` — 客服信箱
- LINE 工程師聯絡：`https://lin.ee/1F7s4pP`

## § 驗證 / 故障排除

### Build 後驗證
```bash
npm run build
curl -sI https://www.yao.care/ | head -3                          # 200
curl -s https://www.yao.care/ | grep -oE '<title>[^<]+</title>'   # 看標題
curl -sI https://www.yao.care/sitemap-index.xml | head -2         # sitemap 正常
curl -sI https://www.yao.care/news/ | head -3                     # 議題追蹤頁
```

### News cron 沒跑 / 文章沒更新
1. `tail -100 /var/log/yaocare-news.log` — 看最後一次跑的結果與錯誤
2. `git log --oneline | grep "auto fetch"` — 看最近幾次自動 commit
3. 抓到但全被丟棄 → 多半是 critic 一直退稿，用 `--debug` 跑單一 target 看 stdout
4. 在 Claude Code session 內手動跑卡住 → 確認 `fetch-news.sh` 仍有 `unset CLAUDECODE`

### 502 / 403
1. NPM 容器是否正常：`docker ps | grep $NPM_CONTAINER`
2. 產物是否存在：`ls $WWW_SITE_DIR/index.html`（沒有 → 跑 `npm run deploy`）
3. 掛載確認：`docker exec $NPM_CONTAINER ls /data/static-sites/www.yao.care/`（應直接看到 index.html，非 dist/ 子層）

### 想看 NPM Advanced Config
透過 SSH tunnel 連到 NPM Web UI（見 `$HOST_RUNBOOK` 的 NPM 章節），Proxy Host #46。

## § 改進待辦

- [x] ~~加入 git 版本控制~~（已建 yao-care/www private repo）
- [x] ~~清掉 `assets/pug/` 和 `assets/scss/` 模板殘骸~~（2026-04-28 已清）
- [x] ~~CSS / jQuery / Bootstrap 4 現代化~~（2026-04-28 改 Astro + Tailwind v4）
- [x] ~~index.html 581 行單檔拆分~~（已拆為 11 個 Astro 元件）
- [ ] 老藥新用平台統計數字（191 / 142,328 / 5）寫死在 `TxGNN.astro`，未來若要動態化可改 fetch
- [ ] 部分裝飾圖目前透過 CSS 漸層代替；如需找回原視覺效果，可從 git history 取出舊 `decor` 圖
