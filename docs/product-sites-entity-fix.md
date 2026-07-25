# 其他 6 個產品站：同一個實體歸屬問題

> 給 `huatuo` / `smart-func-cds` / `smart-geri-cds` / `smart-pedi-cds` / `agent.facial.signature` / `goalkeeper` 各 repo 維護者（含 AI agent）的修改清單。
> 出處：`yao-care/www` repo，2026-07-25。做法與 `docs/txgnn-sites-entity-fix.md` 同源，公司資料逐字沿用該文件第四節。

## 一、為什麼要做

30 國 TxGNN 站台已在 2026-07-25 完成實體歸屬修正（各站 schema 改用共用 `@id` 指回公司）。同日逐站實測其餘 6 個對外產品站，**同一個病灶全部存在，而且更嚴重**——這 6 站沒有一站的 schema 認得 `https://www.yao.care/#organization`，也沒有一站寫出法人全名「藥提醒科技有限公司」。

結果就是：官網 `Organization.sameAs` 把這 6 站都列出去了，但 6 站沒有一條邊指回來。從產品站那頭出發的抓取器走不回公司，跟 TxGNN 修正前的狀況一模一樣。

## 二、實測現況（2026-07-25）

| 站台 | JSON-LD 節點 | Organization `@id` | `legalName` | 指回公司 | 嚴重度 |
|------|-------------|-------------------|-------------|---------|--------|
| **huatuo.ai.yao.care** | **完全沒有** | — | — | **全站 0 次提及 yao.care** | **最高** |
| **smart-geri-cds.yao.care** | 只有 `FAQPage` | **無 Organization 節點** | — | 無 | **高** |
| smart-func-cds.yao.care | Organization / WebSite / SoftwareApplication / FAQPage | **無 `@id`** | `yao.care 藥提醒科技`（非法人全名） | `url: https://yao.care`（非 www），無 `sameAs` | 中 |
| smart-pedi-cds.yao.care | 同上（但四個節點各自獨立 `@context`，未合併 `@graph`） | **無 `@id`** | `yao.care 藥提醒科技`（非法人全名） | `sameAs: [github, https://yao.care]` | 中 |
| sign.yao.care | 只有 `WebApplication` | **無 `@id`** | 無 `legalName`，`name: yao.care` | 內嵌 publisher，指 `https://yao.care` | 中 |
| goalkeeper.yao.care | 根路徑是 `application/json` API，**沒有 HTML 頁**可掛 schema | — | — | — | 低（見 6-6） |

三個 CDS 三胞胎（func / geri / pedi）**彼此就不一致**：func 與 pedi 有 Organization、geri 完全沒有；pedi 有 `sameAs`、func 沒有。同一產品線同一批人做的，卻長出三種 schema。

`legalName: "yao.care 藥提醒科技"` 這個值特別要改——`legalName` 的語意就是「法律登記名稱」，登記名是**藥提醒科技有限公司**，寫成別的等於在結構化資料裡放一個不存在的法人。

## 三、公司資料（逐字照抄，不要改寫也不要翻譯）

同 `docs/txgnn-sites-entity-fix.md` 第四節：

| 欄位 | 值 |
|------|-----|
| `@id` | `https://www.yao.care/#organization` |
| `name` | `yao.care` |
| `legalName` | `藥提醒科技有限公司` |
| `alternateName` | `藥提醒` |
| `url` | `https://www.yao.care`（**有 www**，別寫 `https://yao.care`） |
| `taxID` | `83620786` |
| Wikidata | `https://www.wikidata.org/wiki/Q140265007` |
| GitHub 組織 | `https://github.com/yao-care` |
| Google 商家 | `https://www.google.com/maps?cid=12025785010180313919` |
| 地址 | 台中市西區台灣大道二段220號12樓 |
| Email | `service@yao.care` |

**`@id` 一律用 `https://www.yao.care/#organization`。** 用各自網域的 `#organization` 就變成 6 個不同的公司實體，比現在更糟。

## 四、共用區塊（6 站通用，貼進每一頁的 `<head>`）

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

**這段要出現在每一頁，不是只有首頁**（TxGNN 那邊第一輪就是只改首頁，導致八千個藥品頁的 `@id` 參照懸空，見該文件 9-3）。

其餘節點（`WebSite` / `SoftwareApplication` / `WebApplication` / `FAQPage`）一律用 `@id` 參照，**不要再內嵌整包 Organization**：

```json
"publisher": { "@id": "https://www.yao.care/#organization" },
"author":    { "@id": "https://www.yao.care/#organization" },
"creator":   { "@id": "https://www.yao.care/#organization" },
"copyrightHolder": { "@id": "https://www.yao.care/#organization" }
```

產品自己的 `SoftwareApplication` 補 `@id`（`https://<自己網域>/#software`）與 `sameAs`（自己的 GitHub repo ＋ 官網對應產品頁）。官網產品頁對照：

| 站台 | 官網產品頁 |
|------|-----------|
| huatuo.ai.yao.care | `https://www.yao.care/medical/huatuo/` |
| smart-func-cds.yao.care | `https://www.yao.care/medical/func/` |
| smart-geri-cds.yao.care | `https://www.yao.care/medical/geri/` |
| smart-pedi-cds.yao.care | `https://www.yao.care/medical/pedi/` |
| sign.yao.care | `https://www.yao.care/care/sign/` |
| goalkeeper.yao.care | `https://www.yao.care/ai/goalkeeper/` |

