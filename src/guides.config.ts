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
  },
  {
    slug: 'medical-ai-content-compliance',
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
];

export const GUIDE_BY_SLUG: Record<string, Guide> = Object.fromEntries(
  GUIDES.map((g) => [g.slug, g]),
);
