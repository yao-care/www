// Works (作品) configuration
// 4 個作品：TxGNN（醫療 AI）→ Marketing（行銷服務）→ Intel（資訊搜集）→ SIQC（合規系統）

export const LINE_PERSONAL = 'https://line.me/ti/p/i0_EpxFQVc';
export const LINE_TEAM = 'https://line.me/ti/p/zruKr3pyPK';

export type Work = {
  slug: 'twtxgnn' | 'marketing' | 'intel' | 'siqc';
  title: string;
  tagline: string;
  description: string;
  ogTitle: string;
  ogStat: string;
  ogStatLabel: string;
  cardKicker: string;
  cardBullets: string[];
  cta: {
    label: string;
    href: string;
  };
};

export const WORKS: readonly Work[] = [
  {
    slug: 'twtxgnn',
    title: '30 國老藥新用 AI 預測平台',
    tagline: '知識圖譜 × 圖神經網路雙引擎，已上架 SMART on FHIR Gallery',
    description:
      '基於哈佛 TxGNN 模型，覆蓋 30 國 FDA 藥品，整合 PubMed、ClinicalTrials 證據，產出 16,700 + 藥物頁面與 FHIR 資源，與 Epic、Cerner 等 EHR 系統整合提供臨床決策支援。',
    ogTitle: 'TxGNN',
    ogStat: '30',
    ogStatLabel: 'COUNTRIES',
    cardKicker: '醫療 AI · 國際曝光',
    cardBullets: ['30 國 × 9 Phase 自動化', '3.1M DL 預測 / 16.7K 藥物頁', 'SMART on FHIR Gallery 上架'],
    cta: { label: '討論技術合作', href: LINE_PERSONAL },
  },
  {
    slug: 'marketing',
    title: '結合醫療專業的新媒體行銷服務',
    tagline: '與師級夥伴合作，投放思維 × 素材設計一體化',
    description:
      '與通過醫師、藥師、營養師等國家考試的師級夥伴合作，提供 Meta 廣告投放與素材製作整合服務。2026 年 4 月實績：4,634 筆表單潛在顧客，平均 CPL $2.19，遠低於業界 $5–$15+ 均值。',
    ogTitle: 'Marketing',
    ogStat: '$2.19',
    ogStatLabel: 'AVG · CPL',
    cardKicker: '行銷投放 × 素材設計',
    cardBullets: ['4,634 筆 Qualified Leads', '$2.19 平均 CPL（業界 4–7 倍效率）', '5 大產業跨類別實戰'],
    cta: { label: '聊聊您的行銷需求', href: LINE_TEAM },
  },
  {
    slug: 'intel',
    title: '資訊搜集自動化系統',
    tagline: '從新聞抓取到投資分析，全流程自動化',
    description:
      '以 GitHub Actions 為核心的資訊搜集自動化能力。參考實例：23 條產業供應鏈情報追蹤系統，每日自動監控 500 + 上中下游公司，產出新聞事件、財務異常告警與投資回測分析。可擴展到任何資訊密集領域。',
    ogTitle: 'Intel',
    ogStat: '23',
    ogStatLabel: 'SUPPLY CHAINS',
    cardKicker: '資訊搜集 × 自動化',
    cardBullets: ['23 條供應鏈 / 500+ 公司', '每日自動產出情報報告', 'GitHub 免費方案零成本維運'],
    cta: { label: '我也想要一套', href: LINE_TEAM },
  },
  {
    slug: 'siqc',
    title: 'ISO 27001 合規自動化系統',
    tagline: 'AI 驅動的安全掃描、文件管理、稽核包交付',
    description:
      '以 GitHub 為核心的 ISO 27001 合規自動化系統，12 個 Actions workflow 串成一條管線：從 SAST、SBOM、CVE 到 64 份 ISMS 文件自動修復，再到離線稽核助理交付。完整對照 ISO 27001:2022 / SOC 2 / OWASP ASVS / OWASP LLM Top 10。',
    ogTitle: 'SIQC',
    ogStat: 'ISO',
    ogStatLabel: '27001 · AUTOMATION',
    cardKicker: '合規 × 自動化',
    cardBullets: ['13 條掃描管線 / 64 份 ISMS 文件', '每月稽核包自動發行', 'AI 稽核助理離線可用'],
    cta: { label: '想要這套？聊聊', href: LINE_PERSONAL },
  },
] as const;

export const WORK_BY_SLUG: Record<Work['slug'], Work> = Object.fromEntries(
  WORKS.map((w) => [w.slug, w]),
) as Record<Work['slug'], Work>;
