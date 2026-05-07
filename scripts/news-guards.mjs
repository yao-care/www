// 防幻覺護欄 — regex 黑名單（機械式預檢）
// 任何一條命中就把該 draft 退回 writer 重寫，避免 critic 跑 LLM 浪費 quota
// 規則 R1–R5 主要針對 designResponse（我們的觀點段）
// newsBrief 與 issueAnalysis 因為合理引用新聞原文較寬鬆

// R3 — 戰績敘事：宣稱我們做過某事
const ACHIEVEMENT_PATTERNS = [
  /已協助/,
  /已導入/,
  /已服務/,
  /已完成(?!整)/,  // 排除「已完成整」(「整合」前綴) 類片語
  /我們已/,
  /成功案例/,
  /成功經驗/,
  /成功將/,
  /成功幫/,
  /客戶包含/,
  /客戶有/,
  /客戶數/,
  /我們的客戶/,
  /達成率/,
  /提升至/,
  /提升了/,
  /提升到/,
  /服務對象/,
  /導入後/,
  /合作夥伴包含/,
];

// R4 — 未來空話
const FUTURE_FLUFF_PATTERNS = [
  /未來將/,
  /未來會/,
  /即將推出/,
  /即將上線/,
  /即將發布/,
  /規劃中/,
  /預計推出/,
  /預期將/,
  /預定將/,
  /計畫中將/,
];

// R5 — 一手經驗宣稱
const FIRSTHAND_PATTERNS = [
  /我們發現/,
  /我們觀察到/,
  /我們的研究顯示/,
  /我們的調查/,
  /臨床上常見/,
  /臨床上經常/,
  /我們的數據/,
  /經本團隊驗證/,
];

// R2 — 具名客戶 / 醫院 / 行政區（白名單為空，命中即 fail）
// 只在 designResponse 套用；newsBrief 與 issueAnalysis 可引用新聞原文提及的名稱
const NAMED_ENTITY_PATTERNS = [
  // 主要醫療體系
  /長庚/,
  /台大醫院/,
  /榮總/,
  /馬偕/,
  /新光醫院/,
  /國泰醫院/,
  /奇美/,
  /義大醫院/,
  /北醫/,
  /高醫/,
  /慈濟醫院/,
  /三總/,
  // 行政區
  /台北市|新北市|桃園市|台中市|台南市|高雄市|新竹市|嘉義市|基隆市/,
  /新北市|桃園|台中|高雄|台南/,
  /[一-鿿]{1,3}縣\s*政府/,
  // 一般指代客戶名稱的詞
  /我們服務的[一-鿿]{1,5}/,
  /客戶[一-鿿]{2,6}公司/,
];

// R1 — 「具體數字」(designResponse only)
// 抓任何不在 proofPoints 出現的具體數字 (排除年份 2020-2099 與月份)
function checkSpecificNumbers(text, proofText) {
  // 取出所有數字 token
  const numberPattern = /\d+(?:[,.]?\d+)*\s*(?:%|％|倍|位|人|名|家|間|筆|則|篇|個|億|萬|千|公|噸|公里|公尺|分鐘|小時|天|週|個月|年|歲|床)?/g;
  const matches = Array.from(text.matchAll(numberPattern)).map((m) => m[0]);
  const violations = [];
  for (const m of matches) {
    // 過濾日期 / 年份
    const num = parseFloat(m.replace(/[^\d.]/g, ''));
    if (Number.isNaN(num)) continue;
    if (num >= 2020 && num <= 2099 && /年|^\d{4}$/.test(m)) continue;
    if (num >= 1 && num <= 12 && /月/.test(m)) continue;
    if (num >= 1 && num <= 31 && /日/.test(m)) continue;
    // 是否在 proofPoints 出現
    if (!proofText.includes(m) && !proofText.replace(/\s/g, '').includes(m.replace(/\s/g, ''))) {
      violations.push({
        rule: 'R1',
        evidence: `具體數字「${m}」未在 proofPoints 白名單中`,
        fix: '改寫為結構性敘事，移除具體數字或改為描述性敘述',
      });
    }
  }
  return violations;
}

/**
 * 檢核 draft 對 hard rules 的違規
 * @param {{newsBrief: string, issueAnalysis: string, designResponse: string}} draft
 * @param {readonly string[]} proofPoints
 * @returns {Array<{rule: string, evidence: string, fix: string}>}
 */
export function checkRegexGuards(draft, proofPoints) {
  const violations = [];
  const dr = draft.designResponse || '';
  const proofText = proofPoints.join('\n');

  // R3 戰績敘事
  for (const re of ACHIEVEMENT_PATTERNS) {
    const m = dr.match(re);
    if (m) {
      violations.push({
        rule: 'R3',
        evidence: `designResponse 出現戰績語「${m[0]}」`,
        fix: '改為「設計上採用 ___」「在 ___ 環節，我們選擇 ___」這類結構性敘事',
      });
    }
  }

  // R4 未來空話
  for (const re of FUTURE_FLUFF_PATTERNS) {
    const m = dr.match(re);
    if (m) {
      violations.push({
        rule: 'R4',
        evidence: `designResponse 出現未來空話「${m[0]}」`,
        fix: '只描述目前的設計，不寫「未來」「規劃中」這類空話',
      });
    }
  }

  // R5 一手經驗宣稱
  for (const re of FIRSTHAND_PATTERNS) {
    const m = dr.match(re);
    if (m) {
      violations.push({
        rule: 'R5',
        evidence: `designResponse 出現一手經驗宣稱「${m[0]}」`,
        fix: '不可宣稱「我們發現」「我們觀察到」這類研究/數據主張；改為描述設計選擇',
      });
    }
  }

  // R2 具名實體
  for (const re of NAMED_ENTITY_PATTERNS) {
    const m = dr.match(re);
    if (m) {
      violations.push({
        rule: 'R2',
        evidence: `designResponse 出現具名實體「${m[0]}」`,
        fix: '不可在我們的觀點段提到具名醫院、縣市、客戶、合作對象',
      });
    }
  }

  // R1 具體數字
  violations.push(...checkSpecificNumbers(dr, proofText));

  return violations;
}

/**
 * 字數檢核 — schema 已有 min/max，這裡再做寬限版檢核
 */
export function checkLengths(draft) {
  const violations = [];
  const nb = (draft.newsBrief || '').length;
  const ia = (draft.issueAnalysis || '').length;
  const dr = (draft.designResponse || '').length;

  if (nb < 30 || nb > 200) {
    violations.push({
      rule: 'R8a',
      evidence: `newsBrief 字數 ${nb}（理想 60–100，可接受 30–200）`,
      fix: 'newsBrief 寫到 60–100 字，僅改寫新聞原文，不加入新事實',
    });
  }
  if (ia < 50 || ia > 280) {
    violations.push({
      rule: 'R8b',
      evidence: `issueAnalysis 字數 ${ia}（理想 100–180，可接受 50–280）`,
      fix: 'issueAnalysis 寫到 100–180 字',
    });
  }
  if (dr < 80 || dr > 340) {
    violations.push({
      rule: 'R8c',
      evidence: `designResponse 字數 ${dr}（理想 150–250，可接受 80–340）`,
      fix: 'designResponse 寫到 150–250 字，引用至少 2 條 proofPoints',
    });
  }
  return violations;
}

/**
 * 簡易字串相似度（用於 dedup news items by title）
 */
export function normTitle(s) {
  return (s || '').replace(/[\s\p{P}]/gu, '').toLowerCase();
}
