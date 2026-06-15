// Claude prompt 模板 — filter / writer / critic 三段
// 全部要求 JSON 輸出，配合 claude -p --output-format json --json-schema

/**
 * Filter pass: 給 30–50 筆 candidate，留下與 target 真相關的 8–12 筆
 */
export function filterPrompt(target, candidates) {
  const list = candidates
    .map(
      (c, i) =>
        `[${i}] title: ${c.title}\n    source: ${c.source}\n    pubDate: ${c.pubDate}\n    snippet: ${(c.snippet || '').slice(0, 200)}`,
    )
    .join('\n');

  return `你是「${target.title}」議題追蹤系統的新聞過濾器。任務：從以下 candidate 清單中找出與本主題真實相關的新聞。

主題定位：
${target.serviceContext}

主題涵蓋的關鍵議題：
${target.voicePoints.map((v, i) => `  - ${v}`).join('\n')}

評分原則：
- 1.0：直接報導本主題核心議題
- 0.7–0.9：報導相鄰但相關議題（同產業、同政策範疇）
- 0.4–0.6：勉強相關但邊緣
- 0.0–0.3：撞名、不相關（例如「華佗」可能是三國演義、「藥提醒」可能是某 App 名稱但與用藥追蹤無關）

要求：
1. 為每筆給 0–1 relevance 分數
2. relevance < 0.6 直接視為不相關，從 kept 列表中排除
3. 對於相關的，初步判斷是否「值得首頁 highlight」(時效性強 + 議題重要)
4. 同一事件多家報導時只留品質最好的一筆，去重

僅以 JSON 回應，不要任何前後文字。schema：
{
  "kept": [
    { "idx": 0, "relevance": 0.85, "highlight": true, "reason": "簡短說明為何留下" }
  ]
}

候選清單（共 ${candidates.length} 筆）：
${list}`;
}

/**
 * 讀者洞察區塊（A：搜尋字；C：低完成率）。無洞察時回空字串 → prompt 與原本完全相同。
 */
function renderHints(hints) {
  if (!hints) return '';
  const lines = [];
  if (Array.isArray(hints.queries) && hints.queries.length) {
    lines.push(
      `- 讀者實際搜尋本主題常用這些關鍵字：${hints.queries.join('、')}。可在 titleZh 與內文「自然」採用相近用語以貼近搜尋意圖；不可硬塞、不可改變事實，designResponse 仍只能引用上方 proofPoints。`,
    );
  }
  if (hints.lowCompletion) {
    lines.push(
      '- 讀者常讀不完此類文章：newsBrief 與 issueAnalysis 請在開頭第一句就點出重點，句子精簡、避免冗長鋪陳。',
    );
  }
  if (!lines.length) return '';
  return `\n【讀者洞察（僅供參考；上述【嚴格規則】仍全部適用，不可為此違規）】\n${lines.join('\n')}\n`;
}

/**
 * Writer pass: 為一則新聞寫三段評論文
 * @param hints 可選的讀者洞察 { queries: string[], lowCompletion: boolean }
 */
