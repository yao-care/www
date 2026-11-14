#!/bin/bash
# 載入主機設定（2026-11-14 新增）。用法：在腳本開頭 `. "$(dirname "$0")/lib/host-env.sh"`
#
# 主機專屬的值（網站目錄、金鑰目錄、帳號 ID、commit 作者等）不放 repo，集中在主機的
# /etc/yaocare/www.env（KEY=VALUE，一行一個）。欄位說明見 docs/HOST-CONFIG.md。
# 另一個位置可用 YAOCARE_HOST_ENV 指定（測試用）。
YAOCARE_HOST_ENV=${YAOCARE_HOST_ENV:-/etc/yaocare/www.env}
if [ -f "$YAOCARE_HOST_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$YAOCARE_HOST_ENV"
  set +a
fi
# repo 目錄一律由腳本位置推得，不寫死
WWW_REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
export WWW_REPO_DIR

# need VAR [VAR...]：缺任何一個就停，說明去哪裡設
need() {
  local v
  for v in "$@"; do
    if [ -z "${!v:-}" ]; then
      echo "缺主機設定 $v：請在 $YAOCARE_HOST_ENV 設定（欄位說明見 docs/HOST-CONFIG.md）" >&2
      exit 1
    fi
  done
}
