// pages-dev.js — developer-only page-side handlers for screenshot capture.
// Loaded in blocked.html, warning.html, and options.html in dev builds.
// Excluded from AMO submissions — see RELEASE.md step 3.

let devOriginalWhitelist = null;

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
    if (!isFixed) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const bgSource = document.querySelector('.container') || el;
    const bg = window.getComputedStyle(bgSource).backgroundColor;
    document.body.style.backgroundColor = bg;
    const r = el.getBoundingClientRect();
    return Promise.resolve({ bounds: { x: r.x, y: r.y, width: r.width, height: r.height }, dpr: window.devicePixelRatio, bg });
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
});
