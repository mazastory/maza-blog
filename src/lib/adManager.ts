/**
 * HTML 본문을 특정 위치(예: 절반)에서 나누어 반환합니다.
 * A/B 테스트 시 본문 중간에 광고를 주입하기 위해 사용됩니다.
 */
export function splitHtmlForAd(html: string): [string, string] {
  if (!html) return ['', ''];
  // Do NOT split if it contains a root div with box-sizing (Zero-IT or RendererAgent templates)
  if (html.includes('max-width:740px') || html.includes('template-wrapper')) {
    return [html, ''];
  }

  // 간단한 구현: 본문의 중간쯤에 있는 </p> 태그를 기준으로 나눔
  const pTags = html.match(/<\/p>/g);
  if (!pTags || pTags.length < 4) {
    // 문단이 4개 미만이면 나누지 않고, 전부 파트 1로 반환
    return [html, ''];
  }

  // 문단의 절반쯤 위치를 찾음
  const middleIndex = Math.floor(pTags.length / 2);
  let searchIndex = 0;
  let splitIndex = -1;

  for (let i = 0; i < middleIndex; i++) {
    const idx = html.indexOf('</p>', searchIndex);
    if (idx !== -1) {
      searchIndex = idx + 4; // </p> 의 길이 4
      splitIndex = searchIndex;
    } else {
      break;
    }
  }

  if (splitIndex !== -1) {
    return [
      html.substring(0, splitIndex),
      html.substring(splitIndex)
    ];
  }

  return [html, ''];
}

/**
 * HTML 본문 중간에 이미지 배열을 균등하게 강제 주입(Hydration)합니다.
 * 구글봇이 본문 텍스트만 보고 "Wall of Text"로 인식하는 것을 방지하기 위한 용도입니다.
 */
export function injectImagesIntoHtml(html: string, images: {url: string, alt?: string}[]): string {
  if (!html || !images || images.length === 0) return html;
  if (html.includes('max-width:740px') || html.includes('template-wrapper')) return html;

  let resultHtml = html;
  
  // 1순위: <h2> 태그 앞에 삽입
  const h2Matches = Array.from(resultHtml.matchAll(/<h2/g));
  if (h2Matches.length >= images.length) {
    // 이미지를 넣을 <h2> 태그의 인덱스를 균등하게 선택
    const step = Math.floor(h2Matches.length / images.length);
    let injectedCount = 0;
    // 뒤에서부터 치환해야 인덱스가 꼬이지 않음
    for (let i = images.length - 1; i >= 0; i--) {
      const matchIndex = i * step + Math.floor(step / 2);
      if (matchIndex < h2Matches.length) {
        const match = h2Matches[matchIndex];
        const img = images[i];
        const imgTag = `<figure class="my-8 md:my-12 overflow-hidden rounded-xl shadow-lg border border-slate-100"><img src="${img.url}" alt="${img.alt || ''}" class="w-full object-cover" loading="lazy" /></figure>`;
        resultHtml = resultHtml.substring(0, match.index!) + imgTag + resultHtml.substring(match.index!);
        injectedCount++;
      }
    }
    if (injectedCount === images.length) return resultHtml;
  }

  // 2순위: <h2>가 부족하면 </p> 태그 뒤에 균등 삽입
  const pMatches = Array.from(resultHtml.matchAll(/<\/p>/g));
  if (pMatches.length >= images.length) {
    let resultHtmlP = html;
    const step = Math.floor(pMatches.length / images.length);
    for (let i = images.length - 1; i >= 0; i--) {
      // 첫 문단과 마지막 문단은 피하도록 약간 안쪽으로
      const matchIndex = Math.min(Math.max((i * step) + 1, 1), pMatches.length - 2);
      if (matchIndex < pMatches.length && matchIndex >= 0) {
        const match = pMatches[matchIndex];
        const img = images[i];
        const imgTag = `<figure class="my-8 md:my-12 overflow-hidden rounded-xl shadow-lg border border-slate-100"><img src="${img.url}" alt="${img.alt || ''}" class="w-full object-cover" loading="lazy" /></figure>`;
        const insertPos = match.index! + 4; // </p> 뒤
        resultHtmlP = resultHtmlP.substring(0, insertPos) + imgTag + resultHtmlP.substring(insertPos);
      }
    }
    return resultHtmlP;
  }

  // 만약 <p> 조차 부족하면 (거의 불가능) 최상단/최하단에 대충 붙임
  const fallbackHtml = images.map(img => `<figure class="my-8 md:my-12 overflow-hidden rounded-xl shadow-lg border border-slate-100"><img src="${img.url}" alt="${img.alt || ''}" class="w-full object-cover" loading="lazy" /></figure>`).join('');
  return html + fallbackHtml;
}
