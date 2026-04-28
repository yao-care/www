# 藥提醒 yao.care 官網

## § 專案概要

| 項目 | 值 |
|------|-----|
| 網址 | https://www.yao.care / https://yao.care |
| 類型 | 純靜態網站（單頁式 Landing Page） |
| 主機目錄 | `$WWW_SITE_DIR/`（即本目錄） |
| 部署方式 | NPM 容器唯讀掛載 → nginx 直接提供 |
| 版本控制 | **無**（不是 git repo） |
| Build 流程 | **無**（直接編輯 HTML/CSS） |
| NPM Proxy Host ID | 46（憑證 ID 58） |
| 主機維運手冊 | `$HOST_RUNBOOK` |

## § 重要事實

### 修改後立即生效
nginx 直接讀取本目錄檔案，**沒有快取、沒有 build、沒有部署步驟**。儲存即上線。
驗證：`curl -sI https://www.yao.care/ | head -3`

### 沒有 build pipeline
實際營運的 `index.html` 是手寫繁中內容，`assets/css/style.css` 也是直接編輯的。
要改外觀直接動 `style.css`，要改內容直接動 `index.html`。

> 過往遺留的 `assets/pug/` 與 `assets/scss/` 模板殘骸已於 2026-04-28 清除，備份保存在 `assets/pug-scss-backup.20260428-0618.tar.gz`。

### 沒有 git，先備份再改
這是線上正在服務的網站，沒有版本控制。重大修改前：
```bash
cp index.html index.html.bak.$(date +%Y%m%d-%H%M)
cp assets/css/style.css assets/css/style.css.bak.$(date +%Y%m%d-%H%M)
```

## § 檔案結構

```
$WWW_SITE_DIR/
├── index.html              ← 主頁面（581 行，所有內容都在這）
├── robots.txt              ← SEO
├── sitemap.xml             ← SEO
├── 藥提醒Line民眾服務.ppsx   ← 簡報下載連結指向此檔
├── assets/
│   ├── css/
│   │   ├── style.css       ← 主要樣式（要改外觀改這個）
│   │   ├── responsive.css  ← RWD
│   │   ├── color/          ← 配色變體
│   │   ├── bootstrap.css   ← 第三方，勿動
│   │   ├── font-awesome.min.css ← 第三方，勿動
│   │   └── owl.carousel.*  ← 輪播套件，勿動
│   ├── js/
│   │   ├── script.js       ← 站台 JS
│   │   ├── scroll.js       ← 卷動效果
│   │   └── (其他第三方 jQuery / Bootstrap / Owl)
│   ├── images/             ← 圖片資源（logo、截圖、團隊照等）
│   ├── fonts/              ← 字型
│   └── pug-scss-backup.20260428-0618.tar.gz  ← 已刪殘骸的備份
└── contents/
    ├── BMI/                ← BMI 相關內容圖
    ├── BP/                 ← 血壓相關內容圖
    └── GLU-AC/             ← 血糖相關內容圖
```

## § 常見優改任務

### SEO
- 主要 meta 在 `index.html` 開頭：title、description、keywords、og:*
- `sitemap.xml`：目前只列了首頁，新增頁面要記得補
- `robots.txt`：目前 allow all，含 sitemap 連結
- canonical 已設為 `https://www.yao.care`

### 修改文案
- 直接編輯 `index.html`，所有區塊都在這一個檔案：首頁、關於、功能、截圖、團隊、部落格區、價格、見證、聯絡、訂閱、地圖、頁腳
- 主要區塊以 `<section id="xxx">` 標記，可用 grep 快速定位
- 站名固定 "藥提醒 yao.care"，副標 "用最貼近患者的方式提醒用藥"

### 修改外觀
- 配色：`assets/css/style.css` 找對應 class
- 主題色 `#c6461c`（橘紅，標題用）
- 響應式問題改 `assets/css/responsive.css`

### 替換圖片
- 直接 cp 新圖到 `assets/images/`（覆蓋同檔名最簡單）
- 或新增檔案後改 `index.html` 的 `<img src="...">`
- OG 分享圖：`assets/images/blog/share.jpg`
- Logo：`assets/images/logo.png`

### 新增子頁面
- 在本目錄建立 `subpage.html`（與 index.html 同層），nginx 會直接服務
- 樣式可以共用 `assets/css/style.css`
- 記得補進 `sitemap.xml`

### 換 .ppsx 簡報
- 首頁有 "簡報下載" 按鈕指向 `藥提醒Line民眾服務.ppsx`
- 直接覆蓋同名檔案即可（連結不用改）

## § 連結到的相關平台

`index.html` 有引用以下外站，更新時注意保持連結正確：
- `https://twtxgnn.yao.care/` — 老藥新用平台（站外）
- `mailto:service@yao.care` — 客服信箱

## § 驗證修改

```bash
# 立即看效果
curl -sI https://www.yao.care/ | head -3      # 200 OK + 新的 last-modified

# 看實際 HTML
curl -s https://www.yao.care/ | grep -o '<title>.*</title>'

# 看 NPM 容器是否取得到（沒問題就不用 reload nginx）
docker exec $NPM_CONTAINER curl -sI http://127.0.0.1/ -H "Host: www.yao.care" | head -3
```

## § 故障排除

### 改了沒生效
1. 確認檔案真的存到本目錄：`stat index.html`
2. 強制瀏覽器重新整理（Ctrl+Shift+R），nginx 可能有 etag 快取
3. 容器掛載是唯讀但會即時反映主機變動，不需重啟 NPM

### 502 / 503
1. NPM 容器是否正常：`docker ps | grep $NPM_CONTAINER`
2. 該目錄存在性：`ls -la $WWW_SITE_DIR/index.html`
3. 容器內掛載點：`docker exec $NPM_CONTAINER ls /data/static-sites/www.yao.care/`
4. 必要時 `docker exec $NPM_CONTAINER nginx -s reload`

### 想看 NPM Advanced Config
透過 SSH tunnel 連到 NPM Web UI（見 `$HOST_RUNBOOK` 的 NPM 章節），找 Proxy Host #46。

## § 改善建議（待辦）

- [ ] 加入 git 版本控制（即使不推遠端，本地 git init 也比沒有強）
- [x] ~~清掉 `assets/pug/` 和 `assets/scss/` 的模板殘骸~~（2026-04-28 已清，備份留在 `assets/pug-scss-backup.20260428-0618.tar.gz`）
- [ ] CSS 還在用 jQuery + Bootstrap 4 風格，可考慮現代化但工程量大
- [ ] index.html 已 581 行單檔，內容若再長可考慮拆分
