# Wikidata 項目刪除：申訴卷宗

> 2026-07-26。方向由用戶拍板：**備齊獨立來源後重建**（不是整批拿掉 `sameAs`）。
> 本檔是申訴要用的事實與草稿。動手前先看第五節「誰要做什麼」——有一個卡點只有你能解。

## 一、確切發生了什麼

**2026-07-25T20:44:19Z**，管理員 `WikiBayer` 刪除了 5 個項目，關站紀錄由 `ZI Jony` 於 21:02 標記：

```
== Bulk deletion request for items created by Lightman.Chang ==
{{Rfd group/list|Q140692750|Q140320516|Q140319371|Q140265345|Q140265007|reason=WD:N}}
WD:N  IntensionalLogician 18:50, 25 July 2026 (UTC)
: {{deleted|admin=WikiBayer}}  ZI Jony 21:02, 25 July 2026 (UTC)
```

要點：

- **被刪的是 5 個，不是 2 個。** 已知 `Q140265007`（公司）、`Q140692750`（TwTxGNN）；另外三個 `Q140320516`／`Q140319371`／`Q140265345` 內容已無法讀取，需要你回想當初建了什麼。
- **提案理由只有「WD:N」三個字**，沒有任何針對本案的具體論證。
- **提案 18:50 → 刪除 21:02，相隔 3 小時 12 分。**
- 同一天同一位提案者用同樣格式掃了多個帳號（`Robbinschuchmann`、`AuthorityEngineData` 等），是整批清理，不是針對本公司的個案審查。

這些是申訴時可以陳述的程序事實，但**不能當成主要理由**——Wikidata 看的是有沒有來源，不是刪得快不快。

## 二、為什麼走申訴，不直接重建

- 同一帳號把剛被 RfD 刪掉的項目原樣建回去，會被視為規避刪除決議，可能導致帳號被封。
- 有新來源時，`Wikidata:Requests for undeletion` 就是設計來處理這種情況的正規管道。
- 重建會拿到**新的 QID**，36 個站台與官網現有的 `sameAs` 全部要跟著改；申訴成功則沿用原 QID，一個字都不用動。

## 三、手上的來源（逐條查證過，沒查到的不寫）

### ✅ 可用：發明專利（最強的一條）

| 項目 | 值 |
|------|-----|
| 公開號 | `TW202202123A`（2022-01-16 公開） |
| 公告號 | **`TWI749621B`**（2021-12-11 獲證） |
| 名稱 | 用藥提醒與回報系統及其實施方法 |
| **申請人** | **藥提醒科技有限公司**（公司本體，非個人） |
| 發明人 | 張饒輝、林信成 |
| 申請日 | 2020-07-03 |
| 公開查詢 | <https://patents.google.com/patent/TW202202123A/zh> |

**被第三方專利引用兩次**，兩家都與本公司無關：

- `US20220171983A1` — Lush Era Limited（2022）
- `US12002251B2` — Meiyo Medical Technology Inc（2024）

這是最有力的一條：專利局公告是政府機關的公開紀錄，申請人欄直接寫著公司法人名；而被別家公司的專利引用，是不折不扣的獨立第三方引用。

### ✅ 可用：經濟部商工登記公示資料

政府 open data API 即時查得，可重現：

```bash
curl "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?\$format=json&\$filter=Business_Accounting_NO%20eq%2083620786"
```

回傳：

```json
{"Business_Accounting_NO":"83620786","Company_Status_Desc":"核准設立",
 "Company_Name":"藥提醒科技有限公司","Responsible_Name":"黃金惠",
 "Company_Location":"臺中市西區民龍里臺灣大道二段220號12樓",
 "Register_Organization_Desc":"臺中市政府","Company_Setup_Date":"1090508"}
```

### ✅ 可用：Wikidata 自己就有台灣公司的基礎建設

`P7729`（統一編號 / GUI number）是既有屬性，描述寫明「臺灣營利事業機構的個別法人身分代號」，formatter URL 指向經濟部 `findbiz.nat.gov.tw`。

**目前有 1,375 個項目在使用這個屬性**（SPARQL 實查）。也就是說「台灣註冊公司 + 政府登記編號」在 Wikidata 上是有先例、有結構性位置的，不是孤例。

### ❌ 不能用：SNQ 國家品質標章

官網 `ORG_AWARDS` 有列，但：

1. 搜遍 snq.org.tw 找不到可公開查證的本公司認證條目，等於**沒有可引用的公開來源**。
2. 更關鍵：SNQ 證書原圖內文寫明「國軍臺中總醫院」，屬軍醫體系，公司既定原則是**一律不對外揭露**。

**申訴文裡不要提 SNQ。**

### ❌ 沒查到：媒體報導

WebSearch 查不到針對本公司的獨立新聞報導。搜到的 `twincn.com`（台灣公司網）只是政府登記資料的鏡像站，不算獨立報導。

### ❓ 沒查證成功：政府標案得標紀錄

