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
 * [FIX] 라벨/설명이 한국어로만 고정돼 있어서, en/ja로 설정된 사이트에서도
 * 카테고리만 한글로 튀어나왔다. ko/en/ja 3개 언어를 갖도록 확장.
 *
 * ─── 유지보수 ────────────────────────────────────────────────
 * 이 목록은 maza-studio의 server/lib/categoryTaxonomy.ts와 짝을 이룬다.
 * 저장소가 분리돼 있어 import로 묶지 않았다. 카테고리를 추가할 때는
 * 양쪽을 함께 수정해야 한다.
 */

export type CategoryLang = 'ko' | 'en' | 'ja';

type LabelEntry = Record<CategoryLang, string>;

export const CATEGORY_LABELS: Record<string, LabelEntry> = {
  // 창고 기반 일반 니치
  hardware: { ko: '하드웨어', en: 'Hardware', ja: 'ハードウェア' },
  career_dev: { ko: '커리어', en: 'Career', ja: 'キャリア' },
  ai_tools: { ko: 'AI 도구', en: 'AI Tools', ja: 'AIツール' },
  hobby_leisure: { ko: '취미·레저', en: 'Hobbies & Leisure', ja: '趣味・レジャー' },
  saas_cloud: { ko: 'SaaS·클라우드', en: 'SaaS & Cloud', ja: 'SaaS・クラウド' },
  knowledge_biz: { ko: '지식창업', en: 'Knowledge Business', ja: '知識ビジネス' },
  productivity: { ko: '생산성', en: 'Productivity', ja: '生産性' },
  asset_management: { ko: '자산관리', en: 'Asset Management', ja: '資産管理' },
  home_interior: { ko: '인테리어', en: 'Home & Interior', ja: 'インテリア' },
  lifestyle: { ko: '라이프스타일', en: 'Lifestyle', ja: 'ライフスタイル' },
  // 사이트별 전문 니치
  early_education: { ko: '유아교육', en: 'Early Education', ja: '幼児教育' },
  k12_learning: { ko: '초중등 학습', en: 'K-12 Learning', ja: '小中学生の学習' },
  auto_repair: { ko: '자동차 정비', en: 'Auto Repair', ja: '自動車整備' },
  insurance: { ko: '보험·지원금', en: 'Insurance & Benefits', ja: '保険・給付金' },
  tax_ip: { ko: '세무·지식재산', en: 'Tax & IP', ja: '税務・知的財産' },
  // 레거시
  health: { ko: '건강', en: 'Health', ja: '健康' },
  it: { ko: 'IT', en: 'IT', ja: 'IT' },
  finance: { ko: '금융', en: 'Finance', ja: '金融' },
  auto: { ko: '자동차', en: 'Auto', ja: '自動車' },
  general: { ko: '일반', en: 'General', ja: '一般' },
};

