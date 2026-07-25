# 30 國 TxGNN 站台：實體歸屬修正（第二輪）

> 給各 `*TxGNN` repo 維護者（含 AI agent）。出處：`yao-care/www`，2026-07-25。
> 這份文件只有一件事：**照著第三節做三個步驟，跑第五節驗收，全綠才回報完成。**

## 一、第一輪已完成，不要重做

2026-07-25 第一輪修正已 30 站全數完成並驗收通過。以下項目**現在是對的，不要再動**：

- `head_custom.html` 各分支的 `publisher` / `author` / `reviewedBy` → 已指向 `https://www.yao.care/#organization`
- `<meta name="reviewed-by">` → 已是 `藥提醒科技有限公司 (yao.care)`
- `_config.yml` 的 `footer_content` → 已含法人全名
- `about.md` 的「關於開發單位」段落
- `README.md` 開頭的歸屬行
- GitHub repo 的 description / homepage / topics

## 二、第二輪要補的是什麼

第一輪驗收時查出兩個當時沒交代到的問題，30 站全中：

**問題一：公司在 schema 裡被宣告成「一個人」。** `_config.yml` 的 `author:` 會被 `jekyll-seo-tag` 產成 `{"@type": "Person", "name": "藥提醒科技有限公司 (yao.care)"}`。每一頁都有，包含約 8,000 個藥品頁。

**問題二：公司節點只存在於首頁。** `head_custom.html` 的 Organization 節點寫在 `{% elsif page.url == '/' %}` 分支裡。結果 `/methodology/`、`/drugs/` 連一條指向公司的邊都沒有；藥品頁的 `publisher` 雖然指著 `https://www.yao.care/#organization`，但該頁上沒有任何節點定義這個 `@id`，參照是懸空的。

## 三、要做的三個步驟

動兩個檔案。30 站步驟完全相同。

### 步驟一：刪掉 `docs/_config.yml` 的 `author:`

```diff
-# 作者資訊 (E-E-A-T)
-author:
-  name: 藥提醒科技有限公司 (yao.care)
-  url: https://www.yao.care/
```

整段刪除。**不要留空的 `author:`**，留了 seo-tag 會拿到空 hash。

**不要改成 `author: { type: Organization }`。** 那樣確實能消掉 `Person`，但 seo-tag 產出的節點帶不了 `@id`，等於在每一頁多生一個無法與公司合併的孤立組織節點——用新的實體分裂換掉舊的。

### 步驟二：在 `head_custom.html` 的所有 Liquid 分支「外面」補公司節點

`docs/_includes/head_custom.html` 目前的結構：

```
第 1–21 行    CSP meta、其他 meta                                    ← 不要動
第 22 行      {% if page.layout == 'default' and page.evidence_level %}
   …          各分支（藥品頁 / 首頁 / about / methodology / drugs / news）
最後          {% endif %}
```

**把下面整段插在第 22 行的 `{% if %}` 之前。**

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

**每站只要換兩個字串：**

| 位置 | 換成 |
|------|------|
| `"name": "TwTxGNN"` | 自己站的品牌名（`JpTxGNN` / `UsTxGNN` / `DETxGNN`…） |
| `https://github.com/yao-care/TwTxGNN` | 自己的 repo 網址（大小寫見第六節清單） |

`{{ site.url }}` 原樣保留，Jekyll 會從 `_config.yml` 帶入。Organization 那個節點 **30 站完全相同，一個字都不要改**。

### 步驟三：刪掉首頁分支裡重複的兩個節點

做完步驟二之後，`{% elsif page.url == '/' %}` 分支裡原本的 `Organization` 與 `SoftwareApplication` 就重複了。**把這兩個節點從該分支的 `@graph` 陣列刪除**，刪完檢查逗號，確保 JSON 仍然合法。

- 同分支的 `WebSite`、`Article` 節點**保留不動**。它們用 `{"@id": "https://www.yao.care/#organization"}` 參照，步驟二已在同一頁定義好那個 `@id`。
- 其他分支（`/about/`、`/methodology/`、`/drugs/`、`/news/`、藥品頁）**完全不用改**，步驟二已一次補齊。

## 四、兩個站要多做一項

**eu 站**：`head_custom.html` 搜 `creditText`

```diff
-      "creditText": "EuTxGNN Project"
+      "creditText": "藥提醒科技有限公司 (yao.care)"
```

**tw 站**：步驟二的 `SoftwareApplication.sameAs` 加第三條

```diff
       "sameAs": [
         "https://www.yao.care/medical/txgnn/",
-        "https://github.com/yao-care/TwTxGNN"
+        "https://github.com/yao-care/TwTxGNN",
+        "https://www.wikidata.org/wiki/Q140692750"
       ]
```

`Q140692750` 的 label 就是 `TwTxGNN`，指台灣站這一個軟體。**其他 29 站不要加**，加了等於宣告自己就是台灣站。

