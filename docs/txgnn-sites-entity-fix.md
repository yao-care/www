# 30 國 TxGNN 站台：把平台掛回藥提醒科技有限公司

> 給各 `*TxGNN` repo 的維護者（含 AI agent）照做的修改清單。
> 出處：`yao-care/www` repo 的 `docs/txgnn-sites-entity-fix.md`，2026-07-25。

## 一、問題是什麼

用 LLM 問「台灣老藥新用研究報告的公司，你會推薦哪一間？」，模型會答「第一推薦 TwTxGNN」——**但不知道 TwTxGNN 是藥提醒科技有限公司（yao.care）做的**。

實測 30 個站台，原因一致：

**1. 站台 schema 把自己宣告成一個獨立組織。** 每一站的 `head_custom.html` 都有這樣一段：

```json
{
  "@type": "Organization",
  "@id": "https://twtxgnn.yao.care/#organization",
  "name": "TwTxGNN",
  "description": "基於哈佛 TxGNN 模型的老藥新用預測平台",
  "sameAs": ["https://github.com/yao-care/TwTxGNN"]
}
```

`publisher` 指向這個節點、`author` 是 `Person: "TwTxGNN Team"`（一個不存在的人）。**沒有 `parentOrganization`、沒有任何欄位提到公司。** 機器讀到的結論就是「TwTxGNN 是一家自己的組織」——它照著 schema 說的話回答，沒有錯。30 站無一例外。

**2. 可見正文沒有公司全名。** 全站唯一提到的地方是 footer 的 `Copyright © 2026 Yao.Care`，而且是字串 `Yao.Care`，不是「藥提醒科技有限公司」。`about` 頁通篇不提公司。更糟的是有 8 站連 `Yao.Care` 都沒有（見下表）。

**3. 關係是單向的。** `www.yao.care` 那側早就把 30 國站台都放進 `Organization.sameAs`，但**各國站沒有任何一條邊指回來**。實體圖要雙向才成立；LLM 是從 TwTxGNN 那頭出發的，走不回去。

## 二、實測現況（2026-07-25，各站差異）

| 站台 | schema Organization name | footer 現況 | 嚴重度 |
|------|--------------------------|-------------|--------|
| tw / jp / sg / th / nz / de / fr / it / es / ch / se / no / fi / br / ar / co / sa | `{Cc}TxGNN` | `Yao.Care`（品牌，無法人全名） | 中 |
| **kr / ph / in / us / nl / dk / eu / za / my** | `{Cc}TxGNN` | **`{Cc}TxGNN Project`（完全無公司）**。my 是馬來文版的同一句：`Projek MyTxGNN` | **高** |
| **hk / au / ca / uk** | `{Cc}TxGNN` | **`_config.yml` 根本沒有 `footer_content`**——Just the Docs 沒設就不顯示 footer，這 4 站連 copyright 都沒有，要新增整行 | **高** |

粗體那 13 站請優先處理。

repo 結構已抽樣查證（jp / us / de / kr / za / eu / ch）：全部一致——`docs/_includes/head_custom.html` 存在、預設分支都是 `main`，所以下面的檔案路徑對 30 站都適用。

> ⚠ **repo 名稱大小寫不統一**，`gh repo edit` 時要用正確的名字：
> `ARTxGNN` `AuTxGNN` `BrTxGNN` `CHTxGNN` `COTxGNN` `CaTxGNN` `DETxGNN` `DkTxGNN` `ESTxGNN` `EuTxGNN` `FITxGNN` `FRTxGNN` `HkTxGNN` `ITTxGNN` `InTxGNN` `JpTxGNN` `KrTxGNN` `MyTxGNN` `NOTxGNN` `NZTxGNN` `NlTxGNN` `PhTxGNN` `SATxGNN` `SETxGNN` `SgTxGNN` `ThTxGNN` `TwTxGNN` `UkTxGNN` `UsTxGNN` `ZaTxGNN`

## 三、目標關係

改完之後，這三條邊都要存在：

```
各國站 WebSite/Article/MedicalWebPage
    --publisher/author--> https://www.yao.care/#organization   ← 公司（跨網域共用同一個 @id）

各國站 SoftwareApplication
    --publisher/author/creator--> https://www.yao.care/#organization
    --sameAs--> https://www.yao.care/medical/txgnn/（官網產品頁）

正文（about 頁 + footer + README）
    明寫「藥提醒科技有限公司（yao.care）開發與維運」
```

