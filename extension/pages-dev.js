// pages-dev.js — developer-only page-side handlers for screenshot capture.
// Loaded in blocked.html, warning.html, and options.html in dev builds.
// Excluded from AMO submissions — see RELEASE.md step 3.

let devOriginalWhitelist = null;
let devOriginalLanguages = null;

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'devSetDotColor') {
    const d = document.getElementById('tab-dot');
    if (d) d.style.background = message.color;
    return;
  }

  if (message.type === 'devCapturePrepare') {
    const el = document.querySelector(message.selector);
    if (!el) return Promise.resolve(null);
    const pos = window.getComputedStyle(el).position;
    const isFixed = pos === 'fixed' || pos === 'sticky';
    if (!isFixed) el.scrollIntoView({ block: message.block || 'center', behavior: 'instant' });
    const bgSource = document.querySelector('.container') || document.body;
    const bg = window.getComputedStyle(bgSource).backgroundColor;
    document.body.style.backgroundColor = bg;
    const r = el.getBoundingClientRect();
    let bounds = { x: r.x, y: r.y, width: r.width, height: r.height };
    if (message.clamp) {
      bounds.y = Math.max(0, bounds.y);
      bounds.height = Math.min(bounds.height, window.innerHeight - bounds.y);
    }
    return Promise.resolve({ bounds, dpr: window.devicePixelRatio, bg });
  }

  if (message.type === 'devCaptureRestore') {
    document.body.style.backgroundColor = '';
    return;
  }

  if (message.type === 'devGetPageDimensions') {
    const bodyR = document.body.getBoundingClientRect();
    return Promise.resolve({
      scrollHeight:   document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      captureWidth:   Math.round(bodyR.width),
      contentLeft:    Math.round(bodyR.left),
      dpr:            window.devicePixelRatio,
      bodyBg:         window.getComputedStyle(document.body).backgroundColor,
    });
  }

  if (message.type === 'devScrollTo') {
    window.scrollTo({ top: message.y, behavior: 'instant' });
    return Promise.resolve();
  }

  // Options-page-only handlers — no-op on blocked/warning pages
  if (message.type === 'devShowPrivateWarning') {
    const el = document.getElementById('private-warning');
    if (el) el.style.display = 'flex';
    return;
  }
  if (message.type === 'devHidePrivateWarning') {
    const el = document.getElementById('private-warning');
    if (el) el.style.display = 'none';
    return;
  }
  if (message.type === 'devHideFooter') {
    const el = document.querySelector('footer.page-footer');
    if (el) el.style.display = 'none';
    return;
  }
  if (message.type === 'devShowFooter') {
    const el = document.querySelector('footer.page-footer');
    if (el) el.style.display = '';
    return;
  }
  if (message.type === 'devShowApplyBar') {
    const el = document.getElementById('sticky-apply-bar');
    if (el) { el.style.display = 'flex'; document.body.classList.add('has-sticky-bar'); }
    return;
  }
  if (message.type === 'devHideApplyBar') {
    const el = document.getElementById('sticky-apply-bar');
    if (el) { el.style.display = 'none'; document.body.classList.remove('has-sticky-bar'); }
    return;
  }
  if (message.type === 'devSetWhitelist') {
    if (window._devHooks) {
      devOriginalWhitelist = window._devHooks.getWhitelist();
      window._devHooks.setWhitelist(message.entries);
      window._devHooks.renderWhitelist();
    }
    return;
  }
  if (message.type === 'devRestoreWhitelist') {
    if (window._devHooks && devOriginalWhitelist !== null) {
      window._devHooks.setWhitelist(devOriginalWhitelist);
      devOriginalWhitelist = null;
      window._devHooks.renderWhitelist();
    }
    return;
  }
  if (message.type === 'devGetElementBounds') {
    const el = document.querySelector(message.selector);
    if (!el) return Promise.resolve(null);
    const r = el.getBoundingClientRect();
    return Promise.resolve({
      docX:   r.x + window.scrollX,
      docY:   r.y + window.scrollY,
      width:  r.width,
      height: r.height,
      dpr:    window.devicePixelRatio,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    });
  }
  if (message.type === 'devSetTheme') {
    document.documentElement.dataset.theme = message.theme; // 'light' or 'dark'
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const labels = { auto: 'Auto', opposite: 'Opposite', dark: 'Dark', light: 'Light' };
      themeBtn.textContent = labels[message.theme] ?? message.theme;
    }
    return;
  }
  if (message.type === 'devHideLatinSection') {
    const el = document.getElementById('latin-section');
    if (el) el.style.display = 'none';
    return;
  }
  if (message.type === 'devShowLatinSection') {
    const el = document.getElementById('latin-section');
    if (el) el.style.display = '';
    return;
  }
  if (message.type === 'devShowToast') {
    const lines = message.lines || [message.text];
    const toast = document.createElement('div');
    toast.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
    Object.assign(toast.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: '#222', color: '#fff', padding: '12px 20px', borderRadius: '6px',
      fontSize: '13px', lineHeight: '1.6', zIndex: '9999', maxWidth: '80vw',
      opacity: '1', transition: 'opacity 0.4s',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 15000);
    setTimeout(() => { toast.remove(); }, 15400);
    return;
  }
  if (message.type === 'devSetCompactMode') {
    const cb = document.getElementById('compact-mode');
    if (cb) {
      cb.checked = message.enabled;
      cb.dispatchEvent(new Event('change'));
    }
    return;
  }
  if (message.type === 'devOpenLanguageModal') {
    document.documentElement.classList.add('modal-open');
    // Force backdrop hidden — inline display:none loses to the CSS rule, so use !important via a style element.
    let s = document.getElementById('_dev_backdrop_override');
    if (!s) {
      s = document.createElement('style');
      s.id = '_dev_backdrop_override';
      document.head.appendChild(s);
    }
    s.textContent = '#language-modal-backdrop { display: none !important; }';
    document.body.style.overflow = '';
    const el = document.getElementById('section-languages');
    if (el) {
      el.style.position = 'relative';
      el.style.top = 'auto';
      el.style.left = 'auto';
      el.style.transform = 'none';
      el.style.width = 'auto';
      el.style.maxHeight = 'none';
      el.style.overflowY = 'visible';
      el.style.zIndex = '';
      el.style.borderRadius = '0';
    }
    return;
  }
  if (message.type === 'devCloseLanguageModal') {
    document.documentElement.classList.remove('modal-open');
    const s = document.getElementById('_dev_backdrop_override');
    if (s) s.textContent = '';
    const el = document.getElementById('section-languages');
    if (el) {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.transform = '';
      el.style.width = '';
      el.style.maxHeight = '';
      el.style.overflowY = '';
      el.style.zIndex = '';
      el.style.borderRadius = '';
    }
    return;
  }
  if (message.type === 'devOpenWhitelistModal') {
    document.documentElement.classList.add('whitelist-modal-open');
    let s = document.getElementById('_dev_backdrop_override');
    if (!s) {
      s = document.createElement('style');
      s.id = '_dev_backdrop_override';
      document.head.appendChild(s);
    }
    s.textContent = '#whitelist-modal-backdrop { display: none !important; }';
    document.body.style.overflow = '';
    return;
  }
  if (message.type === 'devCloseWhitelistModal') {
    document.documentElement.classList.remove('whitelist-modal-open');
    const s = document.getElementById('_dev_backdrop_override');
    if (s) s.textContent = '';
    return;
  }
  if (message.type === 'devSetLanguages') {
    if (window._devHooks) {
      devOriginalLanguages = window._devHooks.getLanguages();
      window._devHooks.setLanguages({ scripts: message.scripts, languages: message.languages });
    }
    return;
  }
  if (message.type === 'devRestoreLanguages') {
    if (window._devHooks && devOriginalLanguages !== null) {
      window._devHooks.setLanguages(devOriginalLanguages);
      devOriginalLanguages = null;
    }
    return;
  }
});
