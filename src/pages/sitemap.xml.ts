import type { APIRoute } from 'astro';

import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const domain = getRequestDomain(request);
  const posts = await getApprovedPosts(domain, undefined, 5000);
  const siteConfig = await getSiteConfig(domain);
  const siteUrl = siteConfig?.domain ? `https://${siteConfig.domain}` : new URL(request.url).origin;

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${siteUrl}/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>${siteUrl}/about</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${siteUrl}/contact</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
      </url>
      <url>
        <loc>${siteUrl}/privacy</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.3</priority>
      </url>
      <url>
        <loc>${siteUrl}/disclaimer</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.3</priority>
      </url>
      ${posts.map(post => `
        <url>
          <loc>${siteUrl}/${post.slug}</loc>
          <lastmod>${new Date(post.publish_at || post.created_at).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
