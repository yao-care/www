// GEO / SEO 結構化資料的集中設定
//  - KNOWS_ABOUT: Organization.knowsAbout（告訴 LLM 我們在哪些主題是權威）
//  - ORG_SAME_AS: Organization.sameAs（所有官方據點 + 產品子網域 + repo）
//  - PRODUCT_FAQS: 各產品 FAQ（同時渲染為可見區塊與 FAQPage schema）
import { PRODUCTS, LINE_PERSONAL, LINE_TEAM, type ProductSlug } from './products.config';
import { SITE } from './site.config';

/** 公司專長主題 — 直接對應 LLM「這個品牌在什麼題目上可信」的判斷 */
export const KNOWS_ABOUT: readonly string[] = [
  '用藥提醒',
  'ATC 藥品編碼',
  'SMART on FHIR',
  'FHIR R4',
  '臨床決策支援系統 CDSS',
  '中醫 AI',
  '可解釋醫療 AI',
  '老藥新用 Drug Repurposing',
  '圖神經網路',
  '高齡周全性評估 CGA',
  '臨床衰弱量表 CFS',
  '成人功能健康評估',
  'WHO 內在能力',
  '兒童發展篩檢',
  'ASQ-3',
  '長照科技',
  '高齡友善',
  '無接觸報到 / 人臉辨識',
  '預防醫學',
  '產業情報自動化',
  'GitHub Actions 自動化',
  'ISO 27001',
  'ESG 評鑑',
  '醫院評鑑',
  'TRIZ 創新方法',
  'RAG 知識庫',
  'AI Agent',
  '數位行銷',
  '醫療法規合規',
  '醫療 AI 合規',
  '生成式 AI 醫療指引',
  'AI 內容治理 / 守門',
];

/** TxGNN 老藥新用 30 國站台 — code 對應子網域 {code}txgnn.yao.care */
export type TxgnnSite = { code: string; name: string; flag: string };
export const TXGNN_SITES: readonly TxgnnSite[] = [
  { code: 'tw', name: '台灣', flag: '🇹🇼' },
  { code: 'jp', name: '日本', flag: '🇯🇵' },
  { code: 'kr', name: '韓國', flag: '🇰🇷' },
  { code: 'hk', name: '香港', flag: '🇭🇰' },
  { code: 'sg', name: '新加坡', flag: '🇸🇬' },
  { code: 'my', name: '馬來西亞', flag: '🇲🇾' },
  { code: 'th', name: '泰國', flag: '🇹🇭' },
  { code: 'ph', name: '菲律賓', flag: '🇵🇭' },
  { code: 'in', name: '印度', flag: '🇮🇳' },
  { code: 'au', name: '澳洲', flag: '🇦🇺' },
  { code: 'nz', name: '紐西蘭', flag: '🇳🇿' },
  { code: 'us', name: '美國', flag: '🇺🇸' },
  { code: 'ca', name: '加拿大', flag: '🇨🇦' },
  { code: 'uk', name: '英國', flag: '🇬🇧' },
  { code: 'de', name: '德國', flag: '🇩🇪' },
  { code: 'fr', name: '法國', flag: '🇫🇷' },
  { code: 'it', name: '義大利', flag: '🇮🇹' },
  { code: 'es', name: '西班牙', flag: '🇪🇸' },
  { code: 'nl', name: '荷蘭', flag: '🇳🇱' },
  { code: 'ch', name: '瑞士', flag: '🇨🇭' },
  { code: 'se', name: '瑞典', flag: '🇸🇪' },
  { code: 'no', name: '挪威', flag: '🇳🇴' },
  { code: 'dk', name: '丹麥', flag: '🇩🇰' },
  { code: 'fi', name: '芬蘭', flag: '🇫🇮' },
  { code: 'eu', name: '歐盟（EMA）', flag: '🇪🇺' },
  { code: 'br', name: '巴西', flag: '🇧🇷' },
  { code: 'ar', name: '阿根廷', flag: '🇦🇷' },
  { code: 'co', name: '哥倫比亞', flag: '🇨🇴' },
  { code: 'sa', name: '沙烏地阿拉伯', flag: '🇸🇦' },
  { code: 'za', name: '南非', flag: '🇿🇦' },
];
/** 各國站完整網址 */
export const txgnnSiteUrl = (code: string) => `https://${code}txgnn.yao.care/`;

