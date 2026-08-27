import { supabase } from './supabase';
import { resolvePublishDate } from './postDate';

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
  category?: string;
  metadata?: any;
}

export interface SiteMetadata {
  tier?: 'free' | 'pro' | 'agency';
  mode?: 'stealth' | 'homepage';
  unlocked_features?: string[];
  max_subdomains?: number;
  [key: string]: any;
}

export interface SiteConfig {
  id: string;
  blog_name: string;
  domain: string;
  niche?: string;
  adsense_pub?: string;
  adsense_status?: string;
  purpose?: string;
  metadata?: SiteMetadata;
}

export function getRequestDomain(request: Request): string {
  try {
    let hostname = '';
    
    // 1. 헤더에서 추출 시도 (Vercel alias 도메인 문제 해결)
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

/**
 * 인프라 실패(DB 연결·쿼리 오류)와 "결과가 없음"을 구분하기 위한 에러.
 *
 * [2026-08-27] 이걸 만든 이유: 예전에는 두 경우가 모두 빈 배열/가짜 객체로 돌아왔다.
 * 그래서 **"글이 없는 사이트"와 "DB 가 죽은 사이트"가 화면에서 똑같이 보였고**,
 * 둘 다 HTTP 200 이라 구글에도 "내용 없는 정상 페이지"로 제출됐다.
 */
export class BlogDataError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'BlogDataError';
  }
}

// 캐시: siteConfig 5분, posts 2분 (서버리스 인스턴스별 인메모리)
// ※ 엣지 캐시는 이것과 별개다 — astro.config.mjs 의 Vercel ISR 이 관장한다.
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
        .select('id, blog_name, domain, niche, adsense_pub, adsense_status, sc_verification, ga_measurement_id, metadata')
        .eq('domain', targetDomain)
        .maybeSingle();

      // [2026-08-27] 두 경우를 구분한다.
      //  · 쿼리 오류 = 인프라 실패 → BlogDataError. 호출부가 503 을 낼 수 있다.
      //  · 행 없음   = 그냥 없는 도메인 → null. 404 로 가는 게 맞다.
      // 예전에는 둘 다 catch 로 떨어져 `{ blog_name: 'Debug: Exception' }` 이라는
      // 가짜 설정 객체를 돌려줬다. 그 값이 Layout 의 siteTitle 과 Header 의 blogName
      // 으로 **그대로 렌더**됐다 — 2026-08-21 에 라이브 11곳이 이 문자열을
      // 사이트 제목으로 달고 있었다.
      if (error) {
        console.error('[maza-blog] sites 쿼리 실패:', error, 'domain:', targetDomain);
        throw new BlogDataError(`site config 조회 실패 (${targetDomain})`, error);
      }
      if (!data) {
        console.warn('[maza-blog] 등록되지 않은 도메인:', targetDomain);
        return null;
      }

      // The RPC used to return sc_verification and ga_measurement_id.
      // Layout.astro handles fallback to metadata.google_site_verification so this direct query is compatible.

      cache[cacheKey] = { data, timestamp: Date.now() };
      return data;
    } finally {
      delete inflight[cacheKey];
    }
  })();

  return inflight[cacheKey];
}

