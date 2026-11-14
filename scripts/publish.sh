#!/bin/bash
# 把 dist/ 同步到主機的網站目錄（npm run publish／deploy 用；目錄由主機設定 WWW_SITE_DIR 提供）
set -euo pipefail
. "$(dirname "$0")/lib/host-env.sh"
need WWW_SITE_DIR
cd "$WWW_REPO_DIR"
[ -f dist/index.html ] || { echo "沒有 dist/，請先 npm run build" >&2; exit 1; }
rsync -a --delete dist/ "$WWW_SITE_DIR/"
echo "已同步到 $WWW_SITE_DIR"
