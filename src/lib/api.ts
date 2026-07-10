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
  try {
    let hostname = '';
    
    // 1. 헤더에서 추출 시도 (Netlify/Vercel alias 도메인 문제 해결)
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (hostHeader) {
      hostname = hostHeader.split(':')[0]; // 포트 제거
    }
    
    // 2. 헤더에 없으면 request.url에서 추출
    if (!hostname) {
      const url = new URL(request.url);
      hostname = url.hostname;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || '';
    }
    return hostname;
  } catch (e) {
    return import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || '';
  }
}

// 캐시: siteConfig 5분, posts 2분 (Netlify Edge 인스턴스별 인메모리)
const cache: Record<string, { data: any, timestamp: number }> = {};
const SITE_CONFIG_TTL = 5 * 60 * 1000;   // 5분
const POSTS_TTL       = 2 * 60 * 1000;   // 2분
const CACHE_TTL       = 5 * 60 * 1000;   // 범용 (postContent 등)

// In-flight 중복 요청 방지 (캐시 스탬피드 예방)
const inflight: Record<string, Promise<any> | undefined> = {};

function normalizeDomain(d: string): string {
  if (!d) return '';
  return d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split(':')[0];
}

export async function getSiteConfig(domain?: string, options?: { bypassCache?: boolean }): Promise<SiteConfig | null> {
  let targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || import.meta.env.URL || '';
  targetDomain = normalizeDomain(targetDomain);
  if (!targetDomain) return null;

  const cacheKey = `siteConfig_${targetDomain}`;
  if (!options?.bypassCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < SITE_CONFIG_TTL) {
    return cache[cacheKey].data;
  }

  // 동시 요청 중복 방지
  if (inflight[cacheKey]) return inflight[cacheKey];

  inflight[cacheKey] = (async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, blog_name, domain, niche, adsense_pub, adsense_status, metadata')
        .eq('domain', targetDomain)
        .maybeSingle();

      if (error) {
        console.error('Supabase Query Error:', error, 'Target Domain:', targetDomain);
        return { blog_name: 'Debug: Query Error', metadata: { error: JSON.stringify(error), domain: targetDomain } };
      }
      if (!data) {
        return { blog_name: 'Debug: No Data', metadata: { domain: targetDomain } };
      }
      
      // The RPC used to return sc_verification and ga_measurement_id.
      // Layout.astro handles fallback to metadata.google_site_verification so this direct query is compatible.
      
      cache[cacheKey] = { data, timestamp: Date.now() };
      return data;
    } catch (e) {
      console.error('Supabase Exception:', e);
      return { blog_name: 'Debug: Exception', metadata: { error: String(e), domain: targetDomain } };
    } finally {
      delete inflight[cacheKey];
    }
  })();

  return inflight[cacheKey];
}

