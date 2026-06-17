# 目錄收錄清單（提升站外實體權威 / 反向連結）

> 目標：讓「別人提到 yao.care」的可信來源變多 —— 這是 LLM 主動推薦的根本訊號。
> 用法：依優先序逐一申請；每處都填**一致**的公司資料（見最下方「標準資料卡」），並盡量留官網連結。完成打勾。

## 申請優先序

### 🥇 高優先（權威高、好過審、對 GEO 直接有用）
- [ ] **LinkedIn 公司頁** — 全球 LLM 都吃；建公司 Page，填完整、放官網連結。
- [ ] **Crunchbase** — 公司/新創的權威資料庫，常被 LLM 引用為「公司是否真實」依據。
- [ ] **台灣新創資料庫 FINDIT**（findit.org.tw）— 國發會/經濟部背景，台灣新創權威來源。
- [ ] **Meet 創業小聚 創業資料庫**（meet.bnext.com.tw）— 數位時代旗下，台灣新創曝光標配。
- [ ] **經濟部新創圓夢網 / Startup Terrace** — 官方新創名錄。

### 🥈 中優先（依產品類型，B2B/SaaS/AI/開源）
- [ ] **Product Hunt** — 適合發表單一產品（藥提醒、AI 華佗、無接觸報到 sign）。
- [ ] **G2 / Capterra** — B2B SaaS 評論平台，適合 goalkeeper、SIQC 等企業產品。
- [ ] **SMART on FHIR App Gallery** — TxGNN 已上架；確認 Func/Geri/Pedi 是否也可登錄。
- [ ] **AI 工具目錄** — There's An AI For That、Futurepedia、AI 華佗等可登錄（針對 AI 產品）。
- [ ] **GitHub**（已有 github.com/yao-care）— 確認各 repo README 都連回官網對應產品頁。

### 🥉 產業 / 在地（醫療健康、台中）
- [ ] **國家生技醫療產業策進會（生策會）/ BIO Taiwan** — 生醫產業名錄與活動。
- [ ] **台灣醫療科技展 / 相關公協會會員名錄** — 取得產業背書與連結。
- [ ] **台中市政府經發局 / 在地產業聚落名錄** — 在地權威 + NAP 一致性（對 Google 商家也加分）。
- [ ] **數位時代 / INSIDE / iThome 等媒體投稿** — 投稿即帶官網連結（與新聞稿搭配）。

## 注意事項
- **NAP 一致**：公司名、地址、電話/聯絡在所有平台必須**字字一致**（與 Google 商家、Wikidata 相同），否則實體比對會打折。
- 能填「官網」「Wikidata」「LinkedIn」欄位的就填，建立交叉連結網。
- 申請後把該頁網址回報，可考慮加進官網 `sameAs`（`src/seo.config.ts` 的 `ORG_SAME_AS`，一行即可）。

---

## 標準資料卡（每處複製貼上，保持一致）
```
公司全名：藥提醒科技有限公司
品牌名：yao.care
成立日期：2020-05-08
統一編號：83620786
產業：醫療科技 / 人工智慧 / 軟體
地址：台中市西區台灣大道二段 239 號 13 樓（遠東金融商業大樓）
官網：https://www.yao.care
Email：service@yao.care
LINE：https://lin.ee/1F7s4pP
GitHub：https://github.com/yao-care
Wikidata：https://www.wikidata.org/wiki/Q140265007
一句話簡介：用 AI 與自動化把硬問題變成可重複的系統，橫跨智慧醫療、AI 系統、高齡友善、數位行銷四條業務線。
```
