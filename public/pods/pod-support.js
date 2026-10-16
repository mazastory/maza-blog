/* 가져온 셋업팟 엔진이 부르던 「무료 가이드」 창(LeadMagnet)을 이 사이트의 「무료 자료」 띠로 이어 주는 얇은 연결부 (2026-10-16)
 *
 * 셋업팟 원본의 LeadMagnet 은 이메일을 셋업팟 서버(setupod.com/api/leads)로 직접 보낸다. 팟 사이트는 다른 도메인이라 그 요청이 막히고,
 * 동의·고지 문구도 이 사이트의 「무료 자료」 띠(수집자 투머스 · 마자 제공은 선택 동의)가 이미 맡고 있다.
 * 그래서 도구 안의 「무료 가이드」 버튼은 같은 페이지의 그 띠로 데려간다 — 이메일을 받는 길은 한 곳이다. 띠가 없는 사이트에서는 아무 일도 하지 않는다. */
(function () {
  window.LeadMagnet = {
    open: function () {
      var el = document.getElementById('free-pack');
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
})();
