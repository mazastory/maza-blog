/* 셋업팟 보조 스크립트 고정본(2026-10-16) · 원본 https://www.setupod.com/js/pro_modal.js · sha256 9d9192808ad38a7ef7970d298e1d9b0df36baa0a34d1bb7fc6691075f51563db */
/**
 * SETUPOD PRO Modal / Paywall
 * Phase 4 Monetization - Injects a PRO upgrade modal dynamically
 */

const ProModal = {
  init() {
    if (document.getElementById('setupod-pro-modal')) return;

    const style = document.createElement('style');
    style.innerHTML = `
      .pro-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      }
      .pro-modal-overlay.active { opacity: 1; pointer-events: auto; }
      .pro-modal-box {
        background: rgba(13, 8, 24, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 24px; width: 90%; max-width: 440px; padding: 40px 30px;
        position: relative; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 20px rgba(168,85,247,0.1);
        transform: translateY(20px) scale(0.95); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .pro-modal-overlay.active .pro-modal-box { transform: translateY(0) scale(1); }
      .pro-modal-close {
        position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.05); border: none;
        width: 32px; height: 32px; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .pro-modal-close:hover { background: rgba(255,255,255,0.1); }
      .pro-badge {
        display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
        color: #fff; font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 99px; margin-bottom: 16px; letter-spacing: 0.05em;
      }
      .pro-title { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 12px; line-height: 1.3; font-family: 'Pretendard', sans-serif; }
      .pro-desc { font-size: 14.5px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 28px; }
      .pro-features { text-align: left; background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 28px; }
      .pro-feature { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: #e2e8f0; font-size: 14px; font-weight: 600; }
      .pro-feature:last-child { margin-bottom: 0; }
      .pro-feature i { color: #a855f7; display: flex; align-items: center; justify-content: center; }
      
      .pro-form { display: flex; flex-direction: column; gap: 12px; }
      .pro-input {
        width: 100%; height: 50px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; padding: 0 16px; color: #fff; font-size: 15px;
      }
      .pro-input:focus { outline: none; border-color: #a855f7; }
      .pro-btn {
        width: 100%; height: 54px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); border: none;
        border-radius: 12px; color: #fff; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 10px 20px rgba(168, 85, 247, 0.3);
      }
      .pro-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(168, 85, 247, 0.4); }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'pro-modal-overlay';
    overlay.id = 'setupod-pro-modal';
    
    // SVG icons as raw strings to avoid Lucide dependency issues if not loaded yet
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    overlay.innerHTML = `
      <div class="pro-modal-box">
        <button class="pro-modal-close" onclick="ProModal.hide()">${closeIcon}</button>
        <div class="pro-badge">SETUPOD PRO</div>
        <h3 class="pro-title">해당 기능은<br><span style="color:#c084fc;">PRO 플랜</span> 전용입니다</h3>
        <p class="pro-desc">더 강력한 비즈니스 툴을 준비 중입니다.<br>사전 알림을 신청하시면 런칭 시 얼리버드 혜택을 드립니다.</p>
        
        <div class="pro-features">
          <div class="pro-feature"><i>${checkIcon}</i> 2026 플래너 시크릿 볼트 무제한</div>
          <div class="pro-feature"><i>${checkIcon}</i> 플래너 및 메모팟 데이터 클라우드 백업</div>
          <div class="pro-feature"><i>${checkIcon}</i> 워터마크 없는 고해상도 PDF 추출</div>
          <div class="pro-feature"><i>${checkIcon}</i> 3D 명함 기업용 엑셀 일괄 발행</div>
        </div>

        <form class="pro-form" onsubmit="ProModal.submit(event)">
          <input type="email" class="pro-input" placeholder="이메일 주소를 입력하세요" required>
          <button type="submit" class="pro-btn">얼리버드 혜택 알림 받기</button>
        </form>
      </div>
    `;
    
    document.body.appendChild(overlay);
  },

  show() {
    this.init();
    setTimeout(() => {
      document.getElementById('setupod-pro-modal').classList.add('active');
    }, 10);
  },

  hide() {
    const modal = document.getElementById('setupod-pro-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  async submit(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const btn = e.target.querySelector('button');
    const email = input.value;
    
    btn.innerHTML = '처리 중...';
    btn.style.opacity = '0.7';

    // Save lead to Supabase (if available) or simulate success
    if (window.saveLeadToCloud) {
      await window.saveLeadToCloud('pro_waitlist', email);
    } else {
      // Simulate API call
      await new Promise(r => setTimeout(r, 600));
    }
    
    btn.innerHTML = '신청 완료! 🎉';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
      this.hide();
      setTimeout(() => {
        btn.innerHTML = '얼리버드 혜택 알림 받기';
        btn.style.background = '';
        input.value = '';
      }, 300);
    }, 1500);
  }
};

window.ProModal = ProModal;
