# 30 國 TxGNN 站台：藥品頁沒有套版（既有問題，與實體歸屬無關）

> 給各 `*TxGNN` repo 維護者。出處：`yao-care/www`，2026-07-25。
> 這是複驗實體歸屬第二輪時**另外查到的既有問題**，不是那次改壞的。實體歸屬三步驟已 30 站驗收通過，不用重做。

## 一、症狀

部分藥品頁輸出的是**裸 HTML**——沒有 `<html>`、`<head>`、`<body>`，沒有標題、meta、canonical、導覽、樣式、schema，只有一段 markdown 轉出來的內容。整頁 1.5–2 KB。

實例：

```
https://estxgnn.yao.care/drugs/db00002/     2009 bytes，0 個 ld+json
https://chtxgnn.yao.care/drugs/abacavirum/  1448 bytes，0 個 ld+json
```

這些網址**全部收在各站 sitemap.xml 裡**，正在被送給搜尋引擎。

## 二、根因

藥品頁的 front matter 寫 `layout: drug`：

```yaml
---
layout: drug          ← 問題在這行
title: DB00257
drugbank_id: DB00257
evidence_level: L5
permalink: /drugs/db00257/
---
```

但 **repo 裡沒有 `docs/_layouts/` 目錄**（30 站皆然，`gh api repos/yao-care/<repo>/contents/docs/_layouts` 回 404），just-the-docs 主題也沒有名為 `drug` 的 layout。Jekyll 找不到指定的 layout 時**不套任何 layout**，直接輸出內容本體——就是上面看到的裸頁。

`_config.yml` 的 `defaults:` 雖然有設 `layout: "default"`，但 front matter 的顯式設定優先，蓋過去了。

JpTxGNN 站內就有對照組：

| 檔案 | front matter | 結果 |
|------|-------------|------|
| `docs/_drugs/acebutolol.md` | `layout: default` | ✅ 正常 |
| `docs/_drugs/db00257.md` | `layout: drug` | ❌ 裸頁 |

**這是既有問題**：ESTxGNN 的 `db00002.md` 最後修改於 2026-03-30（`Localize website to local language`），早於 2026-07-25 的實體歸屬工作。

## 三、影響範圍

從各站 sitemap 等距抽樣 60 頁實測：

| 站 | 藥品頁總數 | 抽 60 頁破頁數 | 推估破頁 |
|----|-----------|--------------|---------|
| ch | 730 | 60 | 730（100%） |
| es | 643 | 60 | 643（100%） |
| no | 479 | 58 | 463（97%） |
| fi | 516 | 55 | 473（92%） |
| de | 555 | 54 | 500（90%） |
| nz | 581 | 49 | 474（82%） |
| sa | 1014 | 49 | 828（82%） |
| uk | 880 | 49 | 719（82%） |
| hk | 1626 | 47 | 1274（78%） |
| ca | 1654 | 47 | 1296（78%） |
| au | 997 | 46 | 764（77%） |
| fr | 479 | 45 | 359（75%） |
| za | 658 | 45 | 494（75%） |
| co | 648 | 42 | 454（70%） |
| it | 539 | 42 | 377（70%） |
| dk | 739 | 41 | 505（68%） |
| kr | 820 | 41 | 560（68%） |
| in | 1285 | 39 | 835（65%） |
| us | 1567 | 36 | 940（60%） |
| nl | 261 | 36 | 157（60%） |
| ar | 363 | 28 | 169（47%） |
| jp | 1044 | 20 | 348（33%） |
| br | 526 | 3 | 26（5%） |
| se | 139 | 1 | 2（2%） |
| **tw / sg / th / ph / eu / my** | — | **0** | **0（不用做）** |

**24 站要做，6 站不用。全站合計約 13,390 / 22,783 頁（59%）。**

## 四、修法

在各 repo 執行：

```bash
cd docs/_drugs

# 1. 找出所有 layout: drug 的檔案，改成 default，同時加 nav_exclude
grep -l '^layout: drug$' *.md | while read f; do
  sed -i 's/^layout: drug$/layout: default/' "$f"
  grep -q '^nav_exclude:' "$f" || sed -i '/^layout: default$/a nav_exclude: true' "$f"
done

# 2. 確認沒有漏網
grep -l '^layout: drug$' *.md    # 應該沒有輸出
```

**`nav_exclude: true` 不能省。** 這批檔案沒有 `parent:`，只改 layout 的話，幾百到上千頁會全部灌進側邊欄的頂層，把導覽撐爆（正常的藥品頁是靠 `parent: 中證據等級 (L3-L4)` 這類欄位掛在證據等級底下的）。

改完之後這些頁會**同時**修好三件事：套回主題版型（有導覽、樣式、meta）、吃到實體歸屬第二輪的公司節點、以及觸發 `head_custom.html` 的藥品頁分支產出 `MedicalWebPage` schema——因為那個分支的條件正是 `page.layout == 'default' and page.evidence_level`，而這些檔案都有 `evidence_level`。

## 五、驗收

```bash
SITE=estxgnn.yao.care    # 換成自己的站

curl -s "https://$SITE/sitemap.xml" \
  | grep -oE "https://$SITE/drugs/[^<]+/" | awk 'NR%37==1' | head -30 \
  | while read u; do
      body=$(curl -s "$u")
      html=$(echo "$body" | grep -c '<html')
      org=$(echo "$body" | grep -c 'https://www.yao.care/#organization')
      [ "$html" -ge 1 ] && [ "$org" -ge 1 ] && echo "OK   $u" || echo "FAIL $u (html=$html org=$org)"
    done
```

**抽 30 頁全部 OK 才算完成。** 出現 FAIL 就是還有檔案沒改到，回第四節第 2 步找漏網。

改完順手看一下首頁側邊欄有沒有被撐爆——如果多出一大排藥名，就是 `nav_exclude: true` 沒加成功。

## 六、不要做的事

- 不要新建 `_layouts/drug.html` 來遷就 front matter。多一個要維護的版型，而且那個版型不會自動帶到 just-the-docs 的 head（實體歸屬的公司節點就會再次漏掉）。
- 不要動 `_config.yml` 的 `defaults:`，那段本來就是對的，問題在 front matter 蓋過它。
- 不要動藥品資料、預測數字、證據等級。
- 不要動實體歸屬第二輪的成果（`head_custom.html` 分支外的公司節點、`_config.yml` 沒有 `author:`）。

---

## 附錄：順帶發現，需要另案決定

這批頁面裡有 8 站的 `title` 只有 DrugBank ID，沒有藥名：

| 站 | 實例 | 標題 |
|----|------|------|
| jp | `/drugs/db00257/` | `DB00257` |
| nl | `/drugs/db00009/` | `DB00009` |
| dk | `/drugs/db00059/` | `DB00059` |
| za | `/drugs/db00133/` | `DB00133` |
| hk | `/drugs/db00110/` | `DB00110` |
| au | `/drugs/db00176/` | `DB00176` |
| ca | `/drugs/db00080/` | `DB00080` |
| uk | `/drugs/db00120/` | `DB00120` |

其餘 16 站的同類頁面有正常藥名（`es` 的 `db00002` 是 `CETUXIMAB`、`fr` 的 `db00049` 是 `RASBURICASE`）。

套版修好之後，這 8 站等於多了幾百到上千頁「標題是一串編號」的頁面被搜尋引擎收錄。**這不是套版問題，是資料生成時沒帶到藥名**，要嘛補上藥名、要嘛把這批頁排除出 sitemap。**先做第四節的套版修正，這一項另外決定**——但別忘記。
