#!/bin/bash
# www.yao.care: 每週拉 GA4 → 產報告 + 議題權重訊號 reports/news-insights.json
# crontab(Asia/Taipei): 0 3 * * 1 $WWW_REPO_DIR/scripts/ga-report.sh
set -euo pipefail

# cron PATH 很乾淨，需顯式擴充（與 fetch-news.sh 一致）
export PATH=/usr/local/bin:/usr/bin:/bin:/root/.local/bin
if command -v node >/dev/null 2>&1; then
  :
elif [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi

cd $WWW_REPO_DIR

LOG=/var/log/yaocare-ga.log
{
  echo ""
  echo "════════ ga-insights start: $(date '+%Y-%m-%d %H:%M:%S') ════════"
  # 金鑰路徑由 ga-insights.ts 預設指向 $YAOCARE_SECRETS_DIR/ga4-sa.json
  ./node_modules/.bin/tsx scripts/ga-insights.ts
  echo "════════ ga-insights end:   $(date '+%Y-%m-%d %H:%M:%S') ════════"
} 2>&1 | tee -a "$LOG" || echo "  ⚠ ga-insights 失敗（不阻擋週報）" | tee -a "$LOG"

# ── 📈 週報 Slack（接在週訊號重產之後；即使上面失敗也照發，內部自報數據缺漏）──
{
  echo "──── seo-weekly（📈 Slack 週報）start: $(date '+%H:%M:%S') ────"
  ./node_modules/.bin/tsx scripts/seo-weekly.ts || echo "  ⚠ seo-weekly 失敗"
  echo "──── seo-weekly end: $(date '+%H:%M:%S') ────"
} 2>&1 | tee -a "$LOG" || true
