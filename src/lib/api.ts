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

// 요청 객체(Request)에서 호스트명을 추출하여 도메인을 반환하는 헬퍼 함수
export function getRequestDomain(request: Request): string {
  // 1순위: 주입된 PUBLIC_SITE_DOMAIN 환경변수가 있으면 이를 최우선으로 사용합니다 (Vercel, Netlify 1:1 매핑 호환성)
  if (import.meta.env.PUBLIC_SITE_DOMAIN) {
    return import.meta.env.PUBLIC_SITE_DOMAIN;
  }

  // 2순위: 환경변수가 없을 경우 요청 객체에서 hostname을 추출합니다
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

  // If no domain is configured at build/prerender time, avoid making network calls.
  if (!targetDomain) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_public_site_config', { target_domain: targetDomain });
    if (error) {
      console.error("Error fetching site config:", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("getSiteConfig RPC failed:", e);
    return null;
  }
}

export async function getApprovedPosts(domain?: string, locale?: string): Promise<Post[]> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || '';
  const currentLocale = locale || 'ko';
  
  const { data, error } = await supabase.rpc('get_public_posts', { target_domain: targetDomain, target_lang: currentLocale });

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
  
  const now = new Date().getTime();

  return (data || [])
    .filter((post: any) => {
      // Exclude posts with active generation statuses
      if (post.status && ['QUEUED', 'STARTING', 'TAB_OPENING', 'SCHEDULED', 'ON_HOLD'].includes(post.status.toUpperCase())) return false;
      const publishTime = new Date(post.publish_at || post.created_at).getTime();
      return publishTime <= now;
    })
    .map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      html_content: post.html_content,
      created_at: post.created_at,
      publish_at: post.publish_at || post.created_at,
      status: post.status,
      metadata: post.metadata,
      slug: post.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + post.id.split('-')[0],
    }))
    .sort((a, b) => new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime());
}

export async function getPostBySlug(slug: string, domain?: string, locale?: string): Promise<Post | null> {
  const posts = await getApprovedPosts(domain, locale);
  return posts.find(p => p.slug === slug) || null;
}
