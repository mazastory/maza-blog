/**
 * 글 URL 만들기 — 사이트맵·RSS 가 같은 규칙을 쓰게 한 곳에 모은다.
 *
 * ─── 왜 필요한가 (2026-09-08 실측) ─────────────────────────────────────────
 * 사이트맵의 `<loc>` 에 한글 슬러그가 **퍼센트 인코딩 없이 원문 그대로** 들어가고
 * 있었다. 카테고리는 `encodeURIComponent` 를 쓰는데 글만 빠져 있었다.
 *
 * 사이트맵 프로토콜(sitemaps.org/protocol.html)은 `<loc>` 이 RFC-3986 을 따라야
 * 한다고 명시하고, UTF-8 비ASCII 는 `%C3%BC` 형태로 적으라고 예시까지 준다.
 *
 * 실측으로 갈렸다 — GSC URL 검사의 `sitemap` 필드:
 *
 *     mazastory.com    (ASCII 슬러그)  →  sitemap 잡힘   · Discovered(발견됨)
 *     sharpinsighthub  (한글 슬러그)   →  sitemap null   · URL is unknown
 *     autosite.kr      (한글 슬러그)   →  sitemap null   · 색인된 글도 null
 *
 * 즉 **한글 슬러그 사이트는 사이트맵이 발견 경로로 전혀 작동하지 않았다.**
 * autosite.kr 의 색인된 글들은 사이트맵이 아니라 외부 링크·태그 페이지로 발견된
 * 것이어서, 한때 이 가설의 반례처럼 보였지만 반례가 아니었다.
 *
 * ─── 이중 인코딩 ───────────────────────────────────────────────────────────
 * 발행 글 슬러그 1,000건 표본에서 `%` 0건 · `/` 0건 · `&` 0건이라 지금은
 * `encodeURIComponent` 를 그냥 걸어도 안전하다. 다만 나중에 이미 인코딩된
 * 슬러그가 들어오면 `%25` 로 이중 인코딩되므로 그 경우를 막아둔다.
 */

/** 이미 퍼센트 인코딩된 흔적이 있으면 건드리지 않는다. */
function looksEncoded(slug: string): boolean {
  return /%[0-9A-Fa-f]{2}/.test(slug);
}

/**
 * 슬러그를 URL 경로 세그먼트로 안전하게 인코딩한다.
 * 슬러그에 `/` 가 들어오는 경우까지 대비해 세그먼트별로 처리한다.
 */
export function encodeSlug(slug: string): string {
  const s = String(slug || '');
  if (!s) return '';
  if (looksEncoded(s)) return s;
  return s.split('/').map((seg) => encodeURIComponent(seg)).join('/');
}

/** 글의 정식 절대 URL. 사이트맵·RSS·canonical 이 모두 이 값을 써야 한다. */
export function buildPostUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${encodeSlug(slug)}`;
}
