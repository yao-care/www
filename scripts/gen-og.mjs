#!/usr/bin/env node
/*
 * Generate OG share images for /works/* pages.
 *
 * Outputs PNGs at public/assets/images/og/<slug>.png (1200×630).
 * Designed to render correctly with only DejaVu Sans available
 * (no CJK font on this build host); each card uses Latin/numbers
 * for the dominant visual and falls back to brand-mark for the
 * Chinese context.
 *
 * Run: node scripts/gen-og.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'public/assets/images/og');

// brand
const BRAND = '#c6461c';
const BRAND_DEEP = '#9c3414';
const BRAND_SOFT = '#fff7f3';
const INK = '#222';
const INK_SOFT = '#555';

const WORKS = [
  {
    slug: 'twtxgnn',
    kicker: 'Drug Repurposing AI · SMART on FHIR',
    stat: '30',
    statLabel: 'COUNTRIES',
    title: 'TxGNN',
    tagline: 'Knowledge Graph + Deep Learning · 3.1M predictions',
  },
  {
    slug: 'marketing',
    kicker: 'Performance Marketing · Medical Expertise',
    stat: '$2.19',
    statLabel: 'AVG · CPL',
    title: 'Marketing',
    tagline: '4,634 qualified leads · 5 industries · 4–7× efficiency',
  },
  {
    slug: 'intel',
    kicker: 'Intelligence Automation',
    stat: '23',
    statLabel: 'SUPPLY CHAINS',
    title: 'Intel',
    tagline: '500+ companies tracked daily · zero-cost on GitHub',
  },
  {
    slug: 'siqc',
    kicker: 'ISO 27001 Compliance Automation',
    stat: 'ISO',
    statLabel: '27001 · AUTOMATED',
    title: 'SIQC',
    tagline: '12 workflows · 64 ISMS docs · AI audit assistant',
  },
];

function makeSvg(work) {
  const W = 1200;
  const H = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" />
      <stop offset="100%" stop-color="${BRAND_SOFT}" />
    </linearGradient>
    <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND}" />
      <stop offset="100%" stop-color="${BRAND_DEEP}" />
    </linearGradient>
    <radialGradient id="blob1" cx="0.18" cy="0.22" r="0.45">
      <stop offset="0%" stop-color="${BRAND}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="blob2" cx="0.95" cy="0.85" r="0.5">
      <stop offset="0%" stop-color="${BRAND}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${BRAND}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#blob1)" />
  <rect width="${W}" height="${H}" fill="url(#blob2)" />

  <!-- top accent bar -->
  <rect x="80" y="80" width="60" height="6" rx="3" fill="url(#brandFill)" />

  <!-- kicker -->
  <text x="80" y="140" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="700"
        fill="${BRAND}" letter-spacing="3" text-rendering="geometricPrecision">${work.kicker.toUpperCase()}</text>

  <!-- big stat -->
  <text x="80" y="320" font-family="DejaVu Sans, Arial, sans-serif" font-size="180"
        font-weight="900" fill="${INK}" text-rendering="geometricPrecision">${work.stat}</text>

  <!-- stat label -->
  <text x="80" y="360" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="600"
        fill="${INK_SOFT}" letter-spacing="6" text-rendering="geometricPrecision">${work.statLabel}</text>

  <!-- title -->
  <text x="80" y="450" font-family="DejaVu Sans, Arial, sans-serif" font-size="56" font-weight="700"
        fill="${INK}" text-rendering="geometricPrecision">${work.title}</text>

  <!-- tagline -->
  <text x="80" y="495" font-family="DejaVu Sans, Arial, sans-serif" font-size="24"
        fill="${INK_SOFT}" text-rendering="geometricPrecision">${escapeXml(work.tagline)}</text>

  <!-- bottom brand bar -->
  <line x1="80" y1="552" x2="${W - 80}" y2="552" stroke="${INK}" stroke-opacity="0.08" stroke-width="1" />
  <text x="80" y="585" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="700"
        fill="${BRAND}">yao.care</text>
  <text x="${W - 80}" y="585" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="500"
        fill="${INK_SOFT}" text-anchor="end">/works/${work.slug}</text>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const work of WORKS) {
    const svg = makeSvg(work);
    const out = resolve(OUT_DIR, `${work.slug}.png`);
    await sharp(Buffer.from(svg))
      .png({ quality: 92, compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
