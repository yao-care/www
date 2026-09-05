// 名詞解釋（glossary）— 每則是「X 是什麼」的清楚定義，
// 目標是被 LLM / 搜尋引擎當作該名詞的標準解釋來引用，並交叉導流到對應產品。
// oneLiner 是「定義金句」：放在第一行、schema description，務必精準。
import type { ProductSlug } from './products.config';

export type GlossaryTerm = {
  slug: string;
  /**
   * 最後更新日（YYYY-MM-DD）。初值＝該則加入 repo 的日期（2026-07-28 用 git 歷史回填）。
   * 用途：/rss.xml 全站訂閱源的時間軸排序。**改動這則內容時請一併更新**（大腦層 playbook 已要求）。
   */
  updatedAt: string;
  /** 所屬主題（/topics/<slug>；2026-07-15 Phase 3 掛靠，可選） */
  topic?: string;
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
    updatedAt: '2026-06-14',
    topic: 'explainable-medical-ai',
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
    updatedAt: '2026-06-14',
    topic: 'medication-safety',
    term: 'ATC 藥品分類碼',
    en: 'Anatomical Therapeutic Chemical Classification',
    category: 'medical',
    oneLiner:
      'ATC（Anatomical Therapeutic Chemical Classification，ATC 碼）是世界衛生組織制定的藥品分類系統，依藥物作用的器官系統與治療、化學特性，給每種藥一組標準代碼。',
    paragraphs: [
      'ATC 碼由 WHO 藥物統計方法合作中心（WHOCC）維護，共五個層級：從第一層的解剖學主群（如消化道、心血管系統）一路細分到第五層的化學物質，讓不同來源的處方資料能用同一套標準對齊。',
      '在用藥提醒情境，ATC 碼能把健保處方自動對應到標準藥品，免去人工 key-in，並降低「同成分、不同商品名」造成的重複用藥與混淆風險。',
    ],
    keyPoints: [
      'WHO WHOCC 維護的國際標準',
      '五個分類層級（器官系統 → 化學物質）',  // ai-voice-ok: ATC 五層分類的實際層級順序
      '跨系統處方資料對齊的共同語言',
    ],
    related: ['yaocare'],
    sources: [{ label: 'WHOCC ATC/DDD Index', url: 'https://www.whocc.no/atc_ddd_index/' }],
  },
  {
    slug: 'cfs',
    updatedAt: '2026-09-04',
    topic: 'elder-care-frailty',
    term: '臨床衰弱量表 CFS',
    en: 'Clinical Frailty Scale',
    category: 'care',
    oneLiner:
      'CFS（臨床衰弱量表）為 1 到 9 分：1 分是非常健壯、9 分是末期，用來呈現長者的活動力與健康狀況，是高齡評估最常用的分層工具之一。',
    paragraphs: [
      '臨床衰弱量表（Clinical Frailty Scale，中文也直接稱 CFS 量表）由加拿大 Dalhousie 大學的 Rockwood 團隊於 2005 年發表在《新英格蘭醫學期刊》，是「加拿大健康與老化研究」的一部分。量表上 1 分是「非常健壯」，9 分是「末期」，臨床上常以 5 分以上視為進入衰弱。判斷依據是長者整體的功能與依賴程度，並非單一疾病診斷。',
      '在高齡周全性評估中，CFS 量表常作為第一層分級基準：先快速分級，再依分數決定要不要進入更深入的多面向評估。',
    ],
    keyPoints: [
      '1（非常健壯）– 9（末期）共九級',
      '以整體功能與依賴程度判斷，而非單一疾病',
      '常作為高齡評估的分層起點',
    ],
    related: ['geri'],
    sources: [{ label: 'NCBI StatPearls - Clinical Frailty Scale', url: 'https://www.ncbi.nlm.nih.gov/books/NBK559009/' }],
  },
  {
    slug: 'cga',
    updatedAt: '2026-07-31',
    topic: 'elder-care-frailty',
    term: '高齡周全性評估 CGA',
    en: 'Comprehensive Geriatric Assessment',
    category: 'care',
    oneLiner:
      'CGA（Comprehensive Geriatric Assessment，高齡周全性評估）是一種多面向、跨專業的評估流程，全面盤點長者的醫療、心理、功能與社會狀況，據以擬定照護計畫。',
    paragraphs: [
      '在高齡醫學（Geriatric Medicine）領域，CGA 是最具代表性的跨專業評估方法。它不只看疾病診斷，而是同時評估認知、情緒、營養、行動、用藥、社會支持等多個面向，目的是及早發現衰弱與功能退化，並據此擬定個別化的整合照護介入計畫。',
      '與單次門診不同，CGA 是一套結構化、可重複的評估，廣泛應用於長照機構、醫院老年科與社區健康促進。數位化後判讀更趨一致，並可透過 SMART on FHIR 與醫療系統互通，使評估結果進入臨床決策流程。',
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
    updatedAt: '2026-06-14',
    topic: 'child-development',
    term: 'ASQ-3 兒童發展篩檢',
    en: 'Ages & Stages Questionnaires, Third Edition',
    category: 'medical',
    oneLiner:
      '由家長填寫的兒童發展篩檢工具，適用 1 個月到 66 個月，涵蓋溝通、粗動作、精細動作、問題解決、個人社會五個領域。',
    paragraphs: [
      'ASQ-3 拿各年齡帶的常模當比較基準，用家長易懂的問題判斷孩子發展是否符合同齡；達切點（常以 −2 標準差）即建議進一步專業評估。',
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
    updatedAt: '2026-06-14',
    topic: 'preventive-function-health',
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
    updatedAt: '2026-06-14',
    topic: 'explainable-medical-ai',
    term: '老藥新用（Drug Repurposing）',
    en: 'Drug Repurposing / Repositioning',
    category: 'medical',
    oneLiner:
      '把已上市、已通過安全性驗證的藥物，用於原本未核准的新適應症，藉此大幅降低研發成本與時間。',
    paragraphs: [
      '由於老藥的安全性資料已知，其研發風險與時程遠低於開發全新藥物。近年也常運用知識圖譜與圖神經網路（GNN）等 AI 方法，預測潛在的「藥物–疾病」新配對。',
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
    updatedAt: '2026-06-14',
    topic: 'explainable-medical-ai',
    term: '臨床決策支援系統 CDSS',
    en: 'Clinical Decision Support System',
    category: 'medical',
    oneLiner:
      'CDSS（Clinical Decision Support System，臨床決策支援系統）是協助醫事人員做臨床判斷的軟體，分析資料後提供提醒、建議或證據，但最終決定仍由臨床人員負責。',
    paragraphs: [
      'CDSS（Clinical Decision Support System）是輔助醫事人員臨床判斷的軟體，應用範圍涵蓋用藥安全提醒、鑑別診斷建議與治療計畫。設計良好的 CDSS 強調可解釋與可追溯：臨床人員能逐條檢視每項建議的依據，而非僅接受系統輸出。',
      '它通常透過 SMART on FHIR 與電子病歷（EHR）整合，使建議在診療當下即時呈現。在台灣，CDSS 的輸出亦須符合衛福部生成式 AI 指引對揭露與可追溯的要求。',
    ],
    keyPoints: [
      '輔助而非取代臨床判斷',
      '強調可解釋、可追溯',
      '常與 EHR / FHIR 整合，並需符合 AI 合規要求',
    ],
    related: ['huatuo', 'txgnn', 'goalkeeper'],
  },
  {
    slug: 'genai-medical-guidance',
    updatedAt: '2026-06-14',
    topic: 'medical-ai-governance',
    term: '醫療機構應用生成式 AI 指引',
    en: 'MOHW Generative AI Guidance for Healthcare',
    category: 'ai',
    oneLiner:
      '衛福部發布、規範醫療機構使用生成式 AI 的參考指引，涵蓋揭露、來源標註、不得越權診斷、個資保護與幻覺防範等要求。',
    paragraphs: [
      '指引要求醫療場域使用生成式 AI 時，須讓使用者知道內容由 AI 生成、可能有誤；實質臨床主張需溯源；不得逾越為確定診斷或治療指令；並須保護個資、防止幻覺。',
      '對導入醫療 AI 的機構與廠商而言，關鍵在於把這些要求轉化為可檢核、可重現的查核機制，使每次輸出都能對應到揭露、來源標註與權限規範。',
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
    updatedAt: '2026-06-14',
    topic: 'medical-ai-governance',
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
    updatedAt: '2026-06-18',
    topic: 'elder-care-frailty',
    term: '無接觸報到 / 人臉辨識報到',
    en: 'Contactless Check-in / Facial Recognition Attendance',
    category: 'care',
    oneLiner:
      '不需觸控、按鈕或簽名，靠人臉辨識自動完成身分確認與報到的方式；用於長照據點可大幅降低長者的使用門檻。',
    paragraphs: [
      '傳統簽到要嘛手寫、要嘛在平板上觸控操作，對視力或行動不便的長者是門檻，對工作人員則是每日重複的謄寫負擔。無接觸報到讓人「走過鏡頭」即完成辨識與報到，並可搭配語音問候確認。',
      '隱私是這類系統的主要爭點。若人臉辨識在裝置端（edge／純前端）完成、臉部特徵與紀錄皆不離開裝置、不上傳雲端，便能從源頭降低長照場域的個資風險；這與「先上傳雲端再比對」的架構有根本差異。',
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
    updatedAt: '2026-06-18',
    topic: 'innovation-methods',
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
    updatedAt: '2026-06-18',
    term: '資安稽核 / 評鑑自動化',
    en: 'Security & Compliance Audit Automation',
    category: 'ai',
    oneLiner:
      '用自動化管線持續執行安全掃描、維護合規文件並彙整稽核證據，把原本一次性、靠人工的稽核準備變成可重複的流程。',
    paragraphs: [
      '傳統合規（如 ISO 27001、SOC 2、醫院評鑑）最耗人力的不是技術本身，而是文件維護與稽核準備：數十份程序書、政策、表單要持續更新版本與合規性，每次稽核還要手動彙整報告與證據。',
      '自動化的做法，是將安全掃描（SAST、弱點掃描、SBOM、CVE 監控）與 ISMS 文件渲染、缺漏自動修復、稽核包封裝整合為單一管線，通常以 GitHub Actions 等 CI/CD 驅動，使合規狀態隨時可稽核，而非於稽核前才臨時準備。',
    ],
    keyPoints: [
      '安全掃描、文件維護、證據彙整一次做完',
      '對齊 ISO 27001 / SOC 2 / OWASP / 醫院評鑑等框架',
      '把一次性稽核準備變成可重複的流程',
    ],
    related: ['siqc'],
  },
  {
    slug: 'osint-automation',
    updatedAt: '2026-06-18',
    term: '產業情報自動化',
    en: 'OSINT / Industry Intelligence Automation',
    category: 'ai',
    oneLiner:
      '以自動化管線從公開來源持續爬取、清洗、標註並視覺化資訊，把分散的情報整理成可追蹤、可重複產出的洞察。',
    paragraphs: [
      '資訊密集的工作（投資研究、競品分析、政策追蹤、供應鏈情報）痛點在於資料散落各處、且人力跟不上更新速度。情報自動化把「搜集 → 清洗 → 標註 → 視覺化」這一整趟自動化，讓團隊把時間花在判讀而非搬運資料。',  // ai-voice-ok: 情報自動化的實際處理步驟
      '這類系統多以排程式 CI/CD（如 GitHub Actions）為核心，維運成本接近於零；框架亦具可移植性：更換資料源與關鍵字，即可重組至不同產業情境。',
    ],
    keyPoints: [
      '爬取 → 清洗 → 標註 → 視覺化，整趟自動化',  // ai-voice-ok: 情報自動化的實際處理步驟
      '可移植到供應鏈／政策／競品／研究等情境',
      '常以 GitHub Actions 排程、近零成本維運',
    ],
    related: ['intel'],
  },
  {
    slug: 'ai-agent',
    updatedAt: '2026-06-18',
    topic: 'intelligence-automation',
    term: 'AI Agent（AI 代理）',
    en: 'AI Agent',
    category: 'ai',
    oneLiner:
      '能自主把目標拆成步驟、呼叫工具並依每一步結果決定下一步以完成任務的 AI 系統，而非單次一問一答。',
    paragraphs: [
      'AI Agent 指用大型語言模型當核心、能「規劃 → 行動 → 觀察結果再調整」的系統：它把一個目標拆成多個步驟，過程中呼叫外部工具（搜尋、資料庫、API），依每一步回饋決定下一步，而不是只回一段文字。',  // ai-voice-ok: Agent 迴圈的實際步驟
      '它與一般聊天機器人的差別，在於自主性與工具使用。其工具能力通常來自函式呼叫（function calling）與標準化的工具協定（如 MCP，Model Context Protocol），使 agent 能安全、可重複地接上各種系統與資料來源。',
    ],
    keyPoints: [
      '規劃 → 呼叫工具 → 依結果調整的迴圈',  // ai-voice-ok: Agent 迴圈的實際步驟
      '透過 function calling / MCP 接外部工具與資料',
      '適合多步驟、需整合多來源的任務',
    ],
    related: ['intel', 'siqc', 'triz', 'goalkeeper'],
  },
  {
    slug: 'rag',
    updatedAt: '2026-06-18',
    topic: 'intelligence-automation',
    term: 'RAG 檢索增強生成',
    en: 'Retrieval-Augmented Generation',
    category: 'ai',
    oneLiner:
      '讓大型語言模型回答前先「檢索」外部知識庫、再依檢索到的內容生成答案的方法，用以提高正確性與可溯源性。',
    paragraphs: [
      'RAG 把「檢索（retrieval）」接在「生成（generation）」之前：先把問題拿去向量資料庫等知識庫找出最相關片段，再連同問題一起餵給 LLM 生成答案。好處是答案能引用實際資料、降低幻覺，且知識可即時更新而不必重新訓練模型。',
      '典型流程是把文件切塊（chunk）、轉成向量（embed）建索引，查詢時以語意相似度找回片段。RAG 常作為 AI Agent 的「查資料」工具，也是把專業知識庫接上 LLM 的主流做法。',
    ],
    keyPoints: [
      '先檢索知識庫、再生成答案',
      '降低幻覺、答案可溯源、知識可即時更新',
      '流程：chunk → embed → 向量檢索 → 生成',  // ai-voice-ok: RAG 管線的實際步驟
    ],
    related: ['triz', 'huatuo', 'intel'],
  },
  {
    slug: 'llm',
    updatedAt: '2026-06-19',
    topic: 'medical-ai-governance',
    term: '大型語言模型（LLM）',
    en: 'Large Language Model',
    category: 'ai',
    oneLiner:
      '用海量文字訓練、以「預測下一個詞」為核心、能理解與生成自然語言的深度學習模型，如 GPT、Claude、Gemini。',
    paragraphs: [
      'LLM（Large Language Model，大型語言模型）是建立在 Transformer 架構上、用大規模文字語料訓練的神經網路模型。它最基本的能力是「依前文預測下一個詞」，當模型與資料規模放大後，便展現出問答、摘要、翻譯、寫程式與推理等通用語言能力。代表性模型包括 OpenAI 的 GPT、Anthropic 的 Claude、Google 的 Gemini。',
      'LLM 是生成式 AI 的核心，但有「幻覺」（看似合理卻不正確）的本質限制。在醫療等高風險場景，較可信的用法是搭配 RAG（檢索增強生成）讓回答有依據、用明文規則約束推理、並保留可追溯的推理路徑，而不是把 LLM 當成無法查核的黑箱。',
    ],
    keyPoints: [
      '建立在 Transformer 上，核心是「預測下一個詞」',
      '通用語言能力：問答、摘要、翻譯、寫程式、推理',
      '有幻覺風險，醫療場景需 RAG／明文規則／可追溯佐證',
    ],
    related: ['huatuo', 'goalkeeper', 'intel'],
    sources: [
      { label: 'Wikipedia：Large language model', url: 'https://en.wikipedia.org/wiki/Large_language_model' },
    ],
  },
  {
    slug: 'txgnn',
    updatedAt: '2026-06-19',
    term: 'TxGNN（藥物再利用圖神經網路模型）',
    en: 'TxGNN — graph foundation model for drug repurposing',
    category: 'medical',
    oneLiner:
      'TxGNN 是哈佛醫學院 Zitnik Lab 開發的圖神經網路「基礎模型」，在大型生物醫學知識圖譜上預測已核准藥物的潛在新適應症，是 AI 老藥新用的代表性開源工具。',
    paragraphs: [
      'TxGNN 由哈佛醫學院 Zitnik Lab（Marinka Zitnik 團隊）研發，核心做法是在大型生物醫學知識圖譜上訓練圖神經網路（GNN），讓模型學習藥物、疾病、基因、蛋白質之間的關聯。它最大的特點是「zero-shot（零樣本）」能力：即使是缺乏現有療法、資料稀少的疾病，也能把已研究疾病的知識遷移過去，輸出藥物候選的預測分數與可解釋的推理路徑。相關研究於 2024 年發表在《Nature Medicine》。',
      '相較於從頭開發新藥，老藥新用以「已核准藥物的安全性資料已知」為核心優勢，通常可省去部分早期安全性試驗、縮短研發時程，對罕見疾病尤其有意義。TxGNN 的原始碼已於 GitHub（mims-harvard/TxGNN）開源，學術與臨床資訊團隊可依需求擴充。',
      '要分清「模型規模」與「導入平台規模」：TxGNN 論文涵蓋約 8,000 種藥物 × 17,080 種疾病；而藥提醒科技有限公司（yao.care）以此模型為基礎建置的老藥新用平台，台灣站名為 TwTxGNN（twtxgnn.yao.care），其餘各國依 {國碼}TxGNN 命名。該平台目前部署涵蓋 30 國、約 1,507 種藥物 × 166 種疾病，每筆預測附 PubMed 與 ClinicalTrials 證據，並可經 SMART on FHIR 在電子病歷系統內呈現，作為醫師的決策參考。',
    ],
    keyPoints: [
      '哈佛 Zitnik Lab 開發的圖神經網路（GNN）基礎模型，2024 年發表於 Nature Medicine',
      'zero-shot：對缺乏現有療法的疾病也能預測藥物候選，並附可解釋推理路徑',
      '開源（mims-harvard/TxGNN）；藥提醒科技有限公司（yao.care）的 TwTxGNN 平台導入 30 國、1,507 藥 × 166 病並附文獻證據',
    ],
    related: ['txgnn'],
    sources: [
      { label: 'Nature Medicine（2024）論文原文', url: 'https://www.nature.com/articles/s41591-024-03333-8' },
      { label: 'PubMed Central — 全文（PMC11326339）', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11326339/' },
      { label: 'GitHub — mims-harvard/TxGNN（原始碼）', url: 'https://github.com/mims-harvard/TxGNN' },
    ],
  },
];

export const GLOSSARY_BY_SLUG: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.map((t) => [t.slug, t]),
);