// 최적화: html_content를 제외하고 가벼운 목록만 가져옵니다. (5MB -> 50KB 최적화)
export async function getApprovedPosts(domain?: string, locale?: string, limitCount: number = 60): Promise<any[]> {
  let targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || import.meta.env.URL || '';
  targetDomain = normalizeDomain(targetDomain);
  if (!targetDomain) return [];
  
  const cacheKey = `posts_${targetDomain}_${locale || 'all'}_${limitCount}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < POSTS_TTL) {
    return cache[cacheKey].data;
  }

  // 동시 요청 중복 방지
  if (inflight[cacheKey]) return inflight[cacheKey];

  inflight[cacheKey] = (async () => {
    try {
      // get_public_posts 대신 직접 site_id를 조회 후 posts 목록을 가져옵니다.
      const { data: site } = await supabase.from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
      if (!site) return cache[cacheKey]?.data ?? [];

      const nowIso = new Date().toISOString();

      const targetLanguage = locale || 'ko';
      const result = await supabase.from('posts')
        .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
        .eq('site_id', site.id)
        .eq('status', 'published')
        .or(`language.eq.${targetLanguage},language.is.null`)
        .or(`publish_at.lte.${nowIso},publish_at.is.null`)
        .order('publish_at', { ascending: false })  // created_at → publish_at 정렬로 더 정확한 순서
        .limit(limitCount);

      const { data, error } = result;
      if (error || !data) return cache[cacheKey]?.data ?? [];

      const now = new Date().getTime();

      let formattedData = data
        .filter((post: any) => {
          const isCompliance = post.source_type === 'compliance' ||
                               post.metadata?.is_compliance === true ||
                               /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
          if (isCompliance) return false;
          const publishTime = new Date(post.publish_at || post.created_at).getTime();
          return post.title && publishTime <= now;
        })
        .map((post: any) => {
          let thumbnail_url = post.source_image_url;
          if (!thumbnail_url && post.metadata?.data?.image1) {
            thumbnail_url = post.metadata.data.image1;
          }
          return {
            id: post.id,
            title: post.title,
            slug: post.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + post.id.split('-')[0],
            content: '',
            html_content: '',
            created_at: post.created_at,
            publish_at: post.publish_at || post.created_at,
            status: post.status,
            metadata: post.metadata,
            thumbnail_url
          };
        });

      // Inject mock posts if the blog is empty so it looks good as a sample
      if (formattedData.length === 0) {
        formattedData = Object.keys(SAMPLE_POSTS_MOCK).map(mockId => {
          const mock = SAMPLE_POSTS_MOCK[mockId];
          return {
            id: mockId,
            title: mock.title,
            slug: mock.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + mockId.split('-')[0],
            content: mock.content,
            html_content: mock.content,
            created_at: new Date().toISOString(),
            publish_at: new Date().toISOString(),
            status: 'published',
            metadata: {},
            thumbnail_url: mock.image
          };
        });
      }

      cache[cacheKey] = { data: formattedData, timestamp: Date.now() };
      return formattedData;
    } catch (e) {
      return cache[cacheKey]?.data ?? [];
    } finally {
      delete inflight[cacheKey];
    }
  })();

  return inflight[cacheKey];
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
  // Check mock posts first
  const mockId = Object.keys(SAMPLE_POSTS_MOCK).find(id => slug.includes(id.split('-')[0]) || slug === id);
  if (mockId) {
    const mock = SAMPLE_POSTS_MOCK[mockId];
    return {
      id: mockId,
      title: mock.title,
      slug: mock.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + mockId.split('-')[0],
      content: mock.content,
      html_content: mock.content,
      created_at: new Date().toISOString(),
      publish_at: new Date().toISOString(),
      status: 'published',
      metadata: {},
      thumbnail_url: mock.image
    };
  }

  // If slug is a full UUID, query it directly to allow direct previews of ANY post (even scheduled/future)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  if (isUuid) {
    try {
      const { data, error } = await supabase.from('posts')
        .select('id, title, source_image_url, created_at, publish_at, status, metadata, source_type')
        .eq('site_id', siteId)
        .eq('id', slug)
        .single();
        
      if (error || !data) return null;
      if (isCompliancePost(data)) return null;
      
      let thumbnail_url = data.source_image_url;
      if (!thumbnail_url && data.metadata?.data?.image1) {
        thumbnail_url = data.metadata.data.image1;
      }
      
      return {
        id: data.id,
        title: data.title,
        slug,
        content: '',
        html_content: '',
        created_at: data.created_at,
        publish_at: data.publish_at || data.created_at,
        status: data.status,
        metadata: data.metadata,
        thumbnail_url,
      };
    } catch (e) {
      return null;
    }
  }

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
  if (SAMPLE_POSTS_MOCK[id]) {
    const mock = SAMPLE_POSTS_MOCK[id];
    return { content: mock.content, html_content: mock.content };
  }

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
export const SAMPLE_POSTS_MOCK: Record<string, { title: string, content: string, image: string, category: string }> = {
  '43e05f1f-a779-4ff5-8b97-6f996ae770c5': {
    title: "2026년 한국 편의점 먹방, 글로벌 유튜브 메가 트렌드가 된 이유",
    content: "<p>한국의 편의점 먹방이 전 세계적인 유튜브 트렌드로 자리 잡았습니다. 이 글에서는 그 이유와 문화적 배경을 심도 있게 분석합니다.</p><br/><h2>1. 먹방의 진화</h2><p>단순히 많이 먹는 것을 넘어, 편의점이라는 친숙한 공간에서의 조합이 세계인들의 호기심을 자극하고 있습니다.</p>",
    image: "https://images.pexels.com/photos/35786296/pexels-photo-35786296.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    category: "푸드/문화",
  },
  'f141ad21-1623-49fd-9fc7-2ff781641434': {
    title: "2026년, 감성 지능(EQ) 발달을 위한 디지털 콘텐츠: 단순한 스크린 넘어선 몰입형 학습의 힘",
    content: "<p>에듀테크의 발전으로 아이들의 감성 지능(EQ) 발달을 돕는 몰입형 학습 콘텐츠가 각광받고 있습니다.</p><br/><h2>몰입형 학습이란?</h2><p>단순한 시청각 자료를 넘어 상호작용을 통해 감성적 반응을 이끌어내는 차세대 교육 방식입니다.</p>",
    image: "https://images.pexels.com/photos/32694156/pexels-photo-32694156.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    category: "에듀테크",
  },
  '5c0f7cbe-c176-42b7-bfc1-83208778c045': {
    title: "2026년 만성 피로야 가라! 지친 당신을 위한 에너지 부스팅 습관",
    content: "<p>현대인의 고질병인 만성 피로. 이를 극복하기 위한 5가지 검증된 에너지 부스팅 습관을 소개합니다.</p><br/><h2>핵심 습관</h2><p>수면, 식단, 짧은 휴식의 타이밍이 당신의 하루 에너지를 결정합니다.</p>",
    image: "https://images.pexels.com/photos/36942632/pexels-photo-36942632.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    category: "건강/웰니스",
  },
  'eaf5eab2-307c-48c8-8411-140bc4e717a0': {
    title: "2026년 스마트 시티 교통 혁명: 해외 성공 사례에서 배우는 미래 모빌리티 전략",
    content: "<p>전 세계 스마트 시티들의 미래 모빌리티 성공 전략을 분석하고 우리의 나아갈 방향을 제시합니다.</p><br/><h2>자율주행과 대중교통의 결합</h2><p>끊김 없는 이동 경험(MaaS)이 도시의 효율성을 극대화합니다.</p>",
    image: "https://images.pexels.com/photos/3767027/pexels-photo-3767027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    category: "모빌리티",
  }
};