## 五、可見正文（權重高於 schema，別省）

每站的首頁 footer 與「關於」區塊要出現法人全名，用各站自己的語氣寫一句即可：

```
本系統由藥提醒科技有限公司（yao.care，統一編號 83620786）開發與維運。
產品說明見 https://www.yao.care/medical/func/
```

各 repo 的 `README.md` 最上方也加一行：

```markdown
> 本專案由 **藥提醒科技有限公司**（[yao.care](https://www.yao.care)）開發與維運。
```

## 六、逐站待辦

### 6-1. huatuo（`huatuo.ai.yao.care`）— 優先度最高
- 全站 **0 個 JSON-LD**、**0 次提及 yao.care**、只有 `<title>AI 華佗 - 中醫問診助手</title>`，連 `<meta name="description">` 都沒有。
- `https://huatuo.ai.yao.care/robots.txt` **回的是 SPA 的 index.html**（檔案不存在，被前端 fallback 接走）→ 等於沒有任何爬蟲指示。要補一個真的 `robots.txt`。
- 待辦：補第四節共用區塊 ＋ `SoftwareApplication`（`applicationCategory: HealthApplication`）＋ `meta description` ＋ footer 法人全名 ＋ `robots.txt`。
- ⚠ 官網 `CLAUDE.md` 記載「huatuo.ai 刻意不收錄」——那指的是**不提交 GSC sitemap**，不等於要對 LLM 隱形。robots.txt 要怎麼寫（全開 / 只開 AI bot / 全擋）請先跟站方確認再動，其餘 schema 與正文照做。

### 6-2. smart-geri-cds — 補齊三胞胎缺的那份
- 目前只有 `FAQPage`。補 Organization（第四節）＋ `WebSite` ＋ `SoftwareApplication`，欄位向 `smart-pedi-cds` 對齊。
- FAQPage 也加 `publisher` 指向公司 `@id`。

### 6-3. smart-func-cds
- Organization 加 `@id`；`legalName` 改 `藥提醒科技有限公司`、`name` 改 `yao.care`；`url` 改 `https://www.yao.care`。
- 補 `sameAs`（第四節三條）。
- `WebSite.publisher` 與 `SoftwareApplication.publisher` 目前各自內嵌一整包 Organization（同一份資料重複三次）→ 全部改成 `{"@id": "https://www.yao.care/#organization"}`。
- `SoftwareApplication` 補 `@id` 與 `sameAs`（`https://github.com/yao-care/smart-func-cds`、`https://www.yao.care/medical/func/`）。

### 6-4. smart-pedi-cds
- 同 6-3，另加一項：四個節點目前是**四個獨立的 `<script>` / 獨立 `@context` 物件**，合併成單一 `@graph` 才能讓 `@id` 在頁內解析。
- `sameAs` 裡的 `https://yao.care` 改成 `https://www.yao.care`。

### 6-5. sign（`agent.facial.signature`）
- `WebApplication.publisher` 目前內嵌 `{"name": "yao.care", "url": "https://yao.care"}`，無 `@id`、無 `legalName` → 改成 `{"@id": "https://www.yao.care/#organization"}`，並在同頁加上第四節的 Organization 節點。
- `WebApplication` 補 `@id: https://sign.yao.care/#software` 與 `sameAs`（GitHub repo ＋ `https://www.yao.care/care/sign/`）。
- robots.txt 只放行 `/$` 與 `/index.html`，首頁是唯一可索引頁 → 這一頁的 schema 就更要寫對。

### 6-6. goalkeeper — 唯一可以先不動的
- 根路徑回 `application/json`（API 本體），沒有 HTML 頁面，掛不了 JSON-LD。robots.txt 雖已對 GPTBot / OAI-SearchBot / ClaudeBot 放行，但沒有可讀的內容給它們。
- 這是 B2B API，本來就沒有對外行銷頁；歸屬訊號由官網 `/ai/goalkeeper/` 承擔即可。
- 若日後要做，最小成本是加一頁 `/docs` 或 `/` 的 HTML landing（`Accept: text/html` 時回 HTML），再套第四節區塊。**現階段列為選配。**

## 七、驗收

```bash
for S in huatuo.ai.yao.care smart-func-cds.yao.care smart-geri-cds.yao.care smart-pedi-cds.yao.care sign.yao.care ; do
  echo "--- $S"
  curl -s "https://$S/" | python3 -c "
import sys,re,json
h=sys.stdin.read()
nodes=[]
def flat(x):
    if isinstance(x,dict):
        if '@graph' in x: flat(x['@graph'])
        else: nodes.append(x)
    elif isinstance(x,list):
        for i in x: flat(i)
for m in re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', h, re.S):
    try: flat(json.loads(m))
    except: pass
ok=[n for n in nodes if n.get('@id')=='https://www.yao.care/#organization' and n.get('legalName')=='藥提醒科技有限公司']
print('公司節點:', bool(ok), '| 內嵌 Organization 殘留:', len([n for n in nodes if 'Organization' in str(n.get('@type','')) and not n.get('@id')]), '(必須 0)')
print('法人全名出現次數:', h.count('藥提醒科技有限公司'), '(必須 >=1)')
"
done
```

三項全過才算完成。`goalkeeper` 依 6-6 暫免。
