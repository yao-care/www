#!/usr/bin/env bash
# yao.care 大腦層「每日 SEO 自動優化」本機進入點（全 folk 式自動改站，headless claude）。
# 由 fetch-news.sh 尾段在 news 跑完後依序呼叫（收集 → 心跳 → 大腦）；亦可手動單跑。
#
# 流程：git 同步 → headless claude 讀當日 GA/GSC（reports/seo-daily/<日>.json）→ 驗昨日賭注 →
#   定 ≤5 檔優化（guides/glossary/seo/產品頁 meta／內鏈）→ gate（npm run build）→
#   commit [auto-claude-seo] → push → npm run deploy（build+rsync 上線）→ indexnow-urls 通知收錄 →
#   寫 reports/seo-daily/<日>-actions.md 留痕 → 發 🤖 Slack。claude 全程自理；本包裝只做
#   環境/同步/殘留清理/失敗保底通報。
#
# 用法：
#   scripts/seo-brain-cron.sh           # 正式跑（會 commit/push/deploy/發 Slack）
#   DRY_RUN=1 scripts/seo-brain-cron.sh # 乾跑：claude 讀數據並「提案」，不得 commit/push/deploy/發 Slack
set -uo pipefail

export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
# 若 node 不在標準路徑，補 nvm（與 fetch-news.sh 一致）
if ! command -v node >/dev/null 2>&1 && [ -d /root/.nvm/versions/node ]; then
  NODE_VER=$(ls /root/.nvm/versions/node/ | sort -V | tail -1)
  export PATH=/root/.nvm/versions/node/${NODE_VER}/bin:$PATH
fi
export TZ="Asia/Taipei"
export IS_SANDBOX=1   # Claude Code 認可的 root 旁路，讓 headless 得以運行
# 手動於 Claude Code session 內觸發時，子 claude 會因 nested session 被擋 → 清掉
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SSE_PORT

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1

DRY_RUN="${DRY_RUN:-0}"
DATE="$(date +%F)"   # TZ=Asia/Taipei → 已是台灣日期
CHANNEL="${SLACK_CHANNEL:-$SLACK_CHANNEL}"   # #藥提醒-yao-care
SLACK_NOTIFY="$REPO/scripts/slack-notify.sh"
MODEL="${BRAIN_MODEL:-claude-sonnet-5}"

echo "===== [seo-brain] $DATE $(date '+%T %Z') 開始（DRY_RUN=$DRY_RUN, model=$MODEL）====="

# 1) 同步 main（news 已先 commit/push 當天文章；這裡取最新避免 non-fast-forward）
git pull --rebase --autostash origin main 2>&1 || echo "[seo-brain] git pull 失敗（續行，讀本機既有）"

# 2) headless claude：執行每日 SEO 自動優化閉環。
PROMPT="$(cat <<PROMPTEOF
你是 yao.care（藥提醒）官網的「每日 SEO 自動優化執行者」，在**自有主機**中以 headless 執行（非雲端、無先前對話）。yao.care 是公司級多產品 hub（智慧醫療／AI 系統／高齡友善／數位行銷），Astro 5 + Tailwind v4 靜態站、npm。今天台灣日期＝$DATE（系統時鐘已是台灣時間，勿再 +8）。

