import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const domain = getRequestDomain(context.request);
    const locale = context.locals.lang || 'ko';
    
    let posts: any[] = [];
    try {
      posts = await getApprovedPosts(domain, locale, 5000);
    } catch (e) {
      console.warn("Could not fetch blog posts for RSS", e);
    }

    const config = await getSiteConfig(domain);
    const siteTitle = config?.blog_name || 'Maza Blog';
    const siteDesc = config?.niche || 'A blog powered by Maza Studio';
    const siteUrl = config?.domain ? `https://${config.domain}` : `https://${domain}`;

    const response = await rss({
      title: siteTitle,
      description: siteDesc,
      site: siteUrl,
      items: posts.map((post) => {
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

        return {
          title: post.title,
          pubDate: new Date(post.publish_at || post.created_at),
          description: summary,
          content: richContent,
          link: `${siteUrl}/${post.slug}`,
          categories: tags,
        };
      }),
      customData: `<language>${locale}</language>`,
    });
    response.headers.set('Vary', 'Host');
    return response;
  } catch (err: any) {
    return new Response(`RSS Error: ${err.message}\n${err.stack}`, { status: 500 });
  }
}