**`@id` 用 `https://www.yao.care/#organization` 是關鍵**，不要用各自網域的 `#organization`。同一個 `@id` 才會讓 31 個網域被合併成同一個實體；官網那側已經用這個 `@id` 輸出完整的 Organization 節點（含 `legalName`、`taxID`、Wikidata `sameAs`）。

## 四、公司資料（30 站完全相同，逐字照抄，不要改寫也不要翻譯）

| 欄位 | 值 |
|------|-----|
| `@id` | `https://www.yao.care/#organization` |
| `name` | `yao.care` |
| `legalName` | `藥提醒科技有限公司` |
| `alternateName` | `藥提醒` |
| `url` | `https://www.yao.care` |
| `taxID` | `83620786` |
| Wikidata | `https://www.wikidata.org/wiki/Q140265007` |
| GitHub 組織 | `https://github.com/yao-care` |
| Google 商家 | `https://www.google.com/maps?cid=12025785010180313919` |
| 地址 | 台中市西區台灣大道二段220號12樓 |
| Email | `service@yao.care` |

> ⚠ **不要自己翻譯公司名。** 法人名稱只有中文登記名「藥提醒科技有限公司」。英文一律用 `yao.care`，**不要**寫成 `Yaocare Technology Co., Ltd.`、`Medicine Reminder Technology` 之類自創譯名——30 站各自杜撰一個英文名，反而會製造新的實體歧義。非中文語系的站也照樣保留中文全名，後面加 `(yao.care)`。

## 五、要改的檔案

### 5-1. `docs/_includes/head_custom.html` — schema（最重要）

這個檔用 Liquid 分支輸出各頁 schema（`page.evidence_level` 藥品頁 / `/` 首頁 / `/about/` / `/methodology/` / `/drugs/` / `/news/` 等）。**每一個分支裡的 `Organization` 節點都要處理**，不要只改首頁。

**(a) 刪掉「站台自己是一個組織」的節點，換成公司節點。**

```diff
-    {
-      "@type": "Organization",
-      "@id": "{{ site.url }}/#organization",
-      "name": "TwTxGNN",
-      "url": "{{ site.url }}/",
-      "description": "基於哈佛 TxGNN 模型的老藥新用預測平台",
-      "logo": { "@type": "ImageObject", "url": "{{ site.url }}/assets/images/og-default.png" },
-      "sameAs": ["https://github.com/yao-care/TwTxGNN"],
-      "knowsAbout": ["Drug Repurposing", "..."]
-    },
+    {
+      "@type": ["Organization", "MedicalOrganization"],
+      "@id": "https://www.yao.care/#organization",
+      "name": "yao.care",
+      "legalName": "藥提醒科技有限公司",
+      "alternateName": "藥提醒",
+      "url": "https://www.yao.care",
+      "taxID": "83620786",
+      "email": "service@yao.care",
+      "logo": { "@type": "ImageObject", "url": "https://www.yao.care/assets/images/logo.png" },
+      "address": {
+        "@type": "PostalAddress",
+        "streetAddress": "台灣大道二段220號12樓",
+        "addressLocality": "台中市西區",
+        "addressCountry": "TW"
+      },
+      "sameAs": [
+        "https://www.wikidata.org/wiki/Q140265007",
+        "https://github.com/yao-care",
+        "https://www.google.com/maps?cid=12025785010180313919",
+        "https://www.yao.care/medical/txgnn/"
+      ]
+    },
+    {
+      "@type": ["SoftwareApplication", "WebApplication"],
+      "@id": "{{ site.url }}/#software",
+      "name": "TwTxGNN",
+      "alternateName": "TwTxGNN 老藥新用驗證報告",
+      "url": "{{ site.url }}/",
+      "applicationCategory": "HealthApplication",
+      "operatingSystem": "Web",
+      "isAccessibleForFree": true,
+      "publisher": { "@id": "https://www.yao.care/#organization" },
+      "author": { "@id": "https://www.yao.care/#organization" },
+      "creator": { "@id": "https://www.yao.care/#organization" },
+      "copyrightHolder": { "@id": "https://www.yao.care/#organization" },
+      "sameAs": [
+        "https://www.yao.care/medical/txgnn/",
+        "https://github.com/yao-care/TwTxGNN"
+      ]
+    },
```

