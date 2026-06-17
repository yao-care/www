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
} 2>&1 | tee -a "$LOG"
