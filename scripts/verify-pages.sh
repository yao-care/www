#!/bin/bash
# 切換 DNS 前，直接向 GitHub Pages 要 www.yao.care 的每一頁，逐項比對（2026-11-14 新增）
#
#   ./scripts/verify-pages.sh                 # 打 GitHub Pages（DNS 切換前用，走 http）
#   TARGET=live ./scripts/verify-pages.sh     # 打目前正式站（DNS 切換後，走 https）
#
# 前提：在 repo 根目錄、已 npm run build（用本地 dist/ 當標準答案）。
# 原理：GitHub Pages 依 Host 標頭回應已設定的自訂網域，所以 DNS 還沒指過去，也能用 --resolve 先驗證。
# 結果：最後印出 PASS／FAIL 統計；任何 FAIL 都要處理完才能切 DNS。
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

HOST=www.yao.care
if [ "${TARGET:-pages}" = "live" ]; then
  BASE="https://$HOST"; RES=()
else
  IP=${PAGES_IP:-185.199.108.153}
  BASE="http://$HOST"; RES=(--resolve "$HOST:80:$IP")
fi
# 測試用：VERIFY_BASE=http://localhost:8080 直接指定網址
if [ -n "${VERIFY_BASE:-}" ]; then BASE=$VERIFY_BASE; RES=(); fi
[ -f dist/index.html ] || { echo "沒有 dist/，請先 npm run build"; exit 1; }

PASS=0; FAIL=0
ok() { PASS=$((PASS+1)); }
bad() { FAIL=$((FAIL+1)); echo "FAIL $*"; }
get() { curl -sS -m 30 "${RES[@]}" "$@"; }

echo "== 1. sitemap 每一頁：200，且 <title> 跟本地 build 一樣"
for url in $(grep -o '<loc>[^<]*' dist/sitemap-0.xml | sed 's/<loc>//'); do
  path=${url#https://$HOST}
  local_title=$(grep -o '<title>[^<]*' "dist${path%/}/index.html" 2>/dev/null | head -1)
  body=$(get -w '\n%{http_code}' "$BASE$path")
  code=${body##*$'\n'}
  remote_title=$(echo "${body%$'\n'*}" | grep -o '<title>[^<]*' | head -1)
  if [ "$code" != "200" ]; then bad "$path → $code"
  elif [ "$remote_title" != "$local_title" ]; then bad "$path 標題不同：遠端「$remote_title」本地「$local_title」"
  else ok; fi
done

echo "== 2. 舊新聞轉址頁：跳到正確主題頁"
node -e 'for (const [k,v] of Object.entries(require("./src/data/news-redirects.json"))) console.log(k, v)' |
while read -r from to; do
  body=$(get "$BASE$from")
  if echo "$body" | grep -q "http-equiv=\"refresh\" content=\"0;url=$to\""; then echo P; else echo "F $from（應轉到 $to）"; fi
done > /tmp/verify-redirects.$$
PASS=$((PASS + $(grep -c '^P$' /tmp/verify-redirects.$$)))
while read -r line; do bad "轉址 ${line#F }"; done < <(grep '^F ' /tmp/verify-redirects.$$)
rm -f /tmp/verify-redirects.$$

echo "== 3. 不存在的網址回 404，內容是站上的 404 頁"
code=$(get -o /tmp/verify-404.$$ -w '%{http_code}' "$BASE/this-page-does-not-exist-$$/")
if [ "$code" = "404" ] && grep -q "$(grep -o '<title>[^<]*' dist/404.html | head -1)" /tmp/verify-404.$$; then ok; else bad "404 頁：狀態 $code"; fi
rm -f /tmp/verify-404.$$

echo "== 4. 特殊檔案：200 且跟本地一樣"
for f in robots.txt sitemap-index.xml sitemap.xml sitemap-0.xml rss.xml topics/rss.xml llms.txt llms-full.txt 1be01cbeef8111fdeccbc36e95ec07c1.txt CNAME; do
  if [ "$(get "$BASE/$f" | sha256sum)" = "$(sha256sum < "dist/$f")" ]; then ok; else bad "/$f 內容跟本地不同或抓不到"; fi
done
for f in $(cd dist && ls _astro/*.css _astro/*.js 2>/dev/null); do
  code=$(get -o /dev/null -w '%{http_code}' "$BASE/$f"); [ "$code" = "200" ] && ok || bad "/$f → $code"
done

echo "== 5. 46MB 簡報檔是實檔，不是 LFS 指標"
size=$(get -o /dev/null -w '%{size_download}' "$BASE/%E8%97%A5%E6%8F%90%E9%86%92Line%E6%B0%91%E7%9C%BE%E6%9C%8D%E5%8B%99.ppsx")
[ "${size%.*}" -gt 1000000 ] && ok || bad "ppsx 只有 $size bytes"

echo "== 6. 不帶結尾斜線的目錄 301 到帶斜線"
loc=$(get -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/topics")
case "$loc" in 301\ *"/topics/") ok ;; *) bad "/topics → $loc" ;; esac

echo
echo "PASS $PASS／FAIL $FAIL"
[ "$FAIL" -eq 0 ]
