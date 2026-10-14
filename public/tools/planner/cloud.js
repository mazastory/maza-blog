/**
 * 플래너 클라우드 저장 (선택 기능, 2026-10-14)
 *
 *  · 꺼진 사이트에서는 이 파일이 로드되지 않는다(PlannerTool.astro 가 `planner_cloud.enabled` 일 때만 넣는다).
 *  · 로컬(LocalStorage)이 항상 원본이다. 서버는 정제된 사본을 맡아 둔다. 서버가 죽어도 플래너는 돈다.
 *  · 로그인은 구글(Supabase Auth)만. 브라우저는 공개용 anon 키로 접속하고, 본인 행만 열리는 규칙(RLS)이 막는다.
 *  · 서버로 보내는 것은 PWPlanner.getStateSnapshot() 이 정제한 상태 JSON 뿐이다. 받은 값도 applyState 가 다시 정제한다.
 *  · 사용자 입력은 textContent 로만 화면에 넣는다(HTML 로 끼우지 않는다).
 *
 * 필요한 전역: window.PW_CLOUD = { url, anonKey, site, privacyUrl, consentVersion }, window.supabase(UMD), window.PWPlanner
 */
(function () {
  'use strict';
  if (window.__pwCloudBound) return;
  window.__pwCloudBound = true;

  var cfg = window.PW_CLOUD;
  if (!cfg || !cfg.url || !cfg.anonKey || !cfg.site) return;

  var PENDING_KEY = 'pw_cloud_pending_consent';
  var client = null;
  var user = null;
  var lastKnownServerAt = null;   // 마지막으로 서버와 맞춘 시각(ISO)
  var uploadTimer = null;
  var syncing = false;
  var els = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, props, children) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function fmt(iso) {
    try { return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  // 비교용: 화면 위치 같은 값은 빼고 내용만
  function core(s) {
    if (!s) return '';
    return JSON.stringify({ t: s.tasks || [], d: s.ddays || [], b: s.timeblocks || {} });
  }
  function counts(s) {
    s = s || {};
    return { tasks: (s.tasks || []).length, ddays: (s.ddays || []).length, days: Object.keys(s.timeblocks || {}).length };
  }

  function setStatus(msg, kind) {
    if (els.status) { els.status.textContent = msg; els.status.setAttribute('data-kind', kind || ''); }
    if (els.btn) els.btn.textContent = user ? (kind === 'error' ? '☁ 저장 실패' : '☁ 저장됨') : '☁ 클라우드에 저장 (선택)';
  }

  function open(id) { var m = $(id); if (m) m.hidden = false; }
  function close(id) { var m = $(id); if (m) m.hidden = true; }

  // ── 구글 로그인 ───────────────────────────────────────────────────────────
  function signIn() {
    var consent = $('pwCloudConsent');
    if (!consent || !consent.checked) {
      var err = $('pwCloudLoginErr'); if (err) { err.textContent = '[필수] 동의에 체크해 주세요.'; err.hidden = false; }
      return;
    }
    var marketing = !!($('pwCloudMarketing') && $('pwCloudMarketing').checked);
    try { localStorage.setItem(PENDING_KEY, JSON.stringify({ marketing: marketing, v: cfg.consentVersion || 'v1', at: Date.now() })); } catch (e) {}
    client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
      .then(function (r) { if (r && r.error) { var err = $('pwCloudLoginErr'); if (err) { err.textContent = '로그인을 시작하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.'; err.hidden = false; } } });
  }

  // 로그인 직후: 동의 기록을 서버에 남긴다(없으면 동의 창을 다시 연다)
  async function ensureProfile() {
    var res = await client.from('planner_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
    if (res.error) return false;
    if (res.data) return true;
    var pending = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (e) {}
    if (!pending || Date.now() - pending.at > 30 * 60 * 1000) return false;     // 동의 없이 로그인된 경우: 동기화하지 않는다
    var ins = await client.from('planner_profiles').insert({ user_id: user.id, marketing_opt_in: !!pending.marketing, consent_version: String(pending.v).slice(0, 40) });
    if (ins.error) return false;
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
    return true;
  }

  // ── 동기화 ────────────────────────────────────────────────────────────────
  async function pull() {
    var r = await client.from('planner_snapshots').select('data, updated_at').eq('user_id', user.id).eq('site', cfg.site).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function push() {
    var snap = window.PWPlanner.getStateSnapshot();
    var now = new Date().toISOString();
    var r = await client.from('planner_snapshots').upsert({ user_id: user.id, site: cfg.site, data: snap, updated_at: now }, { onConflict: 'user_id,site' });
    if (r.error) throw r.error;
    lastKnownServerAt = now;
    return now;
  }

  function askConflict(local, remote) {
    return new Promise(function (resolve) {
      var l = counts(local), c = counts(remote.data);
      $('pwCloudConfLocal').textContent = '일정 ' + l.tasks + '개 · D-Day ' + l.ddays + '개 · 메모한 날 ' + l.days + '일';
      $('pwCloudConfRemote').textContent = '일정 ' + c.tasks + '개 · D-Day ' + c.ddays + '개 · 메모한 날 ' + c.days + '일 · ' + fmt(remote.updated_at) + ' 저장';
      open('pwCloudConflict');
      function done(choice) { close('pwCloudConflict'); $('pwCloudUseLocal').onclick = null; $('pwCloudUseRemote').onclick = null; resolve(choice); }
      $('pwCloudUseLocal').onclick = function () { done('local'); };
      $('pwCloudUseRemote').onclick = function () { done('remote'); };
    });
  }

  async function initialSync() {
    if (syncing) return;
    syncing = true;
    try {
      setStatus('동기화 중…');
      var local = window.PWPlanner.getStateSnapshot();
      var remote = await pull();
      if (!remote) { await push(); setStatus('저장됨 · 방금'); return; }
      lastKnownServerAt = remote.updated_at;
      if (core(local) === core(remote.data)) { setStatus('저장됨 · ' + fmt(remote.updated_at)); return; }
      var choice = await askConflict(local, remote);
      if (choice === 'remote') { window.PWPlanner.applyState(remote.data); setStatus('클라우드 내용을 불러왔습니다'); }
      else { await push(); setStatus('저장됨 · 방금'); }
    } catch (e) {
      setStatus('동기화하지 못했습니다(이 기기에는 저장됨)', 'error');
    } finally { syncing = false; }
  }

  function scheduleUpload() {
    if (!user || syncing) return;
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(async function () {
      try {
        // 다른 기기에서 더 최근에 저장했다면 덮어쓰기 전에 묻는다
        var remote = await pull();
        if (remote && lastKnownServerAt && new Date(remote.updated_at).getTime() > new Date(lastKnownServerAt).getTime()) {
          var choice = await askConflict(window.PWPlanner.getStateSnapshot(), remote);
          if (choice === 'remote') { lastKnownServerAt = remote.updated_at; window.PWPlanner.applyState(remote.data); setStatus('클라우드 내용을 불러왔습니다'); return; }
        }
        await push();
        setStatus('저장됨 · 방금');
      } catch (e) {
        setStatus('저장하지 못했습니다(이 기기에는 저장됨)', 'error');
      }
    }, 3000);
  }

  async function signOut() {
    clearTimeout(uploadTimer);
    await client.auth.signOut();
    user = null; lastKnownServerAt = null;
    close('pwCloudMenu');
    setStatus('이 기기에만 저장 중');
  }

  // 플래너 데이터와 동의 기록만 지운다. 마자 계정(회원)은 그대로 둔다 — 마자 회원 탈퇴는 마자 스튜디오에서 한다.
  async function deleteAccount() {
    if (!window.confirm('클라우드에 저장된 일정과 이 서비스의 동의 기록을 삭제하고 로그아웃합니다. 이 기기에 저장된 내용은 남습니다. (마자 스튜디오 회원 계정은 삭제되지 않습니다.) 계속할까요?')) return;
    var r = await client.rpc('delete_my_planner_data');
    if (r.error) { setStatus('삭제하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.', 'error'); return; }
    clearTimeout(uploadTimer);
    await client.auth.signOut();
    user = null; lastKnownServerAt = null;
    close('pwCloudMenu');
    setStatus('클라우드 일정 데이터를 삭제했습니다');
  }

  // ── 시작 ──────────────────────────────────────────────────────────────────
  function bindUI() {
    var root = document.querySelector('.pw-root');
    if (!root || root.dataset.pwCloudReady === '1') return false;
    els.btn = $('pwCloudBtn'); els.status = $('pwCloudStatus');
    if (!els.btn) return false;
    root.dataset.pwCloudReady = '1';
    els.btn.addEventListener('click', function () { user ? open('pwCloudMenu') : open('pwCloudLogin'); });
    ['pwCloudLoginClose', 'pwCloudMenuClose'].forEach(function (id) {
      var b = $(id); if (b) b.addEventListener('click', function () { close(id === 'pwCloudLoginClose' ? 'pwCloudLogin' : 'pwCloudMenu'); });
    });
    var g = $('pwCloudGoogle'); if (g) g.addEventListener('click', signIn);
    var so = $('pwCloudSignOut'); if (so) so.addEventListener('click', signOut);
    var del = $('pwCloudDelete'); if (del) del.addEventListener('click', deleteAccount);
    var now = $('pwCloudSaveNow'); if (now) now.addEventListener('click', function () { clearTimeout(uploadTimer); push().then(function () { setStatus('저장됨 · 방금'); }).catch(function () { setStatus('저장하지 못했습니다(이 기기에는 저장됨)', 'error'); }); });
    setStatus(user ? '저장됨' : '이 기기에만 저장 중');
    return true;
  }

  async function start() {
    if (!window.supabase || !window.PWPlanner) return;
    if (!client) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
      window.addEventListener('pw:saved', scheduleUpload);
      client.auth.onAuthStateChange(function (ev, session) {
        user = session ? session.user : null;
        if (ev === 'SIGNED_OUT') setStatus('이 기기에만 저장 중');
      });
    }
    bindUI();
    var s = await client.auth.getSession();
    user = s && s.data && s.data.session ? s.data.session.user : null;
    if (user) {
      var ok = await ensureProfile();
      if (ok) { await initialSync(); }
      else {            // 동의 기록이 없는 로그인: 저장하지 않고 안내
        setStatus('동의 후 이용할 수 있습니다');
        await client.auth.signOut(); user = null; open('pwCloudLogin');
      }
    } else { setStatus('이 기기에만 저장 중'); }
  }

  // 페이지를 새로 읽지 않는 이동(ClientRouter)에서도 시작되게 한다
  function boot() {
    // planner.js 가 먼저 시작한 뒤에 붙는다
    var tries = 0;
    (function wait() {
      if (window.PWPlanner && document.getElementById('pwCloudBtn')) { start(); return; }
      if (++tries < 40) setTimeout(wait, 100);
    })();
  }
  document.addEventListener('astro:page-load', function () { var r = document.querySelector('.pw-root'); if (r && r.dataset.pwCloudReady !== '1') boot(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
