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

# 若 caller 是 Claude Code session，子 claude CLI 會被擋（nested session）
# cron 沒有這變數，但手動觸發時要清掉
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

LOG=/var/log/yaocare-news.log
{
  echo ""
  echo "════════════════════════════════════════"
  echo " fetch-news start: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "════════════════════════════════════════"

  # 1) 抓新聞 + 寫檔
  ./node_modules/.bin/tsx scripts/fetch-news.ts

  # 2) 有變化才 commit + push
  git add src/content/news
  if git diff --cached --quiet; then
    echo "  no changes; skip commit/build"
  else
    git -c user.email="$OWNER_EMAIL" -c user.name="LightChang" \
      commit -m "chore(news): auto fetch $(date '+%Y-%m-%d')"
    git push 2>&1 | tee -a "$LOG" || echo "  ⚠ git push 失敗（不阻擋 build）"

    # 3) build → 同步產物到 NPM 掛載的服務目錄
    npm run build
    rsync -a --delete dist/ $WWW_SITE_DIR/
  fi

  echo " fetch-news end: $(date '+%Y-%m-%d %H:%M:%S')"
} 2>&1 | tee -a "$LOG"