# 鐵則（違反即停手）—— 這是醫療健康站（YMYL），杜撰會傷害真實使用者，絕對禁止
1. 絕不杜撰：任何補進去的「事實型」說法（醫療數據、評估量表、產品宣稱、機構/人名/專利）一定先用 WebSearch 找到權威來源（衛福部／國健署／PubMed／官方網站／Wikidata），把來源寫進該設定檔的來源/說明欄位或文內。查無權威源就不補事實，只做不碰事實的動作（內鏈、meta／title／description、頁面結構、既有名詞的措辭潤飾）。
2. 每天最多改 5 個檔，寧少勿多。聚焦「今天 GA/GSC 數據指出的具體機會」，不為動而動、不亂改全站。
3. 可改範圍僅限：src/guides.config.ts、src/glossary.config.ts、src/seo.config.ts（FAQ/knowsAbout）、src/pages/**（頁面 meta／標題／內鏈）、src/products.config.ts（僅描述/bullets 措辭，不動結構與路由）。**不要**動 scripts/、astro.config、layout 結構、track/Analytics。
4. 改完自我驗證：npm run build。非零（build 失敗）→ git checkout -- src、今日不 push/deploy、跳步驟6發 Slack 標 🔴。
5. 內容改動集中成一個 commit、訊息前綴 [auto-claude-seo]；commit 用作者 LightChang <$OWNER_EMAIL>（git 沒設 global identity，務必 -c 帶上）。
6. 文風（去 AI 腔，與 scripts/style-guide.mjs 的 STYLE_RULES 同步）：改寫任何對外文字（guides/glossary/meta/描述）時——(a) 開頭別用「面對這類議題…」「在…的今天」公式，也別用模板化第一人稱開場（「我認為」「讓我們」「在這篇文章中」）；(b) 結尾別拔高（「整體邏輯是…」「正是…的關鍵」「才是…所在」）也別空泛收束（「總的來說」「綜上所述」「總而言之」「歸根結底」「整體而言」）；(c) 別用對比公式「不是X，而是Y」「並非…而是」「不僅…更/還」「不只是…而是」；(d) 別用「值得注意的是」「值得一提的是」「換句話說」作文腔轉折；(e) 別用「至關重要／不可或缺／舉足輕重」程度詞堆疊，也少用「結構性／系統性」等抽象詞；(f) 別用「研究顯示／有研究指出／專家認為／普遍認為」模糊引用，有具體來源就寫出、查不到就不寫；(g) 破折號下定義與「可A可B」排比三連收斂、句長交錯、講台灣口語人話。改動內容時順手蓋該頁對應資料的 updatedAt（若有此欄）以對 Google 發新鮮度訊號。

# DRY_RUN
本次 DRY_RUN=$DRY_RUN。若 =1：照常讀數據、可試改與 npm run build 驗證，但**絕不 git commit/push、不 deploy、不 indexnow、不發 Slack**；最後只在 stdout 印「乾跑提案摘要」（今天會改哪些檔、賭哪些 query/page、預期效果）後結束。

# 每日流程
## 1. 讀今日數據
- Read reports/seo-daily/$DATE.json（seo-daily.ts 產）。含 ga4（taiwanActiveUsers/taiwanOrganicActive、channels、countries、topPages）、gsc（totals、topQueries、strikingDistance 排5-15、highImpZeroClick）、index（旗艦頁 coverage）。
- 若該檔不存在或 ga4/gsc 皆 {error} → 無數據，跳步驟5寫「無數據」、步驟6發 Slack 標 🟡 結束。
- 若 reports/seo-daily/$DATE-actions.md 已存在（今天已跑過）→ 不重複大改，只做極小補強或直接 no-op（DRY_RUN=0 時仍發 Slack）。

## 2. 驗證昨天（閉環回饋）
- Read reports/seo-daily/<昨日>-actions.md（若有），取昨天賭的 query/page，對照今日 JSON 的 position/clicks/impressions → 判定進步/持平/退步（GSC 有 2–3 日延遲，資料區間未動時「持平」正常）。某賭注連續 ≥3 天明顯退步 → 考慮回退（git revert 或反向編輯）並在 Slack 標 🟡。

## 3. 定本日優化（依訊號、結論先行、保守）
- strikingDistance（排5-15）：補相關內鏈、在該頁 answer-first 區塊把該詞講更完整（事實型受鐵則1約束，需 WebSearch 源）。
- highImpZeroClick：改該 page 的 title/description/H1 更貼 query（名詞/指南頁可改 glossary.config.ts／guides.config.ts 的對應欄位）。
- 名詞/指南需求字（如 cdss、cga、atc 等已排 7–10 名的字）：強化該名詞頁內容與內鏈入口，推進第一頁。
- index.coverage 仍未收錄的旗艦頁 → 強化內鏈入口。
- 訊號弱／無可行動 → no-op，不要亂改。

## 4. 執行 + 自我驗證 + 上線（DRY_RUN=0 才 push/deploy）
- 鐵則內改 ≤5 檔；事實型先 WebSearch 查證、來源寫進設定檔欄位或文內。
- npm run build。失敗 → git checkout -- src、不 push/deploy、跳步驟5（Slack 標 🔴）。
- 有內容改動且 DRY_RUN=0：
  - git add -A src && git -c user.email=$OWNER_EMAIL -c user.name=LightChang commit -m \"[auto-claude-seo] $DATE: <一句摘要>\"
  - git pull --rebase origin main（防搶先；衝突無法自動解 → git rebase --abort、放棄今日 push、跳步驟5）
  - git push origin main（被拒 non-fast-forward → git pull --rebase 後再 push）
  - 上線：npm run deploy（= astro build && rsync dist/ → $WWW_SITE_DIR/）
  - 通知收錄：node scripts/indexnow-urls.mjs <本次改動頁的路徑或完整 URL，空白分隔>（no-op／無 URL 可推則略過；失敗不影響）
- 本站部署＝rsync 到 NPM 掛載點，push 與 deploy 已涵蓋，無需觸發任何 GitHub workflow。

## 5. 留痕（供明日驗證）
- 寫 reports/seo-daily/$DATE-actions.md：① 昨日賭注勝負 ② 今日判讀摘要 ③ 改了哪些檔、賭哪些 query/page、預期效果。技術細節（commit、build、deploy、indexnow）寫這裡，不寫進 Slack。
- reports/ 為 gitignore（本機記憶，不入版控），actions.md 不需 commit。
- no-op 日（DRY_RUN=0）：仍寫一份 actions.md 記「今日無可行動訊號」，並走步驟6發 Slack。

## 6. 發 Slack（DRY_RUN=0 每天都發；一律人話、禁術語）
用 Bash 執行 yao.care 專屬發送工具（**不是** MCP）：把組好的多行訊息用管線餵給它：
  printf '%s' \"<整則訊息>\" | $SLACK_NOTIFY $CHANNEL
術語照翻：賭注→「今天調整的頁面/想改善的關鍵字」；strikingDistance→「排第5–15名、快擠進第一頁的關鍵字」；highImpZeroClick→「很多人看到卻沒人點的頁」；taiwanOrganicActive→「台灣 Google 搜尋來的訪客」；pos N→「排第N名」；CTR→「點擊率/沒人點」；impressions→「被看到N次」；build/push/deploy→合併成「已自動上線」；indexnow→「已通知 Google/Bing 等搜尋引擎重新收錄」。不要出現英文縮寫、commit hash、檔名（留給 actions.md）。
訊息排版（每項一行「・」開頭、段落空行、【】標題、標題行用 *粗體*）：
🚦 今天要不要你出手：<🟢 不用，系統自己處理好了 ／ 🟡 建議你看一下：一句原因 ／ 🔴 需要你決定：一句事項>

🤖 *yao.care 大腦優化 · <M/D>*

【今天做了什麼】
<一句總述改了哪頁；no-op／無數據就寫「今天沒有需要調整的地方，系統照常監看」並省略下三點>
・問題：<為什麼這頁值得改，人話>
・做法：<改了什麼，人話>
・狀態：已自動上線，並通知搜尋引擎重新收錄

【昨天的調整有沒有效】
<進步／持平／退步白話；資料未更新就寫「還看不出來，Google 數據要 2–3 天才更新」>

📄 完整紀錄：reports/seo-daily/$DATE-actions.md

# 收尾
最後在 stdout 印 3 行內摘要（改了幾項/哪些/有無 push/有無 deploy/有無發 Slack）。
PROMPTEOF
)"

CLAUDE_OK=1
timeout 1800 claude -p "$PROMPT" --model "$MODEL" 2>&1 \
  || { CLAUDE_OK=0; echo "[seo-brain] claude 執行失敗或逾時"; }

# 3) 殘留清理：claude 對該留的改動會自行 commit；此刻 src/ 仍未提交的是 DRY_RUN 試改 / gate-fail
#    殘留，清回 HEAD 以免污染隔天 git pull --rebase。**只清 src/**，不碰 reports/（本機記憶 actions.md）與 scripts/。
if [ -n "$(git status --porcelain -- src 2>/dev/null)" ]; then
  echo "[seo-brain] 清理 src/ 未提交殘留"
  git checkout -- src 2>/dev/null || true
  git clean -fdq -- src 2>/dev/null || true
fi

# 4) 失敗保底通報：claude 整段失敗/逾時時，內部 Slack 步驟多半沒跑到 → 本包裝補一則 🔴，
#    確保「大腦掛了」不會全靜默。DRY_RUN 不發。
if [ "$DRY_RUN" != "1" ] && [ "$CLAUDE_OK" = "0" ] && [ -x "$SLACK_NOTIFY" ]; then
  printf '%s' "🚦 今天要不要你出手：🔴 需要你看一下
:warning: *yao.care SEO 自動優化 $DATE — 執行中斷*
本機大腦層 headless 執行失敗或逾時，今日可能未完成優化/通報。
請查 log：/var/log/yaocare-seo-brain.log" | "$SLACK_NOTIFY" "$CHANNEL" >/dev/null 2>&1 \
    && echo "[seo-brain] 已發失敗保底 Slack" || echo "[seo-brain] 失敗保底 Slack 也送不出（查 token）"
fi

echo "===== [seo-brain] $DATE $(date '+%T %Z') 結束 ====="
