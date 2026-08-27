import { createClient } from '@supabase/supabase-js';

/**
 * [2026-08-27] `|| 'placeholder'` 폴백을 제거했다.
 *
 * 예전 코드:
 *   const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
 *   const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
 *
 * 환경변수가 빠지면 **가짜 주소로 클라이언트를 만들어** 모든 쿼리가 조용히 실패했고,
 * 상위 호출부가 그 실패를 `[]` 로 받아 "아직 작성된 글이 없습니다"를 HTTP 200 으로
 * 내보냈다. 어디에도 에러가 안 남는다. `.claude/CLAUDE.md` 절대규칙 1번
 * ("설정 누락을 그럴듯한 기본값으로 덮지 않는다. 모르면 시끄럽게 멈춘다")이
 * 지목한 바로 그 자리다.
 *
 * ⚠️ Astro 는 `PUBLIC_` 접두사만 클라이언트 번들에 노출한다. maza-studio(Vite)는
 * `VITE_` 라 이름이 다르다 — 섞으면 여기서 조용히 undefined 가 된다.
 */
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  // 던진다. 가짜 클라이언트로 계속 가면 빈 사이트를 200 으로 서빙하게 된다.
  throw new Error(
    `[maza-blog] 필수 환경변수가 없습니다: ${missing}. ` +
    `호스팅(Vercel) 프로젝트 설정에서 주입할 것. ` +
    `이름을 VITE_ 로 쓰면 Astro 가 못 읽는다 — PUBLIC_ 이어야 한다.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
