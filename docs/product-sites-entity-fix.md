# 6 個產品站：把平台掛回藥提醒科技有限公司

> 給 `huatuo` / `smart-func-cds` / `smart-geri-cds` / `smart-pedi-cds` / `agent.facial.signature` / `goalkeeper` 各 repo 維護者（含 AI agent）。
> 出處：`yao-care/www`，2026-07-26 實測重驗。
> 照第三節做，跑第五節驗收，全綠才回報完成。

## 一、要解決什麼

用 LLM 問「台灣做中醫問診 AI 的公司是哪一間？」「高齡周全性評估工具是誰做的？」，模型答得出產品，但**不知道是藥提醒科技有限公司做的**。

原因跟 30 國 TxGNN 站台當初一樣：官網 `www.yao.care` 的 `Organization.sameAs` 早就把這 6 站都列出去了，**但 6 站沒有一條邊指回來**。實體圖要雙向才成立，抓取器是從產品站那頭出發的，走不回公司。

30 國 TxGNN 站台已於 2026-07-25 完成同樣的修正，這 6 站是最後一塊。

## 二、實測現況（2026-07-26）

6 站**全部**是「公司 `@id` 不存在、法人全名 0 次」：

| 站台 | JSON-LD 現況 | 主要問題 |
|------|-------------|---------|
| **huatuo.ai.yao.care** | **完全沒有 JSON-LD** | 全站 0 次提及 yao.care，沒有 `meta description`，`robots.txt` 也不存在 |
| **smart-geri-cds.yao.care** | 只有 `FAQPage` | Organization / WebSite / SoftwareApplication 全缺 |
| smart-func-cds.yao.care | Organization / WebSite / SoftwareApplication / FAQPage | Organization **無 `@id`**；`legalName` 寫成 `yao.care 藥提醒科技`（不是登記名）；`url` 指無 www 的 `https://yao.care`；publisher 內嵌重複三份 |
| smart-pedi-cds.yao.care | 同上 | 另加：四個節點各自獨立 `@context`，沒合併 `@graph`，`@id` 在頁內解析不到 |
| sign.yao.care | 只有 `WebApplication` | publisher 內嵌 `{"name":"yao.care"}`，無 `@id`、無 `legalName` |
| goalkeeper.yao.care | 根路徑是 `application/json` API | 沒有 HTML 頁可掛 schema（見 6-6，列為選配） |

`legalName: "yao.care 藥提醒科技"` 這個值特別要改。`legalName` 的語意是「法律登記名稱」，登記名是**藥提醒科技有限公司**，寫成別的等於在結構化資料裡放一個不存在的法人。

func / geri / pedi 是同一產品線、同一批人做的，**三站卻長出三種 schema**（geri 連 Organization 都沒有、pedi 有 `sameAs` 而 func 沒有）。改完要三站一致。

## 三、要做的兩個步驟

### 步驟一：每一頁的 `<head>` 加公司節點

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
        "https://www.google.com/maps?cid=12025785010180313919"
      ]
    }
  ]
}
</script>
```

**這一段 6 站完全相同，一個字都不要改。** 而且要**每一頁**都有，不是只有首頁——30 國 TxGNN 第一輪就是只改首頁，導致八千個內頁的 `@id` 參照懸空，返工了一次。

`@id` 一律用 `https://www.yao.care/#organization`。用各自網域的 `#organization` 會變成 6 個不同的公司實體，比現在更糟。

### 步驟二：自己的節點改用 `@id` 參照，不要再內嵌 Organization

```json
"publisher":       { "@id": "https://www.yao.care/#organization" },
"author":          { "@id": "https://www.yao.care/#organization" },
"creator":         { "@id": "https://www.yao.care/#organization" },
"copyrightHolder": { "@id": "https://www.yao.care/#organization" }
```

自己的 `SoftwareApplication` / `WebApplication` 補 `@id` 與 `sameAs`：

| 站台 | `@id` | `sameAs` 要有 |
|------|-------|--------------|
| huatuo.ai.yao.care | `https://huatuo.ai.yao.care/#software` | `https://www.yao.care/medical/huatuo/` |
| smart-func-cds.yao.care | `https://smart-func-cds.yao.care/#software` | `https://www.yao.care/medical/func/`、`https://github.com/yao-care/smart-func-cds` |
| smart-geri-cds.yao.care | `https://smart-geri-cds.yao.care/#software` | `https://www.yao.care/medical/geri/`、`https://github.com/yao-care/smart-geri-cds` |
| smart-pedi-cds.yao.care | `https://smart-pedi-cds.yao.care/#software` | `https://www.yao.care/medical/pedi/`、`https://github.com/yao-care/smart-pedi-cds` |
| sign.yao.care | `https://sign.yao.care/#software` | `https://www.yao.care/care/sign/`、`https://github.com/yao-care/agent.facial.signature` |

## 四、可見正文（權重高於 schema，不要省）

首頁 footer 或「關於」區塊加一句，用各站自己的語氣：

```
本系統由藥提醒科技有限公司（yao.care，統一編號 83620786，
地址：台中市西區台灣大道二段220號12樓）開發與維運。
產品說明見 https://www.yao.care/medical/func/
```

各 repo 的 `README.md` 最上方加一行：