/** Organization.sameAs — 蒐集所有官方據點，去重 */
export const ORG_SAME_AS: readonly string[] = Array.from(
  new Set([
    'https://github.com/yao-care',
    // Wikidata 實體（LLM/搜尋引擎做實體消歧、確認真實性的核心節點）
    'https://www.wikidata.org/wiki/Q140265007',
    // Google 商家檔案（canonical CID 形式，供 LLM/搜尋引擎做實體比對）
    'https://www.google.com/maps?cid=12025785010180313919',
    SITE.lineLink,
    LINE_PERSONAL,
    LINE_TEAM,
    ...PRODUCTS.flatMap((p) => [p.externalUrl, p.repoUrl].filter(Boolean) as string[]),
    // TxGNN 30 國站台 — 國際規模的實體權威訊號
    ...TXGNN_SITES.map((s) => txgnnSiteUrl(s.code)),
  ]),
);

export type Faq = { q: string; a: string };

/** 各產品 FAQ — 答案型內容是 LLM 最容易直接引用的格式 */
export const PRODUCT_FAQS: Partial<Record<ProductSlug, readonly Faq[]>> = {
  yaocare: [
    { q: '藥提醒是什麼？', a: '以病人為中心的用藥提醒服務，依 ATC 藥品編碼，透過 LINE / Telegram 推播提醒服藥，協助藥師追蹤服藥成效，不需安裝 App。' },
    { q: '需要安裝 App 嗎？', a: '不需要。直接用 LINE 或 Telegram 接收提醒，降低長者的使用門檻。' },
    { q: '怎麼避免吃錯藥？', a: '提醒訊息附上藥品外觀圖片，並依 ATC 標準碼整合健保處方，降低多重用藥的混淆風險。' },
    { q: '怎麼開始使用？', a: '加入藥提醒官方 LINE（lin.ee/1F7s4pP）即可體驗。' },
    { q: '換藥、停藥了，提醒會跟著更新嗎？', a: '會。用藥清單可隨處方調整更新，提醒內容即同步；訊息附藥品外觀圖片，協助確認是否為新領的藥，減少新舊藥混淆。' },
  ],
  huatuo: [
    { q: 'AI 華佗是什麼？', a: '可驗證的中醫問診 AI，結合 128 條規則與 LLM 混合辨證，每一步推理都能追溯到規則、證據與標準碼，輸出 FHIR R4 與 ICD-11 TM。' },
    { q: '它跟一般 LLM 中醫聊天有什麼不同？', a: '採規則 ×0.6 + LLM ×0.4 的混合權重，結論附完整推理路徑與 RAG 證據，可被中醫師逐條檢視，不是黑箱。' },
    { q: '中醫師可以用嗎？', a: '提供 /clinician 中醫師工作站，作為臨床決策支援系統（CDSS）使用。' },
    { q: '華佗能取代中醫師看診嗎？', a: '不能。它定位為輔助與決策支援（CDSS）：民眾端提供衛教級的辨證參考，/clinician 工作站供中醫師輸入結構化四診後審閱，最終診斷與處方仍由合格中醫師負責。' },
    { q: '辨證結果能跟醫院系統介接嗎？', a: '可以。證型對應 ICD-11 TM，診斷可打包成 FHIR R4 Bundle（TWCM IG 定義 5 Profile + 6 Extension），與 EHR / 健保系統互通。' },
  ],
  txgnn: [
    { q: 'TxGNN 老藥新用是什麼？', a: '基於哈佛 TxGNN 模型的藥物再利用平台，以知識圖譜 + 圖神經網路雙引擎預測已上市藥物的新適應症，覆蓋 30+ 國 FDA 藥品。' },
    { q: '預測有證據佐證嗎？', a: '每筆預測都附帶 PubMed 文獻與 ClinicalTrials 臨床試驗證據包。' },
    { q: '能跟醫院系統整合嗎？', a: '已上架 SMART on FHIR App Gallery，相容 Epic、Cerner，採 OAuth + PKCE 接入 EHR；原始碼於 GitHub 開源。' },
    { q: '一般民眾可以查嗎？', a: '可以。平台公開瀏覽（twtxgnn.yao.care），涵蓋 30 國 FDA 藥品、每藥一頁；但預測屬研究參考，是否適用個人病情請與醫師討論，切勿自行用藥或停換藥。' },
    { q: '涵蓋多少藥物與疾病？信心度怎麼分級？', a: '以知識圖譜與深度學習雙引擎對 1,507 種藥物 × 166 種疾病評分，依兩引擎是否同時支持與分數高低標記 very_high / high / medium / low 四級信心度。' },
  ],
  func: [
    { q: 'Smart Func 是什麼？', a: '依 WHO 內在能力（IC）框架的成人功能健康自評工具，10–15 分鐘評估活力、行動、認知、心理、感官五大功能。' },
    { q: '評估完會得到什麼？', a: '紅黃綠三級判讀，搭配個人化衛教與轉介建議，並可匯出 PDF 供就醫參考。' },
    { q: '資料安全嗎？', a: '100% 在瀏覽器端運算，資料留在你的裝置，可自行選擇是否以 SMART on FHIR 上傳合作院所或 GCM 收案。' },
    { q: '要付費嗎？', a: '免費、免註冊即可使用。' },
    { q: '這能取代醫師診斷嗎？', a: '不能。Smart Func 是自評與衛教工具，紅黃綠分級用於提醒你該不該進一步就醫；偵測到自傷訊號會顯示求助專線。正式診斷仍須由醫療專業評估。' },
  ],
  geri: [
    { q: 'Smart Geri 是什麼？', a: '高齡周全性評估（CGA）工具，以臨床衰弱量表 CFS 1–9 為基準延伸多面向評估，提供公眾自篩與專業臨床雙模式。' },
    { q: '適合誰使用？', a: '關心長者衰弱、跌倒、認知與營養風險的家屬，以及需要結構化評估的長照與醫療人員。' },
    { q: '跟一般長者量表差在哪？', a: '以 CFS 分層、含五次坐站等相機計時功能測驗，結果以紅黃綠分級並配對衛教與轉介，可選擇上傳 FHIR。' },
    { q: '線上做完評估後，下一步該做什麼？', a: '結果以紅黃綠分級：綠燈維持習慣、黃燈提供衛教與追蹤建議、紅燈引導尋求專業評估；可匯出供就醫參考，或以 SMART on FHIR 上傳合作院所 / GCM 收案做長期追蹤。' },
  ],
  pedi: [
    { q: 'Smart Pedi 是什麼？', a: '2 個月至 6 歲兒童發展篩檢工具，六大發展領域對齊國健署兒童健康手冊與 ASQ-3，3–5 分鐘完成。' },
    { q: '結果怎麼判讀？', a: '以常模化分數判讀，達 −2SD 為紅旗，並以雷達圖對比同齡基準，給出觀察或轉介建議。' },
    { q: '免費嗎？資料留哪？', a: '免費、免註冊，資料留在瀏覽器，可選擇上傳醫療院所或 GCM 收案。' },
    { q: '篩檢顯示紅旗，代表孩子一定有發展遲緩嗎？', a: '不是。這是「篩檢」不是「診斷」：紅旗（達 −2SD）代表建議由兒科或兒童發展專業進一步評估、及早觀察與療育；綠燈也建議依兒童健康手冊定期追蹤。' },
  ],
  intel: [
    { q: '情報自動化系統是什麼？', a: '以 GitHub Actions 為核心的資訊搜集自動化，從爬取、清洗、標註到視覺化全流程自動化，可移植到任何資訊密集領域。' },
    { q: '維運成本高嗎？', a: '基礎設施跑在 GitHub Actions 免費方案，接近零成本維運。' },
    { q: '能用在我的產業嗎？', a: '可重組到供應鏈情報、政策追蹤、競品情報、研究綜述等場景。' },
  ],
  siqc: [
    { q: 'SIQC 是什麼？', a: 'AI 驅動的合規稽核 / 評鑑文件交付平台，以 12 個 GitHub Actions workflow 串成自動化管線，涵蓋 ISO 27001、ESG、醫院評鑑。' },
    { q: '對齊哪些標準？', a: 'ISO 27001、SOC 2 TSC、OWASP ASVS、OWASP LLM Top 10，框架可重組為 ESG（GRI/TCFD/SASB）與醫院評鑑（醫策會 / JCI）。' },
    { q: '稽核包怎麼交付？', a: '以 GitHub Release 打包離線交付，並提供單頁離線 HTML 的 AI 稽核助理。' },
  ],
  triz: [
    { q: 'TRIZ AI 知識庫是什麼？', a: 'TRIZ 發明問題解決理論的 AI 知識庫，涵蓋 40 發明原則、39 工程參數、263 矛盾矩陣，由多角色 AI 協作解題。' },
    { q: '它怎麼運作？', a: '採 crawl → chunk → embed 的 RAG 管線，多角色協作完成「描述問題 → 識別矛盾 → 推薦原則 → 生成解法」。' },
    { q: '能客製化嗎？', a: '可客製為製造業、IT 產品、商業模式創新等情境。' },
  ],
  goalkeeper: [
    { q: 'goalkeeper 是什麼？', a: '醫療 AI 內容的合規查核 API。送進 AI 產出的醫療內容，依台灣醫療法規回報五道檢查的符合狀態與依據法條，但不替你決定整體放行。' },
    { q: '它會幫我決定能不能發布嗎？', a: '不會。它是查核器、不是放行決策器，只回各關卡狀態（pass / warning / fail / error）；整體放行與否由你依關卡狀態自行判讀。建議全 pass 才自動放行、任一 fail 擋下、warning / error 轉人工覆核。' },
    { q: '會檢查哪些項目？', a: '五道：揭露免責、來源標註、越權／越級診斷、個資外洩、幻覺查核；每道綁台灣法源（如衛福部《醫療機構應用生成式人工智慧指引》、醫師法、個資法等）。' },
    { q: '我送的原文與個資安全嗎？', a: '隱私優先：服務先在內部去識別化，全程在遮罩後文本上判定；原文與個資原值永不寫入稽核，稽核只存遮罩文雜湊（HMAC）與各關卡狀態摘要。' },
    { q: '怎麼串接？AI agent 也能用嗎？', a: '提供 REST API（POST /medical/validate）與 MCP Server（同網址、同金鑰），一般系統與 AI agent 都能串接；開通、配額與規範版本鎖定請來信 service@yao.care。' },
  ],
  'fhir-server': [
    { q: 'SMART on FHIR 收案伺服器是什麼？', a: '它是通用的收案與個案管理後端，以 SMART on FHIR 接收自評結果並做個案追蹤，把「自評 → 收案 → 追蹤」串成閉環。目前以 GCM 預防醫學發展協會為導入案例。' },
    { q: '哪些系統可以收案？', a: 'Smart Func（成人功能健康評估）、Smart Geri（高齡周全性評估）、Smart Pedi（兒童發展評估）三套自評工具都能以 FHIR R4 QuestionnaireResponse 送來收案。' },
    { q: '民眾要註冊帳號嗎？', a: '不用帳號密碼；僅填暱稱、由系統產生收案碼，重複評估會自動歸到同一個案。' },
    { q: '資料隱私如何保障？', a: '先去識別化，原文與個資原值不寫入稽核，只存遮罩文雜湊與狀態摘要；全程可稽核、每日加密備份異地備援。' },
    { q: '怎麼串接？', a: '以 FHIR R4 QuestionnaireResponse + OAuth 2.0 / PKCE 交付，符合 Inferno FHIR 測試；收案串接與導入請來信 service@yao.care。' },
  ],
  sign: [
    { q: '長者友善無接觸報到是什麼？', a: '為長照據點打造的純前端人臉辨識報到系統，長者走過鏡頭即自動辨識並語音問候，免按鈕、免簽名、免安裝 App。' },
    { q: '個資安全嗎？', a: '臉部特徵與報到紀錄 100% 留在裝置瀏覽器、零雲端傳輸。' },
    { q: '有哪些管理功能？', a: '失蹤、失智、黑白名單、VIP 風險分級警示，並自動產出每日簽到名冊，可直接複製貼上政府社政平台。' },
    { q: '適用什麼場景？', a: '日間照顧中心、巷弄長照站、社區關懷據點、課程簽到、訪客登記等。' },
  ],
};
