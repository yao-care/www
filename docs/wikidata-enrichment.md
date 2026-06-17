# Wikidata 實體補強（Q140265007）

> 目的：充實公司 Wikidata 條目，讓 LLM / 搜尋引擎更能正確辨識並引用 yao.care。
> 實體：**Q140265007**（藥提醒科技有限公司 / yao.care）
> 站上 `sameAs` 已連到此實體（見 `src/seo.config.ts` `ORG_SAME_AS`）。
>
> ✅ **2026-06-17 已套用**（rev 2507035130）：P2037 GitHub、P31 軟體公司、P452 醫療衛生、
> P1813 簡稱、別名修正皆已寫入。以下保留為紀錄與後續第三方 sameAs 待辦。
>
> 重跑方式（憑證在 `$YAOCARE_SECRETS_DIR/wikidata.json`，腳本冪等）：
> ```bash
> ./node_modules/.bin/tsx scripts/wikidata-enrich.ts --dry-run   # 預覽
> ./node_modules/.bin/tsx scripts/wikidata-enrich.ts             # 套用
> ```

## 現況（2026-06-17 已存在的 claims，勿重複加）

| 屬性 | 值 |
|------|-----|
| P1448 官方名稱 | 藥提醒科技有限公司 |
| P17 國家 | Q865（中華民國/台灣） |
| P159 總部所在地 | Q245023（臺中市） |
| P571 成立日期 | 2020-05-08 |
| P856 官方網站 | https://www.yao.care |
| P1454 法人型態 | Q130279319（有限公司） |
| P452 產業 | Q11660（人工智慧） |
| P968 email | service@yao.care |
| P7729 統一編號 | 83620786 |
| P31 性質 | Q4830453（企業） |

## 要補的（已驗證 QID）

1. **P2037 GitHub username = `yao-care`** — 免費、已存在、對 LLM 是強 sameAs 訊號。
2. **P31 性質 += Q1058914（軟體公司）** — 比「企業」更精確。
3. **P452 產業 += Q31207（醫療衛生）** — 目前只有 AI，補上醫療面，幫 LLM 在健康類問題正確歸類。
4. **P1813 簡稱 = `yao.care`（mul）／`藥提醒`（zh-hant）**。
5. **修正壞掉的 aliases** — 目前別名是「藥提醒、yao.care」「藥提醒 、藥提醒科技有限公司、yao.care Technology」整串塞在一個別名裡（全形逗號分隔），應拆成獨立別名，否則實體比對抓不到。

## 執行方式：QuickStatements

1. 開 https://quickstatements.toolforge.org/ → 用 Wikimedia 帳號登入授權。
2. 點 **「Import commands」**，貼下方批次（V1 格式，TAB 分隔），執行。

```
Q140265007	P2037	"yao-care"
Q140265007	P31	Q1058914
Q140265007	P452	Q31207
Q140265007	P1813	mul:"yao.care"
Q140265007	P1813	zh-hant:"藥提醒"
-Q140265007	Azh-hant	"藥提醒、yao.care"
-Q140265007	Azh	"藥提醒 、藥提醒科技有限公司、yao.care Technology"
-Q140265007	Aen	"藥提醒 、藥提醒科技有限公司、yao.care Technology"
-Q140265007	Amul	"藥提醒 、藥提醒科技有限公司、yao.care Technology"
Q140265007	Azh-hant	"藥提醒"
Q140265007	Azh-hant	"藥提醒科技有限公司"
Q140265007	Aen	"yao.care Technology"
Q140265007	Aen	"YaoTixing"
```

> 行首 `-` = 移除該別名；無 `-` = 新增。若某移除行報「not found」屬正常（代表那筆別名語言碼不同），忽略即可，不影響其他行。

## 之後（需先有帳號 → 對應問題 1）

帳號開好後再補這些**第三方 sameAs**，是對 LLM 最有效的權威訊號：

- **P4264 LinkedIn 公司 ID**（建立 LinkedIn 公司頁後）
- **P2013 Facebook ID** / **P2002 X(Twitter) ID**（若有經營）
- **P5995 Crunchbase**（登錄後）

## 驗證

```bash
curl -s "https://www.wikidata.org/wiki/Special:EntityData/Q140265007.json" \
 | python3 -c "import sys,json;d=json.load(sys.stdin)['entities']['Q140265007'];print('claims:',sorted(d['claims']));print('aliases:',{k:[a['value'] for a in v] for k,v in d['aliases'].items()})"
```

跑完應看到 `claims` 多出 P2037、且 P31/P452 各有兩值；`aliases` 變成乾淨的獨立別名。
