#!/bin/bash
# npm run publish／deploy 的最後一步（2026-11-15 起不再同步任何檔案）
#
# 網站由 GitHub Pages 提供、主機不再備援：push 到 main 後由 .github/workflows/pages.yml 建置並發布，
# 部署完也由它送 IndexNow。保留這支是因為 seo-ops 的大腦／反思和舊文件還會呼叫 npm run deploy；
# deploy 現在＝npm run build（全部守門）＋本訊息，build 失敗一樣會擋下。
echo "網站由 GitHub Pages 提供：push 到 main 即自動部署（見 .github/workflows/pages.yml），這裡不再 rsync。"
