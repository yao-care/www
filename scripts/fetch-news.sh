#!/bin/bash
# 自動議題評論引擎 — cron entry
# crontab: 30 20 * * * <repo 目錄>/scripts/fetch-news.sh
set -euo pipefail

# cron PATH 很乾淨，需要顯式擴充
export PATH=/usr/local/bin:/usr/bin:/bin:/root/.local/bin
# 若 node 不在標準路徑，補上 nvm
if command -v node >/dev/null 2>&1; then
  :
elif [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi

. "$(dirname "$0")/lib/host-env.sh"
cd "$WWW_REPO_DIR"

# 系統時區是 UTC；本站面向台灣，日期標籤（commit message / log 起訖）一律用台北時間，
# 否則台北清晨 04:30 發的文會被標成前一天（UTC 此刻仍是前一日 20:30）。
# 只前綴 bash 的 date 呼叫，不污染子 node 程序（其 toISOString 仍輸出 UTC，文章內容不變）。
TWDATE() { TZ=Asia/Taipei date "$@"; }

# 若 caller 是 Claude Code session，子 claude CLI 會被擋（nested session）
# cron 沒有這變數，但手動觸發時要清掉
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

LOG=/var/log/yaocare-news.log

# ── 與 seo-ops 反思/大腦共用 per-站 claude 鎖（2026-07-15 新增，勿拿掉）──────────────
# 三方都會改同一個工作樹：本腳本寫 src/content/news/** 並 commit/push/build；
# seo-ops 的反思（/etc/cron.d/seo-ops，台 04:55）與大腦（台 05:30）改 src/pages/** 等。
# 事故：本腳本 04:30 起跑、實測要 45~50 分（07-12 44 分、07-13 45 分、07-15 50 分），反思
# 04:55 正好撞進窗內 → 反思的機械護欄看到本腳本新生的 src/content/news/** 判定「改動越界」→
# 反思 07-10/11/12/13/15 連 5 天全被回退，無一落地；且反思回退用的 `git clean -fdq` 會把本腳本
# 剛寫出、還沒 commit 的文章直接刪掉（07-15 就被刪掉 3 篇）。
# 對策：三方序列化，誰先拿到鎖誰跑，其餘排隊（反思/大腦的等鎖上限各 65 分，夠本腳本跑完）。
# ⚠ 鎖檔名與 fd 必須與 seo-reflect.sh / seo-brain.sh 完全一致（/tmp/seo-claude-<站>.lock、fd 200），改名即失效。
exec 200>/tmp/seo-claude-yao.care.lock
if ! flock -n 200; then
  echo " fetch-news: 工作樹被 seo-ops（反思/大腦）佔用，等它讓出… $(TWDATE '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  flock -w 3600 200 || {
    echo " fetch-news: 等鎖逾時（>60 分），跳過本次 $(TWDATE '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
    exit 1
  }
fi

{
  echo ""
  echo "════════════════════════════════════════"
  echo " fetch-news start: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
  echo "════════════════════════════════════════"

  # 0) 先拉 origin/main（2026-11-14 新增）：雲端 session 也會推 main，
  #    不先拉，等一下用舊版建置會把別人剛上線的改版蓋回去，推送也會被拒。
  git pull -q --rebase --autostash origin main || echo "  ⚠ git pull 失敗（續行，用本機版本）"

  # 1) 抓新聞 + 寫檔
  ./node_modules/.bin/tsx scripts/fetch-news.ts

  # 1b) 去 AI 味 backfill —— 2026-07-15 停役（內容重構 Phase 2）：
  #     news 舊語料將分批 301 收斂進主題頁，重刷即將退場的頁面是浪費；新鮮度訊號改由
  #     topicFeed 動態（主題頁 lastmod）承擔。要臨時恢復：取消下行註解。
  # ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts || echo "  ⚠ voice backfill 失敗（不阻擋）"

  # 2) 有變化才 commit + push（feed 模式寫 topicFeed；legacy 模式寫 news，兩者都收）
  git add src/content/news src/content/topicFeed
  if git diff --cached --quiet; then
    echo "  no changes; skip commit"
  else
    # 作者身分用本 repo 的本地 git 設定（公開身分，見 CLAUDE.md「commit 身分」）
    git commit -m "chore(news): auto fetch $(TWDATE '+%Y-%m-%d')"
    # 抓新聞要 45~50 分，這段期間 main 可能又有人推；先 rebase 再推
    git pull -q --rebase origin main || { git rebase --abort 2>/dev/null; echo "  ⚠ rebase 衝突，放棄 rebase"; }
    git push 2>&1 | tee -a "$LOG" || echo "  ⚠ git push 失敗"

    # 3) 上線與 IndexNow 都由 GitHub Actions 負責（2026-11-15 起，網站由 GitHub Pages 提供、主機不再備援）：
    #    push 到 main → .github/workflows/pages.yml 建置（含全部守門）→ 發布 Pages → 只對內容有變的頁送 IndexNow。
    #    主機這裡不再 build、rsync，也不送 IndexNow（push 後馬上送，爬蟲會抓到 Pages 還沒更新的舊版）。
  fi

  echo " fetch-news end: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
} 2>&1 | tee -a "$LOG" || echo "  ⚠ news 引擎失敗（不阻擋通報層；心跳會把失敗報出來）" | tee -a "$LOG"

# ════════════════════════════════════════════════════════════
# 通報層已於 2026-07-02 移交統一框架 seo-ops（主機 $SEO_OPS_DIR，排程 /etc/cron.d/seo-ops）：
#   收集 20:00 UTC → 📊 心跳 20:20 → 🤖 大腦 21:30 → 📈 週報 週一 03:00
# 本檔只保留上方 news 引擎本體。回滾：還原本區塊（備份見
# 主機備份目錄的 seo-cutover-20260702-023954/fetch-news.sh.bak）並移除 seo-ops 對應排程。
# 註：「✍️ 文章撰寫」訊號由 seo-ops 內容產出層統一發送（/etc/cron.d/seo-ops，
#     adapter＝$SEO_OPS_DIR/adapters/yao.care.mjs，台 05:50），本檔不再掛任何通報。
# ════════════════════════════════════════════════════════════
