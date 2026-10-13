/**
 * 제휴 상품 모음 홈 (2026-10-14).
 *
 * 사이트의 `metadata.home_mode` 가
 *   · `affiliate`          → 모든 방문자에게 상품 모음 홈을 보여 준다
 *   · `affiliate_preview`  → 주소 뒤에 `?preview=1` 이 있을 때만 보여 준다(확인용)
 * 그 밖이면 지금까지처럼 블로그 홈이다 — 다른 사이트는 영향이 없다.
 * 상품·고지 문구는 코드에 두지 않고 `metadata.affiliate_home` 에 둔다(제휴 링크는 계정에 묶인 주소라 저장소에 올리지 않는다).
 */
export interface AffiliateProduct {
  name: string;
  store: string;
  price: string;
  facts: string[];
  url: string;
}
export interface AffiliateHomeConfig {
  title: string;
  intro: string;
  disclosure: string;
  notice: string;
  checked_at: string;
  products: AffiliateProduct[];
}

export function shouldShowAffiliate(siteConfig: any, url: URL): boolean {
  const m = siteConfig?.metadata;
  if (!m?.affiliate_home?.products?.length) return false;
  if (m.home_mode === 'affiliate') return true;
  if (m.home_mode === 'affiliate_preview') return url.searchParams.get('preview') === '1';
  return false;
}
