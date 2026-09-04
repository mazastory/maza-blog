/**
 * 발행 날짜 단일 판정기
 * ============================================================================
 *
 * **문제** (2026-08-27 실측): `status='published'` 인데 `publish_at` 이 미래인 글이
 * 실사이트 12곳에 19건 있었다(창고 포함 30건, 최대 2026-09-10). 9곳에서 하나씩
 * 직접 받아본 결과 **전부 HTTP 200** — 글은 이미 웹에 나가 있다.
 *
 * 그런데 두 경로가 서로 다르게 판정하고 있었다:
 *
 *   목록·사이트맵·RSS (`getApprovedPosts`)  status='published' **그리고** publish_at<=now
 *   상세 페이지 (`findPostMetaByIdHintFallback`)  status='published' 만
 *
 * 그래서 이 19건은 **URL 로는 열리는데 사이트맵·목록·RSS 어디에도 없는 고아**가 됐다.
 * 실측: autosite.kr 사이트맵 6 URL(발행 15건 중 6건이 미래라 9건만 노출),
 * insightpilotpro 는 애드센스 수량 게이트를 21건으로 통과했지만 구글이 볼 수 있는
 * 것은 17건이다 — 트래커가 말하는 "거짓 초록불"이 여기서 하나 더 나온 셈이다.
 *
 * **판정**: `status` 가 권위다. 이 파이프라인에서 아직 안 나간 글의 상태는
 * `scheduled` / `ready_to_publish` 이지 `published` 가 아니다. 따라서
 * `published` 위에 얹은 `publish_at<=now` 는 중복이면서, 미래 날짜가 잘못 박힌
 * 글을 조용히 지운다. 조건을 뺀다.
 *
 * **다만 미래 날짜를 그대로 내보내지는 않는다.** 살아 있는 페이지의 JSON-LD
 * `datePublished` 가 미래면 구글이 신선도 신호를 신뢰하지 않는다(실측:
 * autosite.kr 의 한 페이지가 오늘 8/27 에 `"datePublished":"2026-08-28..."` 를
 * 내보내고 있었다). 표시·구조화데이터는 여기서 과거로 고정한다.
 *
 * **왜 DB 를 안 고치나**: `publish_at` 을 실제 발행 시각으로 되돌리려면
 * `enforce_published_post_rules()` 의 [규칙 2] 발행 날짜 불변 트리거를 우회해야
 * 한다. 그 트리거는 발행글 파괴를 막으려고 일부러 만든 것이고, 2026-08-18 에
 * "상태를 바꿔 우회하는 짓은 하지 않는다"고 정했다. 근본(누가 publish_at 을
 * 소유하는가 = SINGLE_SOURCE_MAP §8-b)은 발행 경로 수리와 함께 따로 다룬다.
 */

type DatedPost = {
  first_published_at?: string | null;
  publish_at?: string | null;
  created_at?: string | null;
};

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 표시·구조화데이터·사이트맵·RSS 에 쓸 **불변 발행 날짜**.
 *
 * [2026-09-04] 파이프라인(warehouseDispatcher·recoverHangingJobs 등)이 이미
 * 발행된 글의 `publish_at` 을 `published → archived → published` 세탁으로 앞으로
 * 밀고 있었다(불변 트리거 우회). 그 결과 2주 된 글의 `datePublished`·`<lastmod>`
 * 가 매번 "오늘" 로 튀었고 — 새 도메인이 URL 수십 개로 날짜를 흔드는 것은
 * 구글이 명시적으로 억제하는 패턴(날짜 스푸핑 콘텐츠팜)이다.
 *
 * **규칙: 발행일 = created_at 과 publish_at 중 이른 쪽.**
 * - 글은 자기 행이 만들어지기 전에 발행될 수 없다 → created_at 이 상한.
 * - 백데이트 글(`publish_at` 을 일부러 과거로)은 그 이른 값이 그대로 쓰인다.
 * - `publish_at` 이 created_at 보다 뒤면 = 파이프라인이 민 것 → 무시.
 * - 미래·`now()` 절대 안 나온다. 렌더마다 바뀌지 않는다.
 *
 * 근본(누가 publish_at 을 소유하나, 세탁 경로 차단)은 스케줄러 수리로 따로 다룬다.
 */
export function resolvePublishDate(post: DatedPost): string {
  const now = Date.now();

  // first_published_at 이 있으면 그게 답이다 — DB 트리거가 불변으로 지킨다.
  const firstPub = parse(post.first_published_at);
  if (firstPub && firstPub.getTime() <= now) return firstPub.toISOString();

  const publishAt = parse(post.publish_at);
  const createdAt = parse(post.created_at);

  const past = [firstPub, publishAt, createdAt].filter((d): d is Date => !!d && d.getTime() <= now);
  if (past.length > 0) {
    return new Date(Math.min(...past.map((d) => d.getTime()))).toISOString();
  }
  // 전부 미래이거나 없음(실측상 없다). created_at 원본 → 최후에 now.
  return (createdAt ?? new Date(now)).toISOString();
}

/** `publish_at` 이 미래인가 — 계기판·점검용. 표시 경로에서는 위 함수를 쓸 것. */
export function isFutureDated(post: DatedPost): boolean {
  const publishAt = parse(post.publish_at);
  return !!publishAt && publishAt.getTime() > Date.now();
}
