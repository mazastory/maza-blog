import type { Post } from './api';

interface KeywordLink {
  keyword: string;
  url: string;
}

/**
 * 포스트 목록을 받아서 자동 내부 링크 생성을 위한 키워드 맵을 만듭니다.
 * 자기 자신(currentSlug)은 제외하며, 키워드 길이가 긴 순서대로 정렬합니다.
 */
export function buildKeywordMap(posts: Post[], currentSlug: string): KeywordLink[] {
  const map: Map<string, string> = new Map();

  posts.forEach(post => {
    if (post.slug === currentSlug) return;

    // 제목에서 불용어 및 특수문자를 제거하여 메인 키워드 추출 시도
    // 아주 간단한 형태: 제목 전체를 키워드로 쓰기엔 너무 기니까, 해시태그를 적극 활용합니다.
    const url = `/${post.slug}`;
    
    // 1. 해시태그 기반 키워드 (가장 정확도가 높음)
    if (post.metadata?.hashtags && Array.isArray(post.metadata.hashtags)) {
      post.metadata.hashtags.forEach((tag: string) => {
        const cleanTag = tag.replace(/^#/, '').trim();
        if (cleanTag.length > 1) {
          map.set(cleanTag.toLowerCase(), url);
        }
      });
    }

    // 2. 카테고리 기반 키워드 (해당 주제를 언급할 때 링크)
    if (post.category && post.category.length > 1) {
      map.set(post.category.toLowerCase().trim(), url);
    }

    // 3. 시리즈명(Blueprint Title) 기반 키워드 (시리즈물 연결)
    if (post.metadata?.blueprint_title && post.metadata.blueprint_title.length > 3) {
      // "아이폰 15 프로 리뷰" 같은 제목을 통째로 매칭
      map.set(post.metadata.blueprint_title.toLowerCase().trim(), url);
    }
  });

  // 키워드가 긴 것부터 치환해야 "아이폰15 프로"가 "아이폰"보다 먼저 치환됨
  const result = Array.from(map.entries()).map(([keyword, url]) => ({ keyword, url }));
  result.sort((a, b) => b.keyword.length - a.keyword.length);
  
  return result;
}

/**
 * HTML 본문에 내부 링크를 주입합니다.
 * <a> 태그나 <h1~6> 태그 내부의 텍스트는 건드리지 않습니다.
 * 너무 많은 링크가 걸리지 않도록, 한 포스트당 동일한 키워드는 한 번만 링크를 겁니다.
 */
export function injectInternalLinks(html: string, keywordMap: KeywordLink[]): string {
  if (!html) return html || '';
  if (!keywordMap || keywordMap.length === 0) return html;

  let inAnchor = false;
  let inHeading = false;
  
  // 이미 사용된 링크 URL을 추적 (포스트당 최대 3개의 내부 링크만 주입, 동일 링크 중복 방지)
  const usedUrls = new Set<string>();
  let injectedCount = 0;
  const MAX_LINKS = 3;

  const regex = /(<a[^>]*>)|(<\/a>)|(<h[1-6][^>]*>)|(<\/h[1-6]>)|(<[^>]*>)|([^<]+)/gi;

  return html.replace(regex, (_match, aOpen, aClose, hOpen, hClose, otherTag, text) => {
    if (aOpen) { inAnchor = true; return aOpen; }
    if (aClose) { inAnchor = false; return aClose; }
    if (hOpen) { inHeading = true; return hOpen; }
    if (hClose) { inHeading = false; return hClose; }
    if (otherTag) { return otherTag; }
    
    if (inAnchor || inHeading || !text.trim() || injectedCount >= MAX_LINKS) {
      return text;
    }

    let newText = text;
    for (const { keyword, url } of keywordMap) {
      if (injectedCount >= MAX_LINKS) break;
      if (usedUrls.has(url)) continue; // 이미 걸린 링크는 다시 안 검

      // 대소문자 무시, 단어 경계(word boundary) 처리는 한글 특성상 띄어쓰기나 조사가 붙을 수 있으므로 생략.
      // 대신 indexOf로 찾음. (아주 긴 텍스트의 경우 성능 우려가 있지만, 일반 블로그 글 수준에선 충분함)
      const keywordIdx = newText.toLowerCase().indexOf(keyword);
      if (keywordIdx !== -1) {
        // 정확히 치환하기 위해 원본 문자열의 해당 부분을 잘라서 사용
        const originalKeyword = newText.substring(keywordIdx, keywordIdx + keyword.length);
        const linkHtml = `<a href="${url}" class="internal-link text-indigo-600 underline underline-offset-4 decoration-indigo-200 hover:text-indigo-700 font-semibold" title="${keyword} 관련 글 보기">${originalKeyword}</a>`;
        
        newText = newText.substring(0, keywordIdx) + linkHtml + newText.substring(keywordIdx + keyword.length);
        usedUrls.add(url);
        injectedCount++;
      }
    }

    return newText;
  });
}
