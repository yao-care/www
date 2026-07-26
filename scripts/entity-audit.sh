#!/usr/bin/env bash
# 實體歸屬驗收 —— 跑 entity-audit.mjs，存報告，發 Slack。
# 排程：/etc/cron.d/yaocare-entity-audit（2026-08-01 一次性驗收點）
# 手動：./scripts/entity-audit.sh
set -uo pipefail

cd $WWW_REPO_DIR

STAMP="$(TZ=Asia/Taipei date +%Y-%m-%d)"
OUT="reports/entity-audit-${STAMP}.md"
CHANNEL="${SLACK_CHANNEL:-$SLACK_CHANNEL}"   # #藥提醒-yao-care

mkdir -p reports
node scripts/entity-audit.mjs --out "$OUT" > /dev/null 2>&1
STATUS=$?

if [ ! -s "$OUT" ]; then
  ./scripts/slack-notify.sh "$CHANNEL" "🔴 實體歸屬驗收（${STAMP}）：腳本沒產出報告，請上機看 /var/log/yaocare-entity-audit.log" || true
  exit 1
fi

# 摘要：取結論行 + 所有 ❌ / ⚠️ 行（最多 20 行，避免洗版）
SUMMARY="$(grep -E '^(結論：|❌|⚠️ )' "$OUT" | head -20)"
HEAD_ICON="✅"
[ "$STATUS" -ne 0 ] && HEAD_ICON="🔴"

./scripts/slack-notify.sh "$CHANNEL" "$(cat <<EOF
${HEAD_ICON} 實體歸屬驗收 ${STAMP}

${SUMMARY}

完整報告：${OUT}（主機 $WWW_REPO_DIR）
還有一項機器驗不了：實際去問 LLM「台灣做老藥新用研究報告的公司是哪一間」，看會不會講出藥提醒科技有限公司。報告末尾有建議提問清單。
EOF
)" || true

exit "$STATUS"
