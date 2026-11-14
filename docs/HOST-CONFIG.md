# 主機設定（repo 外）

本 repo 是公開的。主機專屬的值（目錄、IP、帳號 ID、個人信箱）**不寫進 repo**，集中在主機上這幾個檔：

| 檔案 | 內容 | 權限 |
|------|------|------|
| `/etc/yaocare/www.env` | 腳本要用的設定（下表），`KEY=VALUE` 一行一個 | 600 |
| `/etc/yaocare/redact-rules.txt` | 「實際值==>代稱」對照表，給 `scripts/redact-host-details.mjs` 與改寫歷史用 | 600 |
| `/etc/yaocare/mailmap` | 舊 commit 作者 → 公開身分（只在改寫歷史時用） | 600 |
| repo 根目錄的 `CLAUDE.local.md` | 主機維運備忘（實際路徑、容器名、NPM 設定位置等），已 gitignore；主機上的 Claude Code 會自動載入 | — |

腳本透過 `scripts/lib/host-env.sh`（shell）與 `scripts/lib/host-env.mjs`（Node）讀 `www.env`；缺欄位時會停下並說明要設哪一個。repo 目錄一律由腳本位置推得，不需要設定。

## `www.env` 欄位

| 欄位 | 用途 | 用到的地方 |
|------|------|-----------|
| `WWW_SITE_DIR` | nginx 提供的網站目錄（rsync 目標） | `npm run deploy`／`publish`、`fetch-news.sh`、`deploy-from-main.sh` |
| `YAOCARE_SECRETS_DIR` | 金鑰目錄（`ga4-sa.json`、`slack-bot-token`、`wikidata.json`） | GA／GSC／Slack／Wikidata 腳本 |
| `SEO_OPS_DIR` | seo-ops 框架目錄（只在文件中引用） | — |
| `GA_PROPERTY_ID` | GA4 Property ID（後台用，不是頁面上的 `G-` 評估 ID） | `ga-insights.ts`、`ga-setup.ts`、`seo-daily.ts`、`seo-weekly.ts` |
| `SLACK_CHANNEL` | Slack 頻道 ID | `entity-audit.sh`、`seo-brain-cron.sh`、`seo-weekly.ts`、`slack-heartbeat.mjs` |
| `CLOUDFLARE_ACCOUNT_ID` | 詢問表單 Worker 部署用（wrangler 讀這個環境變數） | `workers/inquiry-form` |
| `GCP_PROJECT_NUMBER` | GCP 專案編號（只在文件中引用） | — |
| `OWNER_EMAIL` | 帳號擁有者信箱（只在文件中引用，不當 commit 作者） | — |
| `HOST_IPV4`、`HOST_IPV6` | 主機 IP（DNS 設定、回滾時參考） | — |
| `GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME`、`GIT_COMMITTER_EMAIL` | 排程 commit 的作者身分。**會公開**，用公司對外信箱。主機上本 repo 另以 `git config user.email` 設同一組本地身分（蓋過全域的個人信箱），所以沒載入 www.env 的程式（例如 seo-ops）commit 也是這組 | `fetch-news.sh`、`deploy-from-main.sh`（rebase）、seo-ops |

## 文件中的代稱

repo 的文件與舊 commit 裡，以下代稱代表主機上的實際值（實際值見 `redact-rules.txt`／`CLAUDE.local.md`）：

| 代稱 | 意思 |
|------|------|
| `$WWW_REPO_DIR` | 本 repo 在主機上的目錄（舊 commit 裡也代表早期的舊位置） |
| `$WWW_SITE_DIR`、`$STATIC_SITES_DIR` | 網站目錄、所有靜態站的上層目錄 |
| `$YAOCARE_SECRETS_DIR` | 金鑰目錄 |
| `$SEO_OPS_DIR` | seo-ops 框架目錄 |
| `$PROJECTS_DIR`、`$MSPCP_REPO_DIR` | 主機上各專案的上層目錄、mspcp 專案目錄 |
| `$PLATFORM_DIR` | docker compose 平台目錄 |
| `$NPM_CONTAINER` | Nginx Proxy Manager 容器名 |
| `$HOST_RUNBOOK`、`$HOST_SECRETS_NOTE`、`$HOST_BACKUP_DIR`、`$HOST_SKILLS_DIR` | 主機維運手冊、機密備忘、備份目錄、Claude skills 目錄 |
| `$HOST_IPV4`、`$HOST_IPV6`、`$HOST_IPV6_PREFIX`、`$HOST_IPV4_BLOCK_A/B` | 主機 IP 與網段 |
| `$OWNER_EMAIL`、`$GA_PROPERTY_ID`、`$SLACK_CHANNEL`、`$CLOUDFLARE_ACCOUNT_ID`、`$GCP_PROJECT_NUMBER` | 同上表 |

## 防止再寫進 repo

- **主機**：repo 裝 pre-commit hook，每次 commit 前跑 `node scripts/redact-host-details.mjs --check`，有主機資訊就擋下：
  ```bash
  printf '#!/bin/sh\n[ -f /etc/yaocare/redact-rules.txt ] || exit 0\nexec node scripts/redact-host-details.mjs --check\n' > .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  ```
- **雲端 session**：沒有對照表，靠 `CLAUDE.md` 的規則：用上面的設定名稱，不寫實際值。主機的 hook 與定期檢查是最後一道防線。
- 新增需要保密的值：加進 `www.env` 與 `redact-rules.txt`（由長到短排），程式改讀環境變數，文件用代稱。
