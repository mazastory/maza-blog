// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import netlify from '@astrojs/netlify';

// Netlify injects 'URL' env var automatically. If not present (e.g. local), fallback.
// In Maza Studio, we will also inject PUBLIC_SITE_DOMAIN (Vercel) and SITE_DOMAIN (Netlify).
const domain = process.env.PUBLIC_SITE_DOMAIN || process.env.SITE_DOMAIN;
const siteUrl = domain ? `https://${domain}` : (process.env.URL || 'https://example.com');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  output: 'static',
  adapter: netlify(),
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en", "ja"],
    routing: {
      prefixDefaultLocale: false,
      fallbackType: "rewrite",
      strategy: "manual"
    }
  },
  integrations: [],
  vite: {
    plugins: [tailwindcss(), viteTsConfigPaths()]
  }
});
