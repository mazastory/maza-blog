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
  publish_at?: string | null;
  created_at?: string | null;
};

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 표시·구조화데이터·사이트맵에 쓸 발행 날짜. 절대 미래를 돌려주지 않는다.
 *
 * 미래일 때 `created_at` 으로 내려간다 — 행이 만들어진 시각이라 반드시 과거이고,
 * 렌더할 때마다 바뀌지 않는다(`now` 를 쓰면 `datePublished` 가 매 요청 흔들려서
 * 구글에 더 나쁜 신호가 된다).
 */
export function resolvePublishDate(post: DatedPost): string {
  const now = Date.now();
  const publishAt = parse(post.publish_at);
  if (publishAt && publishAt.getTime() <= now) return publishAt.toISOString();

  const createdAt = parse(post.created_at);
  if (createdAt && createdAt.getTime() <= now) return createdAt.toISOString();

  // 둘 다 못 믿을 때만. created_at 이 미래인 행은 실측상 없다.
  return new Date(now).toISOString();
}

/** `publish_at` 이 미래인가 — 계기판·점검용. 표시 경로에서는 위 함수를 쓸 것. */
export function isFutureDated(post: DatedPost): boolean {
  const publishAt = parse(post.publish_at);
  return !!publishAt && publishAt.getTime() > Date.now();
}
