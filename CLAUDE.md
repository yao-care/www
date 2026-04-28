# 藥提醒 yao.care 官網

## § 專案概要

| 項目 | 值 |
|------|-----|
| 網址 | https://www.yao.care / https://yao.care |
| 類型 | 純靜態網站（單頁式 Landing Page） |
| 主機目錄 | `$WWW_SITE_DIR/`（即本目錄） |
| 部署方式 | NPM 容器掛載 `dist/` 唯讀 → nginx 直接提供 |
| 版本控制 | Git → https://github.com/yao-care/www（private） |
| Build 流程 | `npm run build` 產生 `dist/`，nginx 從 `dist/` 服務 |
| 技術棧 | Astro 5 + Tailwind v4 + D3 v7 + TypeScript |
| NPM Proxy Host ID | 46（憑證 ID 58） |
| 主機維運手冊 | `$HOST_RUNBOOK` |

## § 重要事實

### Build → 上線流程
```bash
npm run build      # 產生 dist/
# 立即生效，nginx 直接從 dist/ 唯讀讀取，無需重啟容器
curl -sI https://www.yao.care/ | head -3
```

> nginx 容器掛載點是 `$WWW_SITE_DIR/dist`（不是 repo root）。
> 編輯 `src/` 後**一定要 build**，否則改動不會反映到網站上。

### 不要動 `dist/`
`dist/` 是 build 產物，已在 `.gitignore`。手動編輯 `dist/` 會在下次 `npm run build` 時被覆蓋。
要改外觀或內容，去動 `src/`。

### LFS 注意
46MB 簡報 `public/藥提醒Line民眾服務.ppsx` 透過 Git LFS 管理。clone 後若沒看到實檔，跑 `git lfs pull`。

## § 檔案結構

```
$WWW_SITE_DIR/
├── astro.config.mjs           ← Astro + sitemap + Tailwind v4 設定
├── tsconfig.json
├── package.json
├── public/                    ← Astro 直接複製到 dist/ 的靜態檔
│   ├── assets/images/         ← 所有圖片（路徑保留 /assets/images/...）
│   ├── contents/              ← BMI/BP/GLU-AC 衛教圖
│   ├── robots.txt
│   └── 藥提醒Line民眾服務.ppsx ← LFS 管理
├── src/
│   ├── site.config.ts         ← 全站設定（網址、聯絡、導覽列等）
│   ├── styles/global.css      ← Tailwind 入口 + 主題變數 + 共用 class
│   ├── layouts/BaseLayout.astro  ← <html> + meta + JSON-LD + 全域樣式
│   ├── pages/index.astro      ← 首頁組合（按順序匯入元件）
│   └── components/
│       ├── Nav.astro          ← 固定頂部導覽 + 漢堡選單
│       ├── Hero.astro         ← Hero 區（LINE / 簡報下載按鈕）
│       ├── SmartHealthcare.astro  ← #about（D3 force graph）
│       ├── Advantages.astro   ← #feature（醫院 7 項潛在優勢）
│       ├── SixServices.astro  ← #sixbig（六大服務特點）
│       ├── TxGNN.astro        ← #twtxgnn（D3 計數動畫）
│       ├── Verification.astro ← #blog（驗證流程圖）
│       ├── Screenshots.astro  ← #screenshots（4 組自製 carousel）
│       ├── ContactCTA.astro   ← #cta（LINE 加好友）
│       ├── ContactMap.astro   ← #contact（地址 + Google Maps）
│       └── FooterLinks.astro  ← LINE/Telegram 資源 + 回頂部 + Copyright
└── dist/                      ← build 產物（gitignored，nginx mount 點）
```

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
```

### 502 / 403
1. NPM 容器是否正常：`docker ps | grep $NPM_CONTAINER`
2. `dist/index.html` 是否存在：`ls dist/index.html`（沒有 → 跑 `npm run build`）
3. 掛載確認：`docker exec $NPM_CONTAINER ls /data/static-sites/www.yao.care/`

### 想看 NPM Advanced Config
透過 SSH tunnel 連到 NPM Web UI（見 `$HOST_RUNBOOK` 的 NPM 章節），Proxy Host #46。

## § 改進待辦

- [x] ~~加入 git 版本控制~~（已建 yao-care/www private repo）
- [x] ~~清掉 `assets/pug/` 和 `assets/scss/` 模板殘骸~~（2026-04-28 已清）
- [x] ~~CSS / jQuery / Bootstrap 4 現代化~~（2026-04-28 改 Astro + Tailwind v4）
- [x] ~~index.html 581 行單檔拆分~~（已拆為 11 個 Astro 元件）
- [ ] 老藥新用平台統計數字（191 / 142,328 / 5）寫死在 `TxGNN.astro`，未來若要動態化可改 fetch
- [ ] 部分裝飾圖目前透過 CSS 漸層代替；如需找回原視覺效果，可從 git history 取出舊 `decor` 圖
