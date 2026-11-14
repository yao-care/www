#!/bin/bash
# 改寫 git 歷史，清掉主機資訊與個人信箱，準備 repo 公開（2026-11-14 新增；只在主機上跑一次）
#
#   ./scripts/rewrite-history.sh prepare   # 在暫存複本改寫並驗證；不動主機 repo、不動 GitHub
#   ./scripts/rewrite-history.sh push      # GitHub 上換好新 repo 之後：推上去，並把主機 repo 接到新歷史
#
# 需要：git-filter-repo（pip install git-filter-repo）、git-lfs；主機設定 /etc/yaocare/redact-rules.txt、
#       /etc/yaocare/mailmap（見 docs/HOST-CONFIG.md）。完整步驟見 docs/HANDOFF-github-pages.md 階段 R。
#
# 為什麼推到「新 repo」而不是強制推送舊 repo：強制推送後，GitHub 仍可能以 SHA 存取舊 commit 一段時間；
# 舊 repo 改名後保持 private，同時是完整備份。
set -euo pipefail
. "$(dirname "$0")/lib/host-env.sh"

RULES=${YAOCARE_REDACT_RULES:-/etc/yaocare/redact-rules.txt}
MAILMAP=${YAOCARE_MAILMAP:-/etc/yaocare/mailmap}
STATE=${STATE_DIR:-/var/lib/yaocare}/rewrite-history
LOCK=${LOCK:-/tmp/seo-claude-yao.care.lock}
mkdir -p "$STATE"

die() { echo "❌ $*" >&2; exit 1; }
step() { echo; echo "── $*"; }

# 對照表裡的實際值（給驗證用）
literals() { grep '==>' "$RULES" | grep -v '^#' | sed 's/==>.*//' | awk 'length > 0'; }

# 驗證某個 repo 的所有 blob、commit 訊息、作者都不含任何實際值
verify_repo() {
  local dir=$1 lit bad=0
  literals > "$STATE/literals.txt"
  echo "$(wc -l < "$STATE/literals.txt") 個實際值逐一檢查……"
  # 所有 blob
  git -C "$dir" rev-list --all --objects | awk '{print $1}' |
    git -C "$dir" cat-file --batch-check='%(objectname) %(objecttype)' | awk '$2=="blob"{print $1}' |
    git -C "$dir" cat-file --batch | LC_ALL=C grep -aoF -f "$STATE/literals.txt" | sort | uniq -c > "$STATE/blob-hits.txt" || true
  # commit 訊息與作者
  git -C "$dir" log --all --format='%an <%ae>%n%cn <%ce>%n%B' | LC_ALL=C grep -aoF -f "$STATE/literals.txt" | sort | uniq -c > "$STATE/msg-hits.txt" || true
  if [ -s "$STATE/blob-hits.txt" ]; then echo "檔案內容仍有："; cat "$STATE/blob-hits.txt"; bad=1; fi
  if [ -s "$STATE/msg-hits.txt" ]; then echo "commit 訊息／作者仍有："; cat "$STATE/msg-hits.txt"; bad=1; fi
  [ $bad -eq 0 ]
}

