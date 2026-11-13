# www.yao.care 遷移至 GitHub Pages 工作手冊

> 目標：比照 TwTxGNN，改成「push main 就自動建置上線」。網站從主機（Linode + Nginx Proxy Manager #46）搬到 GitHub Pages。
> 撰寫日：2026-11-13。手冊中的「現況」都是當天實測的結果，動手前若隔了一段時間，請先重跑「附錄 A」的指令確認沒有變。
>
> 負責欄：**主機**＝要在 Linode 主機上做；**GitHub**＝repo 或 org 設定頁；**DNS**＝Linode DNS Manager；**repo**＝改程式碼（可交給 Claude session）。
> 每一步做完就把 `[ ]` 改成 `[x]`，並在後面記下日期與結果。

---

## 0. 為什麼要搬、搬了會變什麼

| 項目 | 現在 | 搬完 |
|------|------|------|
| 上線方式 | 主機上 `npm run deploy`（build＋rsync 到 `$WWW_SITE_DIR/`） | push main → GitHub Actions build → 發布到 Pages |
| 從雲端 session 改版 | 推 main 不會上線（主機不會拉） | 推 main 就上線 |
| 伺服器 | 主機 openresty（NPM） | GitHub Pages（Fastly CDN） |
| 舊新聞網址 301 | NPM Advanced Config 以**前綴**轉址，整個 `/news/<分類>/` 都轉 | Pages 沒有伺服器端 301，改成**逐一網址**的靜態轉址頁（立即跳轉＋canonical） |
| 找不到的頁面 | NPM 設定回 404＋`/404.html` | Pages 原生支援 `404.html`（回 404） |
| `yao.care`（apex） | **直接回 200**，跟 www 並存，等於兩個網址 | Pages 自動把 apex 轉到 www |
| 伺服器存取紀錄 | NPM 有 access log | **沒有**伺服器紀錄（只剩 GA4／GSC） |
| 自訂回應標頭 | NPM 可設（目前有 `strict-transport-security: max-age=63072000; preload`） | 不能自訂；Pages 自帶 HSTS（較短、無 preload） |

**已知的取捨（要接受才往下做）**
1. 250 條舊新聞網址從真 301 變成靜態轉址頁。Google 通常把「0 秒 meta refresh＋canonical」當轉址處理，但訊號比真 301 弱。這批網址 2026-07 起就已轉址，Google 多半已把權重轉到主題頁，影響應該有限。
2. 前綴規則失效：`/news/sign/` 底下**從來不存在的網址**，現在會被 301，搬完會變成 404。正常，不用處理。
3. 之後再做「批次三」（geri／intel／goalkeeper）收斂時，不能再改 NPM，要改 repo 裡的轉址清單（見 §3.3）。
4. 沒有伺服器 log。若 seo-ops 有讀 NPM access log（例如統計 AI 爬蟲），那部分會失效，見 §1.4。

---

## 1. 盤點（主機）：搬之前必須先拿到的資料

這一節的資料只有主機上有，缺任何一項都可能漏東西。

- [ ] **1.1 匯出 NPM #46 的完整設定**（主機）
  ```bash
  docker exec $NPM_CONTAINER cat /data/nginx/proxy_host/46.conf > ~/npm46.conf
  # Advanced Config 存在 NPM 資料庫，UI 也看得到；兩份都要
  ```
  逐條列出所有 `location`／`return 301`／`rewrite`／`add_header`／`error_page`／`try_files`。
  已知至少有：7 個 `/news/<分類>/` 前綴 301、`try_files $uri $uri/ =404`、`error_page 404 /404.html`、HSTS 標頭。
  **任何不在這份清單上的規則都要補進 §3。**

- [ ] **1.2 比對主機服務目錄與 repo build 產物**（主機）：找出「只存在主機、不在 repo」的檔案（例如手動放的驗證檔 `BingSiteAuth.xml`、`google*.html`）
  ```bash
  cd $WWW_REPO_DIR && git pull && npm run build
  diff <(cd $WWW_SITE_DIR && find . -type f | sort) <(cd dist && find . -type f | sort)
  ```
  只在左邊（主機）出現的檔案：決定要搬進 `public/`，或確認可以丟。

- [ ] **1.3 列出所有會部署 www 的排程與腳本**（主機）
  ```bash
  grep -rn "static-sites/www.yao.care\|npm run deploy\|npm run publish" /etc/cron.d /var/spool/cron $SEO_OPS_DIR /usr/local/lib /usr/local/bin 2>/dev/null
  ```
  已知：`scripts/fetch-news.sh`（台北 04:30）、seo-ops 反思（04:55）、seo-ops 大腦（05:30）、`site-build-run`。

