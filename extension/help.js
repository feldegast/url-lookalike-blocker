(function () {
  const cycle  = { auto: 'opposite', opposite: 'dark', dark: 'light', light: 'auto' };
  const labels = { auto: 'Auto', opposite: 'Opposite', dark: 'Dark', light: 'Light' };
  const btn = document.getElementById('theme-toggle');
  let pref = 'auto';

  browser.storage.local.get('theme').then(r => {
    pref = r.theme || 'auto';
    btn.textContent = labels[pref] ?? 'Auto';
  });

  btn.addEventListener('click', async () => {
    pref = cycle[pref] || 'auto';
    btn.textContent = labels[pref] ?? 'Auto';
    await browser.storage.local.set({ theme: pref });
  });

  document.getElementById('options-btn').addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'openOptionsPage' });
  });
})();