把 `TwTxGNN` 換成自己站的品牌名（`JpTxGNN`／`UsTxGNN`…），`https://github.com/yao-care/TwTxGNN` 換成自己的 repo 網址。`{{ site.url }}` 沿用 `_config.yml` 的設定即可。

**(b) 所有 `publisher` / `author` 改成引用公司節點。**

```diff
-      "author": { "@type": "Organization", "name": "TwTxGNN Team", "url": "https://twtxgnn.yao.care/" },
-      "publisher": { "@type": "Organization", "name": "TwTxGNN", "url": "https://twtxgnn.yao.care/", "logo": {...} },
+      "author": { "@id": "https://www.yao.care/#organization" },
+      "publisher": { "@id": "https://www.yao.care/#organization" },
```

首頁 `Article` 節點原本已經寫 `{"@id": "…/#organization"}` 的，只要把 `@id` 字串換成 `https://www.yao.care/#organization` 就好。

**(c) `reviewedBy` 改成公司，不要留假團隊名。**

```diff
-      "reviewedBy": { "@type": "Organization", "name": "TwTxGNN Research Team" },
+      "reviewedBy": { "@id": "https://www.yao.care/#organization" },
```

同理 `head_custom.html` 上方的 meta：

```diff
-<meta name="reviewed-by" content="TwTxGNN Research Team">
+<meta name="reviewed-by" content="藥提醒科技有限公司 (yao.care)">
```

**(d) `WebSite` 節點加 `isPartOf` 之外，也把 `publisher` 指向公司**（多數站已經是 `@id` 引用，改字串即可）。

### 5-2. `docs/_config.yml` — 作者與 footer

```diff
 author:
-  name: TwTxGNN Team
-  url: https://twtxgnn.yao.care/about/
+  name: 藥提醒科技有限公司 (yao.care)
+  url: https://www.yao.care/

-footer_content: "Copyright &copy; 2026 Yao.Care. 本報告僅供研究參考，不構成醫療建議。"
+footer_content: "Copyright &copy; 2026 藥提醒科技有限公司 (yao.care). 本站由藥提醒科技有限公司開發與維運。本報告僅供研究參考，不構成醫療建議。"
```

- `author.name` 被 `jekyll-seo-tag` 用來產生 meta 與 schema，是低成本高回報的一處。
- footer 的免責聲明沿用各站原本的語言（日文站保留日文、泰文站保留泰文），**只把 `Yao.Care` / `{Cc}TxGNN Project` 換成 `藥提醒科技有限公司 (yao.care)`**。
- 前述抓不到 footer 的 5 站（hk / my / au / ca / uk）請確認 `footer_content` 是否存在，沒有就補上。

### 5-3. `docs/about.md` — 正文（LLM 讀正文的權重高於 schema）

在頁面開頭或「關於專案」段落補一段，用各站自己的語言：

```markdown
## 關於開發單位

本平台由**藥提醒科技有限公司**（yao.care，統一編號 83620786，地址：台中市西區台灣大道二段220號12樓）開發與維運。

TwTxGNN 是該公司「TxGNN 老藥新用」產品線的台灣站。同一套系統已部署於 30 個國家／地區，
各站依 `{國碼}TxGNN` 命名（JpTxGNN、UsTxGNN、DeTxGNN…），網址格式為 `{國碼}txgnn.yao.care`。
產品總覽見 <https://www.yao.care/medical/txgnn/>。

TxGNN 模型本身由哈佛醫學院 Zitnik Lab 開發並發表於 Nature Medicine；
本平台是藥提醒科技有限公司以該模型為基礎建置的落地系統，負責各國藥證資料串接、
知識圖譜與深度學習雙引擎預測、PubMed／ClinicalTrials 證據分級，以及 SMART on FHIR 電子病歷整合。
```

最後一段（模型 vs 平台）**不要省**。它同時解決兩件事：說清楚歸屬，也避免宣稱模型是自己做的。

### 5-4. `README.md` — GitHub 是高權重實體來源

在最上方加一行：

```markdown
> 本專案由 **藥提醒科技有限公司**（[yao.care](https://www.yao.care)）開發與維運。
> 台灣站：<https://twtxgnn.yao.care/>｜產品總覽：<https://www.yao.care/medical/txgnn/>
```

