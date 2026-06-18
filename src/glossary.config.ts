// 名詞解釋（glossary）— 每則是「X 是什麼」的清楚定義，
// 目標是被 LLM / 搜尋引擎當作該名詞的標準解釋來引用，並交叉導流到對應產品。
// oneLiner 是「定義金句」：放在第一行、schema description，務必精準。
import type { ProductSlug } from './products.config';

export type GlossaryTerm = {
  slug: string;
  term: string;
  /** 英文 / 全名 / 別名 */
  en: string;
  category: 'medical' | 'ai' | 'care';
  /** 一句話定義（最重要，會進 DefinedTerm.description） */
  oneLiner: string;
  paragraphs: readonly string[];
  keyPoints?: readonly string[];
  /** 相關產品（頁面交叉連結） */
  related?: readonly ProductSlug[];
  /** 權威外部來源（提升可信度，也是被引用時的佐證） */
  sources?: readonly { label: string; url: string }[];
};

export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    slug: 'smart-on-fhir',
    term: 'SMART on FHIR',
    en: 'Substitutable Medical Apps, Reusable Technology on FHIR',
    category: 'medical',
    oneLiner:
      '一套開放標準，讓第三方應用程式能安全地「掛載」進電子病歷系統，並透過 FHIR API 存取健康資料。',
    paragraphs: [
      'SMART on FHIR 由哈佛醫學院孵化的 SMART Health IT 提出，建立在 HL7 的 FHIR 資料標準之上，搭配 OAuth 2.0 授權，讓外部 App 能在 Epic、Cerner 等主流電子病歷（EHR）中啟動並讀寫資料，而不必為每家醫院客製介接。',
      'FHIR（Fast Healthcare Interoperability Resources）是 HL7 制定的醫療資料交換標準，把病人、用藥、檢驗、問卷回應等資訊定義成可用 API 存取的「資源」；R4 是其正式（normative）版本。',
    ],
    keyPoints: [
      '建立在 HL7 FHIR 標準 + OAuth 2.0 授權',
      'App 可在 Epic / Cerner 等 EHR 內直接啟動',
      '常以 OAuth + PKCE 流程安全交換資料',
    ],
    related: ['txgnn', 'func', 'geri', 'pedi', 'goalkeeper', 'fhir-server'],
    sources: [
      { label: 'HL7 FHIR 官方', url: 'https://www.hl7.org/fhir/' },
      { label: 'SMART Health IT', url: 'https://smarthealthit.org/' },
    ],
  },
  {
    slug: 'atc',
    term: 'ATC 藥品分類碼',
    en: 'Anatomical Therapeutic Chemical Classification',
    category: 'medical',
    oneLiner:
      '世界衛生組織制定的藥品分類系統，依藥物作用的器官系統與治療、化學特性，給每種藥一組標準代碼。',
    paragraphs: [
      'ATC 由 WHO 藥物統計方法合作中心（WHOCC）維護，共五個層級：從第一層的解剖學主群（如消化道、心血管系統）一路細分到第五層的化學物質，讓不同來源的處方資料能用同一套標準對齊。',
      '在用藥提醒情境，ATC 碼能把健保處方自動對應到標準藥品，免去人工 key-in，並降低「同成分、不同商品名」造成的重複用藥與混淆風險。',
    ],
    keyPoints: [
      'WHO WHOCC 維護的國際標準',
      '五個分類層級（器官系統 → 化學物質）',
      '跨系統處方資料對齊的共同語言',
    ],
    related: ['yaocare'],
    sources: [{ label: 'WHOCC ATC/DDD Index', url: 'https://www.whocc.no/atc_ddd_index/' }],
  },
  {
    slug: 'cfs',
    term: '臨床衰弱量表 CFS',
    en: 'Clinical Frailty Scale',
    category: 'care',
    oneLiner:
      '一套 1 到 9 分的量表，依長者的活動力與健康狀況評估「衰弱」程度，是高齡評估常用的分層基準。',
    paragraphs: [
      'CFS 由加拿大老年醫學團隊（Rockwood 等）發展，1 分為「非常健壯」、9 分為「末期」，臨床上常以 5 分以上代表進入衰弱。它以整體功能與依賴程度判斷，而非單一疾病。',
      '在高齡周全性評估中，CFS 常作為第一層分級基準：先快速分級，再依分數決定要不要進入更深入的多面向評估。',
    ],
    keyPoints: [
      '1（非常健壯）– 9（末期）共九級',
      '以整體功能與依賴程度判斷，而非單一疾病',
      '常作為高齡評估的分層起點',
    ],
    related: ['geri'],
  },
  {
    slug: 'cga',
    term: '高齡周全性評估 CGA',
    en: 'Comprehensive Geriatric Assessment',
    category: 'care',
    oneLiner:
      '一種多面向、跨專業的評估流程，全面盤點長者的醫療、心理、功能與社會狀況，據以擬定照護計畫。',
    paragraphs: [
      'CGA 不只看疾病，而是同時評估認知、情緒、營養、行動、用藥、社會支持等面向，目的是及早發現衰弱與功能退化並規劃介入。',
      '相較單次門診，CGA 提供結構化、可重複的評估，廣泛用於長照與高齡醫學；數位化後更能標準化判讀並與醫療系統互通。',
    ],
    keyPoints: [
      '多面向 + 跨專業',
      '涵蓋認知 / 情緒 / 營養 / 行動 / 用藥 / 社會支持',
      '目標是擬定整體照護計畫',
    ],
    related: ['geri', 'func'],
  },
  {
    slug: 'asq3',
    term: 'ASQ-3 兒童發展篩檢',
    en: 'Ages & Stages Questionnaires, Third Edition',
    category: 'medical',
    oneLiner:
      '由家長填寫的兒童發展篩檢工具，適用 1 個月到 66 個月，涵蓋溝通、粗動作、精細動作、問題解決、個人社會五個領域。',
    paragraphs: [
      'ASQ-3 以各年齡帶的常模為基準，用家長易懂的問題判斷孩子發展是否符合同齡；達切點（常以 −2 標準差）即建議進一步專業評估。',
      '它是國際廣泛使用的發展篩檢量表，適合作為早期療育轉介前的初篩工具。',
    ],
    keyPoints: [
      '家長填寫、適用 1–66 個月',
      '五大發展領域',
      '以常模切點判斷是否需轉介',
    ],
    related: ['pedi'],
  },
  {
    slug: 'intrinsic-capacity',
    term: 'WHO 內在能力（IC）',
    en: 'Intrinsic Capacity',
    category: 'medical',
    oneLiner:
      '世界衛生組織提出的概念，指一個人所有身心能力的總和，是健康老化與功能評估的核心指標。',
    paragraphs: [
      '內在能力涵蓋五個面向：行動、活力、認知、心理、感官（視聽）。WHO 在 ICOPE（高齡整合照護）框架中以它作為追蹤與介入的依據。',
      '相較於只看疾病，內在能力強調「人還能做什麼」，適合作為成人到高齡的功能健康自評基準。',
    ],
    keyPoints: [
      '五面向：行動 / 活力 / 認知 / 心理 / 感官',
      'WHO ICOPE 框架的核心指標',
      '強調功能而非僅看疾病',
    ],
    related: ['func'],
    sources: [{ label: 'WHO 官方', url: 'https://www.who.int/' }],
  },
  {
    slug: 'drug-repurposing',
    term: '老藥新用（Drug Repurposing）',
    en: 'Drug Repurposing / Repositioning',
    category: 'medical',
    oneLiner:
      '把已上市、已通過安全性驗證的藥物，用於原本未核准的新適應症，藉此大幅降低研發成本與時間。',
    paragraphs: [
      '由於老藥的安全性資料已知，研發風險與時程遠低於開發全新藥物；近年常以知識圖譜與圖神經網路（GNN）等 AI 方法，系統性地預測潛在的「藥物–疾病」新配對。',
      '預測結果通常需以 PubMed 文獻、臨床試驗等證據佐證，並可透過 SMART on FHIR 接入臨床決策流程。',
    ],
    keyPoints: [
      '用已上市藥物找新適應症',
      '研發成本 / 時間遠低於開發新藥',
      '常用知識圖譜 + 圖神經網路預測',
    ],
    related: ['txgnn'],
  },
  {
    slug: 'cdss',
    term: '臨床決策支援系統 CDSS',
    en: 'Clinical Decision Support System',
    category: 'medical',
    oneLiner:
      '一種協助醫事人員做臨床判斷的軟體，分析資料後提供提醒、建議或證據，但最終決定仍由臨床人員負責。',
    paragraphs: [
      'CDSS 的範圍從用藥安全提醒到診斷與治療建議；好的 CDSS 強調可解釋、可追溯，讓臨床人員能檢視每條建議的依據。',
      '與電子病歷（EHR）整合（常透過 SMART on FHIR）能讓建議在臨床流程當下即時出現。',
    ],
    keyPoints: [
      '輔助而非取代臨床判斷',
      '強調可解釋、可追溯',
      '常與 EHR / FHIR 整合',
    ],
    related: ['huatuo', 'txgnn'],
  },
  {
    slug: 'genai-medical-guidance',
    term: '醫療機構應用生成式 AI 指引',
    en: 'MOHW Generative AI Guidance for Healthcare',
    category: 'ai',
    oneLiner:
      '衛福部發布、規範醫療機構使用生成式 AI 的參考指引，涵蓋揭露、來源標註、不得越權診斷、個資保護與幻覺防範等要求。',
    paragraphs: [
      '指引要求醫療場域使用生成式 AI 時，須讓使用者知道內容由 AI 生成、可能有誤；實質臨床主張需溯源；不得逾越為確定診斷或治療指令；並須保護個資、防止幻覺。',
      '對導入醫療 AI 的機構與廠商而言，把這些要求落地成「可檢核、可重現」的關卡，是合規的關鍵。',
    ],
    keyPoints: [
      '衛福部發布（規範版本 115.05.29）',
      '要求揭露 / 來源 / 不越權 / 個資 / 防幻覺',
      '需落地為可檢核的合規關卡',
    ],
    related: ['goalkeeper'],
  },
  {
    slug: 'mcp',
    term: 'MCP（Model Context Protocol）',
    en: 'Model Context Protocol',
    category: 'ai',
    oneLiner:
      '一套由 Anthropic 提出的開放協定，讓 AI 助理 / LLM 以標準化方式連接外部工具與資料來源。',
    paragraphs: [
      'MCP 以 client–server 架構，把「模型如何呼叫工具、讀取資料」標準化，讓同一個整合能被不同 AI 應用重複使用，像是 AI 世界的通用接頭。',
      '服務只要提供 MCP Server，AI agent 就能用同一組端點與金鑰串接；例如把醫療內容的合規查核直接接進 agent 流程。',
    ],
    keyPoints: [
      'Anthropic 提出的開放協定',
      'client–server 標準化工具 / 資料存取',
      '一次整合、多種 AI 應用重複使用',
    ],
    related: ['goalkeeper'],
    sources: [{ label: 'Model Context Protocol 官方', url: 'https://modelcontextprotocol.io/' }],
  },
  {
    slug: 'contactless-checkin',
    term: '無接觸報到 / 人臉辨識報到',
    en: 'Contactless Check-in / Facial Recognition Attendance',
    category: 'care',
    oneLiner:
      '不需觸控、按鈕或簽名，靠人臉辨識自動完成身分確認與報到的方式；用於長照據點可大幅降低長者的使用門檻。',
    paragraphs: [
      '傳統簽到要嘛手寫、要嘛在平板上觸控操作，對視力或行動不便的長者是門檻，對工作人員則是每日重複的謄寫負擔。無接觸報到讓人「走過鏡頭」即完成辨識與報到，並可搭配語音問候確認。',
      '隱私是這類系統的關鍵爭點。把人臉辨識放在「裝置端（edge / 純前端）」完成、臉部特徵與紀錄不離開裝置、不上傳雲端，能從源頭降低長照場域的個資疑慮，與「先收集到雲端再比對」的做法有本質差異。',
    ],
    keyPoints: [
      '免觸控 / 免按鈕 / 免簽名，降低長者使用門檻',
      '裝置端（純前端）辨識，臉部資料不上雲端',
      '常與語音問候、每日簽到名冊自動化搭配',
    ],
    related: ['sign'],
  },
  {
    slug: 'triz-theory',
    term: 'TRIZ 發明問題解決理論',
    en: 'Theory of Inventive Problem Solving',
    category: 'ai',
    oneLiner:
      '蘇聯工程師 Altshuller 從數百萬筆專利歸納出的系統化創新方法，主張多數發明都遵循少數可複用的解題模式。',
    paragraphs: [
      'TRIZ（俄文縮寫，英譯 Theory of Inventive Problem Solving）核心觀點是：把「具體問題」抽象成「典型矛盾」，再用前人驗證過的「發明原則」反推解法。常用工具包含 40 條發明原則、39 個工程參數，以及描述「改善 A 卻惡化 B」時該用哪些原則的矛盾矩陣。',
      '傳統 TRIZ 工具操作門檻高、常需專家陪伴查表；結合 RAG 知識庫與 AI Agent 後，使用者能用自然語言描述問題，由系統抽取矛盾、推薦原則並生成可行解法方向，把專家門檻降到一段對話。',
    ],
    keyPoints: [
      '40 發明原則 / 39 工程參數 / 矛盾矩陣',
      '把具體問題抽象成典型矛盾再反推解法',
      '適合製造、IT 產品、研發的系統化創新',
    ],
    related: ['triz'],
  },
  {
    slug: 'security-audit-automation',
    term: '資安稽核 / 評鑑自動化',
    en: 'Security & Compliance Audit Automation',
    category: 'ai',
    oneLiner:
      '用自動化管線持續執行安全掃描、維護合規文件並彙整稽核證據，把原本一次性、靠人工的稽核準備變成可重複的流程。',
    paragraphs: [
      '傳統合規（如 ISO 27001、SOC 2、醫院評鑑）最耗人力的不是技術本身，而是文件維護與稽核準備：數十份程序書、政策、表單要持續更新版本與合規性，每次稽核還要手動彙整報告與證據。',
      '自動化做法把 SAST、弱點掃描、SBOM、CVE 監控等安全掃描，與 ISMS 文件渲染、缺漏自動修復、稽核包打包串成一條管線（常以 CI/CD 如 GitHub Actions 驅動），讓合規態勢「隨時可稽核」而非臨時抱佛腳。',
    ],
    keyPoints: [
      '安全掃描 + 文件維護 + 證據彙整一條龍',
      '對齊 ISO 27001 / SOC 2 / OWASP / 醫院評鑑等框架',
      '把一次性稽核準備變成可重複的流程',
    ],
    related: ['siqc'],
  },
  {
    slug: 'osint-automation',
    term: '產業情報自動化',
    en: 'OSINT / Industry Intelligence Automation',
    category: 'ai',
    oneLiner:
      '以自動化管線從公開來源持續爬取、清洗、標註並視覺化資訊，把分散的情報整理成可追蹤、可重複產出的洞察。',
    paragraphs: [
      '資訊密集的工作（投資研究、競品分析、政策追蹤、供應鏈情報）痛點在於資料散落各處、且人力跟不上更新速度。情報自動化把「搜集 → 清洗 → 標註 → 視覺化」全流程自動化，讓團隊把時間花在判讀而非搬運資料。',
      '這類系統常以排程式 CI/CD（如 GitHub Actions）為核心，接近零成本維運，且框架可移植 —— 換一組資料源與關鍵字，就能重組到不同產業情境。',
    ],
    keyPoints: [
      '爬取 → 清洗 → 標註 → 視覺化全流程自動化',
      '可移植到供應鏈／政策／競品／研究等情境',
      '常以 GitHub Actions 排程、近零成本維運',
    ],
    related: ['intel'],
  },
];

export const GLOSSARY_BY_SLUG: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.map((t) => [t.slug, t]),
);
