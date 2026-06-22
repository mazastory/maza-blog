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

// 간단한 인메모리 캐시 구현 (로컬 dev 및 SSR 성능 최적화용)
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30000; // 30초

export async function getSiteConfig(domain?: string): Promise<SiteConfig | null> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || import.meta.env.URL || '';
  if (!targetDomain) return null;

  const cacheKey = `siteConfig_${targetDomain}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  try {
    const { data, error } = await supabase.rpc('get_public_site_config', { target_domain: targetDomain });
    if (error) return null;
    cache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  } catch (e) {
    return null;
  }
}

// 최적화: html_content를 제외하고 가벼운 목록만 가져옵니다. (5MB -> 50KB 최적화)
export async function getApprovedPosts(domain?: string, locale?: string): Promise<Post[]> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || '';
  
  const cacheKey = `posts_${targetDomain}_${locale || 'all'}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  let data, error;
  try {
    // get_public_posts 대신 직접 site_id를 조회 후 posts 목록을 가져옵니다.
    const { data: site } = await supabase.from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
    if (!site) return [];

    const nowIso = new Date().toISOString();

    const result = await supabase.from('posts')
      .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .lte('publish_at', nowIso)
      .order('publish_at', { ascending: false })
      .limit(60);
      
    data = result.data;
    error = result.error;
  } catch (e) {
    return [];
  }

  if (error || !data) return [];
  
  const now = new Date().getTime();

  const formattedData = data
    .filter((post: any) => {
      const isCompliance = post.source_type === 'compliance' || 
                           post.metadata?.is_compliance === true ||
                           /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
      if (isCompliance) return false;

      const publishTime = new Date(post.publish_at || post.created_at).getTime();
      return publishTime <= now;
    })
    .map((post: any) => {
      let thumbnail_url = post.source_image_url;
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

  cache[cacheKey] = { data: formattedData, timestamp: Date.now() };
  return formattedData;
}

// 슬러그를 즉석에서 계산합니다 (DB에 slug 컬럼이 없으므로 title + id 접두사로 파생).
function computeSlug(post: { title: string; id: string }): string {
  return post.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + post.id.split('-')[0];
}

function isCompliancePost(post: { title: string; source_type?: string; metadata?: any }): boolean {
  return post.source_type === 'compliance' ||
    post.metadata?.is_compliance === true ||
    /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
}

// [slug].astro에서 이미 호출한 getApprovedPosts() 결과(또는 동일 필터의 candidates 목록)를
// 그대로 받아 slug를 매칭합니다. 별도 DB 쿼리를 하지 않는 순수 함수입니다.
export function findPostMetaInList(posts: Post[], slug: string): Post | null {
  const match = posts.find(p => p.slug === slug || p.id === slug);
  if (!match) return null;
  if (isCompliancePost(match as any)) return null;
  return match;
}

// 61번째 이후의 과거 글처럼 최근 60건 목록에 없는 경우를 위한 안전망(fallback) 쿼리.
// slug 맨 끝의 id 접두사를 단서로 UUID 범위를 계산하여 인덱스를 타고 빠르게 조회합니다.
export async function findPostMetaByIdHintFallback(slug: string, siteId: string): Promise<Post | null> {
  const idHint = slug.includes('-') ? slug.substring(slug.lastIndexOf('-') + 1) : slug;
  if (!idHint || idHint.length < 4) return null; // 너무 짧은 토큰은 신뢰하지 않음

  // UUID range for lexicographical comparison
  const prefix = idHint.padEnd(8, '0').substring(0, 8);
  const minUuid = `${prefix}-0000-0000-0000-000000000000`;
  const prefixMax = idHint.padEnd(8, 'f').substring(0, 8);
  const maxUuid = `${prefixMax}-ffff-ffff-ffff-ffffffffffff`;

  try {
    const { data, error } = await supabase.from('posts')
      .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', siteId)
      .eq('status', 'published')
      .gte('id', minUuid)
      .lte('id', maxUuid)
      .limit(5);

    if (error || !data || data.length === 0) return null;

    const candidate = data.find((post: any) => computeSlug(post) === slug) || (data.length === 1 ? data[0] : null);
    if (!candidate) return null;
    if (isCompliancePost(candidate)) return null;

    let thumbnail_url = candidate.source_image_url;
    if (!thumbnail_url && candidate.metadata?.data?.image1) {
      thumbnail_url = candidate.metadata.data.image1;
    }

    return {
      id: candidate.id,
      title: candidate.title,
      slug,
      content: '',
      html_content: '',
      created_at: candidate.created_at,
      publish_at: candidate.publish_at || candidate.created_at,
      status: candidate.status,
      metadata: candidate.metadata,
      thumbnail_url,
    };
  } catch (e) {
    return null;
  }
}

// 글 본문(html_content, content)만 PK 정확 매칭으로 가져옵니다. 인덱스를 타므로 매우 빠릅니다.
export async function getPostContent(id: string): Promise<{ content: string; html_content: string } | null> {
  const cacheKey = `postContent_${id}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  try {
    const { data, error } = await supabase.from('posts').select('html_content, content').eq('id', id).single();
    if (error || !data) return null;
    const result = { content: data.content || '', html_content: data.html_content || '' };
    cache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (e) {
    return null;
  }
}

// 하위 호환용 단일 진입점: 내부적으로 site 조회 → 목록 조회 → 매칭 → fallback → 본문 조회를 한 번에 수행합니다.
export async function getPostBySlug(slug: string, domain?: string, locale?: string): Promise<Post | null> {
  const targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || '';

  try {
    const { data: site } = await supabase.from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
    if (!site) return null;

    const posts = await getApprovedPosts(targetDomain, locale);
    let meta = findPostMetaInList(posts, slug);

    if (!meta) {
      meta = await findPostMetaByIdHintFallback(slug, site.id);
      if (!meta) return null;
    }

    const full = await getPostContent(meta.id);
    if (!full) return null;

    return { ...meta, content: full.content, html_content: full.html_content };
  } catch (e) {
    return null;
  }
}
