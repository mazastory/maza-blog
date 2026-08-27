// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import vercel from '@astrojs/vercel';

// Vercel injects 'URL' env var automatically. If not present (e.g. local), fallback.
// 마자 스튜디오가 배포 시 PUBLIC_SITE_DOMAIN 을 주입한다.
// [2026-08-27] SITE_DOMAIN 폴백은 남겨 둔다 — 넷리파이 프로비저닝 경로
// (maza-studio `admin/agency.ts`)만 이 이름을 넣는데 현재 그 경로로 만들어진
// 사이트는 0곳이다. 그래도 지우지 않는 이유는 여기가 도메인 해석의 시작점이라,
// 얻는 것 없이 건드릴 자리가 아니기 때문이다.
const domain = process.env.PUBLIC_SITE_DOMAIN || process.env.SITE_DOMAIN;
const siteUrl = domain ? `https://${domain}` : (process.env.URL || 'https://example.com');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  output: 'server',
  // ⚠️ 캐시 수명은 여기서만 정해진다 — 페이지의 응답 헤더로는 못 바꾼다.
  //
  // [2026-08-27] `isr: { expiration: 60 }` 는 @astrojs/vercel 10 에서
  // `expiration: isr.expiration ?? false` 로 풀린다(dist/index.js:483).
  // `expiration: false` 는 **무기한 캐시**다 — 재배포 전까지 절대 안 늙는다.
  // 그리고 `allowQuery: [ASTRO_PATH_PARAM]` 이라 쿼리스트링을 붙여도 캐시 키가
  // 안 바뀌므로 `?cachebust=…` 로도 못 깬다.
  //
  // 실측 피해: 이 저장소의 모든 라우트가 `prerender = false` 라 전부 ISR 로 가고,
  // 그 결과 운영 홈이 `age: 469726`(5.4일) 로 굳어 "아직 작성된 글이 없습니다"를
  // 계속 내보내고 있었다. sitemap.xml 도 같이 굳어서 **구글에 제출된 사이트맵에
  // 글 URL 이 0개**였다(발행글은 실제로 161건).
  //
  // 60초는 새로 고른 값이 아니라, 페이지들이 이미 헤더에 적어두고 있던
  // `s-maxage=60` 을 실제로 동작하는 자리로 옮긴 것이다. ISR 은 만료 후 첫 요청에
  // 옛 응답을 주면서 뒤에서 다시 만든다 — stale-while-revalidate 와 같은 동작이다.
  adapter: vercel({
    isr: { expiration: 60 }
  }),
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en", "ja"],
    routing: "manual"
  },
  integrations: [],
  vite: {
    plugins: [tailwindcss(), viteTsConfigPaths()]
  }
});
