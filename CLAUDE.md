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
| Build gate（2026-07-17 起） | `npm run build`/`deploy` 內建 `scripts/check-internal-links.mjs`：掃 `dist/` 全部 HTML 的 href/src/meta-refresh，**站內目錄式連結缺結尾斜線或含雙斜線即 build fail**（歷史上斜線混用曾讓 GSC 把同頁拆成雙網址）。被擋時修 href 來源（config/元件/頁面），勿改 dist。NAV 已拆至 `src/nav.config.ts`（開放給 seo-ops 反思白名單） |
| Build gate（2026-07-28 起） | `npm run build` 第三段跑 `scripts/check-nav.mjs`（單獨跑：`npm run check:nav`）：**主導覽 `src/nav.config.ts` 的 NAV 不得指向已凍結/已收斂路由**（目前禁 `/news/`）。存在理由：`nav.config.ts` 在 seo-ops reflect 白名單內，反思每天有權改主導覽，純靠 playbook 文字約束不可靠；反思/大腦 gate 都含 `npm run build`，違反即 gate fail 並自行 `git checkout -- src` 撤回（`bin/seo-reflect.sh:157-161`）。`scripts/` 與 `package.json` 都在反思 scope 外，故 gate 本身動不到。要退役規則：改 `FORBIDDEN_HREFS` 並同步 `$SEO_OPS_DIR/playbooks/yao.care.md` |
| Build gate（2026-07-20 起） | `npm run build` 最前段先跑 `scripts/check-design.mjs`（**設計規範守門 v2**，見下「§ 修改外觀」五條）；違規即 build fail。`npm run deploy` 亦改為經由 `npm run build`（同日修，守門不可繞過）。存量 64 處硬編色以 `LEGACY_COLOR_BUDGET` per-檔凍結（禁再擴充），清理後同步下修預算 |
| Build gate（2026-09-05 起） | `npm run build` 第三段跑 `scripts/check-ai-voice.mjs`（單獨跑：`npm run check:ai-voice`，盤點全部命中：`npm run check:ai-voice:all`）：**去 AI 味守門（文案層）**，掃 `.astro` / `*.config.ts` 裡人看得到的中文文案。抓的是**結構性 AI 腔**（破折號當萬用接續、`×` 連接概念、`→` 串流程、「從 A 到 B」涵蓋句型、「閉環／一條龍／生態系」收尾、「以 X 為核心」、「可 A、可 B、可 C」三連、「被 A、被 B」排比），與 `style-guide.mjs` 的**逐字口頭禪**黑名單互補。詳見下「§ 去 AI 味守門（文案層）」 |
| 技術棧 | Astro 5 + Tailwind v4 + D3 v7 + TypeScript |
| NPM Proxy Host ID | 46（憑證 ID 58） |
| 主機維運手冊 | `$HOST_RUNBOOK` |

## § 文件分工（先讀這段，再決定看哪一份）

本專案維護分兩種情境，兩份主文件各管一邊；**不論你先讀到哪一份，照下表跳到對的地方**：

| 你想做的事 | 看哪份 |
|-----------|--------|
| **A. 開發／優化專案** — 改版面/文案、build & deploy、改設定、新增頁面、排錯（502/build）、news 引擎**機制與除錯**、cron/腳本內部 | **本檔 `CLAUDE.md`**（Claude session 自動載入） |
| **B. 對外平台互動與曝光成效** — GEO/LLM 推薦力、GSC/GA4/Bing/IndexNow、Wikidata、Google 商家、站外目錄/合作夥伴/新聞稿、**看曝光到哪了** | **`README.md`** ＋ `GEO-CHECKLIST.md` ＋ `docs/` |

> 兩份文件最上方都有「**這段相同的路由**」；更新分工時兩邊一起改，避免走散。
> 界線速記：**「機器怎麼跑」在本檔；「對外做了什麼、效果如何」在 `README.md`。** 本檔下文的 GA4 / GSC / SEO / GEO 章節講的是**腳本與引擎機制**；對應的「對外帳號總表、看成效指令、站外曝光素材」請看 `README.md`。

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
npm run deploy           # = npm run build（含設計守門+內鏈檢查）&& rsync dist/ → $WWW_SITE_DIR/
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

> 🔄 **2026-07-15 Phase 2 產線反轉（內容重構）**：引擎預設改為 **feed 模式**（`NEWS_MODE=feed`）——通過 filter 的新聞**不再寫成獨立文章頁**，改寫成主題頁「近期動態」條目（`src/content/topicFeed/<topic>/<id>.json`，一句 takeaway＋原文連結，日上限 3（2026-08-03 由 12 調降，見下方策略註記）、target→topic 映射見 `src/topics.config.ts` 的 newsTargets）。主題頁 lastmod＝最新動態時間（astro.config 接好）。**回滾保險絲：`NEWS_MODE=legacy`** 即回舊行為。voice backfill（rewrite-news-voice）已停役（舊語料將分批 301 收斂，重刷即將退場的頁是浪費）。存量已回填每主題最近 12 篇（takeaway=newsBrief）。既有 `/news/` 頁面照常 serve，收斂見重構計畫 Phase 4。本節以下的 writer/critic 三段文流程描述僅適用 legacy 模式。
> 📦 **Phase 4 批次一（2026-07-15）**：`sign/func/triz/siqc` 四桶共 123 篇已自 build 移除（git 歷史保留），舊網址由 NPM host #46 的 **Advanced Config** 301 到對應主題頁（該設定同時收納 soft-404 修正，**已存 DB、UI 重存不再遺失**——sed 產出檔的技術債已清）。觀察一週 GSC 抽查 0 soft-404，已放行批次二。
> 📦 **Phase 4 批次二（2026-07-26）**：`yaocare/pedi/huatuo` 三桶共 127 篇（48/40/39）已自 build 移除（build 頁數 389→262），301 對應 `/topics/medication-safety/`、`/topics/child-development/`、`/topics/explainable-medical-ai/`（同存 host #46 advanced_config，批次一規則保留不動）。高曝光承接：用 GSC 近 28 天曝光查 pedi×2／huatuo×5（含 1 篇 Phase 2 已回填）補進對應 `topicFeed`；**yaocare 該 28 天窗口內無頁面曝光明顯高於其他者（最高僅 7，分布平滑），依批次一「弱桶不強補」precedent 判定 0 篇**。踩坑記錄：`child-development`／`explainable-medical-ai` 兩桶自 Phase 2（07-15）起持續有每日產線餵入，主題頁「近期動態」只顯示 `fetchedAt` 最新 10 筆——沿用批次一原始 `fetchedAt`（舊文章原始抓取時間）會被近 10 天的新產出全部擠出榜外、build 後看不到；改法＝backfill 檔的 `fetchedAt` 蓋成「本次回填時間」（`publishedAt` 仍保留原始新聞發布日，使用者看到的日期不受影響），使其重新進入前 10 榜，build 後已實測可見。觀察至 **2026-08-02**，GSC 無 soft-404 異常再放批次三（geri/intel/goalkeeper）。