// 최적화: html_content를 제외하고 가벼운 목록만 가져옵니다. (5MB -> 50KB 최적화)
export async function getApprovedPosts(domain?: string, locale?: string, limitCount: number = 60, options?: { bypassCache?: boolean }): Promise<any[]> {
  let targetDomain = domain || import.meta.env.PUBLIC_SITE_DOMAIN || import.meta.env.SITE_DOMAIN || import.meta.env.URL || '';
  targetDomain = normalizeDomain(targetDomain);
  if (!targetDomain) return [];
  
  const cacheKey = `posts_${targetDomain}_${locale || 'all'}_${limitCount}`;
  if (!options?.bypassCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < POSTS_TTL) {
    return cache[cacheKey].data;
  }

  // 동시 요청 중복 방지
  if (inflight[cacheKey]) return inflight[cacheKey];

  inflight[cacheKey] = (async () => {
    try {
      // get_public_posts 대신 직접 site_id를 조회 후 posts 목록을 가져옵니다.
      // [2026-08-27] 여기도 인프라 실패와 "없음"을 구분한다.
      const { data: site, error: siteErr } = await supabase
        .from('sites').select('id').eq('domain', targetDomain).limit(1).maybeSingle();
      if (siteErr) {
        console.error('[maza-blog] sites 조회 실패:', siteErr, 'domain:', targetDomain);
        throw new BlogDataError(`sites 조회 실패 (${targetDomain})`, siteErr);
      }
      if (!site) {
        console.warn('[maza-blog] 등록되지 않은 도메인:', targetDomain);
        return [];
      }

      const targetLanguage = locale || 'ko';
      const result = await supabase.from('posts')
        .select('id, title, slug, source_image_url, created_at, publish_at, status, metadata, source_type')
        .eq('site_id', site.id)
        .eq('status', 'published')
        .or(`language.eq.${targetLanguage},language.is.null`)
        .order('publish_at', { ascending: false })  // created_at → publish_at 정렬로 더 정확한 순서
        .limit(limitCount);

      const { data, error } = result;
      // 예전에는 쿼리가 실패해도 `[]` 를 돌려줬다. 그러면 화면은 "아직 작성된 글이
      // 없습니다"를 HTTP 200 으로 내보내고, 사이트맵도 글 0개로 나간다.
      // **DB 가 죽은 것과 글이 없는 것이 구분되지 않았다.**
      if (error) {
        console.error('[maza-blog] posts 조회 실패:', error, 'domain:', targetDomain);
        throw new BlogDataError(`posts 조회 실패 (${targetDomain})`, error);
      }
      if (!data) return [];

      let formattedData = data
        .filter((post: any) => {
          const isCompliance = post.source_type === 'compliance' ||
                               post.metadata?.is_compliance === true ||
                               /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
          if (isCompliance) return false;
          // [2026-08-27] `publish_at <= now` 조건을 뺐다. 위에서 이미
          // status='published' 로 거르므로 중복이고, 미래 날짜가 잘못 박힌
          // 발행글 19건을 사이트맵·목록·RSS 에서 조용히 지우고 있었다.
          // 근거는 lib/postDate.ts 주석 참조.
          return !!post.title;
        })
        .map((post: any) => {
          let thumbnail_url = post.source_image_url;
          if (!thumbnail_url && post.metadata?.data?.image1) {
            thumbnail_url = post.metadata.data.image1;
          }
          return {
            id: post.id,
            title: post.title,
            slug: computeSlug(post),
            content: '',
            html_content: '',
            created_at: post.created_at,
            // 미래 날짜는 여기서 과거로 고정한다 — 이 값이 곧 사이트맵 lastmod ·
            // RSS pubDate · JSON-LD datePublished 로 나간다.
            publish_at: resolvePublishDate(post),
            status: post.status,
            metadata: post.metadata,
            thumbnail_url
          };
        })
        // 정렬도 고정된 날짜 기준으로 다시 잡는다. SQL 은 원본 publish_at 으로
        // 정렬하므로, 그대로 두면 미래 글이 최신인 척 목록 맨 위를 차지한다.
        .sort((a: any, b: any) =>
          new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime());

      // Mock injection removed to prevent AdSense 'Thin Content/Niche Mismatch' flags.
      // if (formattedData.length === 0) { ... }

      cache[cacheKey] = { data: formattedData, timestamp: Date.now() };
      return formattedData;
    } catch (e) {
      // 캐시에 직전 정상 응답이 있으면 그것으로 버틴다(일시적 장애 흡수).
      // 없으면 삼키지 않고 올려보낸다 — 빈 페이지를 200 으로 내보내지 않기 위해서다.
      const stale = cache[cacheKey]?.data;
      if (stale) {
        console.warn('[maza-blog] posts 조회 실패 — 캐시된 직전 응답으로 대체:', targetDomain);
        return stale;
      }
      throw e instanceof BlogDataError ? e : new BlogDataError(`posts 조회 실패 (${targetDomain})`, e);
    } finally {
      delete inflight[cacheKey];
    }
  })();

  return inflight[cacheKey];
}

/**
 * [2026-08-27] **`posts.slug` 는 실재하는 컬럼이다.** 이 함수의 옛 주석("DB에 slug
 * 컬럼이 없으므로")은 사실이 아니었고, 그 오해가 중복 URL 을 만들고 있었다.
 *
 * 실측(발행글 162건):
 *   published_url ↔ DB slug      162/162 일치   ← 실제로 웹에 나간 주소
 *   published_url ↔ 계산 slug    157/162 일치   ← 5건 어긋남
 *
 * 어긋나는 이유는 `toLowerCase()` 다. 제목에 `AI`·`LLM`·`PC` 같은 대문자가 있으면
 * 계산값이 소문자로 낮아진다. 그런데 **두 주소가 다 200 으로 열린다**(상세 경로가
 * 계산값으로도 글을 찾아내므로) — 같은 글이 두 URL 로 살아 있는 중복 콘텐츠다.
 * 2026-08-21 에 "사이트맵이 깨졌다"고 오진했던 것도 같은 대소문자 차이였다.
 *
 * 그래서 DB 값을 단일 진실로 삼는다. 계산은 slug 가 비어 있을 때의 폴백으로만 남긴다.
 */
