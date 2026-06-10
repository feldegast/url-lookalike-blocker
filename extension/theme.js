// theme.js — applies saved visual preferences (theme + shadows) on load and live
// when they change. Included in blocked.html, warning.html, and help.html.
// options.html runs the equivalent logic from options.js so it can also update
// the toggle button label and the "Show shadows" checkbox state.

(function () {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let pref = 'auto';

  function applyPref(p) {
    pref = p || 'auto';
    const effective = pref === 'opposite'
      ? (mq.matches ? 'light' : 'dark')
      : pref;
    if (!effective || effective === 'auto') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = effective;
    }
  }

  // Shadows default ON. Only suppress when the user has explicitly disabled them
  // (showShadows === false) — undefined/missing storage means default behaviour.
  function applyShadowPref(showShadows) {
    document.documentElement.classList.toggle('no-shadows', showShadows === false);
  }

  // Mirror writes to localStorage so apply-theme-early.js can apply the same
  // prefs synchronously on the next page load and avoid a flash of incorrect theme.
  function mirrorTheme(value) {
    try {
      if (value === undefined || value === null) localStorage.removeItem('theme');
      else localStorage.setItem('theme', value);
    } catch (e) { /* localStorage unavailable */ }
  }
  function mirrorShadows(value) {
    try {
      if (value === undefined || value === null) localStorage.removeItem('showShadows');
      else localStorage.setItem('showShadows', String(value));
    } catch (e) { /* localStorage unavailable */ }
  }

  browser.storage.local.get(['theme', 'showShadows']).then(r => {
    applyPref(r.theme);
    applyShadowPref(r.showShadows);
    mirrorTheme(r.theme);
    mirrorShadows(r.showShadows);
  }).catch(() => {});

  mq.addEventListener('change', () => { if (pref === 'opposite') applyPref(pref); });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.theme !== undefined) {
      applyPref(changes.theme.newValue);
      mirrorTheme(changes.theme.newValue);
    }
    if (changes.showShadows !== undefined) {
      applyShadowPref(changes.showShadows.newValue);
      mirrorShadows(changes.showShadows.newValue);
    }
  });
})();