> 🧭 **導覽與文案已對齊 feed 模式（2026-07-28）**：用戶回報「/news/ 好像沒在更新」——查證後確認引擎每天正常跑，只是自 Phase 2 起產出全進 `topicFeed`，`src/content/news/` 最後寫入是 2026-07-14 21:18；但**頁面文案仍宣稱「每天清晨由 AI 自動產出」＝不實陳述**，主導覽也還把訪客導去凍結區。已改：`src/nav.config.ts` 移除 `/news/` 項、原「議題追蹤」標籤改指 `/topics/`（合併掉原「主題」項，nav 仍 7 項）；`/news/` 頁 title/H1/breadcrumb/描述一律加「封存」並在 hero 導往 `/topics/`；`/topics/` hero 補「每天彙整近期動態」＋反向連封存頁（保留爬蟲路徑）；`FooterLinks`（議題追蹤→/topics/、議題追蹤封存→/news/）、`HighlightNews`、`ProductNews` 三處移除「每日/每天自動」字樣。⚠ `nav.config.ts` 在 seo-ops reflect 白名單內，反思本有權改回去 → **同日補上 `scripts/check-nav.mjs` build gate 機械擋**（見上表 2026-07-28 Build gate），並在 seo-ops 側同步三處：playbook 策略區塊【用戶拍板 2026-07-28｜勿再提】、`reflect:scope` 註記、`sites/yao.care.json` 的 `flagship` 把「議題追蹤」從 `/news/` 換成 `/topics/`（否則日報天天把凍結頁當旗艦頁報，等於持續餵反思「這頁該有導覽入口」的訊號）。緣由與教訓記在 `$SEO_OPS_DIR/MAINTENANCE.md` §八 教訓 15。

`/news/` 區塊原本每天自動抓 Google News、由 Claude 生成「議題分析 + 設計回應」對照文章，每篇都連回對應產品頁；**Phase 2（2026-07-15）起改為 feed 模式，此區塊不再新增文章**（現為歷史封存，剩 geri/goalkeeper/intel/marketing/txgnn 五桶 202 篇，批次三將再收斂 geri/intel/goalkeeper）。每天的產出改進 `src/content/topicFeed/`。`src/` 與 `dist/` 都由 cron 自動更新，平時不用手動碰。

### 設定（單一 source of truth）
`src/news.config.ts` — 12 個 target（11 個有對外站的產品 + `marketing`；gcm 後端不開 news target），每個 target 定義：
- `queries`: Google News RSS 搜尋關鍵字
- `voicePoints`: writer 可參考的「我們關心的痛點」
- `proofPoints`: 白名單 — `designResponse` 段落只能引用這些事實，每條附 `#N` 索引（regex guard 會檢查）
- `ctaText / ctaHref`: 文章底部 CTA

> **策略（2026-06）：精準少量 + 永久累積。** 文章是常青議題分析，**不再砍文**（已移除 `pruneOld` / `KEEP_PER_TARGET`），長期累積以建主題深度與 SEO 權重。每天**少寫、寫準、不重複**（門檻 `RELEVANCE_THRESHOLD=0.80`（2026-08-03 由 0.72 調升）、feed 日上限 `MAX_FEED_TOTAL=3`（同日由 12 調降）、每日 `MAX_WRITE_TOTAL=5`（legacy 模式用）、每 target `PER_TARGET_DAILY_CAP=2`（同日由 3 調降），皆 `fetch-news.ts` 檔內常數）。
> **2026-08-03 調量拍板（用戶核可）**：GSC 近月數據顯示站流量進入高原期（週點擊 7 月中 59 見頂後回落 28–35），且 news/topics 動態的邊際點擊趨零（top 25 佔比約一成）——撐流量的是常青頁。故 feed 產量由每天 2–8 則收斂為 **≤3 則精選**，省下的優化額度移往常青頁（glossary/guides/topics）。dreamer868 同日評估為**不降量**（其判決故事頁是成長主力）。

### 內容存放
`src/content/news/<target>/<id>.json` — 走 Astro content collection，schema 定義在 `src/content/config.ts`（含 `newsBrief / issueAnalysis / designResponse / relevance / highlight / criticPasses` 等欄位與長度限制）。檔名 `<id>` 是 URL hash。

### Pipeline（`scripts/fetch-news.ts`）
1. 對每個 target 的每個 query 抓 Google News RSS → 合併、URL 去重
2. **Filter pass**（Haiku, `claude -p`）：留下 `relevance ≥ RELEVANCE_THRESHOLD`(0.80) 的相關新聞；**GSC 真實搜尋字（topQueries）注入 filter prompt**，讓選題貼近讀者需求而非只看內容相關
3. **題目層級去重**：與該 target **既有語料**標題做 bigram Jaccard 比對（門檻 `DUP_TITLE_THRESHOLD=0.6`），近似重複者跳過（log `DUP`）—— 不砍文後避免薄內容累積
   - 🐞 **2026-09-05 修一個從 Phase 2 起就存在的 bug**：`existingCorpus()` 只讀 legacy 的 `news/<target>/`，但 feed 模式（07-15 起的預設）產出在 `topicFeed/<topic>/` —— **去重比對的是一份不再成長的語料，等於對 feed 產出沒有去重**。Phase 4 又刪掉 yaocare/pedi/huatuo/func/sign/triz/siqc 七桶的 `news/`，那幾個 target 的既有標題直接歸零、完全零去重。後果：`topicFeed` 累積出 **21 組近似重複、29 則多餘**（佔 11.5%），且集中在被刪桶對應的主題（child-development 7 組、explainable-medical-ai 4 組、preventive-function-health 3 組）。修法：feed 模式改讀 `TARGET_TOPIC` 對應的 `topicFeed/<topic>/`；依**主題**而非 target 比對也更正確（多個 target 餵同一頁，讀者看到的是同一頁）。**門檻 0.6 不動**——實測它對存量重複可擋下 20 對，壞的是語料來源不是門檻。教訓：**改產出目錄時，要一併檢查所有「讀既有產出」的地方**（去重、統計、排序）。
   - 🐞 **2026-09-09 補修上一版的回歸**：上一版把 feed 模式改成「**只**讀 `topicFeed`」，但 legacy `news/<target>/` 還有 202 篇**仍在線上 serve** 的文章（txgnn/marketing/intel/geri/goalkeeper 五桶未 301）。只讀 feed → 同一則新聞同時出現在主題動態與既有 `/news/` 文章頁；09-06 那次 cron 實際產生 2 則（txgnn 的 `3888ff4e1e`、`80ad505121`）。修法＝**兩份語料用途拆開**：`urls` 取**聯集**（同一 URL 全站只該出現一次，精確比對不會誤殺）、`titles` **只取 feed**（標題近似比對若含幾個月前的封存文，會把當下合理的新報導誤判成重複）。教訓：**「改讀 A 不等於停讀 B」——兩份語料若用途不同，要分欄位決定各自的來源，不是二選一。**
   - ⚠ **兩批重複待人工拍板清除**（皆僅修根因止血，未刪檔）：(a) 同主題近似標題 **21 組 29 則**（清法：同主題內 `titleSimilarity ≥ 0.6` 分組，每組留 relevance 最高者）；(b) 與 legacy `/news/` 同 URL **55 則**——其中 **53 則是 2026-07-29 Phase 2 回填時刻意複製的**（當時的設計，非 bug），**2 則**是上述回歸產生的。屬內容刪除，需人工拍板。
4. **需求感知全域選題**（`selectDemandAware`）：所有 target 候選彙成單池，按 `relevance + 需求加成(命中搜尋字) + (GA/GSC權重−1)×係數 + 引用價值先驗(CITATION_PRIORITY)` 全域排序取前 `MAX_WRITE_TOTAL`，並限每 target ≤ `min(PER_TARGET_DAILY_CAP, 該 target 日上限 TARGET_DAILY_CAP)`。零需求且無高相關候選的 target 當天自然寫 0 篇
   - **引用價值先驗（GEO，2026-06-17）**：`CITATION_PRIORITY` 給「民眾真的會問 LLM 且有對外站」的消費者醫療題目加分（yaocare/geri/func/pedi +0.25、sign +0.2、huatuo/txgnn +0.1），純 B2B/無對外站的內部產品降權（siqc/intel/triz/goalkeeper −0.3）並用 `TARGET_DAILY_CAP` 收緊日上限至 1（marketing 2）。目的：把每日有限額度導向會被 LLM 引用的健康主題，避免再像過去那樣 siqc(59)/intel(28)/triz(22) 灌爆語料。**靜態先驗 + 動態學習**：GA/GSC 權重仍疊加其上，日後若資料證明某 B2B 題目有讀者可部分抵銷。