function deriveSlug(post: { title: string; id: string }): string {
  return post.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + post.id.split('-')[0];
}

function computeSlug(post: { title: string; id: string; slug?: string | null }): string {
  return post.slug || deriveSlug(post);
}

function isCompliancePost(post: { title: string; source_type?: string; metadata?: any }): boolean {
  return post.source_type === 'compliance' ||
    post.metadata?.is_compliance === true ||
    /개인정보처리방침|이용약관|책임 한계|블로그 소개|문의하기/.test(post.title);
}

// [slug].astro에서 이미 호출한 getApprovedPosts() 결과(또는 동일 필터의 candidates 목록)를
// 그대로 받아 slug를 매칭합니다. 별도 DB 쿼리를 하지 않는 순수 함수입니다.
export function findPostMetaInList(posts: Post[], slug: string): Post | null {
  // DB slug 와 계산 slug 를 모두 받는다 — 수정 전에 나간 소문자 링크가 404 나지 않게.
  const match = posts.find(p => p.slug === slug || deriveSlug(p) === slug || p.id === slug);
  if (!match) return null;
  if (isCompliancePost(match as any)) return null;
  return match;
}

// 61번째 이후의 과거 글처럼 최근 60건 목록에 없는 경우를 위한 안전망(fallback) 쿼리.
// slug 맨 끝의 id 접두사를 단서로 UUID 범위를 계산하여 인덱스를 타고 빠르게 조회합니다.
export async function findPostMetaByIdHintFallback(slug: string, siteId: string): Promise<Post | null> {
  // Mock fallback removed

  // If slug is a full UUID, query it directly to allow direct previews of ANY post (even scheduled/future)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  if (isUuid) {
    try {
      const { data, error } = await supabase.from('posts')
        .select('id, title, slug, source_image_url, created_at, publish_at, status, metadata, source_type')
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
        // [2026-08-27] 요청받은 slug 가 아니라 **DB 의 정본 slug** 를 돌려준다.
        // 상세 페이지가 이 값으로 canonical 을 만들기 때문이다 — 소문자 주소로
        // 들어와도 정본은 DB 주소를 가리켜야 중복이 정리된다.
        slug: computeSlug(data),
        content: '',
        html_content: '',
        created_at: data.created_at,
        publish_at: resolvePublishDate(data),
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
      .select('id, title, slug, source_image_url, created_at, publish_at, status, metadata, source_type')
      .eq('site_id', siteId)
      .eq('status', 'published')
      .gte('id', minUuid)
      .lte('id', maxUuid)
      .limit(5);

    if (error || !data || data.length === 0) return null;

    const candidate = data.find((post: any) => computeSlug(post) === slug || deriveSlug(post) === slug) || (data.length === 1 ? data[0] : null);
    if (!candidate) return null;
    if (isCompliancePost(candidate)) return null;

    let thumbnail_url = candidate.source_image_url;
    if (!thumbnail_url && candidate.metadata?.data?.image1) {
      thumbnail_url = candidate.metadata.data.image1;
    }

    return {
      id: candidate.id,
      title: candidate.title,
      // 위와 같은 이유 — 정본은 DB slug 다.
      slug: computeSlug(candidate),
      content: '',
      html_content: '',
      created_at: candidate.created_at,
      publish_at: resolvePublishDate(candidate),
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
  // Mock fallback removed

  const cacheKey = `postContent_${id}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  if (inflight[cacheKey]) return inflight[cacheKey];

  inflight[cacheKey] = (async () => {
    try {
      const { data, error } = await supabase.from('posts').select('html_content, content').eq('id', id).single();
      if (error || !data) return null;
      const result = { content: data.content || '', html_content: data.html_content || '' };
      cache[cacheKey] = { data: result, timestamp: Date.now() };
      return result;
    } catch (e) {
      return null;
    } finally {
      delete inflight[cacheKey];
    }
  })();

  return inflight[cacheKey];
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
