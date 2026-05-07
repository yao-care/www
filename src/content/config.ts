import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  type: 'data',
  schema: z.object({
    target: z.enum(['yaocare', 'huatuo', 'txgnn', 'intel', 'siqc', 'triz', 'marketing']),
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
  }),
});

export const collections = { news };
