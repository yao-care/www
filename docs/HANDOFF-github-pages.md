# 交接：www.yao.care 搬到 GitHub Pages，主機繼續產內容

> 2026-11-14，由雲端 session 準備。照階段順序做，每一步做完把 `[ ]` 改成 `[x]` 並記日期。
> 順序：階段 0 → A → R → B → C → D → E。**階段 0 一定要最先做**（見下方「先看」）。

## 做完之後的樣子

```
主機（照常跑）                     GitHub                         訪客
 04:30 新聞排程 ─┐
 04:55 反思 ─────┼─ commit ─→ main ─→ Actions 建置（全部守門）─→ GitHub Pages ─→ www.yao.care
 05:30 大腦 ─────┘                  ↑                    └→ IndexNow（只送有變的頁）
                     雲端 session 改版 ─┘
```

- **主機**：新聞、反思、大腦照常跑，產出 commit 推到 main。不再負擔網站流量。
- **GitHub**：main 一有新 commit 就建置、發布；守門沒過就不上線。
- **雲端 session**：改完推 main，幾分鐘後上線。
- **主機上的網站目錄**：由 `deploy-from-main.sh` 持續保持最新，當作隨時能切回去的備援。

## 為什麼這樣比較好

- **省主機流量**：網站檔案改由 GitHub 的 CDN 提供，包括 46MB 的簡報檔。
- **改版不用上主機**：跟 TwTxGNN 一樣，推 main 就上線。
- **主機壞了網站照樣在**：網站不再依賴主機存活；主機只負責產內容。

## 代價（已處理或已確認可以接受）

| 項目 | 處理 |
|------|------|
| GitHub Pages 沒有伺服器端 301 | 7 個舊新聞分類的 NPM 前綴規則，已展開成 257 個靜態轉址頁（250 篇舊文＋7 個分類首頁，立即跳轉＋canonical＋noindex）。清單 `src/data/news-redirects.json` 由 `scripts/gen-news-redirects.mjs` 從 git 歷史產生，每次建置都會比對 |
| 前綴規則本來連「不存在的 id」都轉 | 搬完那些網址會變 404。它們本來就不存在，正常 |
| 之後收斂新的新聞分類（批次三） | 不再改 NPM：在 `gen-news-redirects.mjs` 的 BUCKETS 加一行、重跑、commit |
| 沒有伺服器 access log | 只剩 GA4／GSC。若 seo-ops 有讀 NPM log，見 A5 |
| 不能自訂回應標頭 | GitHub Pages 自帶 HSTS（較短、沒有 preload）。網站有沒有用到其他自訂標頭，A3 確認 |
| GitHub Pages 用量上限 | 軟上限每月 100GB 流量、網站 1GB（目前 19MB）、每小時 10 次建置。本站一天推不到 10 次，夠用 |

## repo 裡已經做好的（雲端 session 2026-11-14）

**部署**

| 檔案 | 用途 |
|------|------|
| `.github/workflows/pages.yml` | push main → 建置 → 發布 Pages → IndexNow。用 repo 變數 `PAGES_ENABLED`、`INDEXNOW_ENABLED` 開關，沒開之前推 main 不會跑 |
| `scripts/gen-news-redirects.mjs`、`src/data/news-redirects.json` | 舊新聞轉址清單；`astro.config.mjs` 讀它產生轉址頁（主機上 NPM 的 301 會先攔下，不影響現況） |
| `public/CNAME` | `www.yao.care`，GitHub Pages 自訂網域用 |
| `scripts/changed-pages.mjs` | 比對兩次建置，找出內容真的變了的頁，給 IndexNow |
| `scripts/deploy-from-main.sh` | 主機 cron 每 5 分鐘：main 有新版本就拉、建置、同步到主機網站目錄。切換前讓正式站自動更新，切換後當備援 |
| `scripts/fetch-news.sh` | 開頭與推送前先 rebase 到最新 main；部署後寫下版本；切換後不再送 IndexNow |
| `scripts/verify-pages.sh` | 切換前在主機上逐頁比對 GitHub Pages 與本地 build |

