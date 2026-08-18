import { createClient } from '@supabase/supabase-js';

/**
 * 삭제된 글 URL 처리
 *
 * ─── 왜 ───────────────────────────────────────────────────────
 * 미들웨어에는 URL 구조 변경용 패턴 3개(/blog/*, /post/*, /article/*)만
 * 하드코딩돼 있고 글 단위 매핑이 없다. 글을 지우면 그 URL은 그냥 404가 된다.
 *
 * 재구축에서 발행글을 대량 삭제할 예정인데, 사이트 전부 robots.txt가
 * 크롤링을 허용하고 sitemap에 URL이 올라가 있어 구글이 이미 가져갔다고
 * 봐야 한다. 처리 없이 404를 대량으로 내면 크롤 예산을 낭비한다.
 *
 * ─── 왜 미들웨어가 아니라 여기인가 ────────────────────────────
 * 미들웨어는 모든 요청에서 실행된다. 거기에 DB 조회를 넣으면 정상 페이지
 * 요청까지 전부 왕복 비용을 문다. 리다이렉트가 필요한 건 "글을 못 찾은"
 * 경우뿐이므로, 404가 확정된 시점에만 조회한다.
 * 정상 트래픽에는 비용이 0이다.
 *
 * ─── 410 vs 301 ──────────────────────────────────────────────
 * 기본은 410(Gone)이다. 404는 "일시적으로 없음", 410은 "영구 삭제"라
 * 구글이 색인에서 더 빨리 뺀다. 되살릴 계획이 없는 글이므로 410이 정확하다.
 * 대체할 글이 있으면 target_path로 301을 보낸다.
 */

export interface RedirectRule {
  status_code: number;
  target_path: string | null;
}

function getClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * 삭제된 경로인지 조회한다. 규칙이 없으면 null(=평범한 404).
 *
 * 조회에 실패해도 절대 예외를 던지지 않는다. 리다이렉트 조회 실패가
 * 페이지 전체를 500으로 만들면 안 된다 — 그냥 404로 두는 게 낫다.
 */
export async function findRedirect(siteId: string | undefined, path: string): Promise<RedirectRule | null> {
  if (!siteId || !path) return null;
  const sb = getClient();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('post_redirects')
      .select('status_code, target_path')
      .eq('site_id', siteId)
      .eq('source_path', path)
      .maybeSingle();

    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}
