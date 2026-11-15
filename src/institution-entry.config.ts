// 名詞頁／指南頁內文中段的「機構入口」（2026-11-01 用戶拍板）。
// 只放內容真的對得上產品的頁；對不上的（ai-agent、rag、llm、罕病老藥新用指南）刻意不列。
// 文案裡的產品能力一律取自 products.config.ts 的 description／tagline，不新增事實。
// 獨立成檔、不寫進 glossary/guides.config.ts：那兩檔每條帶 updatedAt 餵 sitemap lastmod，
// 這行是導流入口不是內容更新，不該讓 18+15 頁一起宣稱「已更新」。
import type { ProductSlug } from './products.config';

export type InstitutionEntry = { product: ProductSlug; text: string };

export const GLOSSARY_INSTITUTION: Record<string, InstitutionEntry> = {
  cfs: { product: 'geri', text: '醫院或長照機構想在收案時就做 CFS 分級？Smart Geri 有專業臨床模式，結果可以上傳院內 FHIR。' },
  cga: { product: 'geri', text: '要在門診或長照據點做 CGA，Smart Geri 先用 CFS 分級，再往認知、營養、用藥等面向評下去。' },
  asq3: { product: 'pedi', text: '院所想讓家長先在手機上做發展初篩，Smart Pedi 對齊 ASQ-3 和國健署兒童健康手冊，結果可以上傳院所收案。' },
  'intrinsic-capacity': { product: 'func', text: '健康管理單位想照 IC 框架做成人篩檢，Smart Func 涵蓋活力、行動、認知、心理、感官五項，結果能用 SMART on FHIR 送回合作院所。' },
  atc: { product: 'yaocare', text: '藥局、診所想照 ATC 碼幫病人排用藥提醒，藥提醒能整合健保與醫院資訊系統，不用重新 keyin 處方。' },
  'contactless-checkin': { product: 'sign', text: '日照中心、社區關懷站要用的話，系統每天自動產出簽到名冊，可以直接貼進政府社政平台。' },
  cdss: { product: 'huatuo', text: '中醫診所想試 CDSS，AI 華佗有給中醫師用的工作站，每一步辨證都追得到對應規則。' },
  'smart-on-fhir': { product: 'fhir-server', text: '機構要收 Smart Func、Geri、Pedi 的評估結果，可以接我們的收案伺服器。GCM 預防醫學發展協會已經在用。' },
  'drug-repurposing': { product: 'txgnn', text: '研究團隊或醫院想串 TxGNN 的預測結果，各國站的 SMART App 陸續上架 SMART App Gallery，原始碼也開源。' },
  txgnn: { product: 'txgnn', text: '想把 TxGNN 接進院內 EHR？它能走 SMART on FHIR 免費整合，技術合作細節直接找我們談。' },
  'genai-medical-guidance': { product: 'goalkeeper', text: '醫療機構要讓 AI 寫的衛教內容先過一道合規檢查，goalkeeper 依這份指引等法規回報五道檢查，有 REST API 可串。' },
  mcp: { product: 'goalkeeper', text: '想讓 AI agent 發醫療內容前先查合規，goalkeeper 有現成的 MCP Server。' },
  'triz-theory': { product: 'triz', text: '企業研發團隊想把 TRIZ 用在自家題目上，我們的知識庫內建 40 發明原則和矛盾矩陣，可以談導入。' },
  'security-audit-automation': { product: 'siqc', text: '醫院或企業要準備 ISO 27001、醫院評鑑這類稽核，SIQC 用 GitHub Actions 把掃描和文件整理自動化。' },
  'osint-automation': { product: 'intel', text: '企業想每天自動盯上下游公司動態，我們做過 23 條產業供應鏈、500 多家公司的追蹤系統。' },
};

export const GUIDE_INSTITUTION: Record<string, InstitutionEntry> = {
  'elder-frailty-assessment': { product: 'geri', text: '如果你在長照機構或醫院負責評估，Smart Geri 的專業臨床模式能把 CFS 和 CGA 一次做完，結果可上傳院內系統。' },
  'elder-multiple-medications': { product: 'yaocare', text: '藥局或診所想幫多重用藥的長輩追蹤服藥，藥提醒用 LINE 推播、附藥品外觀圖，藥師端看得到服藥狀況。' },
  'child-development-delay': { product: 'pedi', text: '院所或托育單位想先替家長做初篩，Smart Pedi 涵蓋 2 個月到 6 歲，結果可以上傳院所收案。' },
  'adult-functional-decline': { product: 'func', text: '健康管理中心想做成人功能篩檢，Smart Func 大約 10 到 15 分鐘做完，結果能用 SMART on FHIR 傳回院所。' },
  'medical-ai-content-compliance': { product: 'goalkeeper', text: '院所的 AI 內容多到沒辦法逐篇人工看，goalkeeper 用 API 回報五道合規檢查的狀態和依據法條。' },
  'daycare-checkin-roster': { product: 'sign', text: '想在據點試用，長者友善無接觸報到不用裝 App，臉部資料只留在裝置上。' },
  'which-health-self-assessment': { product: 'fhir-server', text: '機構想同時收成人、高齡、兒童三種評估，收案伺服器三套都收得進來，還有個案管理後台。' },
  'tcm-ai-trustworthy': { product: 'huatuo', text: '中醫診所想導入，AI 華佗的醫師工作站輸出 FHIR R4，證型對應 ICD-11 TM。' },
  'fhir-connectathon': { product: 'fhir-server', text: '我們的收案伺服器符合 Inferno FHIR 測試，準備聯測時想參考串接方式，可以來聊。' },
  'clinical-frailty-scale-levels': { product: 'geri', text: '院所要大量做 CFS 分級，Smart Geri 有專業臨床模式，分完級還能接著做多面向 CGA。' },
  'cga-assessment-scales': { product: 'geri', text: '想把 CGA 量表搬到平板上做？Smart Geri 是離線可用的 PWA，也有五次坐站的相機計時測驗。' },
  'atc-code-how-to-read': { product: 'yaocare', text: '藥局或診所想把 ATC 分類用在病人提醒上，藥提醒依 ATC 編碼整合處方，病人用 LINE 就收得到。' },
  'asq3-scoring-guide': { product: 'pedi', text: '院所想讓家長先線上填，Smart Pedi 以 −2SD 當紅旗，用紅黃綠給出觀察或轉介建議。' },
};