**公開前置（主機資訊移出 repo）**

| 檔案 | 用途 |
|------|------|
| `docs/HOST-CONFIG.md` | 主機設定檔欄位、文件中代稱的意思、防止再寫進 repo 的方法 |
| `scripts/lib/host-env.sh`、`scripts/lib/host-env.mjs` | 腳本從 `/etc/yaocare/www.env` 讀主機設定 |
| `scripts/publish.sh` | `npm run publish`／`deploy` 的 rsync，目錄改讀 `WWW_SITE_DIR` |
| `scripts/redact-host-details.mjs` | 檢查（`--check`）或替換（`--apply`）repo 裡的主機資訊 |
| `scripts/rewrite-history.sh` | 改寫整段 git 歷史並推到新 repo（階段 R） |

雲端已實測：
- **主機自動部署 7 個情境**：改版上線、沒新版、壞版本被擋、工作樹不乾淨、鎖被佔用、主機與雲端同時有 commit、切換後不送 IndexNow。
- **轉址與套件**：轉址頁建置通過全部守門、沒進 sitemap；pnpm 照 lockfile 安裝成功；驗證腳本能抓出錯誤。
- **改寫歷史完整演練**（沙盒裡的舊 repo、主機 clone、新的空 repo）：
  - 378 個 commit 全部改寫，作者統一為公開身分。
  - 歷史中個人信箱、舊主機路徑、主機 IP 都是 0。
  - 最新版檔案與改寫前完全相同。
  - 主機的 `reports/`、`CLAUDE.local.md` 保留。
  - 遠端不是空 repo 時拒絕推送；推送失敗時主機 repo 不被動到。

---

## ⚠ 先看：順序很重要

新版腳本要從 `/etc/yaocare/www.env` 讀設定。**階段 0 必須最先做**：
- 新版程式碼目前只在分支 `claude/txgnn-intro-page-update-rk51y9`，main 還是舊版，所以主機排程現在不受影響。
- 先放好設定檔，再在階段 0 把分支合併進 main。
- 反過來做的話，seo-ops 每天自動 `git pull` 拉到新版腳本後，04:30 新聞排程會因缺設定而無法 commit。

主機上的步驟可以交給主機上的 Claude Code：「照 docs/HANDOFF-github-pages.md 從階段 0 開始執行，每階段做完回報」。這份文件從分支讀：`git fetch origin && git show origin/claude/txgnn-intro-page-update-rk51y9:docs/HANDOFF-github-pages.md`。

## 階段 0：主機設定檔（主機，最先做）

- [ ] **0.1 放三個設定檔**：雲端 session 另外傳給用戶的 `www.env`、`redact-rules.txt`、`mailmap`（不在 repo 裡）
  ```bash
  mkdir -p /etc/yaocare && chmod 700 /etc/yaocare
  # 把三個檔放進 /etc/yaocare/ 後：
  chmod 600 /etc/yaocare/www.env /etc/yaocare/redact-rules.txt /etc/yaocare/mailmap
  ```
  - 先確認 `www.env` 的值跟主機實況一致：網站目錄、金鑰目錄、seo-ops 目錄（文件裡出現過兩種寫法，以實際存在的為準）。
  - `GIT_AUTHOR_EMAIL` 是公開 commit 用的身分，預設 `service@yao.care`，要換就改。

- [ ] **0.2 合併新版程式碼到 main**（cd 到 repo 目錄後）
  ```bash
  git status                        # 應該沒有未提交的改動
  git branch --show-current         # 應該是 main
  set -a; . /etc/yaocare/www.env; set +a     # 載入 commit 身分（主機沒設 git global identity）
  git pull --rebase origin main
  git fetch origin claude/txgnn-intro-page-update-rk51y9
  git merge --no-edit origin/claude/txgnn-intro-page-update-rk51y9
  git push origin main
  ```
  如果 11-14 04:30 的新聞推送被拒過，本機會多一個未推的新聞 commit，`pull --rebase` 會把它接在最新版之後。

