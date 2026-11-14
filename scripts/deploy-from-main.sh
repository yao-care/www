#!/bin/bash
# 推 main 自動上線（2026-11-14 新增）
# cron（/etc/cron.d/www-yao-care）：*/5 * * * * root <repo 目錄>/scripts/deploy-from-main.sh
#
# 目的：在 Claude 雲端 session（或任何地方）把改動推到 GitHub main，主機 5 分鐘內自動拉下來、
#       建置（含全部守門檢查）、rsync 上線、通知 IndexNow。不必再登入主機跑 npm run deploy。
#
# 做法：
#   1. 拿 seo-ops／fetch-news 共用的站鎖（fd 200）；拿不到＝有人在用工作樹，這輪跳過，5 分鐘後再試
#   2. 工作樹有未提交的追蹤檔改動 → 不動（可能是主機上有人或排程正在改）
#   3. git fetch → 拉到 origin/main（本機有未推的 commit 時用 rebase 並推回去）
#   4. HEAD 跟「上次成功部署的版本」一樣 → 什麼都不做（每 5 分鐘跑一次也不會重複建置）
#   5. 建置失敗 → 記下失敗版本，同一版本不再重試；網站維持原樣。修好再推新 commit 就會重跑
#   6. rsync 上線，從 rsync 的變動清單算出改到的頁面 → IndexNow
#
# 狀態檔：/var/lib/yaocare/www-deployed-sha（上次成功部署）、www-failed-sha（上次失敗）
#   fetch-news.sh 自己部署後也會寫 www-deployed-sha，避免本腳本重複部署同一版。
# Log：/var/log/yaocare-deploy.log
#
# 手動：
#   ./scripts/deploy-from-main.sh            # 照常跑一輪
#   FORCE=1 ./scripts/deploy-from-main.sh    # 版本沒變也重新建置部署（含重試失敗版本）
#   DRY_RUN=1 ./scripts/deploy-from-main.sh  # 只印會做什麼：會拉 code，不建置、不 rsync、不送 IndexNow
set -uo pipefail

