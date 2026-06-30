// 文風單一 source of truth —— 去「AI 味」用。
// writer / rewrite / critic prompt 與 regex guard、340 篇 backfill 重寫共用這份定義，
// 避免各寫各的而 drift。診斷依據：實際語料裡反覆出現的 7 大 AI 病徵（見專案討論）。

// 文風修訂版號：每篇文章存 voiceRev；backfill 只改 voiceRev < VOICE_REV 的舊文。
// 新文章由（已去 AI 味的）writer 產出，寫入時即蓋 voiceRev=VOICE_REV，不會被 backfill 重跑。
// 未來若再大改文風規則 → 把 VOICE_REV +1，340 篇會再被分批重刷一輪。
export const VOICE_REV = 1;

// ── 口頭禪黑名單（高精準度；命中 → 計一個 tic）──────────────────
// 只放「幾乎一定是 AI 腔」的詞，誤殺成本低（只是觸發重寫，不刪內容）。
// 結構性病徵（針對X針對Y、可A可B 三連、——定義、拔高排比）較難用 regex 精準抓，
// 交給 critic 的語意層（R10–R12）處理，這裡專收逐字口頭禪。
export const BANNED_PHRASES = [
  /面對這類議題/,
  /面對[^。，]{0,14}(情境|風險|挑戰|趨勢)[，,]/, // 「面對缺藥情境，…」式公式開頭
  /設計思路是/,
  /設計上(選擇|採取|採用了)/,
  /整體邏輯(是|在於)/,
  /核心邏輯(是|在於)/,
  /本質上[是為]/,
  /更根本的問題在於/,
  /真正的[^。，]{0,8}(挑戰|問題|關鍵|價值)(在於|是)/,
  /正是[^。，]{0,22}的關鍵/,
  /才是[^。，]{0,22}(關鍵所在|的關鍵|所在)/,
  /這(正)?是[^。，]{0,22}的(核心|關鍵|根本)/,
  /結構性(根源|缺口|問題|矛盾|斷層|挑戰)/,
  /值得(關注|注意|一提|玩味)的是/,
  /不容忽視/,
  /化繁為簡/,
  /息息相關/,
  /不謀而合/,
  /(隨著|伴隨)[^。，]{0,16}(的)?(發展|到來|普及|興起)[，,]/, // 「隨著 X 的發展，…」開場
];

// ── 正向文風指南（注入 writer / rewrite / critic 的 prompt）──────
// 用「具體可檢查」的指令，不要只說「自然一點」。
export const STYLE_RULES = `【文風要求 —— 寫成人話，去掉 AI 腔（與上面所有事實/引用規則同等重要）】
1. 開頭禁公式：不要每篇都用「面對這類議題…」「設計思路是…」「隨著 X 的發展…」起手。第一句直接講具體的事（一個場景、一個事實、一個讀者真的會問的問題），不要先鋪一層抽象。
2. 結尾禁拔高：不要用「整體邏輯是…」「正是…的關鍵」「才是…的關鍵所在」這種升華大道理收尾。收在一個具體、可檢查的點上就好。
3. 少用抽象名詞：「結構性」「系統性」「可X性與可Y性」不要當萬用詞堆疊；能講具體就講具體。一篇最多出現一次「結構性」。
4. 破折號與造詞節制：不要用「——」來下定義（「X——也就是…」）；自創概念加「」最多一次。
5. 排比要收：不要連用「針對A，…；針對B，…」或「可追溯、可接軌、可…」這種三段對仗；改成自然的句子。
6. 句長交錯：長短句混用，不要每句都是 30 字以上的子句套子句。一句講一件事。
7. 連接詞自然：少用「然而」「更根本的問題在於」「本質上」「值得關注的是」這類作文腔轉折。
8. 立場直接、語氣平實：像一個懂行的人在跟同業講話，不要像顧問簡報或產品文案。`;

// ── 工具：數 tic（口頭禪命中數）──────────────────────────────
/** 回傳該文字命中的不重複口頭禪清單 */
export function findTics(text) {
  const hits = [];
  for (const re of BANNED_PHRASES) {
    const m = (text || '').match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/** 數 tic 總數（跨三段＋titleZh） */
export function countTics(draft) {
  const parts = [draft.titleZh, draft.newsBrief, draft.issueAnalysis, draft.designResponse]
    .filter(Boolean)
    .join('\n');
  return findTics(parts).length;
}

/**
 * 文風護欄（規則 V）：tic 數 ≥ threshold → 退回重寫。
 * 預設 threshold=2：偶發一個不擋（避免無限重寫），明顯滿篇口頭禪才退。
 * @returns {Array<{rule: string, evidence: string, fix: string}>}
 */
export function checkVoice(draft, threshold = 2) {
  const hits = findTics(
    [draft.newsBrief, draft.issueAnalysis, draft.designResponse].filter(Boolean).join('\n'),
  );
  if (hits.length < threshold) return [];
  return [
    {
      rule: 'V',
      evidence: `出現 ${hits.length} 個 AI 口頭禪：${[...new Set(hits)].join('、')}`,
      fix: '依文風要求改寫：開頭別用公式、結尾別拔高、少用「結構性」等抽象詞、排比與破折號定義收斂',
    },
  ];
}
