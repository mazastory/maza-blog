import { defineMiddleware } from 'astro:middleware';

const LOCALES = ['en', 'ja']; // 지원하는 추가 언어 목록

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const path = url.pathname;
  console.log('[MIDDLEWARE] original url:', url.href, 'pathname:', path);

  // 1. rewrite를 통해 전달된 커스텀 헤더가 있는지 확인
  const forwardedLang = context.request.headers.get('x-maza-lang');
  if (forwardedLang) {
    context.locals.lang = forwardedLang;
    return next();
  }

  // URL의 첫 번째 세그먼트 추출 (예: /en/slug -> 'en')
  const segments = path.split('/').filter(Boolean);
  const maybeLocale = segments[0];
  console.log('[MIDDLEWARE] maybeLocale:', maybeLocale);

  if (maybeLocale && LOCALES.includes(maybeLocale)) {
    const newPath = path.substring(maybeLocale.length + 1) || '/';
    
    // rewrite 시 새로운 Request 객체를 생성하여 커스텀 헤더 주입
    const newRequest = new Request(new URL(newPath, url.origin), context.request);
    newRequest.headers.set('x-maza-lang', maybeLocale);
    
    console.log(`[Middleware] Rewriting ${path} to ${newPath} (Locale: ${maybeLocale})`);
    return context.rewrite(newRequest);
  }

  // 기본 한국어
  context.locals.lang = 'ko';
  return next();
});
