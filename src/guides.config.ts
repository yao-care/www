// 情境指南（guides）— 以「使用者真的會搜尋的那句話」為標題的決策/比較頁。
// 設計原則：標題=自然語言問題；先給直接解答（answer，給 LLM 抓的 answer box）；
// 再中立講判斷依據與選項；最後才把 yao.care 的工具當「低門檻的一步」帶進來。
import type { ProductSlug } from './products.config';

export type GuideSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export type Guide = {
  slug: string;
  /**
   * 最後更新日（YYYY-MM-DD）。初值＝該則加入 repo 的日期（2026-07-28 用 git 歷史回填）。
   * 用途：/rss.xml 全站訂閱源的時間軸排序。**改動這則內容時請一併更新**（大腦層 playbook 已要求）。
   */
  updatedAt: string;
  /** 所屬主題（/topics/<slug>；2026-07-15 Phase 3 掛靠，可選） */
  topic?: string;
  /** H1 / og title 的問題（使用者原話） */
  question: string;
  /** 同義問法（補關鍵字變體、列在頁面「常見問法」） */
  searchPhrases: readonly string[];
  audience: 'caregiver' | 'parent' | 'adult' | 'b2b' | 'all';
  /** 直接解答（answer box；schema description） */
  answer: string;
  sections: readonly GuideSection[];
  /** 介紹我們的工具如何幫上忙（接在內容流程後） */
  toolIntro?: string;
  faqs: readonly { q: string; a: string }[];
  related?: readonly ProductSlug[];
  /** 相關名詞（glossary slug） */
  relatedTerms?: readonly string[];
  /** 答案下方的一句連回名詞頁（名詞頁管定義，指南頁管細節） */
  definitionLink?: { slug: string; lead: string; label: string };
  /**
   * 延伸資源（非 yao.care 自家產品的外部連結）。
   * 只在真的相關、免費／開源／公益的資源才放，且全站只挑最相關的一兩則，避免浮濫互連。
   */
  externalResources?: readonly { before: string; label: string; url: string; after: string }[];
  /**
   * 權威來源（供 MedicalWebPage 的 schema `citation` 使用；GEO 用）。
   * 只放實開查證過的權威文獻／官方頁；來源與 glossary/topics 既有 sources 一致。
   */
  sources?: readonly { label: string; url: string }[];
};

export const AUDIENCE_LABEL: Record<Guide['audience'], string> = {
  caregiver: '照顧長輩',
  parent: '兒童家長',
  adult: '成人自己',
  b2b: '專業 / 機構',
  all: '全齡',
};

