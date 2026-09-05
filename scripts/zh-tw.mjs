// 大陸用語 → 台灣用語（詞彙層，安全）
//
// 設計取捨：簡體「字元」轉繁體交給 writer（Claude）在生成 titleZh 時處理——LLM 能正確
// 判斷人名/語境（例：「余中」是人名要保留、「布局」台灣不寫成「佈局」），而 opencc 之類
// 的機械字元轉換會誤傷這些。這支模組只做「大陸專用詞彙 → 台灣詞彙」的字串替換，當作
// 防護網：只收「大陸專用、台灣文本不會出現」的多字詞，因此不會誤傷台灣通用詞
// （數據 / 項目 / 用戶 / 程序 / 文件…這些台灣也用，刻意不收）。

const TERM_MAP = [
  ['運營', '營運'],
  ['網絡', '網路'],
  ['軟件', '軟體'],
  ['視頻', '影片'],
  ['音頻', '音訊'],
  ['信息', '資訊'],
  ['互聯網', '網際網路'],
  ['服務器', '伺服器'],
  ['屏幕', '螢幕'],
  ['鼠標', '滑鼠'],
  ['內存', '記憶體'],
  ['硬盤', '硬碟'],
  ['默認', '預設'],
  ['激活', '啟用'],
  ['卸載', '解除安裝'],
  ['在線', '線上'],
  ['高清', '高畫質'],
];

// 半形標點正規化（2026-09-05）：模型偶爾在中文句中吐出半形逗號／分號／冒號
//（存量 topicFeed 有 24 則、79 處），中文排版讀起來就是不對。
// **只換夾在兩個中文字之間的**——這樣才不會動到 "1,507"、"Bakker, MIT" 這類
// 數字與英文裡本來就該用半形的地方。lookahead 不消耗字元，連續多個也換得到。
const PUNCT_MAP = [
  [/(?<=[一-鿿]),(?=[一-鿿])/g, '，'],
  [/(?<=[一-鿿]);(?=[一-鿿])/g, '；'],
  [/(?<=[一-鿿]):(?=[一-鿿])/g, '：'],
];

/** 只做半形→全形的標點正規化（夾在中文之間者）。 */
export function fixPunct(text) {
  if (text == null || typeof text !== 'string') return text;
  let out = text;
  for (const [re, to] of PUNCT_MAP) out = out.replace(re, to);
  return out;
}

export function fixTerms(text) {
  if (text == null || typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of TERM_MAP) out = out.replaceAll(from, to);
  return fixPunct(out);
}