### 5-5. GitHub repo 設定（About 區塊）

目前 30 個 repo 中有 22 個 `description` 是空的、`homepage` 全部是空的。這是免費的實體訊號，請一併補上：

```bash
gh repo edit yao-care/TwTxGNN \
  --description "TwTxGNN — 台灣核准藥品老藥新用預測與證據驗證平台，由藥提醒科技有限公司 (yao.care) 開發" \
  --homepage "https://twtxgnn.yao.care/" \
  --add-topic drug-repurposing --add-topic txgnn --add-topic yao-care --add-topic healthcare-ai
```

各國站把描述換成自己的國家與主管機關（例：`JpTxGNN — 日本 PMDA 承認薬の Drug Repurposing 予測プラットフォーム。藥提醒科技有限公司 (yao.care) 開発`）。

## 六、不要做的事

- **不要動 `sitemap.xml` / `robots.txt` 的 `Sitemap:` 行。** 各國站的 `Sitemap:` 必須指向自己的網域（歷史上曾有 13 國誤指 twtxgnn／sgtxgnn，已修過一次）。
- **不要把 `@id` 改成各自網域的 `#organization`。** 那樣就變成 30 個不同的公司實體，比現在更糟。
- **不要自創公司英文名**（見第四節）。
- **不要改動藥品資料、預測數字、證據等級。** 這次只碰歸屬與 schema。
- **不要新增外部 CDN 或改 CSP。** `head_custom.html` 上方的 CSP 保持原樣。
- **不要宣稱與哈佛的合作關係。** 只能說「以 Zitnik Lab 發表的 TxGNN 模型為基礎」，這是事實；「合作」不是。

## 七、驗收

改完部署後，逐站跑：

```bash
SITE=twtxgnn.yao.care

# 1. schema 裡要出現公司的 @id 與法人全名，且不該再有站台自封的 Organization
curl -s "https://$SITE/" | grep -o 'https://www.yao.care/#organization' | head -1
curl -s "https://$SITE/" | grep -o '藥提醒科技有限公司' | head -1
curl -s "https://$SITE/" | python3 -c "
import sys,re,json
h=sys.stdin.read()
for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S):
    try: d=json.loads(m)
    except: continue
    for n in (d.get('@graph') or [d]):
        if 'Organization' in str(n.get('@type','')):
            print(n.get('@id'), '|', n.get('name'), '|', n.get('legalName'))
"
# 期待輸出：https://www.yao.care/#organization | yao.care | 藥提醒科技有限公司
# 不該再看到：name = TwTxGNN / JpTxGNN / …

# 2. 正文與 footer 要有法人全名
curl -s "https://$SITE/about/" | grep -c '藥提醒科技有限公司'   # 應 ≥ 1
curl -s "https://$SITE/" | grep -oE 'Copyright[^<]*'            # 不該再有 "{Cc}TxGNN Project"
```

三項全過才算完成。只改 schema 不改正文，效果會打折——LLM 讀正文的權重高於結構化資料。

## 八、對應的官網側改動（已完成，供對照）

`www.yao.care` 這側在 2026-07-25 同步做了：

- `Organization` 節點抽成單一來源並**補進產品頁**（過去 `ProductLayout` 不經 `BaseLayout`，12 個產品頁的 `@graph` 裡根本沒有 Organization 節點，`publisher` 指向一個頁面上不存在的組織）。
- `SoftwareApplication` 加 `@id`、`alternateName: ["TwTxGNN", …]`，`publisher`/`author`/`creator`/`copyrightHolder` 全部指向 `https://www.yao.care/#organization`；公司節點以 `owns` 指回產品，形成雙向。
- 產品頁正文、`/glossary/txgnn/`、`/llms.txt`、`/llms-full.txt` 全部帶入 `TwTxGNN` 品牌名與 30 國站名對照表，並明寫開發單位。
- FAQ 新增「TwTxGNN 是誰開發的？」與「TwTxGNN 跟哈佛的 TxGNN 是同一個東西嗎？」——FAQPage 是 LLM 最容易直接引用的格式。