export PATH=/usr/local/bin:/usr/bin:/bin:/root/.local/bin
if ! command -v node >/dev/null 2>&1 && [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

# 主機設定（網站目錄、commit 身分）見 docs/HOST-CONFIG.md；REPO／TARGET 可用環境變數覆蓋（測試用）
. "$(dirname "$0")/lib/host-env.sh"
REPO=${REPO:-$WWW_REPO_DIR}
TARGET=${TARGET:-${WWW_SITE_DIR:-}/}
[ "$TARGET" != "/" ] || { echo "缺主機設定 WWW_SITE_DIR" >&2; exit 1; }
STATE_DIR=${STATE_DIR:-/var/lib/yaocare}
LOG=${LOG:-/var/log/yaocare-deploy.log}
LOCK=${LOCK:-/tmp/seo-claude-yao.care.lock}
DRY_RUN=${DRY_RUN:-0}
FORCE=${FORCE:-0}

mkdir -p "$STATE_DIR"
OK_FILE="$STATE_DIR/www-deployed-sha"
FAIL_FILE="$STATE_DIR/www-failed-sha"

ts() { TZ=Asia/Taipei date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

cd "$REPO" || { log "找不到 $REPO"; exit 1; }

# 1) 站鎖（與 fetch-news.sh、seo-reflect.sh、seo-brain.sh 同檔同 fd，改名即失效）
exec 200>"$LOCK"
if ! flock -n 200; then
  exit 0 # 有人在用，下一輪再試；不寫 log 免得每 5 分鐘洗版
fi

# 2) 工作樹不乾淨就不動
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "工作樹有未提交的改動，跳過：$(git status --porcelain --untracked-files=no | head -5 | tr '\n' ' ')"
  exit 0
fi

# 3) 拉到 origin/main
if ! git fetch -q origin main 2>>"$LOG"; then
  log "git fetch 失敗"
  exit 1
fi
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  log "目前分支是 $BRANCH 不是 main，跳過"
  exit 0
fi
AHEAD=$(git rev-list --count origin/main..HEAD)
BEHIND=$(git rev-list --count HEAD..origin/main)
if [ "$BEHIND" -gt 0 ]; then
  if [ "$AHEAD" -gt 0 ]; then
    if ! git pull -q --rebase origin main >>"$LOG" 2>&1; then
      git rebase --abort >/dev/null 2>&1
      log "本機有 $AHEAD 個未推 commit，rebase 到 origin/main 衝突，已放棄；需人工處理"
      exit 1
    fi
    git push -q origin main >>"$LOG" 2>&1 || log "rebase 後推回 origin 失敗（不阻擋部署）"
  else
    git merge -q --ff-only origin/main >>"$LOG" 2>&1 || { log "fast-forward 失敗"; exit 1; }
  fi
elif [ "$AHEAD" -gt 0 ]; then
  git push -q origin main >>"$LOG" 2>&1 || log "本機有 $AHEAD 個未推 commit，推送失敗（不阻擋部署）"
fi

HEAD_SHA=$(git rev-parse HEAD)
LAST_OK=$(cat "$OK_FILE" 2>/dev/null || true)
LAST_FAIL=$(cat "$FAIL_FILE" 2>/dev/null || true)

# 4) 沒有新版本
if [ "$FORCE" != "1" ]; then
  [ "$HEAD_SHA" = "$LAST_OK" ] && exit 0
  [ "$HEAD_SHA" = "$LAST_FAIL" ] && exit 0
fi

SUBJECT=$(git log -1 --format='%h %s' HEAD)
log "開始部署 $SUBJECT（上次成功 ${LAST_OK:0:7}）"

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN：會建置並同步 ${HEAD_SHA:0:7}，此處停止"
  echo "DRY_RUN：會部署 $SUBJECT"
  exit 0
fi

# 相依套件變了才重裝（首次執行沒有比較基準，沿用主機現有的 node_modules）
if [ -n "$LAST_OK" ] && ! git diff --quiet "$LAST_OK" HEAD -- package.json pnpm-lock.yaml package-lock.json 2>/dev/null; then
  log "package.json／lockfile 有變，重裝相依套件"
  if [ -d node_modules/.pnpm ] && command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile >>"$LOG" 2>&1 || { log "pnpm install 失敗"; echo "$HEAD_SHA" > "$FAIL_FILE"; exit 1; }
  else
    npm install --no-audit --no-fund >>"$LOG" 2>&1 || { log "npm install 失敗"; echo "$HEAD_SHA" > "$FAIL_FILE"; exit 1; }
  fi
fi

# 5) 建置（走全機 build 輪流；沒有 site-build-run 就直接建）
if command -v site-build-run >/dev/null 2>&1; then
  SITE_BUILD_WAIT=600 site-build-run yao.care -- npm run build >>"$LOG" 2>&1
else
  npm run build >>"$LOG" 2>&1
fi
RC=$?
if [ $RC -ne 0 ]; then
  echo "$HEAD_SHA" > "$FAIL_FILE"
  log "建置失敗（exit $RC），網站維持原樣；${HEAD_SHA:0:7} 不再自動重試，修好後推新 commit 即會重跑"
  exit 1
fi

# 6) 上線 + 算出變動頁
CHANGED=$(rsync -a --checksum --delete --itemize-changes dist/ "$TARGET" 2>>"$LOG")
RC=$?
if [ $RC -ne 0 ]; then
  log "rsync 失敗（exit $RC）"
  exit 1
fi
echo "$HEAD_SHA" > "$OK_FILE"
rm -f "$FAIL_FILE"

URLS=$(echo "$CHANGED" | awk '$1 ~ /^>f/ && $2 ~ /(^|\/)index\.html$/ {print $2}' \
  | sed -E 's#(^|/)index\.html$#\1#; s#^#/#' | head -1000)
N=$(echo "$CHANGED" | grep -c '^>f' || true)
log "上線完成 ${HEAD_SHA:0:7}：同步 $N 個檔"
# 網站改由 GitHub Pages 提供後（存在 www-served-by-pages），IndexNow 由 GitHub Actions 送，主機只當備援
if [ -n "$URLS" ] && [ ! -f "$STATE_DIR/www-served-by-pages" ]; then
  # shellcheck disable=SC2086
  node scripts/indexnow-urls.mjs $URLS >>"$LOG" 2>&1 || log "IndexNow 失敗（不阻擋）"
fi
exit 0
