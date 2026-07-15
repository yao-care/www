import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  type: 'data',
  schema: z.object({
    target: z.enum(['yaocare', 'huatuo', 'txgnn', 'func', 'geri', 'pedi', 'intel', 'siqc', 'triz', 'goalkeeper', 'sign', 'marketing']),
    title: z.string(),
    titleZh: z.string().nullable().optional(),
    url: z.string().url(),
    source: z.string(),
    publishedAt: z.coerce.date(),
    fetchedAt: z.coerce.date(),
    newsBrief: z.string().min(30).max(200),
    issueAnalysis: z.string().min(50).max(280),
    designResponse: z.string().min(80).max(340),
    tags: z.array(z.string()).max(5).default([]),
    relevance: z.number().min(0).max(1),
    highlight: z.boolean(),
    criticPasses: z.number().int().min(1).max(5),
    // 內容最後實質更新時間（去 AI 味重寫 / 大腦優化 → 蓋這欄）。
    // 對外：餵 NewsArticle JSON-LD 的 dateModified 與 sitemap <lastmod>，向 Google 發「有在更新」訊號。
    updatedAt: z.coerce.date().optional(),
    // 文風修訂版號（見 scripts/style-guide.mjs 的 VOICE_REV）；backfill 據此判斷哪些舊文要重刷。
    voiceRev: z.number().int().optional(),
  }),
});

// 主題動態（內容重構 Phase 2，2026-07-15）：新聞不再各自成頁，改為掛在主題頁的「近期動態」。
// 初始批次由既有 news 語料回填（takeaway=newsBrief）；之後由 fetch-news.ts feed 模式每日寫入。
const topicFeed = defineCollection({
  type: 'data',
  schema: z.object({
    topic: z.enum([
      'medication-safety', 'elder-care-frailty', 'child-development',
      'preventive-function-health', 'explainable-medical-ai', 'medical-ai-governance',
      'intelligence-automation', 'innovation-methods', 'healthcare-marketing-compliance',
    ]),
    products: z.array(z.enum(['yaocare', 'huatuo', 'txgnn', 'func', 'geri', 'pedi', 'intel', 'siqc', 'triz', 'goalkeeper', 'sign', 'marketing'])).min(1).max(3),
    title: z.string(),
    url: z.string().url(),
    source: z.string(),
    publishedAt: z.coerce.date(),
    fetchedAt: z.coerce.date(),
    // 一句話重點＋與本主題何關（取代原三段短文；不下醫療結論）
    takeaway: z.string().min(20).max(220),
    relevance: z.number().min(0).max(1),
  }),
});

export const collections = { news, topicFeed };