- [ ] **0.3 確認腳本讀得到設定、repo 已乾淨**
  ```bash
  bash -c '. scripts/lib/host-env.sh; need WWW_SITE_DIR YAOCARE_SECRETS_DIR GA_PROPERTY_ID SLACK_CHANNEL GIT_AUTHOR_EMAIL GIT_COMMITTER_EMAIL && echo 設定 OK'
  node -e "import('./scripts/lib/host-env.mjs').then(m => console.log('Node 設定 OK', m.secretPath('ga4-sa.json')))"
  node scripts/redact-host-details.mjs --check      # 應為 ✅
  ```

- [ ] **0.4 裝 pre-commit hook**：防止主機排程再把主機資訊寫進 repo
  ```bash
  printf '#!/bin/sh\n[ -f /etc/yaocare/redact-rules.txt ] || exit 0\nexec node scripts/redact-host-details.mjs --check\n' > .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  ```

- [ ] **0.5 寫主機備忘 `CLAUDE.local.md`**（repo 根目錄，已 gitignore）：主機上的 Claude Code 會自動載入。把 `www.env` 的值、NPM 容器名、NPM 設定位置、主機維運手冊位置記在這裡，作為 `docs/HOST-CONFIG.md` 代稱的實際對照。

## 階段 A：主機自動部署（做完正式站就能自動更新）

- [ ] **A1. 手動跑一次自動部署**：這一步會讓 TxGNN 介紹頁改版正式上線
  ```bash
  DRY_RUN=1 ./scripts/deploy-from-main.sh; tail -3 /var/log/yaocare-deploy.log    # 應看到「DRY_RUN：會部署 …」
  ./scripts/deploy-from-main.sh; echo "exit=$?"; tail -20 /var/log/yaocare-deploy.log   # 應看到「上線完成」
  curl -s https://www.yao.care/medical/txgnn/ | grep -c "每一頁怎麼被檢查"           # 應 ≥ 1
  ```

- [ ] **A2. 裝 cron**（在 repo 目錄執行，`$(pwd)` 會展開成實際路徑）
  ```bash
  echo "*/5 * * * * root $(pwd)/scripts/deploy-from-main.sh >/dev/null 2>&1" >> /etc/cron.d/www-yao-care
  cat /etc/cron.d/www-yao-care     # 確認是實際路徑；最後一行要有換行
  ```

- [ ] **A3. 匯出 NPM #46 設定，確認沒有漏掉的規則**
  ```bash
  set -a; . /etc/yaocare/www.env; set +a
  docker exec "$(docker ps --format '{{.Names}}' | grep -i npm | head -1)" cat /data/nginx/proxy_host/46.conf > /tmp/npm46.conf
  grep -nE "location|return|rewrite|add_header|error_page|try_files" /tmp/npm46.conf
  ```
  - 預期只有：7 個 `/news/<sign|func|triz|siqc|yaocare|pedi|huatuo>/` 的 301、`try_files … =404`、`error_page 404 /404.html`、HSTS。
  - **其他任何規則都要回報**，雲端會補進 repo。回報時不要貼主機路徑或 IP。

- [ ] **A4. 找出只存在主機網站目錄的檔案**
  ```bash
  npm run build
  diff <(cd "$WWW_SITE_DIR" && find . -type f | sort) <(cd dist && find . -type f | sort) | grep '^<'
  ```
  - 列出的檔（例如驗證檔 `BingSiteAuth.xml`、`google*.html`）要回報，雲端會放進 `public/`。
  - 沒有輸出代表沒有。