- [ ] **1.4 確認 seo-ops 有沒有讀 NPM access log**（主機）
  ```bash
  grep -rn "access.log\|proxy-host-46\|/data/logs" $SEO_OPS_DIR 2>/dev/null
  ```
  有的話，先決定替代來源（GSC 的「檢索統計資料」、Cloudflare 不適用），或接受停用。

- [ ] **1.5 記下目前 DNS 全部紀錄的截圖**（DNS）：Linode DNS Manager → `yao.care` 整個 zone 匯出或截圖，回滾用。

---

## 2. 轉 public 前的檢查

2026-11-13 已掃過目前檔案與完整 git 歷史（含已刪檔）：

| 檢查 | 結果 |
|------|------|
| Slack／Anthropic／GitHub／AWS／Google 金鑰、私鑰、service account 檔 | **無**。歷史中兩處 `xoxb-` 是註解「單行 xoxb-...」的說明文字 |
| 可疑檔名（.env、secret、token、.pem、.key） | 無；`public/assets/images/credentials/` 是專利證書與頒獎照片，網站上本來就公開 |
| 真正的金鑰 | 都在主機 `$YAOCARE_SECRETS_DIR/`，從未進 repo |

**公開後別人看得到、但不是機密的內容（請決定是否接受）**
- `CLAUDE.md`、`README.md`、`docs/`：主機路徑、NPM Proxy Host 編號、Slack 頻道 ID、GA Property ID、主機 IP（DNS 本來就查得到）、Wikidata 封鎖紀錄。
- `workers/inquiry-form/wrangler.jsonc`：Cloudflare `account_id`、D1 `database_id`（識別碼，沒有 API token 不能操作）。
- 每個 commit 的作者信箱。

- [ ] **2.1 決定**（你）：接受現況直接公開，或先把 `CLAUDE.md` 的主機細節搬到 repo 外。⚠ 搬走只影響之後的版本，git 歷史裡仍看得到；要連歷史一起清得改寫歷史（`git filter-repo`），所有 clone（含主機那份）都要重新 clone，代價高，不建議。
- [ ] **2.2 確認 Cloudflare Worker 的機密都用 `wrangler secret`**（repo）：例如 Turnstile secret，不在 `wrangler.jsonc` 的 `vars` 裡（2026-11-13 看過 `vars` 只有網域和信箱）。

---

## 3. repo 改動（可交給 Claude session，全部在分支上做、PR 合併）

- [ ] **3.1 `.github/workflows/pages.yml`**：push main（以及手動 `workflow_dispatch`）時：
  1. `actions/checkout`，**`fetch-depth: 0`**（`check-content.mjs` 要用 `git merge-base origin/main HEAD`），**`lfs: true`**（`public/藥提醒Line民眾服務.ppsx` 是 46MB 的 LFS 檔，沒拉到只會部署 130 bytes 的指標檔）。
  2. LFS 下載要加快取（`actions/cache`，以 LFS oid 為 key）。GitHub LFS 免費頻寬每月 1GB，46MB 每次都重抓，約 20 次部署就用完。
  3. 用 **pnpm**（repo 是 `pnpm-lock.yaml`），Node 22，`pnpm install --frozen-lockfile`。
  4. `pnpm run build`：會跑全部守門檢查（design／content／ai-voice／nav／內鏈／sitemap noindex），任一失敗就不發布。
  5. `actions/upload-pages-artifact`（`path: dist`）→ `actions/deploy-pages`。
  6. `concurrency: { group: pages, cancel-in-progress: false }`：主機一天會推好幾次，不能互相取消到半途。
- [ ] **3.2 `public/CNAME`**：內容一行 `www.yao.care`。
- [ ] **3.3 舊新聞網址轉址頁**：把 NPM 的 7 條前綴規則展開成逐一網址，寫進 `astro.config.mjs` 的 `redirects`（Astro 靜態輸出會產生 0 秒跳轉＋canonical 的 HTML）。清單來源：git 歷史裡被刪的 `src/content/news/<分類>/<id>.json`。

  | 分類 | 轉到 | 篇數 |
  |------|------|------|
  | sign | `/topics/elder-care-frailty/` | 10 |
  | func | `/topics/preventive-function-health/` | 24 |
  | triz | `/topics/innovation-methods/` | 27 |
  | siqc | `/topics/medical-ai-governance/` | 62 |
  | yaocare | `/topics/medication-safety/` | 48 |
  | pedi | `/topics/child-development/` | 40 |
  | huatuo | `/topics/explainable-medical-ai/` | 39 |
  | **合計** | | **250**（＝批次一 123＋批次二 127） |

  另外 7 個分類首頁 `/news/<分類>/` 也各產一頁轉址。
  - 建議做成一支產生器（例如 `scripts/gen-news-redirects.mjs`），把清單寫成 `src/data/news-redirects.json`，`astro.config.mjs` 讀這份檔，不要手寫 257 行。
  - 加一個 build 檢查：清單裡每個舊網址都要產出轉址頁，而且轉到的主題頁存在。
  - 再拿 §1.1 匯出的設定逐條比對，NPM 裡若還有其他規則一併補上。
