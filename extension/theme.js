// theme.js — applies the saved theme preference on load and live when it changes.
// Included in blocked.html and warning.html. options.html uses options.js instead
// (which also updates the toggle button label).

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

  browser.storage.local.get('theme').then(r => applyPref(r.theme)).catch(() => {});

  mq.addEventListener('change', () => { if (pref === 'opposite') applyPref(pref); });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.theme !== undefined) applyPref(changes.theme.newValue);
  });
})();