case "${1:-}" in
prepare)
  command -v git-filter-repo >/dev/null 2>&1 || die "沒有 git-filter-repo：pip install git-filter-repo"
  git lfs version >/dev/null 2>&1 || die "沒有 git-lfs"
  [ -f "$RULES" ] || die "沒有對照表 $RULES"
  [ -f "$MAILMAP" ] || die "沒有 $MAILMAP"
  cd "$WWW_REPO_DIR"

  exec 200>"$LOCK"
  flock -w 600 200 || die "10 分鐘內拿不到站鎖（新聞／seo-ops 在跑），晚點再試"

  step "1. 主機 repo 狀態"
  [ "$(git rev-parse --abbrev-ref HEAD)" = main ] || die "主機 repo 不在 main"
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "主機 repo 有未提交的改動"
  git fetch -q origin main
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "主機 main 與 origin/main 不同步（先 pull／push 到一致）"
  [ "$(git rev-parse --is-shallow-repository)" = false ] || die "主機 repo 是淺層 clone，先 git fetch --unshallow"
  echo "main = $(git log -1 --format='%h %s')"

  step "2. 目前檔案已沒有主機資訊"
  YAOCARE_REDACT_RULES="$RULES" node scripts/redact-host-details.mjs --check

  step "3. 拉齊所有 LFS 檔（新 repo 要用）"
  # REWRITE_SKIP_LFS=1 只給沙盒測試用（測試環境沒有 LFS 實檔），主機上不要設
  [ "${REWRITE_SKIP_LFS:-0}" = 1 ] || git lfs fetch --all origin

  step "4. 在暫存複本改寫歷史"
  WORK="$STATE/work"
  rm -rf "$WORK"
  git clone -q --no-local --single-branch --branch main "$WWW_REPO_DIR" "$WORK"
  if [ -d .git/lfs/objects ]; then mkdir -p "$WORK/.git/lfs" && cp -a .git/lfs/objects "$WORK/.git/lfs/"; fi
  git -C "$WORK" filter-repo --force \
    --replace-text "$RULES" --replace-message "$RULES" --mailmap "$MAILMAP" \
    --prune-empty never  # 只改路徑寫法的舊 commit 換成代稱後會變空，保留下來讓歷史結構不變

  step "5. 驗證改寫結果"
  verify_repo "$WORK" || die "改寫後仍有實際值（見上）。補進 $RULES 後重跑 prepare"
  [ "$(git -C "$WORK" rev-list --count HEAD)" = "$(git rev-list --count HEAD)" ] || die "commit 數不同"
  # 最新版的檔案內容應該完全一樣（目前檔案在步驟 2 已確認乾淨）
  diff <(git ls-tree -r HEAD | awk '{print $3, $4}') <(git -C "$WORK" ls-tree -r HEAD | awk '{print $3, $4}') >/dev/null ||
    die "改寫後最新版的檔案跟主機 repo 不同"
  git -C "$WORK" log --format='%an <%ae>' | sort | uniq -c

  git rev-parse HEAD > "$STATE/source-head"
  echo
  echo "✅ prepare 完成：$(git -C "$WORK" rev-list --count HEAD) 個 commit 已改寫、驗證通過，暫存在 $WORK"
  echo "   接下來到 GitHub：舊 repo 改名封存、建立新的空 repo（見交接文件階段 R），再跑：$0 push"
  ;;

push)
  WORK="$STATE/work"
  [ -d "$WORK/.git" ] && [ -f "$STATE/source-head" ] || die "先跑 prepare"
  cd "$WWW_REPO_DIR"
  URL=$(git remote get-url origin)

  exec 200>"$LOCK"
  flock -w 600 200 || die "10 分鐘內拿不到站鎖，晚點再試"

  step "1. prepare 之後主機 repo 沒有新 commit"
  [ "$(git rev-parse HEAD)" = "$(cat "$STATE/source-head")" ] || die "prepare 之後 main 有新 commit，請重跑 prepare"
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "主機 repo 有未提交的改動"

  step "2. 遠端應該是新的空 repo"
  if git ls-remote --heads "$URL" | grep -q .; then
    die "$URL 上已經有分支。確認 GitHub 上的舊 repo 已改名、這個網址是新建的空 repo"
  fi

  step "3. 推上新 repo（先推 LFS 檔，再推 main）"
  git -C "$WORK" remote remove origin 2>/dev/null || true
  git -C "$WORK" remote add origin "$URL"
  if [ "${REWRITE_SKIP_LFS:-0}" = 1 ]; then git -C "$WORK" config lfs.allowincompletepush true; else git -C "$WORK" lfs push --all origin; fi
  git -C "$WORK" push -u origin main

  step "4. 主機 repo 接到新歷史（未追蹤與 gitignore 的檔案，例如 reports/、node_modules/、CLAUDE.local.md，都保留）"
  git fetch -q origin
  git reset -q --hard origin/main
  git branch -u origin/main main >/dev/null
  for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do
    [ "$b" = main ] || git branch -D "$b"
  done
  git reflog expire --expire=now --all && git gc -q --prune=now
  echo "主機 main = $(git log -1 --format='%h %an <%ae> %s')"

  step "5. 再驗證一次主機 repo"
  verify_repo "$WWW_REPO_DIR" || die "主機 repo 仍有實際值"
  # 自動部署的版本紀錄改成新 SHA，避免它把同一版當新版重建
  git rev-parse HEAD > "${STATE_DIR:-/var/lib/yaocare}/www-deployed-sha"

  echo
  echo "✅ 完成：新 repo 已推上，主機 repo 已接上新歷史。下一步見交接文件階段 R 最後幾步（轉 public 前檢查）。"
  ;;

*)
  echo "用法: $0 prepare | push"
  exit 2
  ;;
esac