5. **Writer + Critic 迴圈**（Sonnet）：writer 出稿（可帶讀者搜尋字/低完成率洞察）→ regex guards 預檢（`scripts/news-guards.mjs`）→ **critic LLM 語意複審**（已重新開啟；critic 掛掉時 fail-open，已過 regex 即接受）→ 不過則 rewrite。最多 `MAX_WRITER_ATTEMPTS=3` 次，仍失敗則丟棄
6. **不再 prune**（永久累積）

Prompt 模板在 `scripts/news-prompts.mjs`，CLI 旗標：`--target <slug>` / `--dry-run` / `--debug` / `--max-items <n>`。

### Cron + 自動部署
```
30 20 * * *  $WWW_REPO_DIR/scripts/fetch-news.sh
```
台灣時間 04:30 每日跑一次。`fetch-news.sh` wrapper 流程：**取 seo-ops 共用鎖** → 抓新聞 → 若 `src/content/news` 有變化 → 自動 commit（作者 LightChang）+ push + `npm run build` + `rsync dist/ → $WWW_SITE_DIR/` → **IndexNow 即時通知**。Log: `/var/log/yaocare-news.log`。Commit message 格式 `chore(news): auto fetch YYYY-MM-DD`。實測全程 **45~50 分鐘**（07-12 44 分 / 07-13 45 分 / 07-15 50 分），不是一瞬間。

> 🔒 **開頭的 `flock` 不可拿掉（2026-07-15 新增）**：本腳本與 seo-ops 的反思（台 04:55）/大腦（台 05:30）**共寫同一個工作樹**，三方靠 `/tmp/seo-claude-yao.care.lock`（fd 200）序列化。
> 拿掉的後果有實例：本腳本 04:30→05:20 的窗把反思 04:55 整個包住 → 反思護欄看到本腳本新生的 `src/content/news/**` 判定「改動越界」→ **反思 07-10~07-15 連 5 天全被回退**，且反思回退用的 `git clean -fdq` 把本腳本剛寫出、尚未 commit 的文章**刪掉 3 篇**。
> 改本腳本或改 cron 時間時，鎖檔名與 fd 必須與 `$SEO_OPS_DIR/bin/seo-reflect.sh`、`seo-brain.sh` 完全一致。詳見 `$SEO_OPS_DIR/MAINTENANCE.md` §二。

> **IndexNow**（`scripts/indexnow.mjs`）：部署後把當天變動的文章 URL POST 給 `api.indexnow.org`（Bing/Yandex/Naver/Seznam 同 endpoint），讓新內容「當天」被收，而非等爬蟲。金鑰檔 `public/1be01cbeef8111fdeccbc36e95ec07c1.txt`（檔名＝金鑰，build 後出現在網站根目錄供驗證；換金鑰要同步改 `indexnow.mjs` 的 `KEY` 常數）。**只提交可索引文章**（共用 `src/news.policy.mjs` 的 relevance 門檻，與 noindex 政策一致，不送低相關文）。提交失敗不阻擋部署。

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

## § 去 AI 味 + 內容更新訊號（freshness）

把語料「去掉 AI 腔、改寫成人話」，同時當「持續內容更新」來做，讓 Google 收到新鮮度訊號。

- **文風單一 source of truth**：`scripts/style-guide.mjs` —— `BANNED_PHRASES`(口頭禪 regex)、`STYLE_RULES`(注入 prompt 的正向文風指南)、`checkVoice`(guard 規則 V)、`TAKEAWAY_MOULDS`/`checkTakeaway`(feed takeaway 收尾模具)、`VOICE_REV`(文風版號)。writer / critic / rewrite / guard / backfill 全共用，不 drift。
- **feed takeaway 收尾模具（2026-09-05）**：`takeawayPrompt` 原本明文要求「再半句點出與主題的關聯」，模型的預設交法就是同一種收尾——存量 252 則裡 **35 則（13.9%）**落在「…與 X 相呼應／相通／相近」「…正是 X 的核心」「…的方向。」「這類做法…」這幾個模子裡。已改兩處：(a) prompt 改為關聯**不必每則都寫**（寫不出就停在事實上，寧可短）並逐條列出禁止的收尾套路；(b) `fetch-news.ts` 的 takeaway 驗證迴圈接上 `checkTakeaway`，命中即重寫，嘗試次數 2→3（守門收緊後多給一次機會，避免整則被丟）。⚠ 這些詞（呼應／相通／方向）在一般行文是正常中文，故**只用於 takeaway**，沒放進全站 `BANNED_PHRASES`。
- **存量已清＋規則校準（2026-09-05 同日第二輪，用戶指示「全部都修」）**：(a) 34 則收尾模具、3 則舊 `findTics` 命中（結構性根源／本質上是／不是…而是）就地改寫，只換 `takeaway`，`fetchedAt`／`publishedAt`／`url` 一字不動（改 `fetchedAt` 會打亂主題頁排序，見 Phase 4 批次二踩坑）。(b) **移除 `這類[^。]{0,16}(做法|現象|案例|情況)` 規則**——存量實測它唯一的獨立命中是「這類『先有療效、後補機轉』的案例…」，那是好句子，純誤傷；真正的模具在收尾關聯句，其餘四條就抓得到。prompt 的禁止清單同步移除該項。(c) 存量 252 則現為：收尾模具 0、`findTics` 0、長度違規 0。
- **半形標點（2026-09-05）**：模型偶爾在中文句中吐半形 `,` `;` `:`（存量 topicFeed 24 則、79 處），中文排版讀起來就是不對。`scripts/zh-tw.mjs` 新增 `fixPunct()` 並併入 `fixTerms()`（後者已套用在每則 takeaway 與 news 三段），故往後自動正規化。**只換夾在兩個中文字之間的**，`1,507`、`Bakker, MIT` 不受影響（已實測）。存量 24 則已回填；已封存待 301 的 `src/content/news/`（15 檔 208 處）依「不重刷即將退場的頁」拍板不動。
- **新文章**：`news-prompts.mjs` 的 writer 已去掉公式範例並注入 `STYLE_RULES`；critic 加 R10–R12(公式開頭/拔高總結/口頭禪)；`news-guards.mjs` 接 `checkVoice`。新文寫入即蓋 `voiceRev=VOICE_REV`、`updatedAt`，不會被 backfill 重跑。
- **既有語料 backfill**：`scripts/rewrite-news-voice.ts` —— 只改 `voiceRev < VOICE_REV` 的舊文、**最舊先刷**、**每天 15–18 篇**(`VOICE_PER_RUN`/`VOICE_DAILY_CAP`)、Sonnet 5 重寫後過全部 guards、保留事實/proofPoint/字數/繁中。**原地更新、同 URL、不刪文**；改完蓋 `updatedAt`。由 `fetch-news.sh` 在抓新聞後呼叫，與新文同批 commit/build/deploy/IndexNow。手動：`--dry`/`--limit N`/`--target`/`--all`/`--debug`。
- **更新訊號(給 Google)**：`updatedAt` →（a）`[slug].astro` 的 NewsArticle JSON-LD `dateModified`；（b）`astro.config.mjs` sitemap **per-article `<lastmod>`**(非 build 時間)。Google 不收 IndexNow，靠這兩個 + 自然重爬;IndexNow 順帶涵蓋 Bing/Yandex 等。
- **大腦不破壞文風**：`seo-brain-cron.sh` prompt 已注入文風要求 + 改頁時蓋 `updatedAt`。
- 調文風規則 → 改 `style-guide.mjs`;若大改 → `VOICE_REV +1`，340+ 篇會再分批重刷一輪。