export const GUIDES: readonly Guide[] = [
  {
    slug: 'elder-frailty-assessment',
    updatedAt: '2026-06-14',
    topic: 'elder-care-frailty',
    question: '長輩體力變差、走路變慢、常跌倒，要做什麼評估？',
    searchPhrases: ['長輩走路變慢', '老人家容易累', '長者常跌倒怎麼辦', '長輩體力下降看哪科', '長者衰弱評估'],
    audience: 'caregiver',
    answer:
      '長輩出現體力下降、走路變慢、容易累、反覆跌倒，常是「衰弱（frailty）」的早期訊號，建議做高齡周全性評估（CGA）：先以臨床衰弱量表（CFS）分級，再看認知、營養、用藥等多個面向。早期介入能延緩失能。可先用線上自篩快速了解風險，再決定是否就醫。',
    sections: [
      {
        heading: '哪些訊號要當心',
        bullets: [
          '走路變慢、需要扶東西或中途停下休息',
          '半年內非刻意的體重明顯下降',
          '容易疲倦、提不起勁',
          '握力變弱，開罐 / 擰毛巾變吃力',
          '一年內跌倒一次以上',
        ],
      },
      {
        heading: '該做哪種評估',
        paragraphs: [
          '單看一項症狀不夠。建議用高齡周全性評估（CGA）：先以臨床衰弱量表（CFS 1–9）分級，再評估認知、情緒、營養、行動步態、用藥與社會支持等面向，找出可介入的點。',
        ],
        bullets: ['CFS 分級：快速判斷整體衰弱程度', '多面向評估：認知 / 營養 / 用藥 / 跌倒風險…', '功能測驗：如五次坐站計時'],
      },
      {
        heading: '在家可以先做什麼',
        bullets: [
          '維持規律阻力運動與足夠蛋白質',
          '檢視多重用藥，清掉重複或不必要的藥',
          '改善居家照明與防滑，降低跌倒風險',
          '出現上述警訊時，及早安排評估或就醫',
        ],
      },
    ],
    toolIntro:
      'Smart Geri 提供免費的高齡周全性評估：家屬可用自篩模式快速了解風險，專業人員可用臨床模式做結構化評估，結果以紅黃綠分級給出轉介建議。',
    faqs: [
      { q: '長輩走路變慢一定是生病嗎？', a: '不一定，但若同時有容易累、體重下降、跌倒，可能是衰弱的早期訊號，建議做評估及早釐清。' },
      { q: '衰弱可以改善嗎？', a: '早期衰弱常可透過運動、營養與用藥檢視等介入而延緩、甚至部分逆轉，關鍵是及早發現。' },
      { q: '要先看醫生還是先自我評估？', a: '可先用線上自篩了解風險方向，紅燈或有明顯警訊再就醫，能讓就診更有重點。' },
    ],
    related: ['geri', 'yaocare'],
    relatedTerms: ['cfs', 'cga'],
  },
  {
    slug: 'elder-multiple-medications',
    updatedAt: '2026-08-24',
    topic: 'medication-safety',
    question: '長輩同時吃很多種藥，怎麼避免吃錯、漏吃？',
    searchPhrases: ['長輩吃很多種藥', '多重用藥怎麼辦', '老人家忘記吃藥', '慢性病領藥提醒', '吃錯藥怎麼預防', '預防長者重複吃錯藥的方法'],
    audience: 'caregiver',
    answer:
      '長輩同時吃很多種藥，最常出的狀況是漏吃、重複吃，或藥物彼此起交互作用。要預防長者重複吃錯藥，關鍵做法有三個：用標準藥品碼（ATC）整理清單揪出重複成分、用藥品外觀辨識避免拿錯、用每日提醒避免漏吃。用 LINE 就能收提醒、不必安裝 App，對長輩門檻最低。',
    sections: [
      {
        heading: '多重用藥常見風險',
        bullets: ['同成分、不同商品名 → 重複用藥', '記不住複雜服藥時間 → 漏吃或亂吃', '藥品長得像 → 拿錯', '藥物交互作用增加副作用風險'],  // ai-voice-ok: 風險對照表，箭頭是「導致」
      },
      {
        heading: '怎麼降低風險',
        bullets: [
          '整理一份完整藥單（含保健食品），請醫師 / 藥師檢視',
          '用 ATC 標準碼比對，揪出重複成分',
          '以藥品外觀圖片核對，避免拿錯',
          '設定每日固定時間的服藥提醒',
        ],
      },
    ],
    toolIntro:
      '藥提醒依 ATC 編碼整合健保處方，透過 LINE / Telegram 推播服藥提醒並附藥品外觀圖片，不必安裝 App，特別適合長輩；藥師端也能追蹤服藥達成率。',
    faqs: [
      { q: '長輩不會用 App 怎麼辦？', a: '藥提醒直接用 LINE 或 Telegram 接收提醒，不需安裝 App，降低長輩使用門檻。' },
      { q: '怎麼知道有沒有重複用藥？', a: '以 ATC 標準藥品碼比對處方，可揪出同成分、不同商品名造成的重複。' },
    ],
    related: ['yaocare', 'geri'],
    relatedTerms: ['atc'],
  },
  {
    slug: 'child-development-delay',
    updatedAt: '2026-06-14',
    topic: 'child-development',
    question: '小孩 2 歲還不太會說話，發展正常嗎？',
    searchPhrases: ['小孩2歲不會說話', '幼兒語言發展遲緩', '兒童發展正常嗎', '發展遲緩徵兆', '小孩走路晚正常嗎'],
    audience: 'parent',
    answer:
      '每個孩子發展速度不同，但有「發展里程碑」可參考。2 歲常見能說一些雙詞句；若明顯落後同齡，建議用對齊 ASQ-3 的發展篩檢初步判斷，達警訊切點再尋求兒童發展專業評估。早期發現能把握黃金療育期。篩檢不是診斷，而是幫你判斷要不要、何時找專業。',
    sections: [
      {
        heading: '怎麼初步判斷',
        paragraphs: ['發展涵蓋多個領域，不只語言。可用對齊國健署兒童健康手冊與 ASQ-3 的篩檢，看孩子在各領域是否符合同齡。'],
        bullets: ['粗動作、精細動作', '語言理解、語言表達', '認知', '社會情緒'],
      },
      {
        heading: '哪些情況建議進一步評估',
        bullets: [
          '某領域明顯落後同齡（常以 −2 標準差為警訊）',
          '原本會的能力退步',
          '幾乎沒有眼神接觸、互動或回應呼喚',
          '家長持續感到不安',
        ],
      },
      {
        heading: '早期療育為什麼重要',
        paragraphs: ['幼兒大腦可塑性高，越早介入效果越好。篩檢的目的不是貼標籤，而是幫你決定「要不要、何時」找專業評估。'],
      },
    ],
    toolIntro:
      'Smart Pedi 提供免費的兒童發展篩檢：依年齡帶給出問卷、對齊 ASQ-3 常模，用雷達圖對比同齡並紅黃綠分級，給出觀察或轉介建議。',
    faqs: [
      { q: '孩子說話比較慢一定要看醫生嗎？', a: '不一定，但若明顯落後同齡或伴隨其他領域落後，建議先做篩檢再決定是否就醫。' },
      { q: '篩檢就是診斷嗎？', a: '不是。篩檢是初步判斷是否需要進一步專業評估，不能取代醫師診斷。' },
    ],
    related: ['pedi'],
    relatedTerms: ['asq3'],
  },
  {
    slug: 'adult-functional-decline',
    updatedAt: '2026-06-14',
    topic: 'preventive-function-health',
    question: '成人體力、記憶、睡眠變差，是正常老化還是亞健康？',
    searchPhrases: ['體力變差原因', '記憶力下降', '睡不好容易累', '亞健康自我檢測', '健康檢查功能評估'],
    audience: 'adult',
    answer:
      '一般健檢偏重血液與影像數據，卻常測不出「功能」狀態。若你覺得體力、記憶、睡眠、情緒變差，可用 WHO 內在能力（IC）框架自評活力、行動、認知、心理、感官五大功能，快速分辨是需要調整生活、還是該尋求專業協助。',
    sections: [
      {
        heading: '為什麼健檢正常還是覺得不對勁',
        paragraphs: ['生化數據正常不代表功能良好。WHO 以「內在能力」描述一個人的身心功能總和，更貼近「我還能不能好好生活」這個問題。'],
      },
      {
        heading: '評估哪些面向',
        bullets: [
          '活力：睡眠、營養、疲勞',
          '行動：運動、行走、久坐',
          '認知：注意力、記憶、處理速度',
          '心理：情緒、壓力、焦慮',
          '感官：視力、聽力',
        ],
      },
      {
        heading: '結果怎麼用',
        bullets: ['綠：維持生活習慣', '黃：針對性調整並追蹤', '紅：尋求專業評估（含情緒 / 自傷訊號的求助資源）'],
      },
    ],
    toolIntro:
      'Smart Func 依 WHO 內在能力框架，10–15 分鐘自評五大功能，結果以紅黃綠分級並附衛教與轉介；資料留在你的裝置。',
    faqs: [
      { q: '這能取代健康檢查嗎？', a: '不能。它評估的是「功能」狀態，與血液 / 影像健檢互補，可作為就醫前的自我了解。' },
      { q: '幾歲適合做？', a: '成人都適用，特別是覺得體力、認知或情緒變差、想及早調整的人。' },
    ],
    related: ['func'],
    relatedTerms: ['intrinsic-capacity'],
    externalResources: [
      {
        before: '若睡眠是主要困擾，也可以先試試非藥物的輔助方式，例如',
        label: 'Vuko',
        url: 'https://www.vuko.life/',
        after: '——一款免費開源的呼吸節奏引導 Web App，透過雙耳拍頻幫助放鬆與入睡。',
      },
    ],
  },
  {
    slug: 'medical-ai-content-compliance',
    updatedAt: '2026-06-14',
    topic: 'medical-ai-governance',
    question: '用 AI 生成的醫療／衛教內容，會不會違反法規？怎麼自我檢查？',
    searchPhrases: ['AI生成醫療內容法規', '衛教文章AI合法嗎', '生成式AI醫療指引', '醫療廣告AI', 'AI醫療內容免責'],
    audience: 'b2b',
    answer:
      '在台灣，醫療機構使用生成式 AI 需遵循衛福部《醫療機構應用生成式人工智慧指引》等規範。重點在五件事：揭露是 AI 生成、實質主張要溯源、不得越權下確定診斷、保護個資、防止幻覺。建議把這些落地成「每次發布前的自動檢查關卡」，而非靠人工逐篇審。',
    sections: [
      {
        heading: '容易踩到的五個地雷',
        bullets: [
          '沒有揭露內容由 AI 生成、可能有誤',
          '臨床主張沒有來源',
          '語氣像是在下確定診斷或治療指令',
          '夾帶可識別個資',
          '編造文獻或與臨床指引不符（幻覺）',
        ],
      },
      {
        heading: '怎麼建立可重現的自我檢查',
        paragraphs: [
          '人工逐篇審查不可持續。較佳做法是用 API 在發布前自動跑檢查，回報每道關卡狀態與依據法條，並保留稽核軌跡。判讀鐵則：error 不等於 pass、任一 fail 擋下、warning / error 轉人工覆核。',
        ],
      },
    ],
    toolIntro:
      'goalkeeper 是醫療 AI 內容的合規查核 API：送進內容，回報揭露、來源、越權診斷、個資、幻覺五道檢查的狀態與法源，但不替你做整體放行決定；提供 REST API 與 MCP Server，隱私優先、原文不入稽核。',
    faqs: [
      { q: '這個服務會幫我決定能不能發布嗎？', a: '不會。它只回各關卡狀態，整體放行與否由你依關卡自行判讀。' },
      { q: '送去檢查的內容會外洩嗎？', a: '服務先在內部去識別化，原文與個資原值永不寫入稽核，只存遮罩文雜湊與狀態摘要。' },
    ],
    related: ['goalkeeper'],
    relatedTerms: ['genai-medical-guidance', 'llm', 'mcp'],
  },
  {
    slug: 'daycare-checkin-roster',
    updatedAt: '2026-06-14',
    topic: 'elder-care-frailty',
    question: '日照中心／長照據點怎麼做報到，又能交出政府要的名冊？',
    searchPhrases: ['日照中心簽到', '長照據點報到系統', '長者簽到名冊', '長照出席政府平台', '人臉辨識報到長者'],
    audience: 'b2b',
    answer:
      '長照據點的報到要兼顧三件事：對長者友善（不必觸控、簽名、裝 App）、對工作人員省力（自動產出名冊）、對個資負責。無接觸人臉辨識報到可讓長者走過鏡頭即完成報到，並自動彙整可貼政府平台的每日名冊；選純前端、零雲端方案能降低個資疑慮。',
    sections: [
      {
        heading: '據點報到常見痛點',
        bullets: ['長者不擅長觸控簽到、安裝 App', '人工簽到耗時、又要手動謄名冊', '雲端人臉辨識引發個資疑慮', '高風險（失智 / 走失）對象需要主動提醒'],
      },
      {
        heading: '挑選方案的重點',
        bullets: [
          '長者友善：免按鈕、免簽名、免裝 App',
          '隱私：資料是否留在本機、零雲端',
          '名冊：能否自動產出、貼上政府平台',
          '警示：能否標記風險對象並提醒',
        ],
      },
    ],
    toolIntro:
      '長者友善無接觸報到是純前端 PWA：長者走過鏡頭自動辨識並語音問候，資料 100% 留在裝置、零雲端，內建風險分級警示，並自動產出可貼政府平台的每日簽到名冊。',
    faqs: [
      { q: '長者的臉部資料會上傳雲端嗎？', a: '不會。它是純前端方案，臉部與紀錄資料 100% 留在裝置瀏覽器。' },
      { q: '能直接交出政府要的名冊嗎？', a: '可自動產出每日簽到名冊，格式可直接複製貼上政府社政平台。' },
    ],
    related: ['sign'],
    relatedTerms: [],
  },
  {
    slug: 'which-health-self-assessment',
    updatedAt: '2026-06-14',
    topic: 'preventive-function-health',
    question: '不同年齡的健康自我評估怎麼選？',
    searchPhrases: ['健康自我評估工具', '線上健康檢測', '發展功能衰弱評估差別', '全齡健康評估', '免費健康自評'],
    audience: 'all',
    answer:
      '健康自我評估要看「年齡與目的」：兒童看發展是否符合里程碑、成人看功能是否開始下滑、長者看衰弱與失能風險。yao.care 以同一套 SMART on FHIR 標準，提供兒童、成人、高齡三個對應工具，都免費、資料留在裝置，並可選擇送交 GCM 收案銜接後續。',
    sections: [
      {
        heading: '依人生階段對照',
        paragraphs: ['三者技術同源、判讀方式一致（紅黃綠分級），差別在評估重點與依據的標準。'],
        bullets: [
          '兒童（2 月–6 歲）→ Smart Pedi：六大發展領域，對齊 ASQ-3 與國健署手冊',
          '成人（18–64）→ Smart Func：WHO 內在能力五大功能',
          '高齡（65+）→ Smart Geri：CFS 衰弱量表 + 多面向 CGA',
        ],
      },
      {
        heading: '它們的共同點',
        bullets: [
          '免費、免註冊，資料留在你的裝置',
          '紅黃綠分級 + 衛教與轉介建議',
          '以 SMART on FHIR 標準，可選擇上傳院所或 GCM 收案',
        ],
      },
      {
        heading: '怎麼選',
        bullets: ['看「對象年齡」決定用哪個', '關心發展 → Pedi；功能 / 亞健康 → Func；衰弱 / 長照 → Geri', '不確定可先做，結果紅燈再就醫'],  // ai-voice-ok: 分流對照表，箭頭是「對應到」
      },
    ],
    faqs: [
      { q: '這些評估免費嗎？', a: '是，免費、免註冊，資料留在你的裝置。' },
      { q: '評估結果能給醫生看嗎？', a: '可匯出，或選擇以 SMART on FHIR 上傳合作院所 / GCM 收案，銜接後續追蹤。' },
    ],
    related: ['func', 'geri', 'pedi'],
    relatedTerms: ['intrinsic-capacity', 'cfs', 'asq3', 'cga', 'smart-on-fhir'],
  },
  {
    slug: 'tcm-ai-trustworthy',
    updatedAt: '2026-06-18',
    topic: 'explainable-medical-ai',
    question: 'AI 看中醫、線上中醫問診的辨證結果可信嗎？',
    searchPhrases: ['AI 中醫可信嗎', '線上中醫問診準嗎', 'AI 把脈舌診準確嗎', '中醫 AI 會不會亂講', 'AI 辨證可靠嗎'],
    audience: 'all',
    answer:
      'AI 中醫問診可不可信，關鍵不在「答得像不像中醫」，而在「能不能說清楚怎麼推論」。單純用通用大型語言模型（LLM）聊天，答案像黑箱、可能出現幻覺；較可信的做法是把中醫辨證規則寫成可逐條審查的明文規則，LLM 只當輔助，並讓每一步推論都能追溯到規則與證據。無論如何，AI 辨證屬參考與衛教，不能取代合格中醫師的親自診察與處方。',
    sections: [
      {
        heading: '為什麼「可解釋」比「答得像不像」更重要',
        paragraphs: [
          '醫療場景最怕黑箱。一個說得頭頭是道、卻無法解釋依據的答案，在中醫辨證上風險很高——你無從判斷它是根據證型推理，還是只是把網路上的說法重組。可信的 AI 中醫應該讓人（尤其是中醫師）能檢視「為什麼得到這個結論」。',
        ],
      },
      {
        heading: '判斷一套中醫 AI 可不可信，看這幾點',
        bullets: [
          '辨證規則是否「明文、可審查」，而非全交給 LLM 自由發揮',
          'LLM 是否只是輔助角色，而非最終決策者',
          '結論是否附「推理路徑」與證據（觸發了哪些規則、引用了哪些醫案）',
          '是否輸出標準碼（如 ICD-11 TM）、能否與醫療系統（FHIR）介接',
          '是否清楚標示「不取代醫師、不處理急重症」',
        ],
      },
      {
        heading: 'AI 中醫問診不該做的事',
        bullets: [
          '不替你開立處方、不取代中醫師的親自診察',
          '不處理急重症或需要立即就醫的狀況',
          '孕婦、慢性病、正在服藥者調整用藥，務必先諮詢專業',
        ],
      },
    ],
    toolIntro:
      '我們開發的「AI 華佗」就是依這個原則設計：採規則 ×0.6 + LLM ×0.4 的混合辨證，128 條八綱／臟腑規則明文寫在編碼檔裡、可被中醫師逐條檢視；每個結論都附完整推理路徑與 RAG 證據，並輸出 ICD-11 TM 與 FHIR R4。另設 /clinician 中醫師工作站作為臨床決策支援（CDSS）。',
    faqs: [
      { q: 'AI 把脈、舌診準嗎？', a: '華佗以舌診拍照、語聲錄音、rPPG 指尖測脈等輔助收集四診資訊，但這些是「輔助參考」，最終辨證仍以可審查的規則為主、LLM 為輔，且不取代中醫師親自四診。' },
      { q: '它會幫我開藥嗎？', a: '不會。系統提供辨證分析與經方「參考」並提示禁忌配伍，但實際處方與用藥須由合格中醫師決定。' },
    ],
    related: ['huatuo'],
    relatedTerms: ['cdss', 'llm'],
  },
  {
    slug: 'drug-repurposing-for-rare-disease',
    updatedAt: '2026-06-18',
    topic: 'explainable-medical-ai',
    question: '罕見疾病或現有藥物無效，有沒有「現成的藥」可以試？',
    searchPhrases: ['老藥新用', '罕見疾病有藥嗎', '舊藥新用途', 'drug repurposing 中文', '現有藥物治療罕病', '藥物再利用'],
    audience: 'all',
    answer:
      '老藥新用（drug repurposing）是把已上市、已通過安全性驗證的藥物，用於原本未核准的新適應症。對罕見疾病或現有療法有限的病患，這是一條相對快、成本較低的探索方向。但任何「現成藥物可能有效」的預測都屬研究參考，是否適用於個人病情、能否使用，務必與主治醫師討論，切勿自行購買、停藥或換藥。',
    sections: [
      {
        heading: '為什麼「老藥」值得期待',
        bullets: [
          '已上市藥物通過安全性驗證，研發時間與成本遠低於開發新藥',
          '對罕見疾病等「市場小、新藥開發誘因低」的處境特別有意義',
          '歷史上不少藥物都是先發現原用途、後來才找到新適應症',
        ],
      },
      {
        heading: '怎麼看待 AI／資料庫給的「候選藥物」',
        bullets: [
          '看它是否附文獻（PubMed）與臨床試驗（ClinicalTrials）證據',
          '看「信心分級」——區分雙重證據支持與單一來源推測',
          '分清楚「研究假說」與「臨床已證實」是兩回事',
          '任何候選都需要醫師依個人病情評估，不能自行套用',
        ],
      },
      {
        heading: '病患與家屬能做的事',
        bullets: [
          '整理完整的用藥史與確切診斷，方便與醫療團隊討論',
          '與主治醫師或罕病團隊討論是否有可考慮的方向',
          '查詢 ClinicalTrials 是否有正在招募、可參加的臨床試驗',
        ],
      },
    ],
    toolIntro:
      '我們以哈佛醫學院 Zitnik Lab 的 TxGNN 模型為基礎，建了 30 個國家與地區的「老藥新用」網站。模型替每組藥物與疾病打分數，排除已知用途後列出可能的新適應症，再附上 PubMed 文獻與 ClinicalTrials.gov 臨床試驗，標上 L1–L5 證據等級；也可經 SMART on FHIR 在電子病歷系統內呈現，作為醫師的研究參考。',
    faqs: [
      { q: '老藥新用的預測可以直接拿去用藥嗎？', a: '不可以。預測屬研究參考、用於提出假說，是否適用個人病情、能否使用一定要由醫師評估，切勿自行用藥或停換藥。' },
      { q: '一般人查得到嗎？', a: '可以。平台公開瀏覽，涵蓋 30 個國家與地區核准的藥、每藥一頁並附證據；但請把它當作「與醫師討論的素材」，不是處方。' },
    ],
    related: ['txgnn'],
    relatedTerms: ['drug-repurposing', 'smart-on-fhir'],
    sources: [
      { label: 'TxGNN 原始論文：A foundation model for clinician-centered drug repurposing，《Nature Medicine》2024', url: 'https://doi.org/10.1038/s41591-024-03233-x' },
      { label: 'PubMed Central — 預印本全文（PMC11326339）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11326339/' },
      { label: '哈佛醫學院 Zitnik Lab：TxGNN 專案頁', url: 'https://zitniklab.hms.harvard.edu/projects/TxGNN/' },
      { label: 'GitHub — mims-harvard/TxGNN（原始碼）', url: 'https://github.com/mims-harvard/TxGNN' },
    ],
  },
  {
    slug: 'fhir-connectathon',
    updatedAt: '2026-06-19',
    topic: 'explainable-medical-ai',
    question: 'FHIR 聯測是什麼？系統要參加前要先準備什麼？',
    searchPhrases: ['fhir 聯測', 'fhir connectathon', 'fhir 互通測試', 'fhir 介接測試', 'smart on fhir 測試', 'fhir 驗證工具'],
    audience: 'b2b',
    answer:
      'FHIR 聯測（FHIR Connectathon／互通性測試）是讓不同醫療資訊系統實地驗證「能不能照 FHIR 標準正確交換資料」的測試活動或流程：各方依同一份實作指引（IG）與設定檔（Profile）互送資源、跑 SMART on FHIR 的 OAuth 2.0 授權流程，並用驗證工具（如 HL7 FHIR Validator、ONC Inferno）檢查符規。準備重點有三：先選定 FHIR 版本與 IG、把要交換的資源驗到綠燈、把 OAuth 2.0 + PKCE 授權流程測通。',
    sections: [
      {
        heading: '聯測在測什麼',
        bullets: [
          '資源符規：Patient、Observation、QuestionnaireResponse 等是否符合 FHIR 與 IG/Profile',
          'SMART on FHIR 啟動與 OAuth 2.0（含 PKCE）授權流程能否跑通',
          '互通：A 系統送出的資源，B 系統能否正確解讀',
          '邊界情境：必填欄位缺漏、代碼系統（LOINC／SNOMED／ATC）對齊、錯誤回應',
        ],
      },
      {
        heading: '參加前要準備的事',
        bullets: [
          '選定 FHIR 版本（多為 R4）與要遵循的 IG（如 TW Core 或場次指定的 IG）',
          '把要交換的資源先用 HL7 FHIR Validator / Inferno 自驗到通過',
          '建好 OAuth 2.0 + PKCE 授權端點，備妥測試帳號與 scope',
          '備齊測試資料與情境腳本，能重複跑並留下紀錄',
        ],
      },
      {
        heading: '常見卡關',
        bullets: [
          '只測 happy path，沒測必填缺漏與錯誤碼回應',
          'OAuth scope 或 PKCE 設定不全，launch 失敗',
          '用自編碼而非標準碼，代碼系統對不上',
          '資源能產出，卻不符 IG Profile 的限制',
        ],
      },
    ],
    toolIntro:
      'SMART on FHIR 收案伺服器以 FHIR R4 收受 QuestionnaireResponse（Smart Func／Geri／Pedi 三系統皆可收案），以 OAuth 2.0 + PKCE 交付、並符合 ONC Inferno FHIR 測試 —— 等於把聯測常見的符規、授權與互通項目先做到位；要與院所或平台介接時可直接接上。',
    faqs: [
      { q: 'FHIR 聯測和 connectathon 一樣嗎？', a: 'connectathon 是國際上常見的 FHIR 互通測試活動形式，台灣多稱「聯測」；本質都是讓不同系統實地驗證能否照 FHIR 標準正確交換資料。' },
      { q: '只有醫院才需要做嗎？', a: '不限。任何要與電子病歷或健康平台交換資料的 App、收案系統或廠商，都需先通過符規與授權測試才能穩定介接。' },
      { q: '有哪些免費的驗證工具？', a: '常用 HL7 官方 FHIR Validator 與 ONC 的 Inferno 測試套件，可在送件／聯測前先自我驗證到通過。' },
    ],
    related: ['fhir-server', 'func', 'geri', 'pedi'],
    relatedTerms: ['smart-on-fhir'],
  },
  {
    slug: 'clinical-frailty-scale-levels',
    updatedAt: '2026-10-02',
    topic: 'elder-care-frailty',
    question: '臨床衰弱量表 CFS 的 1 到 9 級分別是什麼？分數怎麼評？',
    searchPhrases: ['clinical frailty scale 中文', 'CFS 量表', 'CFS 分級', 'frail scale 中文', '衰弱症篩檢', 'CFS 幾分算衰弱'],
    audience: 'caregiver',
    answer:
      'CFS（Clinical Frailty Scale，臨床衰弱量表）把長者的整體狀態分成 9 級：1 到 3 級是健壯到維持得不錯，4 級是極輕度衰弱，5、6、7 級依序是輕度、中度、重度衰弱，8 級是極重度衰弱，9 級是末期。分數由有經驗的臨床人員綜合病史與日常功能後評定，不是讓長者自己填的問卷。級數越高，日常越多事需要別人協助。',
    sections: [
      {
        heading: '九級各代表什麼',
        paragraphs: [
          '下列是依 Dalhousie 大學老年醫學研究團隊公布的 2020 年第 2 版量表改寫的重點，用語為本站自行整理，不是原文逐字翻譯。',
        ],
        bullets: [
          '1 級 非常健壯：精力充沛、有規律運動，在同年齡中屬最健康的一群',
          '2 級 健壯：沒有明顯的疾病症狀，但體能不如 1 級',
          '3 級 維持得不錯：慢性病控制穩定，除了日常走動，不太有運動習慣',
          '4 級 極輕度衰弱：日常生活不必靠人幫忙，但症狀開始限制活動，常覺得自己「變慢了」、白天容易累',
          '5 級 輕度衰弱：較複雜的日常事務開始需要協助，例如理財、搭車、較重的家事、整理藥物',
          '6 級 中度衰弱：所有外出活動和家務都需要協助，在室內爬樓梯有困難，洗澡要人幫忙，穿衣可能需要有人在旁提醒',
          '7 級 重度衰弱：吃飯、盥洗、穿衣、如廁等個人照顧完全依賴他人，不論原因是身體還是認知，但狀況穩定，短期內不是高風險死亡',
          '8 級 極重度衰弱：完全依賴他人且接近生命末期，連小病也常無法恢復',
          '9 級 末期：預期餘命不到 6 個月，即使看起來沒有明顯衰弱也歸在這一級',
        ],
      },
      {
        heading: '分數怎麼評出來的',
        paragraphs: [
          'CFS 不是問卷。它把一次臨床接觸得到的資訊（病史、日常功能、家屬描述）濃縮成一個級數，所以要靠臨床判斷。開發團隊提醒，經驗不足的人評出來的分數可能和專家不同。',
          '團隊另外做了一棵分類樹給新手輔助評分。在一項 115 位急診長者的研究裡，分類樹的結果和資深老年科醫師的評分完全一致的有 63%，另外 30% 相差一級以內。這代表同一位長者換不同人評，差一級並不罕見，追蹤時盡量由同一類人員評。',
          '量表經歷過兩次修訂：2005 年原版是 7 級，2007 年把重度衰弱、極重度衰弱、末期拆開，擴成現在的 9 級；2020 年第 2 版微調用語，例如第 2 級由「Well」改為「Fit」，第 4 級由「Vulnerable」改為「極輕度衰弱」。',
        ],
      },
      {
        heading: '分數代表的風險與後續',
        paragraphs: [
          '原始研究追蹤 2,305 位加拿大長者：量表每上升一級，約 70 個月內死亡風險增加 21.2%，入住機構風險增加 23.9%。這是群體統計，不能拿來預測單一個人。',
        ],
        bullets: [
          '4 級以下：重點在維持運動、蛋白質攝取與定期追蹤',
          '5 級起標籤就是「衰弱」：建議做完整的高齡周全性評估（CGA），找出可介入的原因，例如用藥、營養、跌倒風險',
          '7 級以上：照護重點轉向生活照顧與照護目標的討論，和醫療團隊與家人一起訂',
          '分數的變化比單次分數重要：級數往上升了，值得提早找醫療人員看',
        ],
      },
    ],
    toolIntro:
      'Smart Geri 的高齡評估把 CFS 納入分層，家屬可先用自篩模式了解風險方向，專業人員可用臨床模式做結構化評估。分數仍需醫療人員確認。',
    faqs: [
      { q: 'CFS 幾分算衰弱？', a: '第 2 版量表從 5 級起的標籤是輕度衰弱，4 級是極輕度衰弱。實際判讀仍要看整體功能與臨床判斷，不能只看數字。' },
      { q: '家屬可以自己幫長輩評 CFS 嗎？', a: '可以用上面的對照先了解大概落在哪一級，但正式分數需由熟悉量表的醫療人員評定，因為這是判斷式量表，不同人評出的結果可能差一級。' },
      { q: 'CFS 和 CGA 有什麼不同？', a: 'CFS 是把整體狀態分成 9 級的快速分層，CGA 是多面向、跨專業的完整評估。實務上常先用 CFS 分層，再決定要不要做 CGA。' },
      { q: '需要授權才能使用量表嗎？', a: '要。量表著作權屬開發團隊，臨床或研究使用前需向 Dalhousie 大學老年醫學研究團隊提出 Permission for Use 申請。本頁只做說明，不提供量表圖卡。' },
    ],
    related: ['geri'],
    definitionLink: { slug: 'cfs', lead: '還不清楚這個量表是什麼、誰來評？', label: 'CFS 是什麼' },
    relatedTerms: ['cfs', 'cga', 'intrinsic-capacity'],
    sources: [
      { label: 'Dalhousie Geriatric Medicine Research - Clinical Frailty Scale', url: 'https://www.dal.ca/sites/gmr/our-tools/clinical-frailty-scale.html' },
      { label: 'Rockwood K, et al. A global clinical measure of fitness and frailty in elderly people. CMAJ 2005', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1188185/' },
    ],
  },
  {
    slug: 'cga-assessment-scales',
    updatedAt: '2026-10-02',
    topic: 'elder-care-frailty',
    question: '高齡周全性評估（CGA）會評估什麼？常用的量表有哪些？',
    searchPhrases: ['CGA 評估', 'CGA 評估量表', 'CGA 是什麼', '老人周全性評估', 'comprehensive geriatric assessment 中文', 'CGA 醫學'],
    audience: 'caregiver',
    answer:
      'CGA（高齡周全性評估）由跨專業團隊進行，一般會盤點病史與用藥、日常生活功能、行動與平衡、認知、情緒、營養和社會支持，最後整合成一份照護計畫。常見的量表有 Katz ADL 與 Lawton IADL（生活功能）、MMSE（認知）、GDS（憂鬱）、MNA（營養）、TUG（行動）。各院所選用的量表不完全一樣，量表只是工具，重點是評完之後有人依結果調整照護。',
    sections: [
      {
        heading: '評估面向與常用量表',
        bullets: [
          '日常生活功能：Katz 日常生活活動指數（ADL，吃飯、洗澡、穿衣、如廁、移動、控制排泄），發表於 1963 年',
          '進階生活功能：Lawton 工具性日常活動量表（IADL，用電話、購物、備餐、理財、服藥），發表於 1969 年',
          '認知：簡易智能測驗 MMSE，發表於 1975 年',
          '情緒：老年憂鬱量表 GDS，發表於 1982 年',
          '營養：迷你營養評估 MNA，1999 年發表的版本',
          '行動與平衡：計時起身行走測試 TUG，發表於 1991 年',
          '醫療與用藥：整理病史、慢性病控制程度與全部用藥，找出重複或不必要的藥',
          '社會支持：誰在照顧、居住環境、經濟與照顧者負荷',
        ],
      },
      {
        heading: 'CGA 的重點在處置，不在打分數',
        paragraphs: [
          'Dalhousie 大學的老年醫學團隊把 CGA 的用途說得很直接：重點是處置，評估只是前提。評估出來的問題要對應到具體動作，例如調整藥物、轉介復健、補營養、安排居家環境改善。',
          '急性住院時，團隊通常以長者生病前約兩週的功能與健康狀態當作照護計畫的基準，所以家屬能說出「生病前原本能做什麼」，對評估很有幫助。',
        ],
      },
      {
        heading: '研究怎麼說',
        paragraphs: [
          '2011 年發表的統合分析納入 22 項試驗、共 10,315 位因急症住院的長者。接受 CGA 的人在 6 個月時活著且住在自己家裡的機率較高（勝算比 1.25，需治療人數 17），追蹤到中位數 12 個月時也較高（勝算比 1.16，需治療人數 33）。',
          '這些結果針對住院的急症長者。2018 年的傘式回顧整理 13 篇系統性回顧後指出，住院 CGA 的主要受益者是接受急性照護的老年人，衰弱程度是否影響效果還沒有被充分研究。',
        ],
      },
      {
        heading: '家屬可以先準備什麼',
        bullets: [
          '全部藥袋（含成藥與保健食品），不要只帶最近一張處方',
          '最近一年的跌倒、住院與體重變化',
          '平常誰幫忙洗澡、煮飯、管藥、理財',
          '近期記性、情緒、睡眠的變化，越具體越好，例如「上週連續兩天忘了關瓦斯」',
        ],
      },
    ],
    toolIntro:
      'Smart Geri 提供高齡周全性評估：家屬可用自篩模式先掌握風險方向，專業人員用臨床模式做結構化評估，結果以紅黃綠分級並提供轉介建議。',
    faqs: [
      { q: 'CGA 要做多久？', a: '依機構與長者狀況而定。完整評估通常需要多位專業人員分別看診或訪談，不是單次門診就能完成。建議向就診的院所確認流程與時間。' },
      { q: '哪些人適合做 CGA？', a: '住院的衰弱長者受益的證據最完整。社區長者若出現體力變差、跌倒、多重用藥或照顧負擔變大，也可以詢問老年醫學科或長照單位是否提供。' },
      { q: 'CGA 和 CFS 是同一件事嗎？', a: '不是。CFS 是 9 級的衰弱分層，CGA 是多面向評估流程。常見做法是先用 CFS 快速分層，再決定要不要做完整的 CGA。' },
      { q: '量表分數可以自己判讀嗎？', a: '可以參考，但各量表的切點與解讀需要專業人員結合整體狀況判斷，單一量表分數不能直接下結論。' },
    ],
    related: ['geri'],
    relatedTerms: ['cga', 'cfs', 'intrinsic-capacity'],
    sources: [
      { label: 'Dalhousie Geriatric Medicine Research - Comprehensive Geriatric Assessment', url: 'https://www.dal.ca/sites/gmr/our-tools/comprehensive-geriatric-assessment.html' },
      { label: 'Ellis G, et al. Comprehensive geriatric assessment for older adults admitted to hospital: meta-analysis of randomised controlled trials. BMJ 2011', url: 'https://pubmed.ncbi.nlm.nih.gov/22034146/' },
      { label: 'Parker SG, et al. What is Comprehensive Geriatric Assessment (CGA)? An umbrella review. Age Ageing 2018', url: 'https://pubmed.ncbi.nlm.nih.gov/29206906/' },
      { label: 'Katz S, et al. Studies of illness in the aged: the index of ADL. JAMA 1963', url: 'https://pubmed.ncbi.nlm.nih.gov/14044222/' },
      { label: 'Lawton MP, Brody EM. Assessment of older people: self-maintaining and instrumental activities of daily living. Gerontologist 1969', url: 'https://pubmed.ncbi.nlm.nih.gov/5349366/' },
      { label: 'Folstein MF, et al. "Mini-mental state". J Psychiatr Res 1975', url: 'https://pubmed.ncbi.nlm.nih.gov/1202204/' },
      { label: 'Yesavage JA, et al. Development and validation of a geriatric depression screening scale. J Psychiatr Res 1982', url: 'https://pubmed.ncbi.nlm.nih.gov/7183759/' },
      { label: 'Vellas B, et al. The Mini Nutritional Assessment (MNA) and its use in grading the nutritional state of elderly patients. Nutrition 1999', url: 'https://pubmed.ncbi.nlm.nih.gov/9990575/' },
      { label: 'Podsiadlo D, Richardson S. The timed "Up & Go". J Am Geriatr Soc 1991', url: 'https://pubmed.ncbi.nlm.nih.gov/1991946/' },
    ],
  },
  {
    slug: 'atc-code-how-to-read',
    updatedAt: '2026-10-02',
    topic: 'medication-safety',
    question: 'ATC 藥品分類碼怎麼看？要怎麼查某個藥的 ATC code？',
    searchPhrases: ['ATC code', 'ATC 碼', 'ATC 藥品分類', '藥品 ATC 代碼怎麼查', 'ATC code 查詢', '藥物分類碼'],
    audience: 'b2b',
    answer:
      'ATC 碼共 7 碼，由左到右逐段縮小範圍：第 1 碼英文字母是解剖學主群（作用的器官系統），第 2、3 碼數字是治療次群，第 4 碼字母是藥理次群，第 5 碼字母是化學次群，最後 2 碼數字是個別成分。例如降血糖藥 metformin 是 A10BA02。要查某個成分的碼，可到 WHO 的 ATC/DDD Index，台灣的藥品許可證對應碼則可用食藥署在政府資料開放平臺公開的資料集。',
    sections: [
      {
        heading: '用 metformin 拆一次碼',
        paragraphs: ['WHO 在官方說明中就是用 metformin 示範五個層級：'],
        bullets: [
          'A：消化道與代謝（第 1 層，解剖學主群）',
          'A10：糖尿病用藥（第 2 層，治療次群）',
          'A10B：降血糖藥，不含胰島素（第 3 層，藥理次群）',
          'A10BA：雙胍類（第 4 層，化學次群）',
          'A10BA02：metformin（第 5 層，化學成分）',
        ],
      },
      {
        heading: '看碼時要知道的三件事',
        bullets: [
          'ATC 分到「成分」為止：所有單方 metformin 製劑都是 A10BA02，不論商品名。比對有沒有重複用藥時，看成分碼比看商品名可靠',
          '同一成分可以有多個碼：finasteride 低劑量的生髮錠歸 D11AX，高劑量的攝護腺肥大用藥歸 G04C；prednisolone 因為劑型與用途不同，有 7 個以上的碼',
          'ATC 不是嚴格的適應症分類：它依主要用途或藥理類別歸類，同一類裡的藥可能適應症不同，用途相近的藥也可能在不同類',
        ],
      },
      {
        heading: '去哪裡查',
        bullets: [
          'WHO ATC/DDD Index（whocc.no）：輸入成分名或碼，可以查到該成分在國際標準裡的分類',
          '食藥署藥品藥理治療分類 ATC 碼資料集（政府資料開放平臺）：以藥品許可證字號對應 ATC 碼與中英文分類名稱，每週與藥證系統同步，適合要做批次比對的系統',
        ],
        paragraphs: [
          'WHO 的 ATC 系統只收有人提出申請的成分，涵蓋並不完整；傳統、順勢或草藥製劑一般不收。查不到碼不代表資料有誤。',
        ],
      },
      {
        heading: '用在用藥安全的地方',
        paragraphs: [
          '長輩的藥袋常來自不同醫院，商品名不同但成分相同。把處方對應到 ATC 碼後，系統能在成分層級比對重複用藥，也能依第 3、4 層的藥理類別找出同類藥疊加的情形，再由藥師確認是否需要處理。',
        ],
      },
    ],
    toolIntro:
      '藥提醒以 ATC 碼對應處方藥品，方便在成分層級找出重複用藥。是否調整用藥一律由醫師或藥師決定。',
    faqs: [
      { q: 'ATC 碼和健保藥品代碼是同一種嗎？', a: '不是。健保藥品代碼是給付與申報用的，每個品項一個碼；ATC 碼是 WHO 的成分分類碼，不同商品但相同成分會共用同一組碼。' },
      { q: 'ATC 碼會改變嗎？', a: '會。WHO 定期公布 ATC 碼的新增與異動清單，系統若存放 ATC 碼，需要定期同步。' },
      { q: '每種藥都查得到 ATC 碼嗎？', a: '不一定。WHO 只收有人提出申請且符合條件的成分，傳統、順勢與草藥製劑一般不收，查不到碼不代表資料有誤。' },
    ],
    related: ['yaocare'],
    relatedTerms: ['atc'],
    sources: [
      { label: 'WHOCC - ATC Structure and principles', url: 'https://www.whocc.no/atc/structure_and_principles/' },
      { label: 'WHOCC - ATC/DDD Index', url: 'https://www.whocc.no/atc_ddd_index/' },
      { label: '政府資料開放平臺 - 藥品藥理治療分類 ATC 碼資料集', url: 'https://data.gov.tw/dataset/9119' },
    ],
  },
  {
    slug: 'asq3-scoring-guide',
    updatedAt: '2026-10-02',
    topic: 'child-development',
    question: 'ASQ-3 兒童發展篩檢怎麼填？分數怎麼算、落在哪一區怎麼辦？',
    searchPhrases: ['ASQ-3', 'ASQ 發展篩檢', 'ASQ-3 怎麼算分', 'ASQ-3 切點', '2歲語言發展評估', '兒童發展篩檢量表'],
    audience: 'parent',
    answer:
      'ASQ-3 依孩子的月齡選對應的問卷（涵蓋 1 到 66 個月，共 21 個年齡版），由家長就溝通、粗動作、精細動作、問題解決、個人社會五個領域各回答 6 題，選「會」、「有時會」或「還不會」，分別計 10、5、0 分，每個領域滿分 60 分。領域總分低於該月齡的切點（平均以下 2 個標準差）建議轉介專業評估；落在平均以下 1 到 2 個標準差是監測區，要多練習並定期再篩。篩檢不是診斷。',
    sections: [
      {
        heading: '怎麼選問卷、怎麼填',
        bullets: [
          '依實際月齡選版本：例如 2 歲左右用 24 個月版，適用 23 個月 0 天到 25 個月 15 天',
          '家長親自讓孩子試做每一題，再回答「會、有時會、還不會」，不要只憑印象',
          '填寫約 10 到 15 分鐘，紙本問卷手算約 2 到 3 分鐘',
        ],
        paragraphs: ['問卷題目受著作權保護，由 Brookes 出版社發行，本頁不貼題目。'],
      },
      {
        heading: '分數怎麼算',
        bullets: [
          '每題「會」10 分、「有時會」5 分、「還不會」0 分',
          '同一領域 6 題加總，得到該領域 0 到 60 分',
          '有題目沒回答時，使用手冊有調整分數的方法，不要直接當 0 分',
          '五個領域各自對照該月齡的切點，不要把五個領域加總',
        ],
      },
      {
        heading: '落在哪一區、下一步做什麼',
        bullets: [
          '高於切點：發展符合預期，繼續日常互動，之後依月齡再篩',
          '監測區（平均以下 1 到 2 個標準差）：不是異常，但建議提供針對該領域的練習機會，並隔一段時間重新篩檢',
          '低於切點（平均以下 2 個標準差）：建議安排專業的發展評估，可先詢問兒科醫師或當地的早期療育服務單位',
        ],
        paragraphs: [
          'ASQ-3 是篩檢工具，用意是找出需要進一步看的孩子。切點是研究團隊比較不同切點在各年齡版辨識出的孩子比例後訂的，用於篩檢，不是診斷門檻。結果若與家長的觀察不一致，以專業人員的評估為準。',
        ],
      },
      {
        heading: '2 歲還不太開口的話',
        paragraphs: [
          '語言表達在 ASQ-3 屬於「溝通」領域。孩子在這個領域低於切點，或同時有多個領域偏低，建議儘早讓專業人員評估聽力與整體發展。其他徵兆與觀察重點可看本站的幼兒發展指南。',
        ],
      },
    ],
    toolIntro:
      'Smart Pedi 提供免費的兒童發展篩檢：依年齡帶給出問卷、對齊 ASQ-3 常模，用雷達圖對比同齡並紅黃綠分級，給出觀察或轉介建議。',
    faqs: [
      { q: 'ASQ-3 低於切點就是發展遲緩嗎？', a: '不是。低於切點代表建議進一步評估，確診需要由專業人員做完整的發展評估。' },
      { q: '監測區要不要看醫生？', a: '監測區的孩子不一定要就醫，建議針對該領域多練習並定期再篩。若家長仍然擔心，隨時可以請兒科醫師看。' },
      { q: 'ASQ-3 適用幾歲的孩子？', a: '涵蓋 1 到 66 個月，依月齡分成 21 個年齡版，每個版本有各自的題目與切點。' },
      { q: '自己上網找題目填可以嗎？', a: '建議使用正式授權的問卷或有授權的篩檢工具。非正式版本的題目與切點可能不一致，分數不能對照。' },
    ],
    related: ['pedi'],
    relatedTerms: ['asq3'],
    sources: [
      { label: 'Squires J, Bricker D. ASQ-3 Technical Report. Paul H. Brookes Publishing', url: 'https://agesandstages.com/wp-content/uploads/2017/05/ASQ-3-Technical-Appendix_web_2025.pdf' },
      { label: 'Ages & Stages Questionnaires - How ASQ Works', url: 'https://agesandstages.com/about-asq/how-asq-works/' },
    ],
  },
];

export const GUIDE_BY_SLUG: Record<string, Guide> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g]),
);
