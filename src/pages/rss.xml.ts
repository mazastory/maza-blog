import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getApprovedPosts, getSiteConfig, getRequestDomain } from '../lib/api';

export const prerender = false;

export async function GET(context: APIContext) {
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
      // 썸네일과 요약본을 포함한 리치 콘텐츠 생성 (SNS 연동 툴에서 추출하기 매우 좋음)
      const thumb = post.metadata?.thumbnail_url ? `<p><img src="${post.metadata.thumbnail_url}" alt="thumbnail" /></p>` : '';
      const summary = post.metadata?.description || post.content.substring(0, 150) + '...';
      const richContent = `${thumb}<p>${summary}</p>`;
      
      // 해시태그 및 카테고리를 RSS의 <category> 태그로 매핑 (자동화 툴에서 해시태그 변수로 사용 가능)
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
        link: `/${post.slug}`,
        categories: tags,
      };
    }),
    customData: `<language>${locale}</language>`,
  });
  response.headers.set('Vary', 'Host');
  return response;
}