## § 分析追蹤（GA4）

> 📤 **對外面向看 `README.md`**：GA4/GSC 帳號總表、看成效指令、`news-insights.json` 怎麼解讀、曝光現況。本節只講**埋點與腳本機制**。

GA4 評估 ID `G-W7ZNBYKJHJ`（在 `src/site.config.ts` 的 `SITE.gaId`，單一 source）。
追蹤碼在 `src/components/Analytics.astro`，BaseLayout 與 ProductLayout 的 `<head>` 都引入 → 全站覆蓋；無 cookie 同意橫幅；只追蹤 www.yao.care（不跨網域）。

- **inline 腳本**（Analytics.astro）：依 `location.pathname` 分類內容、依 referrer/utm 分類來源，存 `window.__ya` 並讓首個 `page_view` 帶 `content_group / content_type / content_category / content_item` 與 user property `traffic_category / ai_source / referrer_host`。
- **`src/scripts/track.ts`**（打包 module，全站內聯）：`scroll_depth`(25/50/75/100)、`read_complete`(含 `engaged_seconds`)、`page_engagement`(離開時補送)、`cta_click`(LINE/mail/demo/github/外連)。
- 內容分類靠 **URL 路徑推導**（零per-page改動）：`/news/<target>/<slug>`→議題追蹤、`/guides`、`/glossary`、`/{medical|ai|care}/<product>`。
- 來源「AI 助理」涵蓋 chatgpt/perplexity/gemini/copilot/claude 等 host 或 utm_source。
- **GA4 後台自訂定義**：自訂維度（content_type/category/item、scroll_percent、referrer_host、ai_source、link_domain、cta_type、link_content、app_route；user-scope traffic_category）、自訂指標 engaged_seconds、關鍵事件 read_complete/cta_click/generate_lead —— **已用 `scripts/ga-setup.ts`（Admin API）程式化建好、可冪等重跑**。唯「AI Assistants 自訂管道群組」仍須 GA4 UI 手動建（選用）。
- 加新事件/改分類：只動 `Analytics.astro`（分類）與 `src/scripts/track.ts`（事件）；要新增自訂維度則改 `scripts/ga-setup.ts` 陣列重跑。

### B 回饋迴路（依讀者喜好自動選題）
- **service account 金鑰**：`$YAOCARE_SECRETS_DIR/ga4-sa.json`（repo 外、600、不入版控）；Property ID `$GA_PROPERTY_ID`（非機密）。
- `scripts/ga-setup.ts`：用 Admin API 冪等建立自訂維度/指標/關鍵事件（已執行）。
- `scripts/ga-insights.ts`：用 Data API 拉報告，並產 **`reports/news-insights.json`**。計分用**完成率**(read_complete/page_view) 而非絕對數，避免長尾/爆款偏差：貝氏收縮(α=20)防小樣本雜訊、比較對象為**全站平均率**(非最大值)、單議題未達 MIN_PV(30) 不調、只加重不懲罰、地板 ×1、上限 ×3；全站量不足 → `enoughData=false` 全 1＝現狀。`reports/` 已 gitignore。
- `scripts/ga-report.sh` + cron：**台灣週一 03:00**（`0 3 * * 1`，Asia/Taipei 區段）每週重產訊號；log `/var/log/yaocare-ga.log`。
- `scripts/fetch-news.ts` 的 `loadInsights()` 讀該訊號 →（a）`selectDemandAware` **需求感知全域選題**（權重高的議題在全域評分加分，受 `MAX_WRITE_TOTAL` 與 `PER_TARGET_DAILY_CAP` 限制）；（b）把每議題的**讀者搜尋字注入 filter prompt**（影響「挑哪篇」，非只文案）＋**搜尋字 + 低完成率旗標**當 `WriterHint` 傳進 `writerPrompt`。無訊號/資料不足時選題與寫作都等同原行為。
- **權重三訊號**（合併上限 ×3、地板 ×1）：品質級距（GA 完成率，貝氏收縮、相對全站平均）＋ CTA 加成（GA cta 率，B）＋ 需求機會（GSC 高曝光但排名差/低 CTR，已生效）。
- **`scripts/gsc.ts`**：Search Console API（同金鑰、scope webmasters；資源 `sc-domain:yao.care` 故加 `www.yao.care` page filter）→ 搜尋查詢/頁面 + 每議題搜尋字（A）。GSC 有歷史資料故需求面即刻生效；GA 品質/CTA 待累積（2–4 週）。
- **writer 洞察注入**（`news-prompts.mjs renderHints`）：A 搜尋字 + C 低完成率風格提示；明示「嚴格規則仍全部適用」，且 regex/proofPoint guards 仍為安全網。
- GSC sitemap 提交也走這把金鑰（webmasters scope，Full 權限）。

## § SEO / Sitemap / GSC

> 📤 **對外面向看 `README.md`**：GSC 資源/sitemap 提交清單、Wikidata/Google 商家/站外目錄、GEO 推薦力現況。本節只講**站內 sitemap/robots/schema 機制**；GEO 逐項勾選見 `GEO-CHECKLIST.md`。

### www 本站
- Astro 產 `sitemap-index.xml` + `sitemap-0.xml`；另有 `src/pages/sitemap.xml.ts` 產 `/sitemap.xml` 別名（指向 sitemap-0.xml）—— 修正「提交 /sitemap.xml 卻回首頁 HTML、被 GSC 判為 HTML 網頁」的問題。`robots.txt` 指向 sitemap-index.xml。
- GEO（被 LLM 引用）資產：`src/seo.config.ts`（Organization knowsAbout / 各產品 FAQ）、`/glossary`、`/guides`、`/llms.txt`（目錄）、`/llms-full.txt`（全文，2026-07-25 新增），各頁 schema（SoftwareApplication / FAQPage / DefinedTerm / Article / BreadcrumbList）。

### GSC（網域資源 `sc-domain:yao.care`，涵蓋所有子網域）
- **Sitemap 要逐站維護**：網域資源只整合「驗證/報表」，各子網域要有自己的 sitemap + robots（`Sitemap:` 行指向自己）。
- 用 SA 金鑰（scope `webmasters`，Full 權限）可程式化**提交/列出 sitemap**（見 `scripts/gsc.ts` 同款認證）。目前已提交 35 個：www + 30 國 TxGNN + smart-func/geri/pedi-cds + sign。**huatuo.ai 刻意不收錄、goalkeeper（API）不需**。
- 各國 TxGNN 是獨立 repo（Jekyll / GitHub Pages，`docs/robots.txt` + `docs/CNAME`），robots `Sitemap:` 行需指自己（曾 13 國誤指 twtxgnn / sgtxgnn，已修）。

## § GSC 內容缺口補題（固定頻次，半自動）

> 📤 對外面向（為什麼這樣做、成效）見 `README.md`。本節是**機制**。

把「依 GSC 真實搜尋需求補 guides/glossary」做成**固定頻次、人工把關**的流程（呼應 news「精準少量」紀律；常青醫療頁不適合像 news 那樣全自動產出）：

- **`scripts/content-gaps.ts`**：讀 `getGscInsights()` → 找「曝光 ≥ `MIN_IMPRESSIONS`(8) × 平均排名比 `MIN_POSITION`(6) 差 × 與既有 guides/glossary 的 bigram 相似度 < `COVERED_THRESHOLD`(0.5)」的查詢 → 排序（曝光 × 排名差）寫 `reports/content-gaps.json`。加 `--draft` 時，**只為 top1 且對應得到自家產品的候選**產一份草稿到 `drafts/`（`PER_RUN_DRAFT_CAP=1`）。
  - 旗標：`--draft` / `--debug` / `--min-impr <n>` / `--min-pos <n>`。
  - **安全閘**：對應不到自家產品的高曝光字（如品牌混淆「法律偵探」）**不自動產稿**，避免逼模型杜撰；prompt 要求模型自列 `factCheckNotes` 並可設 `uncertain=true`。
