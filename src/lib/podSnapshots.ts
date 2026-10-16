/**
 * 가져온 셋업팟 엔진 스냅샷 찾기 (2026-10-16 · 만드는 곳: scripts/sync-pods.mjs)
 * 사이트 설정의 `tool.snapshot` 에 엔진 이름(margin) 또는 팟 번호(calculator)를 적으면 같은 스냅샷을 찾는다.
 */
export interface PodSnapshot {
  engine: string; aliases: string[]; source: string; sha256: string; fetchedAt: string;
  title: string; css: string; html: string; js: string;
}

const all = Object.values(
  import.meta.glob('../generated/pods/*.json', { eager: true, import: 'default' }) as Record<string, PodSnapshot>,
);

export function findPodSnapshot(id: unknown): PodSnapshot | null {
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(id)) return null;
  return all.find((s) => s.engine === id) ?? all.find((s) => s.aliases?.includes(id)) ?? null;
}
