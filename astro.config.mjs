import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.yao.care',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  redirects: {
    '/works': '/',
    '/works/twtxgnn': '/medical/txgnn',
    '/works/intel': '/ai/intel',
    '/works/siqc': '/ai/siqc',
    '/works/marketing': '/marketing',
    '/cases': '/medical/yaocare',
    '/medical/gcm': '/medical/fhir-server',
  },
});
