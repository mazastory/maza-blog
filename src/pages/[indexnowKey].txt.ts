import type { APIRoute } from 'astro';

/**
 * =============================================
 * IndexNow 소유 증명 키 파일
 * =============================================
 *
 * [2026-08-31 신설] IndexNow 는 `https://도메인/{키}.txt` 가 **그 키를 그대로 담고 있으면**
 * 도메인 소유를 인정한다. 그래야 URL 제출이 받아들여진다.
 * — https://www.indexnow.org/documentation
 *
 * ─── 왜 이걸 붙였나 ──────────────────────────────────────────────────────────
 * 우리 사이트는 한국어인데 **구글만 재고 있었다**(2026-08-31 발견).
 * 네이버는 2023-07-25 부터 IndexNow 를 공식 지원하고, 한 엔드포인트에 제출하면
 * **네이버·빙·얀덱스에 함께 공유**된다. 구글은 IndexNow 를 지원하지 않는다.
 *
 * ⚠️ 앞서 쓰던 Google Indexing API 와 혼동하지 말 것 — 그건 **채용공고·실시간방송 전용**이라
 * 블로그 글에는 아무 효과가 없었다(실측: 200 응답 + 통지 기록 404).
 * IndexNow 는 **모든 페이지의 생성·수정 알림용**으로 만들어진 프로토콜이라 용도가 맞다.
 *
 * ─── 라우팅 주의 ────────────────────────────────────────────────────────────
 * 이 파일은 루트의 **모든 `*.txt`** 에 걸리는 동적 라우트다. 그러나 Astro 는
 * 정적 라우트를 우선하므로 `ads.txt` · `robots.txt` 는 각자 파일이 먼저 처리한다.
 * **키가 정확히 일치할 때만 200 을 주고, 나머지는 404** 다 — 임의의 `.txt` 를
 * 200 으로 돌려주면 다른 검증에 오작동을 일으킬 수 있다.
 */

export const prerender = false;

/** 전 사이트 공통 키. 공개되는 값이라 비밀이 아니다(파일로 노출하는 것이 규격이다). */
const INDEXNOW_KEY =
  import.meta.env.PUBLIC_INDEXNOW_KEY ||
  import.meta.env.INDEXNOW_KEY ||
  'f52ca1ac60a520b11f551a3f7d8b8f47';

export const GET: APIRoute = async ({ params }) => {
  const requested = params.indexnowKey || '';

  // 키가 다르면 존재하지 않는 파일이다. 그럴듯한 응답을 만들지 않는다.
  if (requested !== INDEXNOW_KEY) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  // 규격: 파일 내용은 키 문자열 그 자체(UTF-8).
  return new Response(INDEXNOW_KEY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      Vary: 'Host',
    },
  });
};
