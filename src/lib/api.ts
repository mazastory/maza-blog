import { supabase } from './supabase';

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  html_content: string;
  thumbnail_url?: string;
  created_at: string;
  publish_at: string;
  status: string;
  metadata?: any;
}

export interface SiteConfig {
  id: string;
  blog_name: string;
  domain: string;
  niche?: string;
  adsense_pub?: string;
  adsense_status?: string;
  metadata?: any;
}

export function getRequestDomain(request: Request): string {
  if (import.meta.env.PUBLIC_SITE_DOMAIN) {
    return import.meta.env.PUBLIC_SITE_DOMAIN;
  }
  try {
    const url = new URL(request.url);
    const hostname = url.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    return hostname;
  } catch (e) {
    return '';
  }
}

export async function getSiteConfig(domain?: string): Promise<SiteConfig | null> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || import.meta.env.URL || '';
  if (!targetDomain) return null;

  try {
    const { data, error } = await supabase.rpc('get_public_site_config', { target_domain: targetDomain });
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// 최적화: html_content를 제외하고 가벼운 목록만 가져옵니다. (5MB -> 50KB 최적화)
export async function getApprovedPosts(domain?: string, locale?: string): Promise<Post[]> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || '';
  
  let data, error;
  try {
    // get_public_posts 대신 직접 site_id를 조회 후 posts 목록을 가져옵니다.
    const { data: site } = await supabase.from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
    if (!site) return [];

    const result = await supabase.from('posts')
      .select('id, title, thumbnail_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', site.id)
      .eq('status', 'published');
      
    data = result.data;
    error = result.error;
  } catch (e) {
    return [];
  }

  if (error || !data) return [];
  
  const now = new Date().getTime();

  return data
    .filter((post: any) => {
      const isCompliance = post.source_type === 'compliance' || 
                           post.metadata?.is_compliance === true ||
                           /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
      if (isCompliance) return false;

      const publishTime = new Date(post.publish_at || post.created_at).getTime();
      return publishTime <= now;
    })
    .map((post: any) => {
      let thumbnail_url = post.thumbnail_url;
      // HTML 콘텐츠가 없으므로 썸네일 정규식 추출 불가능 -> metadata.image1 등을 활용
      if (!thumbnail_url && post.metadata?.data?.image1) {
        thumbnail_url = post.metadata.data.image1;
      }
      
      return {
        id: post.id,
        title: post.title,
        slug: post.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + post.id.split('-')[0],
        content: '', // 목록에서는 제외
        html_content: '', // 목록에서는 제외
        created_at: post.created_at,
        publish_at: post.publish_at || post.created_at,
        status: post.status,
        metadata: post.metadata,
        thumbnail_url
      };
    })
    .sort((a: Post, b: Post) => new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime());
}

// 최적화: slug로 ID를 찾은 후, 해당 포스트 1개만의 html_content를 추가로 가져옵니다.
export async function getPostBySlug(slug: string, domain?: string, locale?: string): Promise<Post | null> {
  const posts = await getApprovedPosts(domain, locale);
  const basePost = posts.find(p => p.slug === slug || p.id === slug);
  
  if (!basePost) return null;

  // html_content와 content만 따로 가져옴
  const { data, error } = await supabase.from('posts').select('html_content, content').eq('id', basePost.id).single();
  if (!error && data) {
    basePost.html_content = data.html_content;
    basePost.content = data.content;
  }

  return basePost;
}