- [ ] **3.4 `scripts/fetch-news.sh`**：
  1. commit 前先 `git pull --rebase --autostash origin main`。搬完後雲端 session 也會推 main，主機不先拉，推送會被拒、當天新聞上不了線。
  2. 拿掉 `npm run build` 與 `rsync`：上線改由 Actions 負責。觀察期要保留主機熱備的話，見 §8.1。
  3. IndexNow 不能在 push 後立刻送：Pages 要幾分鐘才上線，爬蟲會抓到舊版。移到 Actions 部署完成之後送（見 3.5）。
- [ ] **3.5 IndexNow 移到 Actions**：在 `deploy-pages` 之後加一步，用 `git diff --name-only ${{ github.event.before }} ${{ github.sha }}` 算出這次改到的頁面，呼叫 `scripts/indexnow.mjs`／`scripts/indexnow-urls.mjs`。金鑰本來就是公開檔（`public/1be01cbeef8111fdeccbc36e95ec07c1.txt`），不需要 secret。
- [ ] **3.6 `scripts/seo-brain-cron.sh`**（若仍在用）：第 79–81 行的「npm run deploy」「無需觸發任何 GitHub workflow」改成「push main 即上線，IndexNow 由 Actions 送」。
- [ ] **3.7 文件**：更新 `CLAUDE.md`（專案概要表、改版 SOP、Cron＋自動部署、502／403 排錯、NPM Advanced Config 段）與 `README.md`，把「部署＝rsync」改成「部署＝push main」，並寫明之後新增 301 的方法（改 `news-redirects.json`，不是改 NPM）。
- [ ] **3.8 `package.json`**：`deploy`／`publish` 保留給回滾用，註明搬家後不用。

---

## 4. 主機上 repo 外的改動

- [ ] **4.1 seo-ops 反思與大腦**（主機 `$SEO_OPS_DIR/bin/seo-reflect.sh`、`seo-brain.sh` 與 playbook）：
  - 把 `npm run deploy`／rsync 拿掉，或在觀察期改成只更新熱備（§8.1）。
  - 把 push 後立刻送 IndexNow 的步驟拿掉，改由 Actions 送。
  - 同步更新 `$SEO_OPS_DIR/playbooks/yao.care.md` 與 `MAINTENANCE.md`。
  - ⚠ 鎖檔 `/tmp/seo-claude-yao.care.lock`（fd 200）保留不動：多支腳本共寫主機工作樹的問題，搬家後還在。
- [ ] **4.2 `site-build-run` 的 yao.care 輪次**：搬完後主機不再需要建置 www，可移除，或觀察期後再移除。

---

## 5. GitHub 設定

- [ ] **5.1 org 層驗證網域**（GitHub）：`yao-care` org → Settings → Pages → Add a domain → `yao.care`，照指示在 DNS 加 TXT `_github-pages-challenge-yao-care.yao.care`。
  - 這能防止別人把 `*.yao.care` 掛到他的 Pages（子網域接管）。2026-11-13 查這筆 TXT **不存在**。
  - TxGNN 30 站已在用 `*.yao.care`，這一步對它們也有保護作用。
- [ ] **5.2 repo 轉 public**（GitHub）：`yao-care/www` → Settings → Danger Zone → Change visibility。
- [ ] **5.3 開 Pages**（GitHub）：Settings → Pages → Source 選 **GitHub Actions**。
- [ ] **5.4 合併 §3 的 PR**，確認 Actions 第一次跑成功：Actions 分頁全綠，Pages 顯示已部署。
- [ ] **5.5 設自訂網域**（GitHub）：Settings → Pages → Custom domain 填 `www.yao.care`。此時 DNS 還沒改，頁面會顯示 DNS 檢查失敗，正常。先**不要**勾 Enforce HTTPS（DNS 還沒指過來，憑證發不出來）。

