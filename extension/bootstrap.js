// bootstrap.js — synchronously apply cached visual prefs (theme, shadows)
// BEFORE the page paints, eliminating the flash of incorrect theme that
// occurs when browser.storage.local (async) is the only source.
//
// localStorage is a fast synchronous cache; the canonical source remains
// browser.storage.local. theme.js and options.js keep the localStorage
// mirror up to date on every write so this read is always current.
//
// Must be the first <script> in <head>, before any <style> or <link>, so
// the dataset/class is set before stylesheets evaluate or layout begins.

(function () {
  try {
    const theme = localStorage.getItem('theme');
    if (theme && theme !== 'auto') {
      const effective = theme === 'opposite'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark')
        : theme;
      document.documentElement.dataset.theme = effective;
    }
    if (localStorage.getItem('showShadows') === 'false') {
      document.documentElement.classList.add('no-shadows');
    }
  } catch (e) {
    // localStorage unavailable (some private-browsing modes, disabled storage).
    // Fall back to CSS prefers-color-scheme default and the async path in
    // theme.js / options.js — brief flash possible but extension remains usable.
  }
})();
