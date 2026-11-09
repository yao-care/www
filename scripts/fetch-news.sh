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

# 系統時區是 UTC；本站面向台灣，日期標籤（commit message / log 起訖）一律用台北時間，
# 否則台北清晨 04:30 發的文會被標成前一天（UTC 此刻仍是前一日 20:30）。
# 只前綴 bash 的 date 呼叫，不污染子 node 程序（其 toISOString 仍輸出 UTC，文章內容不變）。
TWDATE() { TZ=Asia/Taipei date "$@"; }

# 若 caller 是 Claude Code session，子 claude CLI 會被擋（nested session）
# cron 沒有這變數，但手動觸發時要清掉
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

LOG=/var/log/yaocare-news.log

# ── 與 seo-ops 反思/大腦共用 per-站 claude 鎖（2026-07-15 新增，勿拿掉）──────────────
# 三方都會改同一個工作樹：本腳本寫 src/content/news/** 並 commit/push/build；
# seo-ops 的反思（/etc/cron.d/seo-ops，台 04:55）與大腦（台 05:30）改 src/pages/** 等。
# 事故：本腳本 04:30 起跑、實測要 45~50 分（07-12 44 分、07-13 45 分、07-15 50 分），反思
# 04:55 正好撞進窗內 → 反思的機械護欄看到本腳本新生的 src/content/news/** 判定「改動越界」→
# 反思 07-10/11/12/13/15 連 5 天全被回退，無一落地；且反思回退用的 `git clean -fdq` 會把本腳本
# 剛寫出、還沒 commit 的文章直接刪掉（07-15 就被刪掉 3 篇）。
# 對策：三方序列化，誰先拿到鎖誰跑，其餘排隊（反思/大腦的等鎖上限各 65 分，夠本腳本跑完）。
# ⚠ 鎖檔名與 fd 必須與 seo-reflect.sh / seo-brain.sh 完全一致（/tmp/seo-claude-<站>.lock、fd 200），改名即失效。
exec 200>/tmp/seo-claude-yao.care.lock
if ! flock -n 200; then
  echo " fetch-news: 工作樹被 seo-ops（反思/大腦）佔用，等它讓出… $(TWDATE '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  flock -w 3600 200 || {
    echo " fetch-news: 等鎖逾時（>60 分），跳過本次 $(TWDATE '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
    exit 1
  }
fi

{
  echo ""
  echo "════════════════════════════════════════"
  echo " fetch-news start: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
  echo "════════════════════════════════════════"

  # 1) 抓新聞 + 寫檔
  ./node_modules/.bin/tsx scripts/fetch-news.ts

  # 1b) 去 AI 味 backfill —— 2026-07-15 停役（內容重構 Phase 2）：
  #     news 舊語料將分批 301 收斂進主題頁，重刷即將退場的頁面是浪費；新鮮度訊號改由
  #     topicFeed 動態（主題頁 lastmod）承擔。要臨時恢復：取消下行註解。
  # ./node_modules/.bin/tsx scripts/rewrite-news-voice.ts || echo "  ⚠ voice backfill 失敗（不阻擋）"

  # 2) 有變化才 commit + push（feed 模式寫 topicFeed；legacy 模式寫 news，兩者都收）
  git add src/content/news src/content/topicFeed
  if git diff --cached --quiet; then
    echo "  no changes; skip commit/build"
  else
    # 先記下這次變動的檔案（供 IndexNow 提交；commit 後 staged 清單會清空）
    CHANGED_NEWS=$(git diff --cached --name-only -- src/content/news)
    CHANGED_FEED=$(git diff --cached --name-only -- src/content/topicFeed)

    git -c user.email="$OWNER_EMAIL" -c user.name="LightChang" \
      commit -m "chore(news): auto fetch $(TWDATE '+%Y-%m-%d')"
    git push 2>&1 | tee -a "$LOG" || echo "  ⚠ git push 失敗（不阻擋 build）"

    # 3) build → 同步產物到 NPM 掛載的服務目錄
    #    全站 build 走全機 build 輪流（/usr/local/lib/site-build-turn.sh；站名 yao.care 與 seo-ops 同一本帳）。
    #    最多等 10 分：排隊時本腳本仍持有 yao.care 站鎖，而 seo-ops 的 yao.care decide（台北 04:55）等站鎖上限 65 分，
    #    本腳本自身約 45–50 分，再多等就會把 decide 整輪擠掉（2026-11-09 用戶裁示）。
    #    逾時 site-build-run 回 75 → set -e 中止本輪 build/rsync（commit 已推，下次有新稿時會一併建置）。
    SITE_BUILD_WAIT=600 site-build-run yao.care -- npm run build
    rsync -a --delete dist/ $WWW_SITE_DIR/

    # 4) IndexNow：即時通知 Bing/Yandex 收錄當天變動（失敗不阻擋）
    if [ -n "$CHANGED_NEWS" ]; then
      node scripts/indexnow.mjs $CHANGED_NEWS || echo "  ⚠ IndexNow 提交失敗（不阻擋）"
    fi
    # feed 模式：有新動態的主題頁提交收錄（動態＝頁面實質更新）
    if [ -n "$CHANGED_FEED" ]; then
      TOPIC_URLS=$(echo "$CHANGED_FEED" | sed -E 's#src/content/topicFeed/([^/]+)/.*#https://www.yao.care/topics/\1/#' | sort -u)
      node scripts/indexnow-urls.mjs $TOPIC_URLS || echo "  ⚠ IndexNow(topics) 提交失敗（不阻擋）"
    fi
  fi

  echo " fetch-news end: $(TWDATE '+%Y-%m-%d %H:%M:%S') (台北)"
} 2>&1 | tee -a "$LOG" || echo "  ⚠ news 引擎失敗（不阻擋通報層；心跳會把失敗報出來）" | tee -a "$LOG"

# ════════════════════════════════════════════════════════════
# 通報層已於 2026-07-02 移交統一框架 $SEO_OPS_DIR（/etc/cron.d/seo-ops）：
#   收集 20:00 UTC → 📊 心跳 20:20 → 🤖 大腦 21:30 → 📈 週報 週一 03:00
# 本檔只保留上方 news 引擎本體。回滾：還原本區塊（備份見
# $HOST_BACKUP_DIR/seo-cutover-20260702-023954/fetch-news.sh.bak）並移除 seo-ops 對應排程。
# 註：「✍️ 文章撰寫」訊號由 seo-ops 內容產出層統一發送（/etc/cron.d/seo-ops，
#     adapter＝$SEO_OPS_DIR/adapters/yao.care.mjs，台 05:50），本檔不再掛任何通報。
# ════════════════════════════════════════════════════════════
