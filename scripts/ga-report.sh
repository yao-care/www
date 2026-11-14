#!/bin/bash
# www.yao.care: 每週拉 GA4 → 產報告 + 議題權重訊號 reports/news-insights.json
# crontab(Asia/Taipei): 0 3 * * 1 <repo 目錄>/scripts/ga-report.sh
set -euo pipefail

# cron PATH 很乾淨，需顯式擴充（與 fetch-news.sh 一致）
export PATH=/usr/local/bin:/usr/bin:/bin:/root/.local/bin
if command -v node >/dev/null 2>&1; then
  :
elif [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi

. "$(dirname "$0")/lib/host-env.sh"
cd "$WWW_REPO_DIR"

LOG=/var/log/yaocare-ga.log
{
  echo ""
  echo "════════ ga-insights start: $(date '+%Y-%m-%d %H:%M:%S') ════════"
  # 金鑰路徑由 ga-insights.ts 預設指向 $YAOCARE_SECRETS_DIR/ga4-sa.json
  ./node_modules/.bin/tsx scripts/ga-insights.ts
  echo "════════ ga-insights end:   $(date '+%Y-%m-%d %H:%M:%S') ════════"
} 2>&1 | tee -a "$LOG" || echo "  ⚠ ga-insights 失敗（不阻擋週報）" | tee -a "$LOG"

# ── 📈 週報已於 2026-07-02 移交統一框架 seo-ops（週一 03:00 UTC，/etc/cron.d/seo-ops）──
# 本檔只保留上方 ga-insights 週訊號重產（fetch-news 選題權重依賴 reports/news-insights.json）。
# 回滾：還原本區塊呼叫 scripts/seo-weekly.ts。
