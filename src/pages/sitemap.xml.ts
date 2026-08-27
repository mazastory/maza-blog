import type { APIRoute } from 'astro';

import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';
import { resolvePublishDate } from '../lib/postDate';

export const prerender = false;

/**
 * [2026-08-27] DB 장애 시 503.
 * 예전에는 조회가 실패해도 빈 배열로 진행해 **글 0개짜리 사이트맵을 HTTP 200 으로**
 * 내보냈다. 구글은 200 을 "이게 최신 상태"로 받아들여 색인에서 URL 을 떨어뜨린다.
 * 503 + Retry-After 는 "잠깐 문제가 있으니 나중에 다시 오라"는 뜻이라 안전하다.
 */
export const GET: APIRoute = async ({ request }) => {
  const domain = getRequestDomain(request);
  let posts, siteConfig;
  try {
    // [2026-08-27] 사이트 언어를 먼저 읽고 그 언어로 글을 뽑는다.
    //
    // 예전에는 `getApprovedPosts(domain, undefined, ...)` 였고, 그 안에서
    // `locale || 'ko'` 로 떨어져 **사이트맵이 항상 한국어**를 봤다. 홈은
    // `siteConfig` 의 언어를 쓰므로 둘이 어긋난다.
    //
    // 실측(mazastory.com, language='en'):
    //     홈 = 영어 1건   ·   사이트맵 = 한국어 12건
    // 같은 사이트가 방문자와 구글에 다른 목록을 광고하고 있었고, 그 12건은
    // 홈에서 링크되지 않으니 고아였다. 오늘 아침에 고친 것과 같은 계통인데
    // 이번에는 날짜가 아니라 언어다.
    //
    // 다른 11곳은 언어 미설정이라 홈도 'ko' 로 폴백해 우연히 맞았다 —
    // 우연히 맞는 것은 맞는 게 아니다.
    siteConfig = await getSiteConfig(domain);
    const siteLang = siteConfig?.metadata?.language || siteConfig?.metadata?.lang || 'ko';
    posts = await getApprovedPosts(domain, siteLang, 5000);
  } catch (e) {
    console.error('[sitemap] 데이터 조회 실패 — 빈 사이트맵 대신 503:', e);
    return new Response('Service Unavailable', {
      status: 503,
      headers: { 'Retry-After': '300', 'Content-Type': 'text/plain' },
    });
  }
  const siteUrl = siteConfig?.domain ? `https://${siteConfig.domain}` : new URL(request.url).origin;

  // [FIX] Anti-Footprint: Date parsing 에러로 인한 2025-01-01 고정 및 sitemap 크래시 방어
  const safeDate = (dateStr: any) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const latestPostDate = posts.length > 0 
    ? new Date(Math.max(...posts.map((p: any) => safeDate(resolvePublishDate(p)).getTime()))).toISOString()
    : new Date().toISOString();

  // 정적 페이지는 고정 날짜 사용 (동적으로 바뀌면 Google 혼란 유발)
  const staticPageDate = '2026-01-01T00:00:00.000Z';

  // 카테고리 목록 추출 (사이트맵에 카테고리 페이지도 포함)
  const categories = [...new Set(posts.map((p: any) => p.metadata?.category).filter(Boolean))];

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${siteUrl}/</loc>
        <lastmod>${latestPostDate}</lastmod>
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
        <loc>${siteUrl}/terms</loc>
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
        <lastmod>${latestPostDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>
      `).join('')}
      ${posts.map((post: any) => `
        <url>
          <loc>${siteUrl}/${post.slug}</loc>
          <lastmod>${safeDate(resolvePublishDate(post)).toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Vary': 'Host'
    }
  });
}
