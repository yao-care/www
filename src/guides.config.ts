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
    updatedAt: '2026-06-14',
    topic: 'medication-safety',
    question: '長輩同時吃很多種藥，怎麼避免吃錯、漏吃？',
    searchPhrases: ['長輩吃很多種藥', '多重用藥怎麼辦', '老人家忘記吃藥', '慢性病領藥提醒', '吃錯藥怎麼預防'],
    audience: 'caregiver',
    answer:
      '多重用藥（同時服用多種藥）容易發生漏吃、重複吃與交互作用。降低風險的關鍵是：用標準藥品碼（ATC）整理清單避免重複、用藥品外觀辨識避免拿錯、用每日提醒避免漏吃。用 LINE 就能收提醒、不必安裝 App，對長輩門檻最低。',
    sections: [
      {
        heading: '多重用藥常見風險',
        bullets: ['同成分、不同商品名 → 重複用藥', '記不住複雜服藥時間 → 漏吃或亂吃', '藥品長得像 → 拿錯', '藥物交互作用增加副作用風險'],
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
    relatedTerms: ['genai-medical-guidance', 'mcp'],
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
        bullets: ['看「對象年齡」決定用哪個', '關心發展 → Pedi；功能 / 亞健康 → Func；衰弱 / 長照 → Geri', '不確定可先做，結果紅燈再就醫'],
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
    relatedTerms: ['cdss'],
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
      '我們以哈佛大學 TxGNN 模型為基礎、擴展到 30 個國家的「老藥新用」平台，用知識圖譜 + 圖神經網路雙引擎，對 1,507 種藥物 × 166 種疾病評分並分四級信心度；每筆預測都附 PubMed 文獻與 ClinicalTrials 臨床試驗證據包，並可經 SMART on FHIR 在電子病歷系統內呈現，作為醫師的決策參考。',
    faqs: [
      { q: '老藥新用的預測可以直接拿去用藥嗎？', a: '不可以。預測屬研究參考、用於提出假說，是否適用個人病情、能否使用一定要由醫師評估，切勿自行用藥或停換藥。' },
      { q: '一般人查得到嗎？', a: '可以。平台公開瀏覽，涵蓋 30 國 FDA 藥品、每藥一頁並附證據；但請把它當作「與醫師討論的素材」，不是處方。' },
    ],
    related: ['txgnn'],
    relatedTerms: ['drug-repurposing', 'smart-on-fhir'],
    sources: [
      { label: 'TxGNN 原始論文：An explainable foundation model for drug repurposing，《Nature Medicine》2024', url: 'https://www.nature.com/articles/s41591-024-03333-8' },
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
];

export const GUIDE_BY_SLUG: Record<string, Guide> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g]),
);
