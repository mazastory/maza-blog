/**
 * 카테고리 표시 이름 / 설명
 *
 * ─── 왜 필요한가 ──────────────────────────────────────────────
 * 블로그가 내부 슬러그를 그대로 독자에게 노출하고 있었다.
 *
 *   PostCard.astro   catStr.trim().toUpperCase()  →  "CAREER_DEV"
 *   Header.astro     class="... uppercase"        →  "KNOWLEDGE_BIZ"
 *   category/[slug]  {slug} 그대로                →  "ASSET_MANAGEMENT"
 *
 * 애드센스 심사자가 첫 화면에서 보는 것이라, 사이트가 미완성으로 보이는
 * 가장 큰 요인이었다. 라이브 감사(wiseoriginlab.com)에서 확인.
 *
 * 또 카테고리 설명 맵이 it/health/finance/travel/life 5종만 갖고 있어서
 * 현재 운영 중인 카테고리는 단 하나도 대응되지 않았고, 전부
 * "'knowledge_biz'와 관련된 깊이 있고 실용적인 정보" 같은 기계 문구로 나갔다.
 *
 * ─── 유지보수 ────────────────────────────────────────────────
 * 이 목록은 maza-studio의 server/lib/categoryTaxonomy.ts와 짝을 이룬다.
 * 저장소가 분리돼 있어 import로 묶지 않았다. 카테고리를 추가할 때는
 * 양쪽을 함께 수정해야 한다.
 */

export const CATEGORY_LABELS: Record<string, string> = {
  // 창고 기반 일반 니치
  hardware: '하드웨어',
  career_dev: '커리어',
  ai_tools: 'AI 도구',
  hobby_leisure: '취미·레저',
  saas_cloud: 'SaaS·클라우드',
  knowledge_biz: '지식창업',
  productivity: '생산성',
  asset_management: '자산관리',
  home_interior: '인테리어',
  lifestyle: '라이프스타일',
  // 사이트별 전문 니치
  early_education: '유아교육',
  k12_learning: '초중등 학습',
  auto_repair: '자동차 정비',
  insurance: '보험·지원금',
  tax_ip: '세무·지식재산',
  // 레거시
  health: '건강',
  it: 'IT',
  finance: '금융',
  auto: '자동차',
  general: '일반',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  hardware: 'PC 부품과 주변기기를 실사용 기준으로 비교하고, 목적에 맞는 구성을 고르는 방법을 정리합니다.',
  career_dev: '이직과 커리어 전환에서 실제로 통하는 준비 과정과 판단 기준을 다룹니다.',
  ai_tools: 'AI 도구를 업무에 실제로 붙여 쓰는 방법과, 도구별로 잘 맞는 작업을 정리합니다.',
  hobby_leisure: '취미를 시작할 때 필요한 장비와 준비 과정을, 처음 하는 사람 기준으로 안내합니다.',
  saas_cloud: 'SaaS와 클라우드 서비스를 도입할 때 확인해야 할 조건과 운영상의 고려 사항을 다룹니다.',
  knowledge_biz: '지식을 상품으로 만드는 과정 — 기획, 제작, 판매까지의 실무를 단계별로 정리합니다.',
  productivity: '시간과 집중력을 관리하는 방법을, 오래 유지할 수 있는 형태로 제안합니다.',
  asset_management: '자산을 지키고 늘리는 원칙과, 상황별로 달라지는 판단 기준을 설명합니다.',
  home_interior: '집을 고치고 꾸미는 실제 과정 — 자재 선택부터 시공 순서까지 다룹니다.',
  lifestyle: '일상을 조금 더 편하게 만드는 살림과 생활의 방법을 나눕니다.',
  early_education: '영유아 발달 단계에 맞춘 보육 방법과, 현장에서 자주 부딪히는 상황의 대처법을 다룹니다.',
  k12_learning: '초중등 자기주도 학습법과 학부모가 알아두면 좋은 교육 정보를 정리합니다.',
  auto_repair: '자동차 정비와 차량 관리의 실제 — 정비소에서 잘 알려주지 않는 판단 기준까지 다룹니다.',
  insurance: '보험 보장 내용을 읽는 법과 정부지원금 신청 절차를, 실제 서류 기준으로 안내합니다.',
  tax_ip: '사업자가 마주치는 세무와 지식재산권 문제를, 신고 절차와 함께 구체적으로 다룹니다.',
  health: '검증된 자료를 바탕으로 건강 관리 정보를 정리합니다.',
  it: '윈도우·네트워크·보안 등 실생활에서 부딪히는 IT 문제의 해결 방법을 다룹니다.',
  finance: '재테크와 경제 흐름을 생활에 적용할 수 있는 형태로 풀어냅니다.',
  auto: '운전과 차량 관리에서 겪는 흔한 시행착오를 정리합니다.',
  general: '일상에 도움이 되는 정보를 주제에 구애받지 않고 다룹니다.',
};

/** 슬러그를 표시용 한글 이름으로. 모르는 값은 원문을 다듬어 그대로 보여준다. */
export function getCategoryLabel(raw?: string | string[] | null): string {
  if (!raw) return '';
  const first = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw).split(',')[0];
  const key = first.trim().toLowerCase();
  if (!key) return '';
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  // 등록되지 않은 값은 최소한 대문자 슬러그로는 보이지 않게 한다.
  // (한글이 섞인 자유 입력 카테고리가 DB에 남아 있다.)
  return first.trim().replace(/_/g, ' ');
}

export function getCategoryDescription(raw?: string | null): string {
  const key = String(raw ?? '').trim().toLowerCase();
  return (
    CATEGORY_DESCRIPTIONS[key] ||
    `${getCategoryLabel(raw) || '이 주제'}와 관련해 직접 확인하고 정리한 내용을 모았습니다.`
  );
}