- [ ] **A5. seo-ops 確認三件事**
  ```bash
  grep -n "git pull\|git push\|git commit\|user.email\|npm run deploy\|indexnow" "$SEO_OPS_DIR"/bin/seo-reflect.sh "$SEO_OPS_DIR"/bin/seo-brain.sh
  grep -rln "$OWNER_EMAIL" "$SEO_OPS_DIR" 2>/dev/null
  grep -rn "access.log\|proxy-host-46\|/data/logs" "$SEO_OPS_DIR" 2>/dev/null
  ```
  - **push 前要先拉**：反思、大腦 push 前都要有 `git pull --rebase origin main`；沒有就補上。
  - **commit 身分**：commit 時不能再用 `-c user.email=<個人信箱>`，否則新 commit 會把個人信箱公開。改成載入 `/etc/yaocare/www.env` 後直接 `git commit`。第二行 grep 列出的檔都要改，playbook 裡給 Claude 的指示也算。
  - **access log**：有讀 NPM access log 的話回報，搬完就沒有這份 log 了。

- [ ] **A6. 回報**：0.1～A5 各一行結果；A3、A4、A5 的輸出貼上（拿掉主機路徑、IP）。

## 階段 R：改寫歷史、換成新 repo（主機＋GitHub，一次做完）

> 時段：避開台北 04:30～06:00，預留 30 分鐘。
> 原理：在主機上用 `git filter-repo` 改寫一份暫存複本，把對照表裡的值換成代稱，作者改成公開身分。GitHub 上的舊 repo 改名後保持 private 當備份，新建同名的空 repo 再推上去。不直接強制推送舊 repo，因為 GitHub 在一段時間內仍能用 SHA 打開被覆蓋的舊 commit。

- [ ] **R1. 裝工具**：`pip install git-filter-repo`，確認 `git filter-repo --version`、`git lfs version` 都有輸出。
- [ ] **R2. 改寫並驗證（不動主機 repo、不動 GitHub）**
  ```bash
  ./scripts/rewrite-history.sh prepare
  ```
  - 最後要看到「✅ prepare 完成」。
  - 它會檢查主機 repo 乾淨且與 GitHub 同步、目前檔案沒有主機資訊；拉齊 LFS 檔；改寫；確認所有檔案內容、commit 訊息、作者都不含對照表裡的值，而且最新版檔案與改寫前完全相同。
  - 有任何值漏掉，就補進 `/etc/yaocare/redact-rules.txt` 再跑一次。
- [ ] **R3. GitHub：舊 repo 改名封存**
  - `yao-care/www` → Settings → General → Repository name 改成 `www-private-archive`。
  - 保持 **private**，不要刪，它是改寫前的完整備份。
- [ ] **R4. GitHub：建新的空 repo**
  - New repository：owner `yao-care`，名稱 `www`，先選 **Private**。
  - **不要**勾 README、.gitignore、license，要完全空的。
- [ ] **R5. 新 repo 的存取權**（舊 repo 的設定不會跟過來）
  - **主機推送用的憑證**：若是 deploy key，到新 repo → Settings → Deploy keys 重新加，勾 Allow write access。若是個人 token 或 SSH key，則不用動。
  - **Claude GitHub App**：如果安裝時選的是「Only select repositories」，到 org Settings → GitHub Apps → Claude → Configure，把新的 `www` 加進去，雲端 session 才讀寫得到。
- [ ] **R6. 推上新 repo，主機接上新歷史**
  ```bash
  ./scripts/rewrite-history.sh push
  ```
  - 會先確認 prepare 之後主機沒有新 commit、遠端是空的，才推送：先推 LFS 檔，再推 main。
  - 之後主機 repo 直接切到新歷史，`reports/`、`node_modules/`、`CLAUDE.local.md` 等未追蹤的檔都保留，最後再驗證一次。
  - 最後要看到「✅ 完成」。
- [ ] **R7. 在 GitHub 上確認**
  - 新 repo 的 commit 數與舊 repo 相同，作者都是公開身分。
  - `public/藥提醒Line民眾服務.ppsx` 點開是 46MB 實檔，不是一行指標文字。
