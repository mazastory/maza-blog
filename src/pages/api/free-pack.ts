/**
 * 무료 자료 신청 창구 (2026-10-14, sharpinsighthub.com).
 *
 * 방문자 브라우저 → 이 주소 → 셋업팟 `/api/leads`(투머스 DB `partner_leads`). 서버끼리만 부른다 — 브라우저가
 * 셋업팟을 직접 부르지 않는다(CORS·열쇠 불필요). 저장·보유(2년 뒤 자동 삭제)·읽기 잠금은 셋업팟 쪽 규칙을 그대로 쓴다.
 *
 * 규칙: 필수 동의(consent===true) + 이메일 형식 · 저장이 안 되면 성공이라고 답하지 않는다 · 같은 IP 10분에 5건.
 * 다운로드 주소는 **저장이 확인된 뒤에만** 돌려준다(신청 없이 화면만으로는 열리지 않는다 — 단, 파일 주소 자체는 공개 정적 파일이다).
 */
import type { APIRoute } from 'astro';
import { getSiteConfig } from '../../lib/api';
export const prerender = false;

// 운영 주체별 저장소: sharpinsighthub = 투머스(셋업팟 DB) · mazapost = 캔두코리아(마자 DB). 서로 섞지 않는다.
const SETUPOD_LEADS = 'https://www.setupod.com/api/leads';
const MAZA_LEADS = 'https://mazastudio.kr/api/telemetry/lead';
const destFor = (domain: string) => (domain === 'mazapost.com' ? 'maza' : 'setupod');
const EMAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,}$/;
// 무료 자료 띠를 쓰는 사이트(같은 앱·같은 PDF). 늘릴 때는 그 사이트의 개인정보 방침도 같이 고친다.
const ALLOWED_HOSTS = new Set(['sharpinsighthub.com', 'www.sharpinsighthub.com', 'mazapost.com', 'www.mazapost.com']);
/**
 * 마자 장학 팟 사이트(`metadata.site_kind === 'pod'` 이고 `affiliate_home.free_pack` 이 있는 줄)도 허용한다 — 수집자는 투머스(셋업팟) 하나다.
 * 도메인 이름으로 허용하지 않고 **그 호스트의 sites 줄**이 말하게 한다: 줄이 없거나 팟이 아니면 404 다.
 */
async function isPodHost(host: string): Promise<boolean> {
  if (!/^[a-z0-9.-]{3,253}$/.test(host)) return false;
  try {
    const cfg: any = await getSiteConfig(host.replace(/^www\./, ''));
    const m = cfg?.metadata;
    return m?.site_kind === 'pod' && Array.isArray(m?.affiliate_home?.free_pack?.items) && m.affiliate_home.free_pack.items.length > 0;
  } catch { return false; }
}
const CONSENT_DATE = '2026-10-14';

const hits = new Map<string, number[]>();
function tooMany(ip: string, now = Date.now(), limit = 5, windowMs = 10 * 60 * 1000) {
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > limit;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  try {
    const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
    const staticHost = ALLOWED_HOSTS.has(host);
    if (!staticHost && !(await isPodHost(host))) return json({ success: false, error: 'Not available on this site' }, 404);
    const origin = request.headers.get('origin');
    if (origin) {
      const o = origin.replace(/^https?:\/\//, '').toLowerCase();
      if (staticHost ? !ALLOWED_HOSTS.has(o) : o !== host) return json({ success: false, error: 'Bad origin' }, 403);
    }

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (tooMany(ip)) return json({ success: false, error: 'Too many requests' }, 429);

    let b: any;
    try { b = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }
    const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!email) return json({ success: false, error: 'Email is required' }, 400);
    if (email.length > 254 || !EMAIL_RE.test(email)) return json({ success: false, error: 'Invalid email' }, 400);
    if (b.consent !== true) return json({ success: false, error: 'Consent is required' }, 400);

    const domain = host.replace(/^www\./, '');
    const dest = destFor(domain);
    const common = {
      email,
      consent: true,
      consent_version: `${domain}-free-pack-${CONSENT_DATE}`,
      marketing_opt_in: b.marketing_opt_in === true,
      domain,
      pod_id: 'free_pack',
      gift_name: '2026 플래너 PDF 3종',
      source: `${domain.replace(/\./g, '_')}_free_pack`,
    };
    // 마자 쪽은 운영자가 곧 마자라서 「마자 제공」 동의는 필수 동의에 포함된다(방침에 적음).
    const payload = dest === 'maza' ? { ...common, provide_to_maza: true } : { ...common, lead_type: 'free_pdf' };
    const res = await fetch(dest === 'maza' ? MAZA_LEADS : SETUPOD_LEADS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[free-pack] leads upstream status', dest, res.status);
      return json({ success: false, error: 'Could not save the request' }, res.status === 429 ? 429 : 503);
    }
    const out: any = await res.json().catch(() => ({}));
    // 셋업팟은 saved:true, 마자는 lead_id 로 저장을 알린다
    if (!(out?.saved === true || (dest === 'maza' && out?.success === true && out?.lead_id))) return json({ success: false, error: 'Could not save the request' }, 503);
    return json({ success: true });
  } catch (e: any) {
    console.error('[free-pack] fatal', e?.message);
    return json({ success: false, error: 'Server processing error' }, 500);
  }
};