---

## 6. 切換前驗證（DNS 還沒改，正式站不受影響）

GitHub Pages 會依 Host 標頭回應已設定的自訂網域，所以可以用 `--resolve` 把網域暫時指到 Pages，先在 port 80 驗證。

```bash
P=185.199.108.153
curl -sI --resolve www.yao.care:80:$P http://www.yao.care/ | head -5
```

- [ ] **6.1 全部頁面**：`dist/sitemap-0.xml` 的每個網址，用 `--resolve` 抓都要 200，而且內容跟本機 build 一樣（比對 `<title>`）。
- [ ] **6.2 轉址**：§3.3 的 257 個舊網址，抓回來都要是轉址頁，跳轉目標正確。
- [ ] **6.3 404**：亂打的網址回 404，內容是站上的 404 頁。
- [ ] **6.4 特殊檔案**都要 200 且內容正確：`/robots.txt`、`/sitemap-index.xml`、`/sitemap.xml`、`/rss.xml`、`/topics/rss.xml`、`/llms.txt`、`/llms-full.txt`、`/1be01cbeef8111fdeccbc36e95ec07c1.txt`（IndexNow 金鑰）、`/藥提醒Line民眾服務.ppsx`（大小要約 46MB，不是 130 bytes）、`/_astro/` 底下的 css 和 js。
- [ ] **6.5 結尾斜線**：`/topics`（不帶斜線）要 301 到 `/topics/`。
- [ ] **6.6 §1.2 找到的主機獨有檔案**：都已在 Pages 上。
- [ ] **6.7 §1.1 的每一條 NPM 規則**：都在 Pages 上有對應行為，或已確認可以不要。

**6.1～6.7 全部通過才進 §7。** 這些驗證可以寫成一支腳本（`scripts/verify-pages.mjs`），交給 Claude session 跑。

---

## 7. DNS 切換

- [ ] **7.1 至少 24 小時前**（DNS）：把 `yao.care`、`www.yao.care` 的 A／AAAA 紀錄 TTL 從 **21600（6 小時）**降到 **300**。要等舊的 6 小時 TTL 過期，降 TTL 才會生效；回滾時也靠它快速切回。
- [ ] **7.2 選時段**：避開台北 04:30–06:00（新聞與 seo-ops 排程），選流量低的時段。
- [ ] **7.3 改紀錄**（DNS）：**只動下面這幾筆，其他一律不動**

  | 名稱 | 類型 | 現在 | 改成 |
  |------|------|------|------|
  | `www` | A | $HOST_IPV4 | **刪除**，改建 CNAME → `yao-care.github.io` |
  | `www` | AAAA | $HOST_IPV6 | **刪除**（CNAME 不能跟其他紀錄並存） |
  | `@`（yao.care） | A | $HOST_IPV4 | 185.199.108.153、185.199.109.153、185.199.110.153、185.199.111.153（四筆） |
  | `@`（yao.care） | AAAA | $HOST_IPV6 | 2606:50c0:8000::153、2606:50c0:8001::153、2606:50c0:8002::153、2606:50c0:8003::153（四筆） |

  ⚠ **絕對不能動的紀錄**（2026-11-13 實查）：
  - MX：`ASPMX.L.GOOGLE.COM` 與 `ALT1`～`ALT4`（`service@yao.care` 的信）
  - TXT：`v=spf1 include:_spf.yao_care._d.easydmarc.pro ~all`
  - TXT：兩筆 `google-site-verification=…`（Search Console 網域資源靠它）
  - 所有 `*.txgnn.yao.care`、`smart-*-cds`、`sign`、`goalkeeper`、`huatuo.ai` 等子網域紀錄
  - 其他 TXT（DMARC、DKIM 等）

  動手前用 §1.5 的截圖逐筆核對，改完再匯出一次比對差異，確認只差上表四項。
- [ ] **7.4 等憑證**（GitHub）：Settings → Pages 的 DNS 檢查轉綠後，GitHub 會自動向 Let's Encrypt 申請憑證，通常幾分鐘到一小時。
  - ⚠ 這段期間 `https://www.yao.care` 可能出現憑證錯誤。之前 HSTS 已讓瀏覽器強制走 HTTPS，所以這是**唯一可能中斷的時段**，要盯著看。
- [ ] **7.5 憑證就緒後勾 Enforce HTTPS**（GitHub）。

---

## 8. 切換後