```markdown
> 本專案由 **藥提醒科技有限公司**（[yao.care](https://www.yao.care)）開發與維運。
```

**不要自創公司英文名。** 法人登記名只有中文「藥提醒科技有限公司」，英文一律用 `yao.care`，不要寫成 `Yaocare Technology Co., Ltd.` 之類的自創譯名。

## 五、驗收

```bash
SITE=smart-func-cds.yao.care    # 換成自己的站

curl -s "https://$SITE/" | python3 -c "
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
inline=[n for n in nodes if 'Organization' in str(n.get('@type','')) and not n.get('@id')]
print('JSON 解析失敗:', bad, '(必須 0)')
print('公司節點定義於本頁:', len(org), '(必須 1)')
print('無 @id 的內嵌 Organization:', len(inline), '(必須 0)')
print('法人全名出現次數:', h.count('藥提醒科技有限公司'), '(必須 >= 1)')
"
```

首頁與**任意一個內頁**都要四項全綠。症狀對照：

| 症狀 | 原因 |
|------|------|
| 公司節點 = 0 | 步驟一沒做，或只加在首頁沒加到內頁 |
| 內嵌 Organization ≠ 0 | 步驟二沒做乾淨，舊的整包 Organization 還在 |
| 法人全名 = 0 | 第四節的正文沒加 |
| JSON 解析失敗 ≠ 0 | 改 JSON 時逗號沒處理好，整段 schema 全廢，比不改還糟 |

## 六、逐站補充

### 6-1. huatuo — 優先度最高
全站 0 個 JSON-LD、0 次提及 yao.care、沒有 `meta description`。除了步驟一二與第四節，還要補：

- `SoftwareApplication`（`applicationCategory: HealthApplication`）
- `<meta name="description">`
- **`robots.txt`**：目前 `https://huatuo.ai.yao.care/robots.txt` 回的是 SPA 的 index.html（檔案不存在，被前端 fallback 接走），等於沒有任何爬蟲指示。請補一個實體檔案，內容維持現狀的可爬狀態即可：

  ```
  User-agent: *
  Allow: /
  ```

  > 官網 `CLAUDE.md` 記的「huatuo.ai 刻意不收錄」指的是**不提交 GSC sitemap**，不是要對爬蟲隱形。上面這份只是把「現在事實上全開」寫成明確檔案，不改變任何行為。若要改成限制收錄，那是另一個決定，請先問過站方再動。

### 6-2. smart-geri-cds
目前只有 `FAQPage`。補 Organization（步驟一）＋ `WebSite` ＋ `SoftwareApplication`，欄位向 `smart-pedi-cds` 對齊。`FAQPage` 也加 `publisher` 指向公司 `@id`。

### 6-3. smart-func-cds
- Organization 加 `@id`；`legalName` 改 `藥提醒科技有限公司`、`name` 改 `yao.care`、`url` 改 `https://www.yao.care`
- `WebSite.publisher` 與 `SoftwareApplication.publisher` 目前各自內嵌一整包 Organization（同一份資料重複三次）→ 全改成 `@id` 參照

### 6-4. smart-pedi-cds
同 6-3，另加：四個節點目前是四個獨立 `@context` 物件，**合併成單一 `@graph`**，`@id` 才能在頁內解析。`sameAs` 裡的 `https://yao.care` 改成 `https://www.yao.care`。

### 6-5. sign
- `WebApplication.publisher` 內嵌的 `{"name": "yao.care", "url": "https://yao.care"}` 改成 `@id` 參照，並在同頁加上步驟一的 Organization 節點
- robots.txt 只放行 `/$` 與 `/index.html`，首頁是唯一可索引頁 → 這一頁的 schema 更要寫對

### 6-6. goalkeeper — 現階段選配
根路徑回 `application/json`（API 本體），沒有 HTML 頁面，掛不了 JSON-LD。robots.txt 雖已對 GPTBot / OAI-SearchBot / ClaudeBot 放行，但沒有可讀內容給它們。

這是 B2B API，本來就沒有對外行銷頁；歸屬訊號由官網 `/ai/goalkeeper/` 承擔即可。**現階段不用做**。日後若要做，最小成本是 `Accept: text/html` 時回一頁 landing，再套步驟一二。

## 七、不要做的事

- 不要把 `@id` 改成各自網域的 `#organization`
- 不要自創公司英文名
- 不要動 `robots.txt` / `sitemap.xml` 的 `Sitemap:` 行，必須指向自己的網域
- 不要新增外部 CDN 或改 CSP
- 不要動產品的功能、演算法、評估邏輯。這次只碰歸屬與 schema

## 八、官網側已完成（供對照，不用做）

`www.yao.care` 這側在 2026-07-26 已補完，你們那側接上就雙向成立：

- 12 個產品頁正文全部加上「開發與維運」區塊，明寫法人全名、統編、地址、服務網站與原始碼位置
- 6 個產品各新增一則「X 是誰開發的？」FAQ（FAQPage 是 LLM 最容易直接引用的格式）
- 公司 `Organization.owns` 從只指向 TwTxGNN，擴充為指向 6 個產品的 `SoftwareApplication @id`
- `smart-func-cds.yao.care` 的網址補上結尾斜線，與其他站一致
