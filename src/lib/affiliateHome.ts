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
}
export interface AffiliateTool {
  /** 셋업팟 임베드 주소(https://www.setupod.com/embed/…) — 이 도구를 홈 가운데에 띄운다 */
  embed_url: string;
  /** 접근성용 이름 */
  title: string;
  height?: number;
  /** 위쪽 배너로 보낼 상품 수(나머지는 아래쪽) */
  top_count?: number;
}
export interface AffiliateHomeConfig {
  /** 있으면 「도구 가운데 + 위아래 배너」 구조, 없으면 상품 목록 */
  tool?: AffiliateTool;
  title: string;
  intro: string;
  disclosure: string;
  notice: string;
  checked_at: string;
  products: AffiliateProduct[];
}

export type AffiliateMode = 'affiliate' | 'affiliate_preview' | null;

export function affiliateMode(siteConfig: any): AffiliateMode {
  const m = siteConfig?.metadata;
  if (!m?.affiliate_home?.products?.length) return null;
  return m.home_mode === 'affiliate' || m.home_mode === 'affiliate_preview' ? m.home_mode : null;
}

/** 홈(`/`)을 상품 모음으로 보낼 것인가 — 공개 모드일 때만. */
export function homeIsAffiliate(siteConfig: any): boolean {
  return affiliateMode(siteConfig) === 'affiliate';
}

/** `/affiliate-preview` 를 열어 줄 것인가 — 미리보기 모드이거나 이미 공개한 사이트. */
export function previewAllowed(siteConfig: any): boolean {
  return affiliateMode(siteConfig) !== null;
}