- **`scripts/content-gaps.sh`**：cron entry，`unset CLAUDECODE…` 後跑 `--draft`，log `/var/log/yaocare-content-gaps.log`。
- **Cron**：`0 2 1,15 * *`（UTC，每月 1/15 號 = 台灣 10:00）—— **每兩週**一次。
- ⚠ **草稿不自動上線、不自動 commit**。`drafts/` 已 gitignore。採用流程：人工查證 `factCheckNotes` → 貼進 `src/guides.config.ts` 或 `src/glossary.config.ts` → `npm run deploy` → IndexNow。
- 調參：門檻/頻次改 `content-gaps.ts` 檔內常數與 crontab。

## § Slack 通報層（📊 數據心跳 / 🤖 大腦優化 / 📈 週報）

> ⚠️ **2026-07-02 遷移**：SEO 通報層（收集/心跳/大腦/週報）移交統一框架 `$SEO_OPS_DIR`
>（排程 `/etc/cron.d/seo-ops`：收集 20:00 UTC → 心跳 20:20 → 大腦 21:30 → 週報週一 03:00；
> 站台參數 `seo-ops/sites/yao.care.json`、大腦站規 `seo-ops/playbooks/yao.care.md`）。
> `fetch-news.sh` 已摘除通報層尾段（news 引擎本體保留原 cron 04:30 台）、`ga-report.sh` 已摘除週報呼叫
>（ga-insights 訊號重產保留，fetch-news 選題權重依賴它）。
> 「✍️ 文章撰寫」訊號由 seo-ops **內容產出層**統一發送（台 05:50，adapter＝
> `$SEO_OPS_DIR/adapters/yao.care.mjs`，讀 news log＋git 當日 auto-fetch commit；新文/文風重刷分計）。
> 本節下方為舊架構描述，僅供查考。

仿 `folk.tw` 的四段式本機通報（**已退役**，見上方遷移註記）。發到 `#藥提醒-yao-care`（`$SLACK_CHANNEL`）。Bot token 在 `$YAOCARE_SECRETS_DIR/slack-bot-token`（600、不入版控）。

- **發送工具 `scripts/slack-notify.sh`**：`<CHANNEL> "訊息"` 或 stdin；缺 token/失敗都不中斷呼叫端（`|| true` 包）。
- **每日**（接在 `fetch-news.sh` 尾，台灣 04:30 news 跑完後依序）：
  1. 📥 **`scripts/seo-daily.ts`**（純資料）：拉 GA4（台灣活躍/來源/國別）+ GSC（totals / strikingDistance 排5-15 / highImpZeroClick / 旗艦頁 URL Inspection 索引）→ `reports/seo-daily/<台灣日>.json`。**鎖死 `sc-domain:yao.care`**（SA 同時掛 vuko.life 等多站，臨時腳本用「第一個 sc-domain」會誤抓）。
  2. 📊✍️ **`scripts/slack-heartbeat.mjs`**（純 node、無 AI）：讀當日 JSON + news log + 當日 auto-fetch commit → 發一則「✍️ 今天寫了什麼（抓N→過濾→寫K，逐篇標題/relevance/✓索引或noindex）＋📊 數據心跳（台灣訪客趨勢/GSC/striking）」。首行 🚦 行動標籤；news 沒跑到/數據缺會標 🟡。
  3. 🤖 **`scripts/seo-brain-cron.sh`**（headless `claude -p`、**Sonnet**、`IS_SANDBOX=1`）：讀當日數據 → 驗昨日賭注勝負（`reports/seo-daily/<日>-actions.md`）→ 定 **≤5 檔**優化（`guides.config.ts`/`glossary.config.ts`/`seo.config.ts`/頁面 meta/內鏈）→ `npm run build` gate → commit `[auto-claude-seo]` → push → `npm run deploy` → `indexnow-urls.mjs` 通知收錄 → 寫 actions.md → 發 🤖 Slack。**YMYL 鐵則**：補醫療事實必先 WebSearch 權威源；查無源只動不碰事實的東西。`DRY_RUN=1` 乾跑（不 commit/deploy/slack）。失敗時 wrapper 補發 🔴 保底。
- **每週**（接在 `ga-report.sh` 尾，台灣週一 03:00 訊號重產後）：📈 **`scripts/seo-weekly.ts`**（純資料）：台灣 GA/GSC 週對週 + 本週語料增長 + per-target 權重/需求機會 → Slack。
- **模型**：所有 headless cron 用 `claude-sonnet-5`（2026-06 後發布的 Sonnet 5；CLI `--model claude-sonnet-5` 確認可用，1M context / 64K 輸出）；唯 `fetch-news.ts` 的 filter pass 刻意**留 Haiku**（`claude-haiku-4-5`，每天過濾數百則 RSS，省成本、精準度影響小）。
- **護欄**：`reports/` 為 gitignore（`seo-daily/*.json` 與 `*-actions.md` 是本機記憶，不入版控）；brain 殘留清理**只清 `src/`、不碰 `reports/`**（否則會刪掉 actions.md 記憶）。各腳本可 `--dry`/`DRY_RUN=1` 單測。
- ⚠ **接點在既有 wrapper**：news 本體加了 `|| true` 使其失敗也不阻擋通報層；改 `fetch-news.sh`/`ga-report.sh` 尾段時勿破壞這結構。

## § 檔案結構

