# 交接：推 main 自動上線（主機端設定）

> 2026-11-14，由雲端 session 準備。**請在主機上照順序做**，也可以直接把這份檔案交給主機上的 Claude Code 執行。
> 做完請把每一步的 `[ ]` 改成 `[x]`，最後一步的結果回報給雲端 session（或貼給用戶）。

## 要達成什麼

- 網站**繼續放在這台主機**，nginx、NPM #46 的 301 轉址都不動。
- 主機每天的新聞、seo-ops 反思／大腦排程**照常運作**。
- 以後在 Claude 雲端 session 改版，**推到 GitHub main 就好**：主機每 5 分鐘檢查一次，有新版本就自動拉下來、建置（含全部守門檢查）、上線，並通知 IndexNow。

## 這次 repo 裡改了什麼

| 檔案 | 改動 |
|------|------|
| `scripts/deploy-from-main.sh`（新增） | 每 5 分鐘由 cron 呼叫。沒有新版本就什麼都不做；有就 pull、build、rsync、IndexNow。說明寫在檔頭 |
| `scripts/fetch-news.sh` | 開頭先 `git pull --rebase`；推送前再 rebase 一次；部署完寫下已上線的版本。不改的話，04:30 會用舊程式碼建置，把雲端剛上線的改版蓋回去 |
| `CLAUDE.md` | 改版 SOP 補上「雲端 session 推 main 即上線」 |

`deploy-from-main.sh` 的保護機制（雲端已在沙盒逐項實測通過）：
1. 跟新聞排程、反思、大腦共用同一把鎖 `/tmp/seo-claude-yao.care.lock`（fd 200）。鎖被佔用就跳過，下一輪再試，不會同時改工作樹。
2. 工作樹有未提交的改動就不動，log 會寫是哪些檔。
3. 建置沒通過守門就不上線，網站維持原樣；同一個壞版本不會每 5 分鐘重跑，推新 commit 才會再試。
4. 主機有自己未推的 commit 時，會 rebase 到最新 main 再推回 GitHub。
5. 用內容比對（`rsync --checksum`）判斷哪些頁真的變了，只對那些頁送 IndexNow。

## 步驟

- [ ] **1. 確認工作樹乾淨、在 main**
  ```bash
  cd $WWW_REPO_DIR
  git status            # 應該沒有未提交的改動；有的話先查清楚是誰的
  git branch --show-current   # 應該是 main
  ```

- [ ] **2. 拉最新版**（含這次的腳本，以及還沒上線的 TxGNN 介紹頁改版）
  ```bash
  git pull --rebase origin main
  ls -l scripts/deploy-from-main.sh   # 應該存在且可執行；沒有 x 權限就 chmod +x
  ```

- [ ] **3. 先乾跑一次**：會拉 code，但不建置、不上線
  ```bash
  DRY_RUN=1 ./scripts/deploy-from-main.sh; echo "exit=$?"
  tail -5 /var/log/yaocare-deploy.log
  ```
  應該看到「DRY_RUN：會部署 …」。

- [ ] **4. 正式跑第一次**：這一步會把 TxGNN 介紹頁改版上線
  ```bash
  ./scripts/deploy-from-main.sh; echo "exit=$?"
  tail -20 /var/log/yaocare-deploy.log
  cat /var/lib/yaocare/www-deployed-sha
  ```
  - 應該看到「上線完成 <版本>」和 IndexNow 提交紀錄。
  - exit 不是 0 的話，看 log 的錯誤訊息；建置失敗時網站不會被動到。

- [ ] **5. 確認正式站**
  ```bash
  curl -s https://www.yao.care/medical/txgnn/ | grep -c "每一頁怎麼被檢查"   # 應該 ≥ 1
  curl -s https://www.yao.care/medical/txgnn/ | grep -c "17,676"             # 應該 0
  ```

- [ ] **6. 裝 cron**：加在現有的 `/etc/cron.d/www-yao-care`（content-gaps 排程也在這個檔）
  ```bash
  echo '*/5 * * * * root $WWW_REPO_DIR/scripts/deploy-from-main.sh >/dev/null 2>&1' >> /etc/cron.d/www-yao-care
  cat /etc/cron.d/www-yao-care
  ```
  ⚠ cron.d 的檔案最後一行要有換行；檔名不能有點。

- [ ] **7. 確認 seo-ops 反思與大腦推送前會先拉**
  ```bash
  grep -n "git pull\|git push\|npm run deploy" $SEO_OPS_DIR/bin/seo-reflect.sh $SEO_OPS_DIR/bin/seo-brain.sh
  ```
  - 兩支都要在 push 前做 `git pull --rebase origin main`。舊版大腦腳本有，反思要確認。
  - 沒有的話要補上，否則雲端推過的版本，它們推送會被拒，或用舊版建置把新版蓋回去。
  - （選做）它們 `npm run deploy` 之後加一行 `git rev-parse HEAD > /var/lib/yaocare/www-deployed-sha`，可省掉自動部署多跑一次建置。不加也沒關係：多跑那次內容相同，不會同步任何檔，也不會送 IndexNow。

- [ ] **8. 端對端測試**：從雲端 session 推一個無害的小改動到 main，等 5～10 分鐘
  ```bash
  tail -5 /var/log/yaocare-deploy.log   # 應該看到「開始部署」→「上線完成」
  ```
  再到正式站確認改動已出現。

- [ ] **9. 隔天早上確認新聞排程**
  ```bash
  tail -60 /var/log/yaocare-news.log    # 04:30 那輪：開頭 pull、commit、push 都成功
  tail -5 /var/log/yaocare-deploy.log   # 不該出現「工作樹有未提交的改動」反覆跳過
  ```

## 回報格式

步驟 1～9 各一行：通過／失敗，失敗附 log 片段。

## 之後怎麼用

- **雲端 session 改版**：改完、建置通過，推到 main，5 分鐘左右自動上線，不用上主機。
- **看部署紀錄**：`tail -50 /var/log/yaocare-deploy.log`
- **強制重新部署**（例如版本沒變但想重建）：`FORCE=1 $WWW_REPO_DIR/scripts/deploy-from-main.sh`
- **暫停自動部署**：把 `/etc/cron.d/www-yao-care` 那一行前面加 `#`。
- **某版建置失敗**：log 會寫「建置失敗…不再自動重試」。修好推新 commit 就會重跑；或修主機環境後用 `FORCE=1` 重試同一版。

## 回滾

- 拿掉 cron 那一行，自動部署就停止。
- `fetch-news.sh` 的改動只多了 pull 與寫狀態檔，不影響原本流程，不需要還原。
- 要退回某個網站版本：在主機 `git revert <commit>` 後推上去，自動部署會上線退回後的版本；或照舊手動 `npm run deploy`。
