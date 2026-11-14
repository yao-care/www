#!/bin/bash
# www.yao.care: 每兩週掃 GSC 內容缺口 → 列補題候選 + 為 top1（對應自家產品者）產草稿
# crontab(Asia/Taipei): 0 5 1,15 * *  <repo 目錄>/scripts/content-gaps.sh
#
# ⚠ 只產『草稿』到 drafts/（gitignored），不自動上線、不自動 commit。
#    人工查證事實 → 貼進 src/guides.config.ts 或 src/glossary.config.ts → npm run deploy → IndexNow。
set -euo pipefail

# 在 Claude Code session 內手動觸發時，子 claude CLI 會偵測 nested session 被擋 → 先 unset
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT 2>/dev/null || true

# cron PATH 很乾淨，需顯式擴充（與 fetch-news.sh / ga-report.sh 一致）
export PATH=/usr/local/bin:/usr/bin:/bin:/root/.local/bin
if command -v node >/dev/null 2>&1; then
  :
elif [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi

. "$(dirname "$0")/lib/host-env.sh"
cd "$WWW_REPO_DIR"

LOG=/var/log/yaocare-content-gaps.log
{
  echo ""
  echo "════════ content-gaps start: $(date '+%Y-%m-%d %H:%M:%S') ════════"
  ./node_modules/.bin/tsx scripts/content-gaps.ts --draft
  echo "════════ content-gaps end:   $(date '+%Y-%m-%d %H:%M:%S') ════════"
} 2>&1 | tee -a "$LOG"
