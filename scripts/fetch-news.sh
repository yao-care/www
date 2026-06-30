#!/bin/bash
# 自動議題評論引擎 — cron entry
# crontab: 30 20 * * * $WWW_REPO_DIR/scripts/fetch-news.sh
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

cd $WWW_REPO_DIR

# 系統時區是 UTC；本站面向台灣，日期標籤（commit message / log 起訖）一律用台北時間，
# 否則台北清晨 04:30 發的文會被標成前一天（UTC 此刻仍是前一日 20:30）。
# 只前綴 bash 的 date 呼叫，不污染子 node 程序（其 toISOString 仍輸出 UTC，文章內容不變）。
TWDATE() { TZ=Asia/Taipei date "$@"; }

# 若 caller 是 Claude Code session，子 claude CLI 會被擋（nested session）
# cron 沒有這變數，但手動觸發時要清掉
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

LOG=/var/log/yaocare-news.log
{
  echo ""
  echo "════════════════════════════════════════"
  echo " fetch-news start: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
  echo "════════════════════════════════════════"

  # 1) 抓新聞 + 寫檔
  ./node_modules/.bin/tsx scripts/fetch-news.ts

  # 2) 有變化才 commit + push
  git add src/content/news
  if git diff --cached --quiet; then
    echo "  no changes; skip commit/build"
  else
    # 先記下這次變動的文章檔（供 IndexNow 提交；commit 後 staged 清單會清空）
    CHANGED_NEWS=$(git diff --cached --name-only -- src/content/news)

    git -c user.email="$OWNER_EMAIL" -c user.name="LightChang" \
      commit -m "chore(news): auto fetch $(TWDATE '+%Y-%m-%d')"
    git push 2>&1 | tee -a "$LOG" || echo "  ⚠ git push 失敗（不阻擋 build）"

    # 3) build → 同步產物到 NPM 掛載的服務目錄
    npm run build
    rsync -a --delete dist/ $WWW_SITE_DIR/

    # 4) IndexNow：即時通知 Bing/Yandex 收錄當天變動（只送可索引文章，失敗不阻擋）
    if [ -n "$CHANGED_NEWS" ]; then
      node scripts/indexnow.mjs $CHANGED_NEWS || echo "  ⚠ IndexNow 提交失敗（不阻擋）"
    fi
  fi

  echo " fetch-news end: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
} 2>&1 | tee -a "$LOG" || echo "  ⚠ news 引擎失敗（不阻擋通報層；心跳會把失敗報出來）" | tee -a "$LOG"

# ════════════════════════════════════════════════════════════
# 通報層（接在 news 之後依序跑：📥 收集 → 📊✍️ 心跳 → 🤖 大腦）
# 對齊 folk.tw 的 collect/heartbeat/brain；用既有 04:30 時段，不另開 cron。
# 即使上面 news 失敗也照跑，各步驟自帶 || 護欄、心跳/大腦自報數據缺漏與失敗保底。
# ════════════════════════════════════════════════════════════
{
  echo "──── 📥 seo-daily 收集 start: $(TWDATE '+%H:%M:%S') ────"
  ./node_modules/.bin/tsx scripts/seo-daily.ts || echo "  ⚠ seo-daily 失敗（心跳會標數據暫缺）"

  echo "──── 📊✍️ slack-heartbeat start: $(TWDATE '+%H:%M:%S') ────"
  node scripts/slack-heartbeat.mjs || echo "  ⚠ slack-heartbeat 失敗"

  echo "──── 🤖 seo-brain（自動優化）start: $(TWDATE '+%H:%M:%S') ────"
  scripts/seo-brain-cron.sh || echo "  ⚠ seo-brain 非零退出（內含失敗保底通報）"

  echo "──── 通報層 end: $(TWDATE '+%H:%M:%S') ────"
} 2>&1 | tee -a "$LOG" || true