```
$WWW_REPO_DIR/            ← 原始碼（本目錄）；產物 rsync 到 $WWW_SITE_DIR/
├── astro.config.mjs           ← Astro + sitemap + Tailwind v4 設定
├── tsconfig.json
├── package.json
├── scripts/                   ← cron 觸發的後台流程（news 引擎 + GA/GSC 回饋）
│   ├── fetch-news.sh          ← cron entry（日 04:30）：抓新聞 → 有變化才 commit + push + build
│   ├── fetch-news.ts          ← 主流程（RSS → filter[+需求字] → 去重 → 需求感知選題 → writer+critic 迴圈；不砍文）
│   ├── news-prompts.mjs       ← filter(可注入需求字) / writer(可帶讀者洞察 renderHints) / rewrite / critic 模板
│   ├── news-guards.mjs        ← regex 預檢（長度 / proofPoint 引用 / 標題正規化）
│   ├── ga-report.sh           ← cron entry（週一 03:00）：拉 GA+GSC 產訊號，log /var/log/yaocare-ga.log
│   ├── ga-insights.ts         ← GA Data API + GSC → reports/news-insights.json（議題權重 + 寫作洞察）
│   ├── ga-setup.ts            ← GA Admin API 冪等建自訂維度/指標/關鍵事件
│   ├── gsc.ts                 ← Search Console API（搜尋需求 + 每議題搜尋字；限 www）
│   ├── content-gaps.ts        ← GSC 內容缺口偵測 + 草稿生成（補題候選 → drafts/，人工審查）
│   ├── content-gaps.sh        ← cron entry（每月 1/15，02:00 UTC）：跑 --draft，log /var/log/yaocare-content-gaps.log
│   ├── check-nav.mjs          ← build gate：主導覽不得指向已凍結路由（禁 /news/；防反思改回去）
│   ├── check-ai-voice.mjs     ← build gate：去 AI 味（文案層）——掃 .astro/*.config.ts 的結構性 AI 腔
│   └── gen-og.mjs             ← OG 圖產生器
├── public/                    ← Astro 直接複製到 dist/ 的靜態檔
│   ├── assets/images/         ← 所有圖片
│   │   └── og/                ← 分產品 OG 圖（home/yaocare/huatuo/txgnn/func/geri/pedi/fhir-server/sign/care/intel/siqc/triz/goalkeeper/marketing.png）
│   ├── contents/              ← BMI/BP/GLU-AC 衛教圖
│   ├── robots.txt
│   └── 藥提醒Line民眾服務.ppsx ← LFS 管理
├── src/
│   ├── site.config.ts         ← 全站設定（公司名/title/description/keywords/NAV）
│   ├── products.config.ts     ← 四大分類 + 12 個產品定義 + medical 子分組（MEDICAL_GROUPS/group/productsByGroup）（單一 source of truth）
│   ├── seo.config.ts          ← GEO/SEO：KNOWS_ABOUT / ORG_SAME_AS / 各產品 FAQ（PRODUCT_FAQS）
│   ├── glossary.config.ts     ← 名詞解釋（18 則）：定義 + 段落 + related 產品 + 來源（GEO 用）；每則帶 updatedAt（餵 /rss.xml 時間軸，改內容要更新）
│   ├── guides.config.ts       ← 情境指南（10 則）：使用者搜尋原話為題 + answer-first + 工具帶入（GEO 用）；每則帶 updatedAt（同上）
│   ├── news.config.ts         ← 12 個 news target（queries / voicePoints / proofPoints / CTA）
│   ├── topics.config.ts       ← 9 個主題頁內容（2026-07-15 新增：lens 判斷角度 / answerFirst / sections / faqs / sources / ctas；來源經逐條實開查證）
│   ├── content/
│   │   ├── config.ts          ← news collection schema（Zod）
│   │   └── news/<target>/*.json ← 自動產生的議題評論文章（cron 寫入）
│   ├── lib/                   ← 頁面/endpoint 共用的小工具（非 cron 後台流程，那些在根目錄 scripts/）
│   │   ├── rss.ts             ← RSS 2.0 產生器（手寫，兩支 feed 共用；XML 跳脫在 esc()）
│   │   └── topic-feed.ts      ← 主題動態的錨點 id（feedAnchorId）＋ RSS description HTML（feedItemHtml）
│   ├── scripts/track.ts       ← GA4 互動事件（捲動 / 讀完 / 互動時間 / CTA），由 Analytics.astro 全站載入
│   ├── styles/variables.css   ← 設計 token 單一來源（@theme：字級階梯/色票；守門規則見檔頭）
│   ├── styles/global.css      ← Tailwind 入口（import variables.css）+ base 樣式 + 共用 class
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
│   │   │   ├── pedi.astro     ← Smart Pedi 兒童發展評估（assessment）
│   │   │   └── fhir-server.astro ← SMART on FHIR 收案伺服器（slug=fhir-server；通用收案後端，Func/Geri/Pedi 皆可收案，GCM 為導入案例；private、無對外站；/medical/gcm 重導至此）
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
│   │   ├── topics/
│   │   │   ├── index.astro            ← 主題總覽（ItemList）
│   │   │   ├── [slug].astro           ← 主題頁（Article + FAQPage + Breadcrumb；議題×產品彙整，吃 topics.config）
│   │   │   └── rss.xml.ts             ← /topics/rss.xml 九主題動態合併訂閱源（最新 50 則）
│   │   ├── glossary/
│   │   │   ├── index.astro            ← 名詞解釋總覽（DefinedTermSet）
│   │   │   └── [slug].astro           ← 名詞頁（DefinedTerm + Breadcrumb；交叉連回產品）
│   │   ├── guides/
│   │   │   ├── index.astro            ← 情境指南總覽（ItemList）
│   │   │   └── [slug].astro           ← 情境題頁（Article + FAQPage + Breadcrumb；連回產品/名詞）
│   │   ├── llms.txt.ts               ← /llms.txt（llmstxt.org）build 時自動生成，給 LLM 的站點地圖（目錄：連結＋一句描述）
│   │   ├── llms-full.txt.ts          ← /llms-full.txt build 時自動生成，給 LLM 的**全文**（topics/guides/glossary 正文 + 服務總覽 + 最新 30 則 news 摘要，純文字、去 HTML；約 160KB）
│   │   ├── rss.xml.ts                ← /rss.xml 全站訂閱源（主題動態 + guides + glossary，最新 50 則）
│   │   └── sitemap.xml.ts            ← /sitemap.xml 別名（指 sitemap-0.xml；修 GSC「HTML 網頁」誤判）
│   └── components/
│       ├── Nav.astro          ← 固定頂部導覽 + 漢堡選單
│       ├── Analytics.astro     ← GA4 gtag bootstrap + 內容/來源分類（BaseLayout & ProductLayout 引入）
│       ├── ContactCTA.astro   ← #cta 首頁公司層級 LINE 加好友 + mailto（與團隊聊聊）
│       ├── CareTag.astro      ← 四條業務線的 yao・care 同音 wordmark pill（藥/鑰/耀/邀・X (care)）
│       ├── ContactMap.astro   ← #contact（地址 + Google Maps；幾乎所有頁底都會放）
│       ├── FooterLinks.astro  ← 全站 footer：多欄連結（醫療/AI/高齡友善/行銷/聯絡）+ 回頂部
│       ├── products/
│       │   ├── ProductCard.astro      ← 各分類 hub + 首頁預覽共用的卡片（href 依 product.category 解析）
│       │   ├── ProductHero.astro      ← 產品詳情頁 hero
│       │   ├── ProductCta.astro       ← 產品詳情頁底部 LINE CTA
│       │   ├── CapabilityCloud.astro  ← hub 頁的能力雲標籤
│       │   └── GcmClosedLoop.astro    ← SMART on FHIR 收案閉環 panel（用於 /medical 評估區塊、/care、CDS 頁；GCM 為案例；深入了解連 /medical/fhir-server）
│       ├── news/
│       │   ├── HighlightNews.astro    ← 議題總覽頁上方精選
│       │   ├── NewsCard.astro         ← 列表卡片
│       │   ├── NewsArticle.astro      ← 全文頁主體
│       │   └── ProductNews.astro      ← 嵌在產品詳情頁的相關議題
│       └── (yaocare 專屬，仍只在 medical/yaocare.astro 引用)
│           SmartHealthcare / Advantages / SixServices / Verification / Screenshots
├── reports/                   ← GA/GSC 訊號輸出（gitignored）：news-insights.json 餵 fetch-news
└── dist/                      ← 本地 build 產物（gitignored）；deploy 時 rsync 到 $WWW_SITE_DIR/（後者才是 nginx mount 點）
```

> 改文案優先順序：先看 `src/products.config.ts`（產品標題、描述、bullets、CTA 都在這） → 再看對應頁面 `src/pages/<category>/<slug>.astro` → 全站共用字串看 `src/site.config.ts`。

## § 常見任務

### 修改文案
- 區塊 → 對應 `src/components/*.astro` 元件
- 全域字串（站名、聯絡、外站連結）→ `src/site.config.ts`
- Build：`npm run build`

### 修改外觀（設計規範守門 v2，2026-07-20 全站統一）
`npm run build` 前自動跑 `scripts/check-design.mjs`（單獨跑：`npm run check:design`），掃 `src/` 下 .css/.astro/.svelte，五條規則違規即 fail：
1. **font-size 禁用 px** — 一律 `var(--text-*)` 階梯（最小 18px；階梯定義在 `src/styles/variables.css`）
2. **顏色（hex / rgb() / hsl()）只准出現在 `src/styles/variables.css`** — 其他地方一律 `var(--color-*)`
3. **禁 important 覆寫** — 調整選擇器權重，不硬壓
4. **禁外部 CDN**（Google Fonts、cdnjs、unpkg、jsdelivr 等）— 字型/資源自託管或系統堆疊
5. **統一 css 檔** — `src/` 下的 .css 只准 `src/styles/{variables,global}.css`；元件樣式寫 .astro scoped `<style>` 或進 global.css

