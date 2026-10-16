/* 셋업팟 접속 기록 SDK — 고정본(2026-10-16). 원본: https://www.setupod.com/js/maza-telemetry.js
 * sha256: 1071ace8677d28802b5d2c4f3bdd362f18199dbaae36f5237f2efb64ce76c7e7
 * 팟 사이트에서 가져온 도구가 접속·체류·조작 횟수만 마자 서버(mazastudio.kr/api/telemetry/event)로 보낸다. 개인정보는 보내지 않는다. */
/**
 * SETUPOD ↔ MAZA Studio Telemetry SDK (v1.0)
 * 셋업팟 저관여 인터랙티브 웹 자산의 실시간 트래픽 및 체류시간을 마자 백엔드로 비동기 전송
 */
(function(window) {
  'use strict';

  var DEFAULT_MAZA_ENDPOINT = 'https://mazastudio.kr/api/telemetry/event';

  var MazaTelemetry = {
    domain: null,
    podId: null,
    assetType: 'pod',
    endpoint: DEFAULT_MAZA_ENDPOINT,
    dwellMilestonePassed: false,
    interactThrottleTimer: null,
    dwellTimer: null,
    initialized: false,

    /**
     * SDK 초기화 및 기본 뷰 트래킹 시작
     */
    init: function(options) {
      if (this.initialized) return;
      options = options || {};

      // URL 파라미터 또는 전달받은 옵션에서 추출
      var params = new URLSearchParams(window.location.search);
      this.domain = options.domain || params.get('domain') || window.location.hostname;
      this.podId = options.podId || params.get('podId') || params.get('pod_id') || 'unknown';
      this.assetType = options.assetType || 'pod';
      this.endpoint = options.endpoint || DEFAULT_MAZA_ENDPOINT;

      this.initialized = true;

      // 1. 최초 뷰(view) 이벤트 전송
      this.send('view', {
        referrer: document.referrer || '',
        screen_width: window.innerWidth,
        user_agent_category: window.innerWidth < 768 ? 'mobile' : 'desktop'
      });

      // 2. 30초 고체류(dwell_time) 타이머 가동 (자산 가치 증명용)
      var self = this;
      this.dwellTimer = setTimeout(function() {
        self.dwellMilestonePassed = true;
        self.send('dwell_time', {
          dwell_seconds: 30,
          milestone: '30s_engagement'
        });
      }, 30000);

      // 3. 사용자 인터랙션(interact) 리스너 (10초 스로틀)
      this.bindInteractionListeners();
    },

    /**
     * 사용자 조작 감지 리스너
     */
    bindInteractionListeners: function() {
      var self = this;
      var onUserAction = function() {
        if (self.interactThrottleTimer) return;
        self.interactThrottleTimer = setTimeout(function() {
          self.interactThrottleTimer = null;
        }, 10000); // 10초에 최대 1회 조작 핑

        self.send('interact', {
          action: 'user_interaction',
          timestamp: Date.now()
        });
      };

      window.addEventListener('click', onUserAction, { passive: true });
      window.addEventListener('keydown', onUserAction, { passive: true });
      window.addEventListener('touchstart', onUserAction, { passive: true });
    },

    /**
     * 마자 백엔드로 이벤트 전송 (sendBeacon 우선, 실패 시 fetch keepalive)
     */
    send: function(eventType, metadata) {
      if (!this.domain) return;

      var payload = {
        domain: this.domain,
        asset_type: this.assetType,
        pod_id: this.podId,
        event_type: eventType,
        metadata: metadata || {}
      };

      var jsonStr = JSON.stringify(payload);

      // sendBeacon 시도
      if (navigator.sendBeacon) {
        try {
          var blob = new Blob([jsonStr], { type: 'application/json' });
          if (navigator.sendBeacon(this.endpoint, blob)) {
            return;
          }
        } catch (e) {
          // sendBeacon 예외 시 fetch로 폴백
        }
      }

      // fetch 폴백
      if (typeof fetch === 'function') {
        fetch(this.endpoint, {
          method: 'POST',
          mode: 'cors',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json'
          },
          body: jsonStr
        }).catch(function() {
          // 텔레메트리 에러는 사용자 화면에 영향 주지 않도록 무음 처리
        });
      }
    }
  };

  window.MazaTelemetry = MazaTelemetry;
})(window);