export const CATEGORY_DESCRIPTIONS: Record<string, LabelEntry> = {
  hardware: {
    ko: 'PC 부품과 주변기기를 실사용 기준으로 비교하고, 목적에 맞는 구성을 고르는 방법을 정리합니다.',
    en: 'Real-world comparisons of PC parts and peripherals, and how to pick the right setup for your needs.',
    ja: 'PCパーツと周辺機器を実使用の観点から比較し、目的に合った構成の選び方を紹介します。',
  },
  career_dev: {
    ko: '이직과 커리어 전환에서 실제로 통하는 준비 과정과 판단 기준을 다룹니다.',
    en: 'What actually works when preparing for a job change or career pivot.',
    ja: '転職やキャリアチェンジで実際に通用する準備の進め方と判断基準を扱います。',
  },
  ai_tools: {
    ko: 'AI 도구를 업무에 실제로 붙여 쓰는 방법과, 도구별로 잘 맞는 작업을 정리합니다.',
    en: 'Practical ways to put AI tools to work, and which tool fits which task.',
    ja: 'AIツールを実務に活用する方法と、ツールごとに向いているタスクを整理します。',
  },
  hobby_leisure: {
    ko: '취미를 시작할 때 필요한 장비와 준비 과정을, 처음 하는 사람 기준으로 안내합니다.',
    en: 'Gear and prep advice for starting a new hobby, written for complete beginners.',
    ja: '趣味を始めるときに必要な道具と準備を、初心者向けに案内します。',
  },
  saas_cloud: {
    ko: 'SaaS와 클라우드 서비스를 도입할 때 확인해야 할 조건과 운영상의 고려 사항을 다룹니다.',
    en: 'What to check before adopting SaaS or cloud services, and how to run them well.',
    ja: 'SaaSやクラウドサービスを導入する際に確認すべき条件と運用上の注意点を扱います。',
  },
  knowledge_biz: {
    ko: '지식을 상품으로 만드는 과정 — 기획, 제작, 판매까지의 실무를 단계별로 정리합니다.',
    en: 'Turning knowledge into a product — planning, creating, and selling it, step by step.',
    ja: '知識を商品化する過程 — 企画から制作、販売までの実務を段階別に整理します。',
  },
  productivity: {
    ko: '시간과 집중력을 관리하는 방법을, 오래 유지할 수 있는 형태로 제안합니다.',
    en: 'Sustainable ways to manage your time and focus for the long run.',
    ja: '時間と集中力を管理する方法を、長く続けられる形で提案します。',
  },
  asset_management: {
    ko: '자산을 지키고 늘리는 원칙과, 상황별로 달라지는 판단 기준을 설명합니다.',
    en: 'Principles for protecting and growing assets, with judgment calls that change by situation.',
    ja: '資産を守り増やす原則と、状況によって変わる判断基準を解説します。',
  },
  home_interior: {
    ko: '집을 고치고 꾸미는 실제 과정 — 자재 선택부터 시공 순서까지 다룹니다.',
    en: 'The real process of fixing up and decorating a home — from materials to the order of work.',
    ja: '住まいを修繕・装飾する実際の過程 — 資材選びから施工の順序まで扱います。',
  },
  lifestyle: {
    ko: '일상을 조금 더 편하게 만드는 살림과 생활의 방법을 나눕니다.',
    en: 'Everyday tips and habits that make life a little easier.',
    ja: '日常をもう少し楽にする暮らしの工夫を紹介します。',
  },
  early_education: {
    ko: '영유아 발달 단계에 맞춘 보육 방법과, 현장에서 자주 부딪히는 상황의 대처법을 다룹니다.',
    en: 'Childcare approaches matched to early developmental stages, and how to handle common situations.',
    ja: '乳幼児の発達段階に合わせた保育方法と、よくある状況への対処法を扱います。',
  },
  k12_learning: {
    ko: '초중등 자기주도 학습법과 학부모가 알아두면 좋은 교육 정보를 정리합니다.',
    en: 'Self-directed study methods for K-12 students, and education info worth knowing for parents.',
    ja: '小中学生の自主学習法と、保護者が知っておきたい教育情報を整理します。',
  },
  auto_repair: {
    ko: '자동차 정비와 차량 관리의 실제 — 정비소에서 잘 알려주지 않는 판단 기준까지 다룹니다.',
    en: 'The reality of car maintenance and repair — including judgment calls shops rarely explain.',
    ja: '自動車整備と車両管理の実際 — 整備工場ではあまり教えてくれない判断基準まで扱います。',
  },
  insurance: {
    ko: '보험 보장 내용을 읽는 법과 정부지원금 신청 절차를, 실제 서류 기준으로 안내합니다.',
    en: 'How to read what your insurance actually covers, and how to apply for government benefits.',
    ja: '保険の保障内容の読み方と、公的支援金の申請手続きを実際の書類に沿って案内します。',
  },
  tax_ip: {
    ko: '사업자가 마주치는 세무와 지식재산권 문제를, 신고 절차와 함께 구체적으로 다룹니다.',
    en: 'Tax and IP issues business owners run into, with the filing process explained concretely.',
    ja: '事業者が直面する税務・知的財産権の問題を、申告手続きとともに具体的に扱います。',
  },
  health: {
    ko: '검증된 자료를 바탕으로 건강 관리 정보를 정리합니다.',
    en: 'Health guidance organized from verified sources.',
    ja: '信頼できる資料に基づいた健康管理の情報を整理します。',
  },
  it: {
    ko: '윈도우·네트워크·보안 등 실생활에서 부딪히는 IT 문제의 해결 방법을 다룹니다.',
    en: 'Fixes for everyday IT problems — Windows, networking, security, and more.',
    ja: 'Windows・ネットワーク・セキュリティなど、日常で直面するIT問題の解決法を扱います。',
  },
  finance: {
    ko: '재테크와 경제 흐름을 생활에 적용할 수 있는 형태로 풀어냅니다.',
    en: 'Personal finance and economic trends, explained in a way you can actually use.',
    ja: '資産形成や経済の流れを、生活に取り入れやすい形で解説します。',
  },
  auto: {
    ko: '운전과 차량 관리에서 겪는 흔한 시행착오를 정리합니다.',
    en: 'Common trial and error in driving and car ownership.',
    ja: '運転や車の管理でよくある試行錯誤を整理します。',
  },
  general: {
    ko: '일상에 도움이 되는 정보를 주제에 구애받지 않고 다룹니다.',
    en: 'Useful everyday information, not limited to any single topic.',
    ja: 'テーマにこだわらず、日常に役立つ情報を扱います。',
  },
};

const FALLBACK_DESC: LabelEntry = {
  ko: '와 관련해 직접 확인하고 정리한 내용을 모았습니다.',
  en: 'A collection of practical, hands-on articles about this topic.',
  ja: 'に関する実践的な記事をまとめています。',
};

function normalizeLang(lang?: string | null): CategoryLang {
  return lang === 'en' || lang === 'ja' ? lang : 'ko';
}

/** 슬러그를 표시용 이름으로. 모르는 값은 원문을 다듬어 그대로 보여준다. */
export function getCategoryLabel(raw?: string | string[] | null, lang?: string | null): string {
  if (!raw) return '';
  const first = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw).split(',')[0];
  const key = first.trim().toLowerCase();
  if (!key) return '';
  const entry = CATEGORY_LABELS[key];
  if (entry) return entry[normalizeLang(lang)];
  // 등록되지 않은 값은 최소한 대문자 슬러그로는 보이지 않게 한다.
  // (한글이 섞인 자유 입력 카테고리가 DB에 남아 있다.)
  return first.trim().replace(/_/g, ' ');
}

export function getCategoryDescription(raw?: string | null, lang?: string | null): string {
  const key = String(raw ?? '').trim().toLowerCase();
  const resolvedLang = normalizeLang(lang);
  const entry = CATEGORY_DESCRIPTIONS[key];
  if (entry) return entry[resolvedLang];
  const label = getCategoryLabel(raw, lang);
  if (resolvedLang === 'ko') return `${label || '이 주제'}${FALLBACK_DESC.ko}`;
  if (resolvedLang === 'ja') return `${label || 'このテーマ'}${FALLBACK_DESC.ja}`;
  return `${FALLBACK_DESC.en}${label ? ` (${label})` : ''}`;
}