實作備忘：
- 主色 `#c6461c` 已注入 Tailwind theme（`var(--color-brand)`）；**token 一律定義在 `src/styles/variables.css` 的 `@theme`**，`global.css` 只留 base 樣式與共用 class（`.btn-line`、`.btn-brand`）
- 元件內樣式直接用 Tailwind utility classes（色值用 `var(--color-*)`，禁 arbitrary 硬編色如 `bg-[#123456]`）
- ⚠ **遷移遞延（TODO）**：存量 64 處硬編色（SmartHealthcare/intel/marketing/txgnn/news-index，多為 D3 圖表 JS 與 Tailwind arbitrary 色值，需視覺判斷）以 `scripts/check-design.mjs` 的 `LEGACY_COLOR_BUDGET` per-檔凍結——**禁再擴充**，清一處下修一處，全清完刪掉整段回到 0 容忍

### 內容守門（去 AI 味，build gate 掃 md/mdx，2026-07-21 全站統一）
`npm run build` 在 `check-design.mjs` 之後、`astro build` 之前跑 `scripts/check-content.mjs`（單獨跑：`npm run check:content`；全站盤點：`npm run check:content:all`），對「相對 origin/main 變動的 `src/**/*.md(x)`」掃去 AI 味，強指紋單一命中即擋、軟訊號跨 ≥3 層才升級擋。`npm run deploy` 已改為經 `npm run build`，故 build gate 即涵蓋部署；seo-ops `sites/yao.care.json` 的 `brain.gates=["npm run build"]` 亦隨之繼承此守門。

> **兩層分工（勿混淆，勿互相取代）**：
> - **本 gate = build/CI 檔案 gate**：掃 `src/**/*.md(x)` 的**檔案**，在 build 當下擋。**yao 目前 0 個 md/mdx**（news 是 content collection **JSON**），故此 gate 現階段等於**防守未來手寫頁**（新增 `.md/.mdx` 內容頁時自動生效）。
> - **`scripts/style-guide.mjs` 的 `checkVoice` = 產線 runtime gate**：在 `fetch-news.ts` 的 writer/critic 迴圈對 **draft 物件**跑（擋「產文當下」的 JSON news），**保留不動**。這是不同層的護欄，與本 build gate 互補、不重疊。
> - **引擎單一來源**：`scripts/check-content.mjs` 直接取自統一模板 `$HOST_SKILLS_DIR/new-astro-site/templates/check-content.mjs`（核心跨站規則勿改），yao 顧問腔特化規則 port 進檔內 `SITE_ERROR_TELLS`／`SITE_WARN_LAYERS`（`設計思路是`/`整體邏輯`/`核心邏輯`/`更根本的問題在於`/`面對這類議題`/`不容忽視`＝ERROR；`本質上是`/`設計上選擇`/`面對…情境，`/`這是…的核心`＝WARN），核心已有的（值得…的是、隨著…的發展、化繁為簡…）未重複。
> - **JSON news 涵蓋列遞延**：統一腳本預設只掃 md/mdx；要讓本 gate 也掃 news JSON 的文字欄位（`newsBrief/issueAnalysis/designResponse`）需擴充腳本讀 JSON——因 runtime `checkVoice` 已在產文當下擋住 JSON news，**此擴充遞延**、非當務之急。

### 去 AI 味守門（文案層，build gate 掃 .astro / *.config.ts，2026-09-05）
`npm run build` 在 `check-content.mjs` 之後跑 `scripts/check-ai-voice.mjs`。

> **為什麼要多一支**：`style-guide.mjs` 的 `BANNED_PHRASES` 抓的是**逐字口頭禪**（「面對這類議題」「本質上是」…），而且只在 fetch-news 產線對 draft 物件跑。實測靜態文案命中那份黑名單是 **0**——本站的 AI 味不在詞彙，在**標點與句型的模具**：改版前 13 個產品的 tagline 是同一個模子壓出來的。這支專收那一類。

**三層分工（勿互相取代）**
| 層 | 檔 | 擋什麼 | 何時 |
|----|----|--------|------|
| 產線 runtime | `scripts/style-guide.mjs` 的 `checkVoice` / `checkTakeaway` | news JSON draft、feed takeaway | 產文當下 |
| build gate | `scripts/check-content.mjs` | `src/**/*.md(x)` 檔案（yao 目前 0 個，防守未來手寫頁） | build |
| build gate | `scripts/check-ai-voice.mjs` | `.astro` / `*.config.ts` 的靜態文案 | build |

**核心設計：AI 味是密度與重複，不是單次出現。** 破折號夾註、「CFS 分 1 到 9 級，從非常健壯到末期」、bullet 裡的 `A → B` 都是正當中文；同一段出現六次才是模具。故規則分兩類：
- **有正當用法**（`DASH` / `ARROW` / `FROM_TO`）→ 每千中文字容許 1 次（至少 1）
- **幾乎只有行銷腔會用**（`CROSS` / `BUZZ` / `CORE` / `TRIPLE` / `PASSIVE3`）→ 零容忍

**校準基準**：`src/topics.config.ts`（22k 字，2026-07-15 刻意去 AI 味寫成）密度 **0.3‰**，是全站寫得最像人話的內容；改版前首頁 35.6‰、`/medical/` 33.2‰、`/care/` 36.2‰、`products.config.ts` 16.1‰。改文案時照 0.3‰ 那個標準寫。

**豁免機制**：真的是流程圖標註或技術管線步驟（`載入 FDA → 過濾有效藥品`、`crawl → chunk → embed`、ATC 五層分類、CTA 按鈕的導引箭頭），在該行或**前一行**加註解 `ai-voice-ok: <理由>` 即跳過。刻意不做「每檔容許 N 處」的數字預算——豁免要看得到、審得到，不隨改動漂移。另有兩處內建例外：`— yao.care` 結尾與 `pageTitle`/`title:` 行的破折號是標題分隔號；「以病人為中心」是 patient-centered care 的正規醫學譯法，不收。

⚠ `src/*.config.ts` 全部在守門範圍內，包含 seo-ops 反思／大腦會改的 `seo.config.ts`、`glossary.config.ts`、`guides.config.ts`——反思與大腦 gate 都含 `npm run build`，寫出 AI 腔會 gate fail 並自動撤回。

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

### 調整主題頁（/topics/）內容
- 九頁內容單一來源：`src/topics.config.ts`（答案、章節、FAQ、來源、產品回應）；模板在 `src/pages/topics/`
- **內頁「近期動態」顯示（2026-07-28）**：不再 `slice(0, 10)`——**全部**條目都渲染進 HTML，前端預設顯示前 `FEED_INITIAL`(10) 筆，「看更多」每次展開 `FEED_STEP`(10) 筆直到全部顯示、按鈕自動消失（兩個常數在 `topics/[slug].astro` 檔內）。三個踩過的坑：(a) **摺疊不能用 `hidden` 屬性**——Tailwind v4 preflight 對 `[hidden]` 下的 `display:none` 帶強制旗標，無 JS 的覆寫贏不了它，而 check-design 規則 3 禁該旗標，故改用自有屬性 `data-collapsed` + 元件內 `<style is:inline>`；(b) `<style>`／`<script>` **必須 `is:inline`**，否則 Astro 會把 style 抽成打包 CSS、脫離 `<noscript>`，變成任何情況都全展開；(c) check-design 掃的是**整份原始碼含註解**，註解裡寫出該旗標字樣也會被擋（實際踩到，已改寫措辭）。無 JS／不執行 JS 的爬蟲由 `<noscript>` 全部攤開；無頭瀏覽器實測：38 則的主題 10→20→30→38（3 次點擊、按鈕消失）、12 則的主題 10→12（1 次），無 JS 兩者皆 38/38、12/12
- **總覽頁排序（2026-07-28）**：`/topics/` 不用 config 順序，改**依各主題最新動態日新→舊**排序，並在卡片顯示「更新 YYYY-MM-DD · 動態 N 則」、hero 顯示主題數/累計則數/最後更新日。更新日＝該主題 `topicFeed` 最新一筆的 `fetchedAt`，與 `astro.config.mjs` 餵 sitemap `<lastmod>` **同源算法**（改一邊要改另一邊，否則頁面與 sitemap 對不上）。日期一律用 `toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })`——主機跑 UTC，產線在台北 04:30 抓的動態若用主機本地日會顯示成前一天；`topics/index.astro` 與 `topics/[slug].astro` 各有一份 `fmtDate`，兩處要一起改
- 鐵則：已查證數字與來源連結不可亂改；新增事實先查權威來源；文風禁 AI 味（比照 style-guide 精神）
- 改完 `npm run deploy` 上線，並用 `node scripts/indexnow-urls.mjs <改動頁URL>` 通知收錄

