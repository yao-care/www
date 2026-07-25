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

在**未被封鎖的網路**（家用／公司網路）打開 <https://quickstatements.toolforge.org/#/batch>，用 Wikidata 帳號授權後貼上批次語法。語法用這個指令生成，不要手抄：

```bash
cd $WWW_REPO_DIR
./node_modules/.bin/tsx scripts/wikidata-txgnn.ts --quickstatements
```

分兩批：批次一 `CREATE` 新項目；批次二把批次一產生的 QID 填進 `Q140265007 P1830 <QID>`。**兩批都要跑完，只跑批次一等於只有單向邊，白做。**

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
| P856 official website | https://twtxgnn.yao.care/ |
| P1324 source code repository | https://github.com/yao-care/TwTxGNN |

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

核心關係已完整，以下是查核後發現的缺漏。都不影響「LLM 認得歸屬」這件事，但補上會讓項目更禁得起 notability 檢視。同樣用 QuickStatements 在未封鎖的網路執行：

```
Q140265007	P1830	Q140692750	S854	"https://www.yao.care/medical/txgnn/"
Q140692750	P973	"https://www.yao.care/medical/txgnn/"
Q140692750	P973	"https://apps.smarthealthit.org/app/twtxgnn-smart-app"
Q140692750	P275	Q334661
Q140265007	Lzh-tw	"藥提醒科技有限公司"
```

逐條理由：

| 語句 | 為什麼 |
|------|--------|
| `Q140265007 P1830 … S854` | 建立時反向那條**沒吃到 reference**（TwTxGNN 側的 P178/P127 都有，只有回指這條光禿禿）。QuickStatements 遇到已存在的 statement 會補 reference 上去，不會重複建立。 |
| `P973 → www.yao.care/medical/txgnn/` | 目前 Wikidata 這側**沒有任何一條指回官網產品頁**。官網那側的 `sameAs` 已經指過來了，補這條才對稱。 |
| `P973 → SMART App Gallery` | **notability 的關鍵**。這是 SMART Health IT（哈佛醫學院孵化的開源組織）的第三方目錄，實測 HTTP 200。若日後項目被提刪，非自家來源的背書是最有效的辯護，比再多自家連結都管用。 |
| `P275 → Q334661`（MIT License） | repo 的 LICENSE 確認是 MIT。授權資訊是軟體類項目的常規欄位，缺了會被 Wikidata 的品質檢查標記。 |
| `Q140265007 Lzh-tw` | 公司項目目前只有 `zh-hant` / `mul` / `en` 三個 label，缺 `zh-tw`。zh-tw 介面會 fallback 到 zh-hant，影響小，順手補。 |

**刻意不加的**：

- `P571`（inception）—— 沒有可靠日期。repo 建立於 2026-01-11、站台 schema 的 `datePublished` 寫 2026-02-19，但那是內容審核日不是平台上線日。寧可留空也不要填一個猜的數字進權威資料庫。若你知道實際上線日，格式是 `Q140692750 P571 +2026-01-11T00:00:00Z/11`。
- **其餘 29 國站台的獨立項目** —— 30 個近乎相同的項目會踩到 notability，而且沒有額外好處。各國站在自己的 schema 裡用 `sameAs` 指向 Q140692750 就夠了（見 `docs/txgnn-sites-entity-fix.md` 第八節）。
- `P144`（based on）→ 哈佛 TxGNN 模型 —— **Wikidata 上還沒有 TxGNN 模型的項目**。那篇 Nature Medicine 論文也還沒建項目。要補這條得先建模型項目，屬於另一件事。
