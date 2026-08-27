import type { APIContext } from 'astro';
import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';
import { resolvePublishDate } from '../lib/postDate';

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const domain = getRequestDomain(context.request);
    const locale = context.locals.lang || 'ko';
    
    // [2026-08-27] 조회 실패를 빈 피드로 삼키지 않는다.
    // 예전에는 catch 에서 경고만 찍고 `posts = []` 로 진행해 **항목 0개짜리 RSS 를
    // HTTP 200 으로** 내보냈다. 구독자·크롤러 입장에서는 "글이 전부 사라졌다"와
    // 구분되지 않는다.
    let posts: any[] = [];
    let config;
    try {
      posts = await getApprovedPosts(domain, locale, 500); // Limit to 500 for RSS safety
      config = await getSiteConfig(domain);
    } catch (e) {
      console.error('[rss] 데이터 조회 실패 — 빈 피드 대신 503:', e);
      return new Response('Service Unavailable', {
        status: 503,
        headers: { 'Retry-After': '300', 'Content-Type': 'text/plain' },
      });
    }
    const siteTitle = config?.blog_name || 'Maza Blog';
    const siteDesc = config?.niche || 'A blog powered by Maza Studio';
    const siteUrl = config?.domain ? `https://${config.domain}` : `https://${domain}`;

    const itemsXml = posts.map((post) => {
      const thumb = post.metadata?.thumbnail_url ? `<p><img src="${post.metadata.thumbnail_url}" alt="thumbnail" /></p>` : '';
      const rawSummary = post.metadata?.data?.summary || post.metadata?.summary || post.metadata?.description || '';
      const summary = rawSummary 
        ? rawSummary.replace(/<[^>]*>?/gm, '').replace(/[#*`>\[\]\(\)-]/g, '').replace(/\s+/g, ' ').trim().substring(0, 200)
        : (post.html_content || post.content || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().substring(0, 200);
      const richContent = `${thumb}<p>${summary}</p>`;
      
      const tags: string[] = post.metadata?.hashtags 
        ? post.metadata.hashtags.map((tag: string) => tag.replace(/^#/, '').trim()) 
        : [];
      
      if (post.metadata?.category && !tags.includes(post.metadata.category)) {
        tags.push(post.metadata.category);
      }
      
      // Escape special XML characters
      const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });

      return `
        <item>
          <title><![CDATA[${post.title}]]></title>
          <link>${siteUrl}/${post.slug}</link>
          <guid isPermaLink="true">${siteUrl}/${post.slug}</guid>
          <pubDate>${new Date(resolvePublishDate(post)).toUTCString()}</pubDate>
          <description><![CDATA[${summary}]]></description>
          <content:encoded><![CDATA[${richContent}]]></content:encoded>
          ${tags.map(t => `<category><![CDATA[${t}]]></category>`).join('')}
        </item>
      `;
    }).join('');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${siteTitle}]]></title>
    <description><![CDATA[${siteDesc}]]></description>
    <link>${siteUrl}</link>
    <language>${locale}</language>
    <generator>Maza Studio</generator>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(rssXml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Vary': 'Host'
      }
    });
  } catch (err: any) {
    return new Response(`RSS Error: ${err.message}\n${err.stack}`, { status: 500 });
  }
}