### RSS 訂閱源（2026-07-28）
產線每天餵新動態進 `/topics/`，但**訪客沒有「追蹤」的方法**——只能自己回來看。補了兩支 feed（build 時由 endpoint 產出靜態 XML，無執行期成本）：

| 網址 | 內容 | 條數 |
|------|------|------|
| `/topics/rss.xml` | 九主題「近期動態」合併，每則＝一筆 `topicFeed`（標題／來源／我們的一句 takeaway＋原始報導連結） | 最新 50 |
| `/rss.xml` | 全站：上面的動態（限 30）＋ 情境指南 ＋ 名詞解釋的新增／更新 | 最新 50 |

- **產生器 `src/lib/rss.ts`**（手寫 RSS 2.0，比照 `llms.txt.ts`／`sitemap.xml.ts` 的 endpoint 慣例，不裝 `@astrojs/rss`）。代價是 **XML 跳脫要自己顧**：任何進 XML 的字串一律走 `esc()`（新聞標題常含 `&` `<` `>`）。改這支後驗一次 well-formed（本機無 `xmllint`）：`python3 -c "import xml.dom.minidom as m;[m.parse(p) for p in ['dist/rss.xml','dist/topics/rss.xml']]"`。
- **每則連回站內錨點**，不是直接把人送去外站：連結是 `/topics/<主題>/#feed-<id>`，錨點算法在 `src/lib/topic-feed.ts` 的 `feedAnchorId()`，**主題頁 `<li id>` 與兩支 feed 共用這個函式**（各寫一份就會對不上、訂閱者落在頁首）。⚠ 那則若還在「看更多」的摺疊區，瀏覽器捲不到隱藏元素 → `[slug].astro` 的 inline script 有 `openHash()`：進站/hashchange 時把該則之前的全部展開再捲過去。改摺疊邏輯時別弄丟它。
- **`updatedAt` 是 `/rss.xml` 的時間軸來源**：`guides.config.ts` / `glossary.config.ts` 每則都有（初值 2026-07-28 以 git 歷史回填）。**改內容沒更新它，新版本就不會浮上 feed**；seo-ops 大腦層 playbook 已有「資料有 `updatedAt` 欄位就順手蓋新值」的通則。
- **發現路徑**：全站 `<link rel="alternate">` 由 `BaseLayout` 一律掛 `/rss.xml`，頁面專屬的用 `feeds` prop 加（`/topics/` 與主題頁加了 `/topics/rss.xml`）；可見入口在 footer「RSS 訂閱」與 `/topics/`＋主題頁的「用 RSS 訂閱主題動態」。
- feed 不進 sitemap（已確認 `sitemap-0.xml` 無 rss 條目），不需要也不該被當網頁索引。

### 調整 news 抓取範圍 / 角度
- 加搜尋關鍵字、改痛點 / 設計 proof：編 `src/news.config.ts` 對應 target
- 調精準度 / 產量：`fetch-news.ts` 檔內常數 `RELEVANCE_THRESHOLD`(0.80) / `MAX_FEED_TOTAL`(3，feed 模式日上限) / `MAX_WRITE_TOTAL`(5，legacy) / `PER_TARGET_DAILY_CAP`(2) / `DUP_TITLE_THRESHOLD`(0.6)
- 調各 target 的「引用價值傾斜」：`CITATION_PRIORITY`（選題加減分）與 `TARGET_DAILY_CAP`（單 target 日上限覆寫），同在 `fetch-news.ts`
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

### 分析 / 回饋沒更新（GA / GSC）
1. 手動拉一次：`./node_modules/.bin/tsx scripts/ga-insights.ts`（印報告 + 重產 `reports/news-insights.json`）
2. 週 cron 結果：`tail -50 /var/log/yaocare-ga.log`
3. GA 拉到空 → GA4 標準報表延遲 24–48h，或資源剛建/事件未進；GSC 拉到空 → 確認 SA 仍在 GSC 使用者
4. fetch-news 沒依喜好調整 → 看 `reports/news-insights.json` 的 `enoughData` 與各 target `weight`（全 1 = 資料未達門檻，屬正常）

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
- [ ] **觀察中**：B（CTA 加成）/ C（低完成率提示）。**2026-06-16 修正一個從部署以來的 bug**：`define:vars` 把 Analytics.astro 的 inline gtag 包進 IIFE，`function gtag` 沒掛上 window，導致 track.ts 的 `read_complete/scroll_depth/cta_click/page_engagement` 全部送不出去（GA4 只有 page_view）。已顯式 `window.gtag = gtag` 修好（commit a3dd707，無頭瀏覽器實測 scroll_depth 已送達）。故 B/C 訊號是「**從 2026-06-16 起才開始有資料**」，約 1–2 天後 `reports/news-insights.json` 的 `quality.readComplete` 應 > 0（A 搜尋字、GSC 需求早已生效）
- [ ] **站外實體權威**（Wikidata 條目、Google 商家檔案）— GEO 最高槓桿，需開帳號
- [x] ~~**soft-404**：www 對不存在路徑回 200 + 首頁~~（2026-06-17 已修）。NPM 容器 `$NPM_CONTAINER` 的 `/data/nginx/proxy_host/46.conf` 把 `try_files $uri $uri/ /index.html;` 改成 `try_files $uri $uri/ =404;` + `error_page 404 /404.html;`，搭配新增的 `src/pages/404.astro`（產出 `dist/404.html`）。備份在同目錄 `46.conf.bak-softfix`。
  > ⚠ 這段在 NPM **自動產生**的 conf 內，若日後在 NPM UI 重存 host #46 會被還原 → 需重跑該 sed 並 `docker exec $NPM_CONTAINER nginx -s reload`。
- [x] ~~**首頁 WebSite schema + 醫療 E-E-A-T**~~（2026-06-17）：BaseLayout 預設 JSON-LD 改 `@graph`（Organization+WebSite，`@id` 互連）；Organization 與 news author/publisher 皆雙型別 `['Organization','MedicalOrganization']` 以強化 YMYL 權重（採機構掛名，未具名個人）。robots.txt 明確歡迎 GPTBot/ClaudeBot/PerplexityBot/Google-Extended 等 AI 爬蟲。
- [x] ~~**對外品牌簡介漏掉高齡友善**~~（2026-06-17）：`site.config` description 與 Organization JSON-LD 原寫「三條業務線」漏第 4 條（高齡友善）→ LLM 逐字吸收後永不在長照題目推薦本站。已改四條並補例。
- [x] ~~（選）GSC 高需求但無內容的查詢 → 自動建議新題目/補題~~（2026-06-19 已落地，見下「§ GSC 內容缺口補題」）