- [ ] **R8. 其他 clone**：雲端 session 每次都重新 clone，不用處理。其他電腦上若有舊 clone，刪掉重新 clone；不要從舊 clone 推送，會把舊歷史帶回來。

## 階段 B：GitHub Pages 設定（你，在 github.com 上）

- [ ] **B1. org 網域驗證**：`yao-care` org → Settings → Pages → Add a domain → `yao.care`。照指示到 Linode DNS 加 TXT `_github-pages-challenge-yao-care`，回 GitHub 按 Verify。
  - 這能防止別人把 `*.yao.care` 掛到他的 Pages。2026-11-13 查過還沒做。
  - TxGNN 30 站也受益。
- [ ] **B2. 新 repo 轉 public**（R 全部完成後）：`yao-care/www` → Settings → General → Danger Zone → Change visibility → Public。
  - 公開前在主機最後跑一次 `node scripts/redact-host-details.mjs --check`。
- [ ] **B3. Pages 來源**：Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。
- [ ] **B4. 開建置開關**：Settings → Secrets and variables → Actions → Variables → New repository variable：`PAGES_ENABLED` = `true`。
- [ ] **B5. 跑第一次**：Actions → Deploy to GitHub Pages → Run workflow。兩個 job 都要綠。
- [ ] **B6. 自訂網域**：Settings → Pages → Custom domain 填 `www.yao.care` → Save。
  - DNS 還沒改，會顯示 DNS 檢查失敗，正常。
  - **先不要勾 Enforce HTTPS**。

## 階段 C：切換前驗證（主機）

- [ ] **C1.**
  ```bash
  git pull && npm run build && ./scripts/verify-pages.sh     # 在 repo 目錄執行
  ```
  - 必須是 `FAIL 0`。
  - 這支會向 GitHub Pages 逐一要 sitemap 全部頁面、257 個轉址頁、404 頁、robots／sitemap／RSS／llms／IndexNow 金鑰檔、css／js、46MB 簡報檔、結尾斜線轉址，並跟本地 build 比對。
- [ ] **C2.** A3、A4 回報的項目都已補進 repo，B5 之後重新發布過，C1 再跑一次仍是 `FAIL 0`。

## 階段 D：DNS 切換（你，Linode DNS Manager）

- [ ] **D1. 至少 24 小時前降 TTL**：`yao.care`、`www.yao.care` 的 A、AAAA 紀錄 TTL 從 21600（6 小時）改成 300。舊的 6 小時 TTL 過期後才生效，回滾時也靠它。
- [ ] **D2. 先截圖整個 zone**，回滾用。
- [ ] **D3. 選時段**：避開台北 04:30～06:00（新聞與 seo-ops 排程）。
- [ ] **D4. 改紀錄，只動這四項**

  「現在」欄的實際 IP 見 `/etc/yaocare/www.env` 的 `HOST_IPV4`、`HOST_IPV6`。

  | 名稱 | 類型 | 現在 | 改成 |
  |------|------|------|------|
  | `www` | A | $HOST_IPV4 | 刪除，改建 **CNAME → `yao-care.github.io`** |
  | `www` | AAAA | $HOST_IPV6 | 刪除（CNAME 不能跟其他紀錄並存） |
  | `@` | A | $HOST_IPV4 | 185.199.108.153、185.199.109.153、185.199.110.153、185.199.111.153 |
  | `@` | AAAA | $HOST_IPV6 | 2606:50c0:8000::153、2606:50c0:8001::153、2606:50c0:8002::153、2606:50c0:8003::153 |

  ⚠ **不能動**：
  - MX（`ASPMX.L.GOOGLE.COM` 等 5 筆，`service@yao.care` 的信）
  - TXT `v=spf1 …easydmarc…`
  - 兩筆 TXT `google-site-verification=…`（Search Console 靠它）
  - 所有子網域（`*.txgnn`、`smart-*-cds`、`sign`、`goalkeeper`、`huatuo.ai` 等）
  - B1 新加的 TXT

  改完跟 D2 截圖逐筆比對，確認只差這四項。
