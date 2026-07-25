# sg / ph / my 三站：藥品頁缺 MedicalWebPage schema

> 給 `SgTxGNN` / `PhTxGNN` / `MyTxGNN` 三個 repo。出處：`yao-care/www`，2026-07-25。
> 這三站**不在**套版修正（`txgnn-drug-pages-layout-fix.md`）的名單裡，那份不用做。這是另一個既有問題。

## 一、症狀

部分藥品頁版型正常、公司 Organization 節點也在，但**沒有 `MedicalWebPage` schema**，只落到 `head_custom.html` 最後那個泛用 `BreadcrumbList` 分支。

| 站 | 抽 60 頁缺 schema | 藥品頁總數 | 推估受影響 |
|----|-----------------|-----------|-----------|
| sg | 39（65%） | 1816 | 約 1,180 |
| my | 36（60%） | 650 | 約 390 |
| ph | 11（18%） | 420 | 約 77 |

實例：`sgtxgnn.yao.care/drugs/bisoprolol-fumarate/`、`mytxgnn.yao.care/drugs/budesonide/`、`phtxgnn.yao.care/drugs/betahistine/`

## 二、根因（兩站一種，一站另一種）

`head_custom.html` 產出藥品頁 schema 的條件是：

```liquid
{% if page.layout == 'default' and page.evidence_level %}
```

**sg 與 ph：卡在後半段。** 這批藥品頁是較早的一代，front matter 沒有 `evidence_level`：

```yaml
---
layout: default
title: BISOPROLOL FUMARATE
parent: Drugs
nav_order: 197
last_modified_date: 2026-03-11
---
```

**my：卡在前半段。** MyTxGNN 是 30 站裡唯一真的建了 `docs/_layouts/drug.html` 的站（內容是 `layout: default` + 一層 `<article>` 包裝）。所以它的頁面**渲染完全正常**——這也是它當初沒出現裸頁的原因——但 `page.layout` 的值是 `drug` 而不是 `default`，條件的前半段就不成立：

```yaml
---
layout: drug
title: "Budesonide"
evidence_level: "L1"      ← 這個有，但 layout 對不上
---
```

## 三、修法

### my：改 `head_custom.html` 一行

```diff
-{% if page.layout == 'default' and page.evidence_level %}
+{% if page.evidence_level %}
```

`evidence_level` 只出現在藥品頁，單獨用它判斷就夠了；`page.layout` 那半段本來就沒有增加辨識力，只是讓判斷跟版型綁死。**`_layouts/drug.html` 保留不動**，那個檔案沒有問題。

### sg 與 ph：補 front matter 的 `evidence_level`

這批檔案要補上 `evidence_level`，值從產生這些頁面時用的原始資料帶（L1–L5），**不要用猜的**：頁面正文已經有證據描述，但證據等級是評級結果，寫錯會直接反映在 schema 上。

```yaml
---
layout: default
title: BISOPROLOL FUMARATE
parent: Drugs
nav_order: 197
evidence_level: L4        ← 補這行，值取自原始資料
last_modified_date: 2026-03-11
---
```

如果原始資料已經找不到對應的等級，**不要硬填**——那些頁面目前仍可正常瀏覽、也帶著公司 Organization 節點，缺的只是藥品專屬 schema。這種情況請回報還有多少頁補不了，另外決定。

## 四、驗收

```bash
SITE=sgtxgnn.yao.care    # 換成自己的站

curl -s "https://$SITE/sitemap.xml" \
  | grep -oE "https://$SITE/drugs/[^<]+/" | awk 'NR%29==1' | head -30 \
  | while read u; do
      body=$(curl -s "$u")
      med=$(echo "$body" | grep -c 'MedicalWebPage')
      org=$(echo "$body" | grep -c 'https://www.yao.care/#organization')
      [ "$med" -ge 1 ] && [ "$org" -ge 1 ] && echo "OK   $u" || echo "FAIL $u (med=$med org=$org)"
    done
```

抽 30 頁全部 OK 才算完成。

## 五、不要做的事

- 不要跑 `txgnn-drug-pages-layout-fix.md` 的 sed，這三站沒有裸頁問題，跑了反而會動到不該動的檔案。
- my 不要刪 `_layouts/drug.html`，也不要把 front matter 的 `layout: drug` 改掉——那樣要動幾百個檔案，而改條件只要一行。
- 不要動藥品資料、預測數字。`evidence_level` 只能從原始資料帶，不能推算。
- 不要動實體歸屬的成果（分支外的公司節點、`_config.yml` 沒有 `author:`）。