- [ ] **8.1 觀察期熱備**（主機，建議 2 週）：保留 NPM #46 與 `$WWW_SITE_DIR/`，讓主機排程每天 `git pull` 後照舊 rsync，回滾時才是最新版。觀察期結束再停。
- [ ] **8.2 從外部重跑 §6 全部驗證**：這次用 https、不加 `--resolve`。
- [ ] **8.3 apex**：`https://yao.care/` 要 301 到 `https://www.yao.care/`（現在是 200，搬完會修正重複網址）。
- [ ] **8.4 寫入流程**：從雲端 session 推一個小改動到 main，確認 Actions 部署成功，正式站在 5 分鐘內更新。
- [ ] **8.5 主機排程**：隔天早上看 `/var/log/yaocare-news.log`，確認 04:30 新聞排程 pull→commit→push 成功、Actions 自動部署、IndexNow 有送。seo-ops 反思與大腦同樣檢查。
- [ ] **8.6 詢問表單**：到 `/inquiry/` 送一筆測試，確認 Cloudflare Worker 的跨網域與 Turnstile 正常（允許來源 `www.yao.care`、`yao.care` 沒變，應該正常）。
- [ ] **8.7 GA4**：即時報表有流量。
- [ ] **8.8 GSC**（1～2 週）：涵蓋範圍沒有暴增的 404 或「已轉址」異常、soft-404 為 0、檢索統計正常；抽查 10 個舊新聞網址的「網址檢查」。
- [ ] **8.9 NPM 憑證**：DNS 移走後，NPM 上 www 的 Let's Encrypt 會續約失敗（約 90 天到期）。觀察期內不用處理，回滾窗口要在到期前；觀察期結束後在 NPM 停用 #46。
- [ ] **8.10 更新 `$HOST_RUNBOOK`**（主機維運手冊）：記下 www 已移出主機。

---

## 9. 回滾

任何時候發現重大問題（大量 404、轉址錯、表單壞掉、憑證一直發不出來）：

1. **DNS**：把 §7.3 的四項改回原值（`www` A／AAAA 指 $HOST_IPV4／$HOST_IPV6，apex 同）。TTL 已降到 300，約 5 分鐘生效。
2. **主機**：確認 `$WWW_SITE_DIR/` 是最新版（§8.1 有做熱備就是）；沒有就跑 `cd $WWW_REPO_DIR && git pull && npm run deploy`。
3. **GitHub**：Pages 的 Custom domain 清空，避免兩邊都宣稱同一網域。
4. 主機排程把 §3.4、§4.1 的改動還原，恢復 rsync 與 IndexNow。

---

## 附錄 A：重跑現況檢查

```bash
curl -sSI https://www.yao.care/ | grep -iE "^(server|strict-transport)"
curl -sSI https://yao.care/ | head -1
for t in A AAAA MX TXT NS; do curl -sS "https://dns.google/resolve?name=yao.care&type=$t" | python3 -c "import json,sys;[print('$t',a['data'],a['TTL']) for a in json.load(sys.stdin).get('Answer',[])]"; done
for t in A AAAA CNAME; do curl -sS "https://dns.google/resolve?name=www.yao.care&type=$t" | python3 -c "import json,sys;[print('$t',a['data'],a['TTL']) for a in json.load(sys.stdin).get('Answer',[])]"; done
for t in sign func triz siqc yaocare pedi huatuo; do curl -s -o /dev/null -w "$t %{http_code} %{redirect_url}\n" https://www.yao.care/news/$t/x/; done
```

## 附錄 B：2026-11-13 實測現況

- **NS**：ns1～ns5.linode.com
- **www／apex**：A $HOST_IPV4、AAAA $HOST_IPV6，TTL 21600；無 CAA
- **標頭**：`server: openresty`、`strict-transport-security: max-age=63072000; preload`
- **轉址行為**：`http://` 一律 301 到 https；`https://yao.care/` 回 200（沒轉 www）；`/topics` 301 到 `/topics/`；不存在的網址回 404
- **7 個 `/news/<分類>/` 前綴 301**：分類首頁、真實舊文、亂打的 id 都轉，目標見 §3.3
- **build 產物**：399 個檔，約 19MB（276 html、75 png、22 jpg、9 webp、5 xml、4 txt、4 js、2 css、1 svg、1 ppsx）；Astro 打包資源在 `_astro/`（用 Actions 發布不經 Jekyll，底線開頭的目錄照常提供）
- **LFS**：`public/藥提醒Line民眾服務.ppsx`，46,105,068 bytes
- **org 網域驗證 TXT**（`_github-pages-challenge-yao-care.yao.care`）：不存在
