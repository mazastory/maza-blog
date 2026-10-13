/**
 * 도구 CSS 를 `.pw-root` 안으로 가둔다 (2026-10-14).
 * 원본(planner-web)의 전역 규칙 — `*`, `:root`, `html`, `body` — 이 사이트 전체를 건드리지 않도록
 * 모든 선택자 앞에 `.pw-root` 를 붙이고, 전역 규칙은 `.pw-root` 자체로 옮긴다. @keyframes·@font-face 는 그대로 둔다.
 *   node scripts/scope-tool-css.mjs <입력.css...> <출력.css>
 */
import postcss from 'postcss';
import fs from 'node:fs';

const ROOT = '.pw-root';
const [out, ...ins] = process.argv.slice(2).reverse();
const inputs = ins.reverse();
if (!out || inputs.length === 0) { console.error('usage: scope-tool-css.mjs in.css... out.css'); process.exit(1); }

function scopeSelector(sel) {
  const s = sel.trim();
  if (s === ':root' || s === 'html' || s === 'body' || s === 'html, body') return ROOT;
  if (/^(html|body)\b/.test(s)) return s.replace(/^(html|body)\b\s*/, ROOT + ' ');
  if (s === '*' || s === '*::before' || s === '*::after') return `${ROOT} ${s}`;
  if (s.startsWith(ROOT)) return s;
  return `${ROOT} ${s}`;
}

let css = '';
for (const f of inputs) css += fs.readFileSync(f, 'utf-8') + '\n';
const root = postcss.parse(css);
root.walkRules((rule) => {
  const p = rule.parent;
  if (p && p.type === 'atrule' && /keyframes$/i.test(p.name)) return;   // 0%, 100%, from, to
  rule.selectors = rule.selectors.map(scopeSelector);
});
fs.writeFileSync(out, root.toString());
console.log(`scoped ${inputs.length} file(s) → ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
