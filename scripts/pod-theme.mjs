/**
 * 가져온 셋업팟 엔진의 색을 「바꿔 낄 수 있는 변수」로 바꾼다 (2026-10-16)
 *
 * 왜: iframe 은 늘 어두운 고정 상자다. 스냅샷은 사이트의 밝기·브랜드 색에 맞출 수 있다 — 이것이 iframe 보다 좋아지는 가장 눈에 띄는 점이다.
 *
 * 원칙: **아무 설정이 없으면 원본과 똑같이 보인다.** 모든 색은 `var(--이름, 원래색)` 로 바뀌므로 변수가 없으면 원래 색이 나온다.
 *   · 무채색(회색·검정·흰색·그 반투명)은 `--pn-…` 변수. 밝은 테마에서는 명도를 뒤집은 값으로 바꾼다(계산해서 `light` 로 함께 저장).
 *   · 엔진의 대표색(설정 `accent`)은 `--pod-accent` / `--pod-accent-rgb`. 사이트가 브랜드 색을 줄 수 있다.
 *   · 상태 색(초록·노랑·빨강 등 그 밖의 채도 있는 색)은 의미가 있어 건드리지 않는다.
 *   · 채도 있는 배경 위의 글자색(버튼 등)은 그대로 둔다 — 뒤집으면 안 보인다.
 */

const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const RGB = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
export const COLOR_RE = new RegExp(`${HEX.source}|${RGB.source}`, 'g');

export function parseColor(str) {
  const s = String(str).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  return null;
}

export function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function fromHsl(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/** 무채색인가(회색 계열). 채도가 낮거나 채널 차이가 작으면 무채색으로 본다. */
export function isNeutral(c) {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 30 || toHsl(c).s < 0.2;
}

/** 밝은 테마에서 쓸 대응 색. 불투명은 명도를 뒤집고, 반투명은 짙은 남색 바탕 위의 얇은 막으로 바꾼다. */
export function lightCounterpart(c) {
  const { h, s, l } = toHsl(c);
  if (c.a >= 0.999) return fromHsl(h || 215, Math.min(s, 0.3) * 0.7, Math.min(0.97, Math.max(0.05, 1 - l)));
  const a = l >= 0.6 ? c.a : c.a * 0.35;       // 흰 막 → 같은 세기의 짙은 막 / 검은 막 → 더 옅게
  return `rgba(15,23,42,${+a.toFixed(3)})`;
}

const nameOf = (c) => `--pn-${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}${c.a < 0.999 ? '-' + String(+c.a.toFixed(3)).replace('.', '') : ''}`;

/**
 * 한 문자열 안의 색을 바꾼다. `ctx.vars`(이름→{orig,light})에 변수를 모은다.
 * `skipNeutral` 이면 무채색은 건드리지 않는다(채도 있는 배경 위의 글자색 등).
 */
export function tokenizeColors(text, ctx, { skipNeutral = false } = {}) {
  return text.replace(COLOR_RE, (lit) => {
    const c = parseColor(lit);
    if (!c) return lit;
    const acc = ctx.accent;
    if (acc && !isNeutral(c)) {
      if (acc.hex.includes(lit.toLowerCase())) return `var(--pod-accent, ${lit})`;
      if (/^rgba?/i.test(lit) && `${c.r},${c.g},${c.b}` === acc.rgb) return `rgba(var(--pod-accent-rgb, ${acc.rgb}), ${c.a})`;
    }
    if (isNeutral(c) && !skipNeutral && c.a > 0) {
      const name = nameOf(c);
      if (!ctx.vars.has(name)) ctx.vars.set(name, { orig: lit, light: lightCounterpart(c) });
      return `var(${name}, ${lit})`;
    }
    return lit;
  });
}

/** 규칙 하나: 채도 있는 배경이 있으면 `color` 선언은 무채색을 바꾸지 않는다. */
export function tokenizeRule(rule, ctx) {
  const hasColoredBg = rule.nodes?.some((d) => d.type === 'decl' && /^background/i.test(d.prop) && (d.value.match(COLOR_RE) || []).some((l) => { const c = parseColor(l); return c && !isNeutral(c) && c.a > 0.5; }));
  rule.walkDecls((d) => {
    if (/^(src|font-family|content|animation|transition)$/i.test(d.prop)) return;
    const skip = hasColoredBg && /^(color|fill|stroke)$/i.test(d.prop);
    d.value = tokenizeColors(d.value, ctx, { skipNeutral: skip });
  });
}

/** 밝은 테마 변수 블록(문자열). */
export function lightBlock(vars, root) {
  const body = [...vars.entries()].map(([n, v]) => `${n}:${v.light};`).join('');
  return `${root}[data-theme="light"]{${body}}`;
}
