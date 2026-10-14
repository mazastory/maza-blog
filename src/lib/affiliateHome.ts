/**
 * 제휴 상품 모음 홈 (2026-10-14).
 *
 * 사이트의 `metadata.home_mode` 가
 *   · `affiliate`          → 홈(`/`)이 상품 모음이다(모든 방문자)
 *   · `affiliate_preview`  → 홈은 그대로 블로그 홈이고, **`/affiliate-preview`** 에서만 상품 모음을 볼 수 있다(확인용·검색 제외)
 * 그 밖이면 지금까지처럼 블로그 홈이다 — 다른 사이트는 영향이 없다.
 *
 * 🔴 미리보기를 `?preview=1` 같은 쿼리로 가르지 않는다. 이 블로그의 ISR 캐시 키는 쿼리를 무시한다
 *    (astro.config.mjs 의 `allowQuery` 설명) — 쿼리로 가르면 함수가 쿼리를 못 보거나, 공개 홈이 미리보기로 굳는다.
 *
 * 상품·고지 문구는 코드에 두지 않고 `metadata.affiliate_home` 에 둔다(제휴 링크는 계정에 묶인 주소라 저장소에 올리지 않는다).
 */
export interface AffiliateProduct {
  name: string;
  store: string;
  price: string;
  facts: string[];
  url: string;
  /** 카드에 보일 상품 이미지(https). 없으면 글자만. 쇼핑 커넥트가 제공하거나 사용을 허용한 이미지만 쓴다 */
  image?: string;
  /** 도구형 홈에서의 자리. 없으면 앞의 top_count 개는 top, 나머지는 bottom */
  slot?: 'top' | 'bottom' | 'left' | 'right';
}
export interface AffiliateTool {
  /** 마자 블로그에 들어 있는 공용 도구를 페이지의 일부로 넣는다(iframe 아님). 'planner' | 'breakeven'. */
  builtin?: 'planner' | 'breakeven';
  /** 도구를 둘 이상 쌓을 때(위에서 아래로). 있으면 builtin·embed_url 은 무시한다 */
  tools?: { builtin: 'planner' | 'breakeven'; title: string }[];
  /** 셋업팟 임베드 주소(https://www.setupod.com/embed/…) — builtin 이 없을 때 iframe 으로 띄운다 */
  embed_url?: string;
  /** 접근성용 이름 */
  title: string;
  height?: number;
  /** 위쪽 배너로 보낼 상품 수(나머지는 아래쪽) */
  top_count?: number;
}
/** 쿠팡 파트너스 다이나믹 배너. 쿠팡이 만들어 준 코드의 값만 받는다(id 숫자·trackingCode·크기) — 스크립트는 우리가 만든다 */
export interface CoupangBanner {
  id: number | string;
  tracking_code: string;
  template?: string;
  width: number | string;
  height: number | string;
  slot?: 'top' | 'bottom' | 'left' | 'right';
}
export interface AffiliateHomeConfig {
  /** 쿠팡 배너(없으면 네이버 상품 카드만) */
  coupang?: CoupangBanner[];
  /** 있으면 「도구 가운데 + 위아래 배너」 구조, 없으면 상품 목록 */
  tool?: AffiliateTool;
  title: string;
  intro: string;
  disclosure: string;
  notice: string;
  checked_at: string;
  products: AffiliateProduct[];
  /** 무료 자료 받기 띠(이메일+동의 → 내려받기). 없으면 띠를 안 보인다 */
  free_pack?: { title: string; lead: string; items: { title: string; desc: string; file: string; pages?: number; size?: string }[]; operator?: string; contact?: string };
}

/** 보여 줄 광고가 하나라도 있는가(네이버 카드 또는 쿠팡 배너) */
export function hasItems(cfg: any): boolean {
  return !!(cfg?.products?.length || cfg?.coupang?.length);
}

export type AffiliateMode = 'affiliate' | 'affiliate_preview' | null;

export function affiliateMode(siteConfig: any): AffiliateMode {
  const m = siteConfig?.metadata;
  if (!hasItems(m?.affiliate_home)) return null;
  return m.home_mode === 'affiliate' || m.home_mode === 'affiliate_preview' ? m.home_mode : null;
}

/** 홈(`/`)을 상품 모음으로 보낼 것인가 — 공개 모드일 때만. */
export function homeIsAffiliate(siteConfig: any): boolean {
  return affiliateMode(siteConfig) === 'affiliate';
}

/** `/affiliate-preview` 를 열어 줄 것인가 — 미리보기 설정(`affiliate_home_preview`)이 있거나, 미리보기 모드이거나, 이미 공개한 사이트. */
export function previewAllowed(siteConfig: any): boolean {
  return hasItems(siteConfig?.metadata?.affiliate_home_preview) || affiliateMode(siteConfig) !== null;
}

/** 미리보기 주소가 보여 줄 설정 — 따로 둔 미리보기 설정이 공개 설정보다 먼저다(공개 홈을 건드리지 않고 새 모양을 확인하려고). */
export function previewConfig(siteConfig: any): AffiliateHomeConfig | null {
  const m = siteConfig?.metadata;
  return (hasItems(m?.affiliate_home_preview) ? m.affiliate_home_preview : m?.affiliate_home) ?? null;
}
