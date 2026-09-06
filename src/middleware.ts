import { defineMiddleware } from 'astro:middleware';

const LOCALES = ['en', 'ja']; // 지원하는 추가 언어 목록

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const path = url.pathname;

  // -1. 봇 방어 및 경쟁자 크롤러 차단 (Bot Evasion)
  const userAgent = context.request.headers.get('user-agent') || '';
  const blockList = ['ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'rogerbot', 'baiduspider', 'yandexbot'];
  const isMaliciousBot = blockList.some(bot => userAgent.toLowerCase().includes(bot));
  
  if (isMaliciousBot) {
    // 경쟁사 분석 봇이나 불필요한 크롤러에게는 403 반환하여 트래픽 및 자산 보호
    return new Response('Forbidden: Bot Access Denied', { status: 403 });
  }

  // 0. 구형 URL 구조 301 영구 리다이렉트 (SEO 대응 - GSC 404 에러 방지)
  //
  // ⚠️ [2026-09-07] `post` 를 이 목록에서 뺐다.
  // 여기서 `/post/(.+)` 를 통째로 가로채는 바람에 **`src/pages/post/[id].astro`
  // 가 한 번도 실행되지 않았다.** 그 파일은 DB 에서 id → slug 를 찾아 정본 주소로
  // 보내는 코드인데, 미들웨어가 앞에서 `/post/<UUID>` → `/<UUID>` 로 던져버려
  // slug 자리에 UUID 가 들어가고 그대로 404 가 됐다.
  //
  //   실측(2026-09-06): /post/abc123 → 301 → /abc123 → 404
  //   autosite.kr · profitnestlab.com 두 곳에서 동일. GSC 「리디렉션 오류」·
  //   「찾을 수 없음(404)」 메일이 여러 사이트에 같은 날 온 원인이다.
  //
  // `blog` · `article` 은 처리할 페이지가 없으므로 여기서 계속 넘긴다.
  const legacyMatch = path.match(/^\/(blog|article)\/(.+)$/);
  if (legacyMatch) {
    return context.redirect(`/${legacyMatch[2]}`, 301);
  }
  // /blog, /post 등 단일 경로 접근 시 홈으로 리다이렉트
  if (path === '/blog' || path === '/post' || path === '/article') {
    return context.redirect('/', 301);
  }

  // 1. rewrite를 통해 전달된 커스텀 헤더가 있는지 확인
  const forwardedLang = context.request.headers.get('x-maza-lang');
  if (forwardedLang) {
    context.locals.lang = forwardedLang;
    return next();
  }

  // URL의 첫 번째 세그먼트 추출 (예: /en/slug -> 'en')
  const segments = path.split('/').filter(Boolean);
  const maybeLocale = segments[0];

  if (maybeLocale && LOCALES.includes(maybeLocale)) {
    const newPath = path.substring(maybeLocale.length + 1) || '/';
    
    // rewrite 시 새로운 Request 객체를 생성하여 커스텀 헤더 주입
    const newRequest = new Request(new URL(newPath, url.origin), context.request);
    newRequest.headers.set('x-maza-lang', maybeLocale);
    
    return context.rewrite(newRequest);
  }

  // 기본 한국어
  context.locals.lang = 'ko';
  return next();
});

