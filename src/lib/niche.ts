/**
 * 표시용 분야명과 한국어 조사 — 고정 페이지가 DB 값을 문장에 꽂기 전에 거친다.
 *
 * [왜]
 *   2026-09-22, 애드센스가 autosite.kr 과 mazastory.com 을 "가치가 별로 없는
 *   콘텐츠"로 떨어뜨렸다. 실물을 열어보니 구글 검토자가 제일 먼저 보는 세 페이지
 *   (소개·문의·개인정보)의 문장이 깨져 있었다. `sites.niche` 를 "분야명"으로 보고
 *   문장에 그대로 꽂는데, DB 에 들어 있는 값은 분야명이 아니라 설명문이었다.
 *
 *     autosite.kr    "자동차 정비, 차량 관리 노하우 및 중고차 팁 (항공기 정비 출신)"
 *       → "…가이드은 자동차 정비, … (항공기 정비 출신) 분야에 특화된"
 *          글쓴이 정보가 분야 이름 자리에 들어가고, 조사도 틀렸다.
 *     mazastory.com  248자짜리 문단 하나
 *       → "…focusing on [248자]. We aim to … interested in [248자]." 두 번 반복,
 *          문의 페이지는 "related to [248자]?" 가 됐다.
 *
 *   13곳 중 8곳의 niche 가 이런 형태였다. 값을 고치지 않고 표시할 때 줄이는 이유는
 *   niche 가 글 생성 프롬프트(`siteNiche`)에도 쓰여서, 값을 줄이면 생성 쪽 맥락이
 *   같이 얇아지기 때문이다. 원본은 두고 보여줄 때만 줄인다.
 */

/** 표시용 분야명. 괄호 속 화자 정보를 떼고, 구분자 앞을 취하고, 길면 쉼표 단위로 줄인다. */
export function displayNiche(raw: string | null | undefined, lang: string = 'ko'): string {
  if (!raw) return '';
  let s = String(raw).trim();

  // 1) 괄호 속 글쓴이 정보 — "(항공기 정비 출신)", "(보험설계사)", "(IT 기업가)".
  //    단, "지식재산권(IP)" 같은 짧은 약어 괄호는 정당한 표기라 남긴다.
  //    (첫 판에서 이걸 같이 지워 "지식재산권 , 창업 절세" 가 나왔다.)
  s = s.replace(/\s*[（(]([^）)]*)[）)]/g, (m, inner) => {
    const t = String(inner).trim();
    const isShortAbbr = t.length <= 5 && /^[A-Za-z0-9./&-]+$/.test(t);
    return isShortAbbr ? `(${t})` : ' ';
  });

  // 2) 대시·콜론 뒤는 상술이다. 앞부분만 쓴다.
  s = s.split(/\s[—–]\s|\s-\s|:\s/)[0];

  s = s.replace(/\s+/g, ' ').replace(/[,·]\s*$/, '').trim();

  // 3) 그래도 길면 나열 단위로 줄인다. 상한 안에서 최대한 채운다.
  const limit = lang === 'ko' || lang === 'ja' ? 45 : 80;
  if (s.length > limit) {
    // 'and' 와 '및' 은 "for solopreneurs and solo founders", "가이드 및 실전 정보"
    // 처럼 한 덩어리를 묶는 말이라 자르는 경계로 쓰지 않는다. 쉼표만 경계로 본다.
    const parts = s.split(/,\s*/);
    let out = '';
    for (const p of parts) {
      const next = out ? `${out}, ${p}` : p;
      if (next.length > limit) break;
      out = next;
    }
    s = out || parts[0].slice(0, limit).trim();
  }
  return s.trim();
}

/**
 * 받침에 맞는 한국어 조사. **한글로 끝날 때만** 답한다.
 *
 * 영문·숫자로 끝나는 이름의 조사는 글자가 아니라 읽는 소리가 정한다.
 * "Rumipost" 는 "루미포스트"라 '는' 이고, "Vora Post" 도 '는' 이다. 글자만 보면
 * t 로 끝나니 받침이 있는 것처럼 보인다 — 첫 판이 여기서 "Rumipost은" 을 냈다.
 * 소리는 규칙으로 못 재므로 재지 않는다. 못 재면 `null` 을 돌려주고,
 * 문장은 `subject()` 가 조사 없는 형태로 피해 간다.
 */
export function josa(
  word: string,
  pair: '은는' | '이가' | '을를' | '와과' | '로으로'
): string | null {
  const [withBatchim, withoutBatchim] =
    pair === '은는' ? ['은', '는'] :
    pair === '이가' ? ['이', '가'] :
    pair === '을를' ? ['을', '를'] :
    pair === '와과' ? ['과', '와'] : ['으로', '로'];

  const ch = (word || '').trim().replace(/[)\]」』"'.]+$/, '').slice(-1);
  if (!ch) return null;

  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null; // 한글이 아니면 재지 않는다

  const jong = (code - 0xac00) % 28;
  if (jong === 0) return withoutBatchim;
  if (pair === '로으로' && jong === 8) return withoutBatchim; // ㄹ 받침은 '로'
  return withBatchim;
}

/**
 * 문장의 주어 자리. `${name}은` 처럼 조사를 박아 쓰던 자리를 대신한다.
 * 조사를 정할 수 있으면 붙이고, 못 정하면 쉼표로 받는다.
 *   "오토사이트…가이드는 …"   (한글로 끝남)
 *   "Rumipost, …"            (조사를 못 정함)
 */
export function subject(name: string, pair: '은는' | '이가' = '은는'): string {
  const j = josa(name, pair);
  return j ? `${name}${j}` : `${name},`;
}