## 五、驗收（GitHub Pages 部署完成後跑，約 1–3 分鐘）

```bash
SITE=twtxgnn.yao.care     # 換成自己的站
for P in / /about/ /methodology/ /drugs/ ; do
  echo "--- $P"
  curl -s "https://$SITE$P" | python3 -c "
import sys,re,json
h=sys.stdin.read()
nodes=[]
def flat(x):
    if isinstance(x,dict):
        if '@graph' in x: flat(x['@graph'])
        else: nodes.append(x)
    elif isinstance(x,list):
        for i in x: flat(i)
bad=0
for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S):
    try: flat(json.loads(m))
    except Exception: bad+=1
org=[n for n in nodes if n.get('@id')=='https://www.yao.care/#organization' and n.get('legalName')=='藥提醒科技有限公司']
print('  JSON 解析失敗:', bad, '(必須 0)')
print('  公司節點定義於本頁:', len(org), '(必須 1)')
print('  Person 節點:', len(re.findall(r'\"@type\"\s*:\s*\"Person\"', h)), '(必須 0)')
"
done
```

**四個路徑 × 三項全綠才算完成。** 對不上就是沒改乾淨：

| 症狀 | 原因 |
|------|------|
| 公司節點 = 0 | 步驟二插錯位置，插進了某個 `{% if %}` 分支裡面 |
| 公司節點 = 2 | 步驟三沒做，首頁分支的舊節點還在 |
| Person ≠ 0 | 步驟一沒做，或 `_config.yml` 還留著空的 `author:` |
| JSON 解析失敗 ≠ 0 | 步驟三刪節點時逗號沒處理好，整段 schema 全廢，比不改還糟 |

這四個路徑是有理由挑的：`/` 驗步驟三，`/methodology/` 與 `/drugs/` 驗步驟二（這兩頁原本一條指向公司的邊都沒有），`/about/` 驗第一輪成果沒被弄壞。

## 六、不要做的事

- 不要動 `footer_content`、`about.md`、`README.md`、GitHub repo 設定（第一節已列，第一輪做對了）
- 不要動 `robots.txt` / `sitemap.xml` 的 `Sitemap:` 行，必須指向自己的網域
- 不要動藥品資料、預測數字、證據等級
- 不要把 `@id` 改成各自網域的 `#organization`
- 不要自創公司英文名。法人登記名只有中文「藥提醒科技有限公司」，英文一律用 `yao.care`
- 不要新增外部 CDN 或改 CSP

**repo 名稱大小寫不統一**，步驟二填 repo 網址時照這份：

`ARTxGNN` `AuTxGNN` `BrTxGNN` `CHTxGNN` `COTxGNN` `CaTxGNN` `DETxGNN` `DkTxGNN` `ESTxGNN` `EuTxGNN` `FITxGNN` `FRTxGNN` `HkTxGNN` `ITTxGNN` `InTxGNN` `JpTxGNN` `KrTxGNN` `MyTxGNN` `NOTxGNN` `NZTxGNN` `NlTxGNN` `PhTxGNN` `SATxGNN` `SETxGNN` `SgTxGNN` `ThTxGNN` `TwTxGNN` `UkTxGNN` `UsTxGNN` `ZaTxGNN`

---

## 附錄：背景（不影響照做，可略過）

**為什麼 `@id` 要用 `https://www.yao.care/#organization`。** 31 個網域共用同一個 `@id`，抓取器才會把它們合併成同一個實體。官網那側已用這個 `@id` 輸出完整的 Organization 節點（含 `legalName`、`taxID`、Wikidata），各站只要用同一個字串就接得上。用各自網域的 `#organization` 會變成 30 個不同的公司。

**為什麼步驟二寫在分支外面就會每頁生效。** just-the-docs 的 `_includes/head.html` 最後一行是 `{% include head_custom.html %}`，而 30 個 repo 都沒有自訂 `docs/_layouts/`，全部吃 theme 的 head。

**問題是怎麼來的。** 30 站的 `head_custom.html` 是同一份模板複製 30 份，最後一次動 schema 是 2026-02-21，之後只碰過 CSP。一份模板寫錯一個節點，複製出去就是 30 個一樣的錯。30 站錯得完全一致是共用模板的特徵，不是 30 個獨立失誤。

**第一輪為什麼會漏掉這兩項。** 問題一是第一輪的指示叫大家把 `author.name` 改成公司名，但沒發現 `jekyll-seo-tag` 的 `author` 預設輸出 `Person`（`json_ld_drop.rb` 的 `VALID_AUTHOR_TYPES`），結果從「假的團隊名」變成「真法人被當成人」。問題二是 `/methodology/`、`/drugs/` 兩個分支原本就沒有 Organization 節點，「每個分支的 Organization 都要改」對它們無事可做，指示沒寫「原本沒有的要新增」。兩項都不是執行方的問題。
