import { ui, defaultLang } from './ui';

// [FIX] 이 앱은 멀티테넌트 SSR이라 요청마다 사이트가 다르다.
// 예전엔 빌드타임 환경변수(VITE_SITE_LANG)로 언어를 고정했는데,
// 그러면 어떤 도메인으로 들어와도 항상 같은 언어만 나온다.
// siteConfig.metadata.language(요청별 값)를 넘겨받아 검증하는 방식으로 교체.
export function resolveLang(lang?: string | null) {
  if (lang && lang in ui) {
    return lang as keyof typeof ui;
  }
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
