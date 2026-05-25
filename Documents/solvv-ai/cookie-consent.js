/* ═══════════════════════════════════════════
   SOLVV AI — GDPR Cookie Consent (v1)
   ═══════════════════════════════════════════ */
(function () {
  var STORAGE_KEY = 'solvvai_consent_v1';

  /* ─── Read stored choice ─── */
  function getStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
  }

  /* ─── Push consent state to Google Consent Mode v2 ─── */
  function applyConsent(granted) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        ad_storage:          granted ? 'granted' : 'denied',
        analytics_storage:   granted ? 'granted' : 'denied',
        ad_user_data:        granted ? 'granted' : 'denied',
        ad_personalization:  granted ? 'granted' : 'denied'
      });
    }
  }

  /* ─── Save and apply ─── */
  function saveConsent(granted) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ granted: granted, ts: Date.now() }));
    } catch (_) {}
    applyConsent(granted);
  }

  /* ─── Apply existing consent immediately (no banner) ─── */
  var stored = getStored();
  if (stored !== null) {
    applyConsent(stored.granted);
    return;
  }

  /* ─── Styles ─── */
  var css = [
    '#solvv-cc{',
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120px);',
      'width:calc(100% - 32px);max-width:680px;',
      'background:#111;border:1px solid rgba(124,58,237,0.35);border-radius:16px;',
      'padding:24px 28px;z-index:99999;',
      'box-shadow:0 0 40px rgba(124,58,237,0.15),0 8px 32px rgba(0,0,0,0.6);',
      'display:flex;flex-wrap:wrap;gap:20px;align-items:center;',
      'opacity:0;transition:transform 0.5s cubic-bezier(0.16,1,0.3,1),opacity 0.5s ease;',
      'font-family:"Outfit",sans-serif;',
    '}',
    '#solvv-cc.cc-visible{transform:translateX(-50%) translateY(0);opacity:1;}',
    '#solvv-cc .cc-body{flex:1;min-width:200px;}',
    '#solvv-cc .cc-title{font-size:0.95rem;font-weight:700;color:#fff;margin-bottom:6px;display:flex;align-items:center;gap:8px;}',
    '#solvv-cc .cc-text{font-size:0.82rem;color:#aaa;line-height:1.6;}',
    '#solvv-cc .cc-text a{color:#9B5CF6;text-decoration:none;}',
    '#solvv-cc .cc-text a:hover{text-decoration:underline;}',
    '#solvv-cc .cc-actions{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}',
    '#solvv-cc .cc-btn{',
      'padding:10px 20px;border-radius:10px;font-size:0.82rem;font-weight:600;',
      'cursor:pointer;border:none;font-family:"Outfit",sans-serif;',
      'transition:opacity 0.2s,transform 0.15s;white-space:nowrap;',
    '}',
    '#solvv-cc .cc-btn:hover{opacity:0.85;transform:translateY(-1px);}',
    '#solvv-cc .cc-accept{background:linear-gradient(135deg,#7C3AED,#9B5CF6);color:#fff;}',
    '#solvv-cc .cc-essential{background:transparent;color:#aaa;border:1px solid rgba(255,255,255,0.12);}',
    '#solvv-cc .cc-essential:hover{color:#fff;border-color:rgba(255,255,255,0.3);}',
    '@media(max-width:480px){',
      '#solvv-cc{bottom:0;left:0;right:0;width:100%;max-width:100%;border-radius:16px 16px 0 0;transform:translateY(120%);border-bottom:none;}',
      '#solvv-cc.cc-visible{transform:translateY(0);}',
      '#solvv-cc .cc-actions{width:100%;}',
      '#solvv-cc .cc-btn{flex:1;text-align:center;}',
    '}'
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ─── Banner HTML ─── */
  var privacyPath = (window.location.pathname.indexOf('/blog/') !== -1)
    ? '../privacy.html'
    : 'privacy.html';

  var banner = document.createElement('div');
  banner.id = 'solvv-cc';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = [
    '<div class="cc-body">',
      '<div class="cc-title">🍪 Cookies &amp; Privacy</div>',
      '<p class="cc-text">',
        'We use Google Ads cookies to measure conversions and improve our service. ',
        'Essential cookies always run. See our <a href="', privacyPath, '">Privacy Policy</a>.',
      '</p>',
    '</div>',
    '<div class="cc-actions">',
      '<button class="cc-btn cc-essential" id="cc-essential">Essential Only</button>',
      '<button class="cc-btn cc-accept" id="cc-accept">Accept All</button>',
    '</div>'
  ].join('');

  document.body.appendChild(banner);

  /* ─── Show after a short delay ─── */
  setTimeout(function () { banner.classList.add('cc-visible'); }, 700);

  /* ─── Button handlers ─── */
  document.getElementById('cc-accept').addEventListener('click', function () {
    saveConsent(true);
    hideBanner();
  });
  document.getElementById('cc-essential').addEventListener('click', function () {
    saveConsent(false);
    hideBanner();
  });

  function hideBanner() {
    banner.classList.remove('cc-visible');
    setTimeout(function () { banner.remove(); }, 500);
  }
})();
