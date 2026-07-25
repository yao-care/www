# Wikidata：把 TwTxGNN 掛回藥提醒科技有限公司

> ✅ **2026-07-25 已完成**：TwTxGNN 項目 = **[Q140692750](https://www.wikidata.org/wiki/Q140692750)**，
> 由使用者在自有網路（非本主機）建立。雙向邊已成立：
> `Q140692750 --P178/P127--> Q140265007`，`Q140265007 --P1830--> Q140692750`。
> 本檔以下的封鎖說明與操作路徑保留，供日後維護該項目時參考。
> 尚可補強的欄位見文末「後續補強」。

## 為什麼要做

用 LLM 問「台灣老藥新用研究報告的公司，你會推薦哪一間？」時，模型會答 TwTxGNN，但**不知道那是藥提醒科技有限公司做的**。

原因是 TwTxGNN 那一側完全沒有回到公司的邊：站台 schema 把自己宣告成獨立 `Organization`、正文只有 footer 一行 `Copyright © 2026 Yao.Care`、Wikidata 也沒有這條產品關係。Wikidata 是 LLM 與搜尋引擎做實體消歧最先吃的節點，補這條邊槓桿最高。

## 目標關係（雙向，缺一邊都不算成立）

```
TwTxGNN(新項目) --P178 developer--> Q140265007（藥提醒科技有限公司）
TwTxGNN(新項目) --P127 owned by---> Q140265007
Q140265007      --P1830 owner of--> TwTxGNN(新項目)
```

兩條 developer/owned by 都附 `S854`（reference URL）指向 <https://www.yao.care/medical/txgnn/> —— 官網明列本平台歸屬的頁面，讓這條聲明有可查證的出處。

## ⚠ 本主機無法用 API 寫入（2026-07-23 起）

這台 Linode 主機的 IPv4（`$HOST_IPV4`）與 IPv6（`$HOST_IPV6_PREFIX…`）**都在 Wikimedia 全域封鎖名單內**：

| 封鎖對象 | 起訖 | 理由 |
|---------|------|------|
| `2400:8904::/31` | 2026-07-23 → 2028-07-23 | Open proxy/Webhost（針對 Linode IP 段） |
| `$HOST_IPV4_BLOCK_A` | 2026-07-23 → 2028-07-23 | 同上 |
| `$HOST_IPV4_BLOCK_B` | 2026-01-26 → 2029-01-26 | 同上 |

實測結果：登入成功，但**所有寫入一律回 `permissiondenied`**（blockinfo 帶 `blocknocreate`），連編輯既有項目都不行。

> 這解釋了為何 2026-06-17／06-18／06-30 的 `wikidata-enrich.ts` 都跑得通，現在卻不行 —— 封鎖是 07-23 才生效的。
>
> 規避封鎖違反 Wikimedia 政策，不要嘗試用 proxy 繞過。

## 三條可行路徑（擇一）

### 1. QuickStatements（最省事，瀏覽器操作）

在**未被封鎖的網路**（家用／公司網路）用瀏覽器操作。語法用這個指令生成，不要手抄：

```bash
cd $WWW_REPO_DIR
./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --quickstatements
```

腳本會先查 Wikidata（唯讀，不受封鎖影響）決定該產哪種語法：項目**還不存在**時產 `CREATE` 批次；**已存在**時直接以該 QID 為主語產補強語句。逐步操作見文末「怎麼加」。

### 2. 換一台機器跑同一支腳本

腳本本身是冪等的，在沒被封鎖的機器上直接跑就會自動處理「建立項目 → 補 claims → 回頭在 Q140265007 補 P1830」全流程：

```bash
./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --dry-run   # 先看 payload
./node_modules/.bin/tsx scripts/wikidata-txgnn.ts             # 實際寫入
```

需要把憑證 `$YAOCARE_SECRETS_DIR/wikidata.json` 一併帶過去（內含 Bot password，注意保護）。

### 3. 申請 IP block exemption（長期解）

替帳號 `Lightman.Chang` 申請 IPBE，之後本主機即可恢復 API 寫入，`wikidata-enrich.ts` 與本腳本都能重新自動化。申請入口見 <https://meta.wikimedia.org/wiki/Steward_requests/Global_permissions>。

## 項目內容（腳本內的單一來源）

| 欄位 | 值 |
|------|-----|
| label（en / zh-hant / zh-tw） | TwTxGNN |
| description（en） | drug repurposing prediction platform for Taiwan-approved medicines, developed by yao.care |
| description（zh-hant / zh-tw） | 藥提醒科技有限公司開發的台灣核准藥品老藥新用預測平台 |
| 別名（zh-hant） | TwTxGNN 老藥新用驗證報告、TxGNN 老藥新用、老藥新用驗證報告 |
| 別名（en） | yao.care TxGNN、TxGNN Taiwan、TwTxGNN drug repurposing report |
| P31 instance of | Q189210（web application）、Q7094076（online database） |
| P178 developer | Q140265007 ＋ reference |
| P127 owned by | Q140265007 ＋ reference |
| P17 country | Q865（Taiwan） |
| P921 main subject | Q5308921（drug repositioning） |
| P2283 uses | Q107750691（graph neural network） |
| P275 copyright license | Q334661（MIT License，repo LICENSE 確認） |
| P571 inception | 2026-02-09（GitHub Pages 首次部署，見下方考證） |
| P856 official website | https://twtxgnn.yao.care/ |
| P1324 source code repository | https://github.com/yao-care/TwTxGNN |
| P973 described at URL | https://www.yao.care/medical/txgnn/（官網產品頁） |
| P973 described at URL | https://apps.smarthealthit.org/app/twtxgnn-smart-app（第三方目錄） |

改內容一律改 `scripts/wikidata-txgnn.ts` 上方常數，QuickStatements 語法與 API 寫入都從那裡生成。

## notability 提醒

Wikidata 對「自家產品項目」不是無條件收。TwTxGNN 有公開站台、GitHub 開源、SMART on FHIR App Gallery 上架，符合 [Wikidata:Notability](https://www.wikidata.org/wiki/Wikidata:Notability) 第 2 條（可清楚辨識且有可公開參照的來源）。若日後被提刪，補上第三方報導或學術引用是最有效的辯護；不要靠增加自家連結硬撐。

## 完成後怎麼驗

```bash
# 新項目要有 P178/P127 指向 Q140265007
curl -s "https://www.wikidata.org/wiki/Special:EntityData/<新QID>.json" | \
  python3 -c "import json,sys;d=json.load(sys.stdin)['entities']['<新QID>'];print([p for p in d['claims']])"

# 公司項目要有 P1830 指回新項目
curl -s "https://www.wikidata.org/wiki/Special:EntityData/Q140265007.json" | \
  python3 -c "import json,sys;d=json.load(sys.stdin)['entities']['Q140265007'];print([c['mainsnak']['datavalue']['value']['id'] for c in d['claims'].get('P1830',[])])"
```

兩邊都查得到才算關係成立。

## 後續補強（2026-07-25 盤點）

核心關係建立時已成立，以下是事後查核發現的缺漏。都不影響「LLM 認得歸屬」這件事，但補上會讓項目更禁得起 notability 檢視。

| 要補的 | 為什麼 |
|--------|--------|
| `Q140265007` 的 `P1830` 補 reference | 建立時反向那條**沒吃到出處**（TwTxGNN 側的 P178/P127 都有，只有回指這條光禿禿）。沒出處的聲明在 Wikidata 容易被其他編輯者質疑或移除 |
| `P973` → 官網產品頁 | Wikidata 這側**沒有任何一條指回 www.yao.care**。官網那側的 `sameAs` 已經指過來了，補這條才對稱 |
| `P973` → SMART App Gallery | **notability 的主要辯護**。SMART Health IT（哈佛醫學院孵化）的第三方目錄，實測 HTTP 200。項目被提刪時，非自家來源比再多自家連結都管用 |
| `P275` → Q334661（MIT） | repo 的 LICENSE 確認是 MIT。授權是軟體類項目的常規欄位，缺了會被 Wikidata 品質檢查標記 |
| `P571` → 2026-02-09 | 見下方考證 |
| `Q140265007` 的 `zh-tw` label | 公司項目只有 `zh-hant` / `mul` / `en`，缺 `zh-tw`。介面會 fallback，影響小，順手補 |

### P571（inception）的日期考證

四個候選日期，只有一個對：

| 日期 | 是什麼 | 可查證來源 |
|------|--------|-----------|
| 2026-01-11 | repo 建立 | GitHub API `created_at` ——**只是開始寫程式的日子** |
| **2026-02-09** | **GitHub Pages 首次部署**——站台第一次真的存在於網路上 | `GET /repos/yao-care/TwTxGNN/deployments?per_page=100&page=2` 最早一筆 `2026-02-09T02:17:51Z`（共 153 筆，要翻到最後一頁才看得到） |
| 2026-02-11 | CNAME 加入，`twtxgnn.yao.care` 這個網址開始生效 | commit `Add custom domain CNAME for twtxgnn.yao.care` |
| 2026-02-19 | 站台 schema 的 `datePublished` / `lastReviewed` | 寫死在 `head_custom.html`，套用在**所有**藥品頁上——是內容審核基準日，不是上線日 |

採 **2026-02-09**：`P571` 對「平台」這個實體問的是它何時開始存在，首次部署就是那一刻，而且第三方可從 GitHub API 查證。若認為該以自訂網域生效為準，改 `2026-02-11` 也站得住，差兩天。

Wayback Machine 無法佐證——`twtxgnn.yao.care` 從未被爬存（CDX 查詢無任何快照）。

### 刻意不加的

- **其餘 29 國站台的獨立項目**——30 個近乎相同的項目會踩到 notability，而且沒有額外好處。各國站在自己的 schema 用 `sameAs` 指向 Q140692750 就夠了（見 `docs/txgnn-sites-entity-fix.md` 第八節）。
- `P144`（based on）→ 哈佛 TxGNN 模型——**Wikidata 上還沒有 TxGNN 模型的項目**，那篇 Nature Medicine 論文也沒有。要補這條得先建模型項目，屬於另一件事。

## 怎麼加

### 步驟

1. **在未被封鎖的網路**（家用／公司網路，**不是**這台主機）開瀏覽器。
2. 打開 <https://quickstatements.toolforge.org/#/batch>。
3. 右上角點 **Log in** → 用 Wikidata 帳號授權（OAuth，第一次會跳同意頁，之後記住）。
4. 確認頁面上方的格式選擇是 **V1**（不是 CSV）。
5. 把批次語法**整份貼進大文字框**。
6. 按 **Import V1 commands** → 再按 **Run**（或 **Run in background**）。
7. 執行完會逐行顯示綠色 ✓ 或紅色錯誤。

### 整份貼上是安全的

腳本輸出的是**完整清單**，包含已經建好的那些（P31、P178、P856…）。QuickStatements 遇到已存在且值相同的敘述會**跳過**，不會重複建立；遇到已存在但缺 reference 的，會**把 reference 補上去**——`Q140265007 P1830` 那條正是靠這個行為修好的。所以不必自己挑哪幾行要貼。

### 兩個常見的坑

- **Tab 會變空格。** V1 語法用 Tab 分隔欄位，從網頁或聊天視窗複製時 Tab 常被轉成空格，貼上後會整批失敗。保險做法是用產出的 `.txt` 檔（`scripts/wikidata-txgnn.ts --quickstatements > batch.txt`）或用下面的直連網址。
- **日期格式**。`+2026-02-09T00:00:00Z/11` 結尾的 `/11` 是精確度（11 = 精確到日），不能省。

### 免貼上的直連網址

QuickStatements 支援把指令編碼進網址，點開就自動填好，省掉複製貼上與 Tab 問題：

```bash
./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --quickstatements | \
  python3 -c "
import sys, urllib.parse
rows = [l for l in sys.stdin.read().split('\n') if l and (l[0] == 'Q' or l == 'CREATE' or l.startswith('LAST'))]
print('https://quickstatements.toolforge.org/#/v1=' + urllib.parse.quote('\n'.join(rows), safe=''))
"
```

打開產出的網址 → 授權 → 按 **Run**。

### 或者手動加（六、七條而已）

不想碰工具的話，直接在 Wikidata 網頁上編輯也行：打開 <https://www.wikidata.org/wiki/Q140692750>，按 **+ 新增敘述**，屬性欄輸入 `P973`、值貼網址，存檔。reference 則是點該敘述下方的 **+ 新增參考資料**，屬性選 `P854`（reference URL）。條數不多，手動反而直觀，缺點是沒有紀錄可重跑。
