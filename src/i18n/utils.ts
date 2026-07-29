import { ui, defaultLang } from './ui';

export function getLangFromEnv() {
  // .env에 설정된 VITE_SITE_LANG이 있으면 사용, 없으면 defaultLang(ko) 사용
  const envLang = import.meta.env.VITE_SITE_LANG;
  if (envLang && envLang in ui) {
    return envLang as keyof typeof ui;
  }
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