g0v 標案瀏覽器的兩個 API 端點（`pcc.g0v.ronny.tw`、`pcc.mlwmlw.org`）目前都已失效，回 HTML 或 404。**如果公司確實有政府標案得標紀錄，這會是很有力的第三方來源**，但我沒查證到，所以不寫進申訴文。你若知道具體案名，可以從政府電子採購網撈出決標公告網址補進去。

## 四、兩個項目要分開處理（重要）

**`Q140265007`（公司）——申訴，案子站得住。** 專利局公告 + 經濟部登記 + 既有的 P7729 屬性先例，足以支撐 WD:N 第 2 條「clearly identifiable entity ... described using serious and publicly available references」。

**`Q140692750`（TwTxGNN）——建議先不申訴。** 這個平台目前**沒有任何獨立來源**：沒有媒體報導、沒有第三方收錄、沒有學術引用。它建立在哈佛 Zitnik Lab 發表於 Nature Medicine 的 TxGNN 模型之上，但那是**模型的**知名度，不是平台的。硬要一起申訴，反而會拖累公司那件的說服力。

實務作法：**公司項目申訴成功後**，TwTxGNN 可以先不要獨立項目，官網與 30 國站台的 `SoftwareApplication.sameAs` 拿掉 Wikidata 那條就好——其他邊（官網產品頁、GitHub repo）本來就都在。

## 五、誰要做什麼（我做不了的部分）

⛔ **這台主機的 IP 被 Wikimedia 全域封鎖**，我沒辦法代發申訴。

封鎖範圍：IPv4 `$HOST_IPV4_BLOCK_A`、`$HOST_IPV4_BLOCK_B`，IPv6 `2400:8904::/31`，理由 Open proxy/Webhost（針對 Linode 位址段，2026-07-23 生效、2028 到期）。登入會成功，但所有寫入回 `permissiondenied`。**不要用 proxy 規避，那違反 Wikimedia 政策。**

所以要你在**未被封鎖的網路**（家用網路、手機熱點都行）登入 `Lightman.Chang`，到 <https://www.wikidata.org/wiki/Wikidata:Requests_for_undeletion> 貼下面這段。

長期解法是替帳號申請 IPBE（IP block exemption），之後這台主機才能程式化寫入。

## 六、申訴文草稿（英文，直接貼）

```
== [[Q140265007]] ==

{{Undelete|Q140265007}}

This item (藥提醒科技有限公司 / yao.care, a company registered in Taichung, Taiwan)
was deleted on 2026-07-25 as part of a bulk nomination whose stated rationale was
"WD:N" with no case-specific argument. I am the creator of the item and I accept
that it was created without adequate sourcing. I would like to request undeletion
on the basis of the following serious and publicly available references, which
satisfy WD:N criterion 2:

1. Granted invention patent — Taiwan Intellectual Property Office
   Publication TW202202123A (2022-01-16), granted as TWI749621B (2021-12-11),
   "Medication reminding and reporting system and implementation method".
   The applicant of record is the company itself (藥提醒科技有限公司).
   https://patents.google.com/patent/TW202202123A/zh
   This patent has been cited by two unrelated third-party patents:
   - US20220171983A1 (Lush Era Limited, 2022)
   - US12002251B2 (Meiyo Medical Technology Inc, 2024)

2. Company registry — Ministry of Economic Affairs, Taiwan (open data API)
   GUI number 83620786, status 核准設立 (approved/active), registered
   2020-05-08 with the Taichung City Government.
   https://findbiz.nat.gov.tw/fts/query/QueryBar/queryInit.do?banNo=83620786

Both are government records, publicly retrievable, and independent of the
subject's own publications. Wikidata already models this class of entity:
P7729 (GUI number) is an established property with a formatter URL pointing at
the same Taiwanese registry, currently used on 1,375 items.

I am not requesting undeletion of the other items in that nomination.
I understand the concern about self-created items on one's own organisation and
will not re-create anything without sourcing. Thanks for reconsidering.
```

> 若之後查到政府標案決標公告，把網址補成第 3 條，說服力會再高一截。

## 七、如果申訴不成

Wikidata 對「只有登記資料 + 自家專利」的公司仍可能認定不足。若被拒：

- 不要再建一次。改為**先累積獨立來源**（媒體報導、政府標案決標公告、學術論文引用、第三方產業資料庫收錄），有了再申訴。
- 同時把 36 個站台與官網 `sameAs` 裡的 Wikidata 那一條拿掉——留著死連結沒有好處。這是一次性的批次改動，屆時我可以出一份跟前兩份同格式的交接文件。

## 八、連帶要修的（等申訴結果再動）

`sameAs` 目前指向已刪項目的位置：30 國 TxGNN 站台、6 個產品站、官網 `src/seo.config.ts` 的 `ORG_SAME_AS`。申訴成功則不用動；失敗則整批移除。

自動檢查已內建於 `scripts/entity-audit.mjs` D 段，`/etc/cron.d/yaocare-entity-audit` 於 2026-08-01 會跑並把結果發到 Slack。
