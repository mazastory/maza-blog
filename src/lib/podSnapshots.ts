/**
 * 가져온 셋업팟 엔진 스냅샷 찾기 (2026-10-16 · 만드는 곳: scripts/sync-pods.mjs)
 * 사이트 설정의 `tool.snapshot` 에 엔진 이름(margin) 또는 팟 번호(calculator)를 적으면 같은 스냅샷을 찾는다.
 */
export interface PodSnapshot {
  engine: string; aliases: string[]; source: string; sha256: string; fetchedAt: string;
  title: string; css: string; html: string; js: string;
  /** 엔진이 같이 부르던 보조 스크립트의 고정본 경로(/pods/vendor/…) */
  scripts?: string[];
  /** 밝은 테마에서 바꿔 끼울 색 변수(--pn-…) */
  light?: Record<string, string>;
  /** 사이트가 갈아 끼울 수 있는 문구 자리의 원래 글자(title·desc·badge) */
  slots?: Record<string, string>;
}

/** 사이트가 도구의 겉모습을 바꾸는 값. 모두 선택이다 — 없으면 원본 그대로. */
export interface PodSkin {
  /** 'dark'(기본·원본 그대로) | 'light' | 'auto'(사이트가 어두우면 어둡게) */
  theme?: 'dark' | 'light' | 'auto';
  /** 대표색 #rrggbb — 엔진의 대표색을 이 색으로 */
  accent?: string;
  title?: string; desc?: string; badge?: string;
  /** 입력칸 기본값 { 입력칸 id: 값 } */
  defaults?: Record<string, string | number>;
}

const all = Object.values(
  import.meta.glob('../generated/pods/*.json', { eager: true, import: 'default' }) as Record<string, PodSnapshot>,
);

export function findPodSnapshot(id: unknown): PodSnapshot | null {
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(id)) return null;
  return all.find((s) => s.engine === id) ?? all.find((s) => s.aliases?.includes(id)) ?? null;
}
