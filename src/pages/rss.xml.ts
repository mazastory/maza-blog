import type { APIContext } from 'astro';
import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const domain = getRequestDomain(context.request);
    const locale = context.locals.lang || 'ko';
    
    let posts: any[] = [];
    try {
      posts = await getApprovedPosts(domain, locale, 500); // Limit to 500 for RSS safety
    } catch (e) {
      console.warn("Could not fetch blog posts for RSS", e);
    }

    const config = await getSiteConfig(domain);
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
          <pubDate>${new Date(post.publish_at || post.created_at).toUTCString()}</pubDate>
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