- [ ] **D5. 等憑證**：GitHub Pages 設定頁 DNS 檢查轉綠後，會自動申請 HTTPS 憑證，通常幾分鐘到一小時。
  - ⚠ 這段期間 `https://www.yao.care` 可能出現憑證錯誤（網站設了 HSTS，瀏覽器會強制走 HTTPS），是**唯一可能中斷的時段**。
  - 一小時還沒好就執行「回滾」。
- [ ] **D6. 憑證好了勾 Enforce HTTPS。**
- [ ] **D7. 交棒 IndexNow**
  - GitHub 加變數 `INDEXNOW_ENABLED` = `true`。
  - 主機執行 `touch /var/lib/yaocare/www-served-by-pages`，之後主機只更新備援、不送 IndexNow。

## 階段 E：切換後

- [ ] **E1.** 主機上 `TARGET=live ./scripts/verify-pages.sh` 必須是 `FAIL 0`。
- [ ] **E2.** `curl -sI https://yao.care/` 應 301 到 `https://www.yao.care/`（以前是直接回 200，兩個網址並存，搬完順便修正）。
- [ ] **E3.** 從雲端 session 推一個小改動，Actions 綠燈，正式站幾分鐘內更新。
- [ ] **E4.** 隔天早上：`tail -60 /var/log/yaocare-news.log`，04:30 新聞排程 pull、commit、push 成功；GitHub Actions 有對應的部署；反思、大腦同樣檢查。
- [ ] **E5.** 到 `https://www.yao.care/inquiry/` 送一筆測試，確認詢問表單正常。
- [ ] **E6.** GA4 即時報表有流量。
- [ ] **E7.**（1～2 週）Search Console：沒有暴增的 404、soft-404 為 0；抽查 10 個舊新聞網址會跳到主題頁。
- [ ] **E8.** 觀察期滿（建議 2 週）、一切正常後，決定主機的備援要不要繼續留。
  - 保留：什麼都不用做。注意 NPM 上 www 的憑證約 90 天後會因 DNS 已移走而續約失敗，回滾窗口要在那之前。
  - 停用：拿掉 A2 的 cron，NPM 停用 #46。
- [ ] **E9.** 更新 `$HOST_RUNBOOK`（主機維運手冊）與 repo 的 `CLAUDE.md`、`README.md`：部署方式改成「推 main → GitHub Pages」。

## 回滾（任何階段發現重大問題）

1. **DNS**：照 D2 截圖把四項改回去（TTL 已是 300，約 5 分鐘生效）。
2. **主機**：網站目錄已由 `deploy-from-main.sh` 保持最新，不用額外動作；`rm /var/lib/yaocare/www-served-by-pages` 讓主機恢復送 IndexNow。
3. **GitHub**：清空 Pages 的 Custom domain；`INDEXNOW_ENABLED` 改 `false`。
4. **改寫歷史出問題（階段 R）**：
   - 主機：`git remote` 保持原網址。
   - GitHub：刪掉新建的 `www`，把 `www-private-archive` 改回 `www`。
   - 主機 repo 在 R6 之前都沒被動過；R6 之後要回舊歷史，`git fetch origin && git reset --hard origin/main` 即可，未追蹤的檔保留。

## 附錄：2026-11-13 實測現況

- **DNS**：Linode（ns1～ns5.linode.com）；www 與 apex 都是 A $HOST_IPV4、AAAA $HOST_IPV6，TTL 21600；沒有 CAA。
- **回應**：`server: openresty`、`strict-transport-security: max-age=63072000; preload`；`http://` 都 301 到 https；`https://yao.care/` 直接回 200；`/topics` 301 到 `/topics/`；不存在的網址回 404。
- **舊新聞**：7 個分類的分類首頁、真實舊文、亂打的 id 都 301 到對應主題頁。
- **建置產物**：276 頁＋257 個轉址頁，約 19MB；LFS 簡報檔 46,105,068 bytes。
