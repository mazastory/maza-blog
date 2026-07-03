import type { APIRoute } from 'astro';
import { getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const domain = getRequestDomain(request);
  const siteConfig = await getSiteConfig(domain);
  const siteUrl = siteConfig?.domain ? `https://${siteConfig.domain}` : new URL(request.url).origin;

  const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
