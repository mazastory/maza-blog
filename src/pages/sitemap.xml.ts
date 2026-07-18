import type { APIRoute } from 'astro';

import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const domain = getRequestDomain(request);
  const posts = await getApprovedPosts(domain, undefined, 5000);
  const siteConfig = await getSiteConfig(domain);
  const siteUrl = siteConfig?.domain ? `https://${siteConfig.domain}` : new URL(request.url).origin;

  // 고정된 날짜 사용 (매번 바뀌는 new Date()는 크롤 버짓 낭비의 주범)
  const staticPageDate = '2025-01-01T00:00:00.000Z';

  // 카테고리 목록 추출 (사이트맵에 카테고리 페이지도 포함)
  const categories = [...new Set(posts.map((p: any) => p.metadata?.category).filter(Boolean))];

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${siteUrl}/</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>${siteUrl}/about</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>${siteUrl}/contact</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
      </url>
      <url>
        <loc>${siteUrl}/privacy</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.3</priority>
      </url>
      <url>
        <loc>${siteUrl}/disclaimer</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.3</priority>
      </url>
      ${categories.map(cat => `
      <url>
        <loc>${siteUrl}/category/${encodeURIComponent(cat as string)}</loc>
        <lastmod>${staticPageDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>
      `).join('')}
      ${posts.map((post: any) => `
        <url>
          <loc>${siteUrl}/${post.slug}</loc>
          <lastmod>${new Date(post.publish_at || post.created_at).toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Vary': 'Host'
    }
  });
}
