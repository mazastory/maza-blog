/**
 * 셋업팟 엔진 페이지를 블로그 스냅샷으로 가져온다 (2026-10-16)
 *
 *   node scripts/sync-pods.mjs            → scripts/pods.config.json 의 엔진을 모두 가져온다
 *   node scripts/sync-pods.mjs margin     → 한 엔진만
 *   node scripts/sync-pods.mjs --check    → 쓰지 않고, 셋업팟의 지금 내용이 저장된 스냅샷과 같은지만 본다(다르면 종료코드 2)
 *
 * 왜 스냅샷인가(요청 때마다 불러오지 않고):
 *   · 셋업팟이 잠시 멈추거나 바뀌어도 팟 사이트는 그대로다.
 *   · 남의 코드를 광고가 붙는 페이지에 실시간으로 섞지 않는다 — **한 번 검토한 버전만** 나간다.
 *     아래 점검을 통과하지 못하면(모르는 외부 스크립트 · 네트워크 호출 · eval 등) 가져오지 않고 **시끄럽게 멈춘다.**
 *
 * 하는 일:
 *   1. 페이지의 <style> 을 `.pod-root` 안으로 가둔다(`*`·`html`·`body` 규칙은 `.pod-root` 로). @keyframes·@font-face 는 그대로.
 *   2. <body> 의 알맹이만 꺼낸다(스크립트는 뺀다).
 *   3. 인라인 스크립트는 따로 모은다. 외부 스크립트(lucide·접속 기록·무료 가이드)는 **우리 쪽 고정본**으로 바꿔 부른다(PodInline.astro).
 *   4. 결과: src/generated/pods/<engine>.json  { engine, source, sha256, fetchedAt, title, css, html, js }
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postcss from 'postcss';

const ROOT = '.pod-root';
const OUT_DIR = path.resolve('src/generated/pods');
const cfg = JSON.parse(fs.readFileSync(path.resolve('scripts/pods.config.json'), 'utf-8'));
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const only = args.find((a) => !a.startsWith('--'));

/** 외부 스크립트는 이 셋만 안다. 나머지가 나오면 사람이 보기 전에는 가져오지 않는다. */
const ALLOWED_SCRIPT_SRC = [
  /^https:\/\/unpkg\.com\/lucide@latest$/,        // → 블로그 고정본(lucide@0.344.0)으로 바꿔 부른다
  /^\/js\/maza-telemetry\.js$/,                    // → /pods/maza-telemetry.js
  /^\/js\/lead-magnet\.js$/,                       // → 쓰지 않는다. 무료 자료 받기는 사이트의 「무료 자료」 띠가 맡는다
];
/** 인라인 스크립트에 있으면 안 되는 것(네트워크·동적 실행·저장소). 있으면 사람이 먼저 본다. */
const FORBIDDEN_JS = [
  [/\bfetch\s*\(/, 'fetch('], [/XMLHttpRequest/, 'XMLHttpRequest'], [/\beval\s*\(/, 'eval('], [/new\s+Function\s*\(/, 'new Function('],
  [/document\.write/, 'document.write'], [/document\.cookie/, 'document.cookie'], [/\bimport\s*\(/, 'import('], [/sendBeacon/, 'sendBeacon'],
  [/localStorage|sessionStorage|indexedDB/, '브라우저 저장소'], [/window\.open\s*\(/, 'window.open('], [/\blocation\s*(\.href)?\s*=/, 'location 이동'],
];

function scopeSelector(sel) {
  const s = sel.trim();
  if (s === ':root' || s === 'html' || s === 'body' || s === 'html, body') return ROOT;
  if (/^(html|body)\b/.test(s)) return s.replace(/^(html|body)\b\s*/, ROOT + ' ');
  if (s === '*' || s === '*::before' || s === '*::after') return `${ROOT} ${s}`;
  if (s.startsWith(ROOT)) return s;
  return `${ROOT} ${s}`;
}

function scopeCss(css, engine) {
  // 외부 CSS 는 구글 글꼴만 안다. 다른 @import 는 사람이 먼저 본다.
  for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/gi)) {
    if (!/^https:\/\/fonts\.googleapis\.com\//.test(m[1])) throw new Error(`[${engine}] CSS 에 모르는 @import 가 있습니다: ${m[1]} — 가져오지 않습니다`);
  }
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const p = rule.parent;
    if (p && p.type === 'atrule' && /keyframes$/i.test(p.name)) return;
    rule.selectors = rule.selectors.map(scopeSelector);
  });
  // 페이지 전체를 채우던 값은 사이트 안의 한 칸이 되도록 풀어 준다.
  root.append(postcss.parse(`${ROOT}{min-height:0;width:100%;max-width:100%;overflow-x:hidden;}`));
  return root.toString();
}

async function importEngine(e) {
  const res = await fetch(e.source, { redirect: 'follow', headers: { 'User-Agent': 'maza-blog-sync-pods/1.0' } });
  if (!res.ok) throw new Error(`[${e.engine}] ${e.source} → HTTP ${res.status}`);
  const html = await res.text();
  const sha256 = crypto.createHash('sha256').update(html).digest('hex');

  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    if (!ALLOWED_SCRIPT_SRC.some((re) => re.test(m[1]))) throw new Error(`[${e.engine}] 모르는 외부 스크립트: ${m[1]} — 사람이 먼저 봐야 합니다`);
  }
  const bodyM = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyM) throw new Error(`[${e.engine}] <body> 를 찾지 못했습니다`);
  const body = bodyM[1];
  if (/<iframe|<form\b|<object|<embed/i.test(body)) throw new Error(`[${e.engine}] 본문에 iframe·form·object·embed 가 있습니다 — 사람이 먼저 봐야 합니다`);

  const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n');
  for (const [re, label] of FORBIDDEN_JS) if (re.test(inline)) throw new Error(`[${e.engine}] 인라인 스크립트에 ${label} 가 있습니다 — 사람이 먼저 봐야 합니다`);

  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || e.engine).replace(/\s*\|\s*SETUPOD\s*$/i, '').trim();
  const bodyHtml = body.replace(/<script\b[\s\S]*?<\/script>/gi, '').trim();

  return { engine: e.engine, aliases: e.aliases || [], source: e.source, sha256, fetchedAt: new Date().toISOString(), title, css: scopeCss(styles, e.engine), html: bodyHtml, js: inline.trim() };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let changed = 0, failed = 0;
for (const e of cfg.engines) {
  if (only && e.engine !== only) continue;
  try {
    const snap = await importEngine(e);
    const file = path.join(OUT_DIR, `${e.engine}.json`);
    const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
    const same = prev && prev.sha256 === snap.sha256;
    if (!same) changed++;
    console.log(`${same ? '=' : '≠'} ${e.engine.padEnd(12)} ${(snap.html.length / 1024).toFixed(1)}KB html · ${(snap.css.length / 1024).toFixed(1)}KB css · ${(snap.js.length / 1024).toFixed(1)}KB js  ${same ? '(변화 없음)' : prev ? '(셋업팟 쪽이 바뀌었습니다)' : '(새로 가져옴)'}`);
    if (!checkOnly && !same) fs.writeFileSync(file, JSON.stringify(snap, null, 2) + '\n');
  } catch (err) { failed++; console.error(`✗ ${e.engine}: ${err.message}`); }
}
if (failed) process.exit(1);
if (checkOnly && changed) process.exit(2);