Wikidata 的 TwTxGNN 項目已於 2026-07-25 建立：**[Q140692750](https://www.wikidata.org/wiki/Q140692750)**（`P178 developer` → `Q140265007`，公司側 `P1830 owner of` 回指）。詳見 `docs/wikidata-txgnn.md`。

**請把這兩條補進各站 `SoftwareApplication.sameAs`**（第 5-1 節的範本記得一併更新）：

```json
"sameAs": [
  "https://www.yao.care/medical/txgnn/",
  "https://github.com/yao-care/TwTxGNN",
  "https://www.wikidata.org/wiki/Q140692750"
]
```

`Q140692750` 這條**台灣站以外的各國站也照加**——它標示的是「這個平台屬於誰」，不是「這是哪一國的站」。Wikidata 是搜尋引擎與 LLM 做實體消歧最先吃的節點，指過去等於直接告訴機器「這個平台的 developer 是 Q140265007」。

---

## 九、第一輪驗收結果（2026-07-25，30 站實測）

30 站全部逐站抓線上 HTML 驗過（首頁 / about / methodology / drugs / 藥品詳細頁 / robots）。**第五節交辦的事項全數完成**，但驗收過程查出**三個第一版指示沒交代到的洞**，其中一個是我們自己的指示造成的。

### 9-1. 已完成（30/30 全過）

| 項目 | 結果 |
|------|------|
| 首頁 Organization `@id` = `https://www.yao.care/#organization` | ✅ 30/30，且**站台自封的 `{Cc}TxGNN` Organization 節點已全數消失** |
| `legalName: 藥提醒科技有限公司` | ✅ 30/30 |
| `SoftwareApplication` 節點（publisher/author/creator/copyrightHolder → 公司 `@id`） | ✅ 30/30 |
| `SoftwareApplication.sameAs` 含 `https://www.yao.care/medical/txgnn/` | ✅ 30/30 |
| about 頁正文出現法人全名 | ✅ 30/30（6～13 次） |
| footer 有法人全名 | ✅ 30/30（含原本沒有 `footer_content` 的 hk/au/ca/uk，及 my 的馬來文 `Hak Cipta © 2026 藥提醒科技有限公司 (yao.care)`） |
| `meta name="reviewed-by"` | ✅ 30/30 = `藥提醒科技有限公司 (yao.care)` |
| README 開頭掛公司 | ✅ 30/30 |
| GitHub repo description / homepage / topics | ✅ 30/30 全補齊（含 `yao-care` topic） |
| robots.txt `Sitemap:` 仍指自己網域（紅線） | ✅ 30/30，沒被誤動 |

### 9-2. 洞一（我們的鍋，30/30）：`_config.yml` 的 `author:` 讓公司變成「一個人」

第 5-2 節叫大家把 `author.name` 改成公司名。照做之後 `jekyll-seo-tag` 產出的是：

```json
{ "@type": "WebPage",
  "author": { "@type": "Person", "name": "藥提醒科技有限公司 (yao.care)", "url": "https://www.yao.care/" } }
```

**`@type` 是 `Person`。** jekyll-seo-tag 的 `author` 永遠輸出 Person，沒有參數可改成 Organization。結果是 30 站的**每一頁**（含約 8,000 個藥品頁）都在宣告「藥提醒科技有限公司是一個自然人」——比原本的 `TxGNN Team` 更糟，因為它現在用的是真正的法人全名，會直接污染實體圖。

**修法：把 `docs/_config.yml` 的 `author:` 整段刪掉。**

```diff
-# 作者資訊 (E-E-A-T)
-author:
-  name: 藥提醒科技有限公司 (yao.care)
-  url: https://www.yao.care/
```

歸屬訊號由 `head_custom.html` 的 Organization 節點 + footer + about 正文承擔，已經足夠；seo-tag 那個 Person 節點只有反效果。**`footer_content` 保留不動。**

### 9-3. 洞二（30/30）：Organization 節點只出現在首頁，其他頁的 `@id` 是斷的

`head_custom.html` 的 Liquid 分支裡，Organization + SoftwareApplication 只寫在 `{% elsif page.url == '/' %}` 那一支。實測：

- `/methodology/`、`/drugs/`：`@graph` 只有 HowTo / CollectionPage / ItemList / BreadcrumbList，**連一條指向公司的邊都沒有**，是孤兒節點。
- 藥品詳細頁（`page.evidence_level`，每站 191～279 頁，全站最大宗）：`MedicalWebPage` 的 `author`/`publisher`/`reviewedBy` 寫的是 `{"@id": "https://www.yao.care/#organization"}`，方向對，**但該頁上沒有任何節點定義這個 `@id`**——參照懸空，抓取器只拿得到一個沒有名字的識別碼。

**修法：把公司節點提到分支外，讓每一頁都輸出。** 在 `head_custom.html` 第 22 行的 `{% if page.layout == 'default' and page.evidence_level %}` **之前**，插入一段獨立的 script：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "MedicalOrganization"],
      "@id": "https://www.yao.care/#organization",
      "name": "yao.care",
      "legalName": "藥提醒科技有限公司",
      "alternateName": "藥提醒",
      "url": "https://www.yao.care",
      "taxID": "83620786",
      "email": "service@yao.care",
      "logo": { "@type": "ImageObject", "url": "https://www.yao.care/assets/images/logo.png" },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "台灣大道二段220號12樓",
        "addressLocality": "台中市西區",
        "addressCountry": "TW"
      },
      "sameAs": [
        "https://www.wikidata.org/wiki/Q140265007",
        "https://github.com/yao-care",
        "https://www.google.com/maps?cid=12025785010180313919",
        "https://www.yao.care/medical/txgnn/"
      ]
    },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": "{{ site.url }}/#software",
      "name": "TwTxGNN",
      "url": "{{ site.url }}/",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web",
      "isAccessibleForFree": true,
      "publisher": { "@id": "https://www.yao.care/#organization" },
      "author": { "@id": "https://www.yao.care/#organization" },
      "creator": { "@id": "https://www.yao.care/#organization" },
      "copyrightHolder": { "@id": "https://www.yao.care/#organization" },
      "sameAs": [
        "https://www.yao.care/medical/txgnn/",
        "https://github.com/yao-care/TwTxGNN"
      ]
    }
  ]
}
</script>
```

`TwTxGNN` 與 repo 網址換成自己站的。**然後把 `{% elsif page.url == '/' %}` 分支裡原本那兩個節點刪掉**，避免同一頁出現兩份（首頁的 WebSite / Article 節點保留，它們用 `@id` 參照即可）。

### 9-4. 洞三（僅 eu 站）：ImageObject 殘留假團隊名

`eutxgnn.yao.care` 首頁 schema 的 `ImageObject.creditText` 還是 `"EuTxGNN Project"`：

```diff
-      "creditText": "EuTxGNN Project"
+      "creditText": "藥提醒科技有限公司 (yao.care)"
```

其餘 29 站已無任何 `TxGNN Team / Research Team / Project` 字樣。

### 9-5. 更正第八節：Wikidata QID 只有 tw 站可以掛

第八節寫「請把這兩條補進**各站** `SoftwareApplication.sameAs`」——**那是錯的，只有 tw 站適用**。

[Q140692750](https://www.wikidata.org/wiki/Q140692750) 的 label 就是 `TwTxGNN`，指的是台灣站這一個軟體。其他 29 站把它放進自己的 `sameAs`，等於宣告「JpTxGNN 就是 TwTxGNN」，會製造新的實體混淆——正是這整份文件要解決的問題。

- **tw 站**：`SoftwareApplication.sameAs` 加 `https://www.wikidata.org/wiki/Q140692750`（目前 30 站都還沒加）。
- **其他 29 站**：**不要加**。公司的 QID `Q140265007` 已經在 Organization 節點的 `sameAs` 裡，實體鏈已經接通，不需要另外的軟體 QID。

### 9-6. 第二輪驗收指令

```bash
SITE=twtxgnn.yao.care
for P in / /about/ /methodology/ /drugs/ ; do
  echo "--- $P"
  curl -s "https://$SITE$P" | python3 -c "
import sys,re,json
h=sys.stdin.read()
person=re.findall(r'\"@type\"\s*:\s*\"Person\"', h)
orgdef=False
for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S):
    try: d=json.loads(m)
    except: continue
    for n in (d.get('@graph') or [d]):
        if n.get('@id')=='https://www.yao.care/#organization' and n.get('legalName'): orgdef=True
print('Person 節點:', len(person), '(必須 0)')
print('本頁定義了公司 Organization 節點:', orgdef, '(必須 True)')
"
done
```

四個路徑都要 `Person 節點: 0` ＋ `本頁定義了公司 Organization 節點: True`，再加上第七節原有三項，才算收工。