export function writerPrompt(target, item, hints) {
  const hintBlock = renderHints(hints);
  return `你是「${target.title}」服務的內容編輯。任務：根據以下新聞 metadata，寫一篇三段式議題評論文。

【嚴格規則】
1. 不可宣稱我們做過任何具體事情（沒有「已協助」「已導入」「成功」「客戶」「服務了」「達成率」「提升至」這類戰績語）。
2. 不可提到任何具名醫院、縣市、政府機關、合作對象（白名單為空）。
3. 不可使用「未來將」「規劃中」「即將推出」「預計」這類空話。
4. 不可宣稱「我們發現」「我們觀察到」「我們的研究」這類一手主張。
5. designResponse 段必須引用以下 proofPoints 至少 2 條（用 (proofPoint #N) 格式標註）。
6. designResponse 必須是「結構性設計敘事」而非「戰績宣告」。
   ❌ 「藥提醒已協助 OO 縣...」
   ✅ 「面對這類議題，藥提醒的設計思路是...」「在 ___ 環節，我們選擇 ___」
7. 字數要求（嚴格遵守，這是硬規則）：
   - newsBrief：60–100 字（中文字符數）
   - issueAnalysis：100–180 字
   - designResponse：150–250 字（這段最重要，要寫得充實）
8. 引用新聞原文片段不超過 50 字。
9. 一律使用「繁體中文（台灣用語）」，絕對不可出現簡體字。台灣用詞對照（左大陸／右台灣，一律用右）：
   軟件→軟體、信息→資訊、網絡→網路、運營→營運、視頻→影片、音頻→音訊、屏幕→螢幕、
   默認→預設、激活→啟用、在線→線上、互聯網→網際網路、服務器→伺服器、內存→記憶體、
   硬盤→硬碟、智能→智慧、優化→最佳化、調研→調查、社交→社群。「台」字用「台」不用「臺」。

【可用素材】
我們的服務脈絡：
${target.serviceContext}

我們關心的痛點（issueAnalysis 段可參考）：
${target.voicePoints.map((v) => `  - ${v}`).join('\n')}

我們的具體做法（designResponse 段必須引用至少 2 條，用 #N 索引）：
${target.proofPoints.map((p, i) => `  #${i + 1}. ${p}`).join('\n')}

【新聞 metadata】
title: ${item.title}
source: ${item.source}
pubDate: ${item.pubDate}
snippet: ${(item.snippet || '').slice(0, 400)}
url: ${item.link}
${hintBlock}
【輸出格式】
僅以 JSON 回應，不要任何前後文字。schema：
{
  "newsBrief": "60–100 字的新聞重點繁中改寫",
  "issueAnalysis": "100–180 字的議題結構性分析",
  "designResponse": "150–250 字的設計觀點，引用 (proofPoint #N) 至少 2 次",
  "tags": ["1–3 個中文 tag"],
  "titleZh": "把原標題改寫成繁體中文（台灣用語）的標題"
}
（titleZh：必填，不可為 null。一律輸出繁體中文（台灣用語）標題；保留專有名詞、人名、品牌名、英文與數字原樣，只把簡體字改繁體、把大陸用語改台灣用語，不要改寫語意或加油添醋。例：「泛联集团旗下AI运营管理平台获认证」→「泛聯集團旗下AI營運管理平台獲認證」；「余中」是人名要保留不可改成「餘中」。）`;
}

/**
 * Rewrite pass: 收到 critic 的 violations 後重寫
 */
export function rewritePrompt(target, item, prevDraft, violations) {
  const violText = violations
    .map((v) => `  - [${v.rule}] ${v.evidence}\n    建議修法：${v.fix}`)
    .join('\n');
  return `你剛才寫的議題評論文違反了以下規則，請重寫修正。

【上一版本】
newsBrief: ${prevDraft.newsBrief}
issueAnalysis: ${prevDraft.issueAnalysis}
designResponse: ${prevDraft.designResponse}

【違規清單】
${violText}

【嚴格規則（再次提醒）】
1. designResponse 不可有戰績語、具名實體、未來空話、一手主張
2. designResponse 必須引用至少 2 條 proofPoints (#N)
3. 字數（嚴守）：newsBrief 60–100、issueAnalysis 100–180、designResponse 150–250
4. 一律繁體中文（台灣用語），不可有簡體字；titleZh 必填且為繁體台灣標題

【可用素材】
proofPoints：
${target.proofPoints.map((p, i) => `  #${i + 1}. ${p}`).join('\n')}

【新聞 metadata】
title: ${item.title}
source: ${item.source}
snippet: ${(item.snippet || '').slice(0, 400)}

僅以 JSON 回應，schema 同上。`;
}

/**
 * Critic pass: 對 draft 做語意層審查
 */
export function criticPrompt(target, item, draft) {
  return `你是嚴格的事實審查員。檢核以下議題評論文是否違反規則。

【可信來源】
A. proofPoints（白名單事實，僅這些可被引用為「我們的做法」）：
${target.proofPoints.map((p, i) => `  #${i + 1}. ${p}`).join('\n')}

B. 該則新聞 metadata（newsBrief 與 issueAnalysis 可引用其內容）：
   title: ${item.title}
   source: ${item.source}
   snippet: ${(item.snippet || '').slice(0, 300)}

【待審文章】
newsBrief: ${draft.newsBrief}
issueAnalysis: ${draft.issueAnalysis}
designResponse: ${draft.designResponse}

【檢核規則（任一違反 → pass=false）】
R1. designResponse 是否出現具體數字（除年月日）且該數字不在 proofPoints？
R2. designResponse 是否出現具名醫院/縣市/政府/客戶？
R3. designResponse 是否出現戰績語（已協助、已導入、成功、客戶、達成率、提升至…）？
R4. 全文是否出現未來空話（未來將、規劃中、即將、預計…）？
R5. 全文是否出現一手經驗宣稱（我們發現、我們觀察到、我們的研究…）？
R6. newsBrief / issueAnalysis 引用新聞原文是否超過 50 字？
R7. designResponse 是否引用至少 2 條 proofPoints？(用 #N 標註)
R8. 三段字數是否在合理範圍？(newsBrief 30–200、issueAnalysis 50–280、designResponse 80–340)
R9. 文章是否真的扣回該主題（${target.title}）？(避免題材飄走)

寧可錯殺，任何模糊都標 violation。

僅以 JSON 回應，schema：
{
  "pass": true | false,
  "violations": [
    { "rule": "R3", "evidence": "出現「已協助」", "fix": "改為「設計思路是…」" }
  ]
}`;
}
