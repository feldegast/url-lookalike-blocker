// options.js
// Holds changes in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let additionalScripts = new Set(); // Set of enabled script names, e.g. 'Cyrillic', 'Han'
let enabledLanguages = new Set(); // Explicitly enabled language names — source of truth for langScriptSets
let derivedTicked = new Set();    // Single-script languages auto-ticked because their script is permitted; never stored
let whitelist = [];

// Snapshot of language state as loaded from storage, used to detect unsaved changes.
let initialLanguages = new Set();
let initialWhitelist = [];
let isDirty = false;


const urlParams = new URLSearchParams(window.location.search);
const initialBlockedTabId = urlParams.get('blockedTabId')
  ? parseInt(urlParams.get('blockedTabId'), 10) : null;

// LANGUAGE_SCRIPTS and ALWAYS_PERMITTED are defined in unicode-scripts.js (loaded first).

const LOCALE_TO_LANGUAGE = {
  'ru': 'Russian', 'uk': 'Ukrainian', 'bg': 'Bulgarian', 'sr': 'Serbian',
  'mk': 'Macedonian', 'be': 'Belarusian', 'kk': 'Kazakh', 'ky': 'Kyrgyz',
  'tg': 'Tajik', 'uz': 'Uzbek', 'mn': 'Mongolian', 'el': 'Greek',
  'ar': 'Arabic', 'ur': 'Urdu', 'fa': 'Persian', 'ps': 'Pashto', 'he': 'Hebrew',
  'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi', 'mr': 'Marathi', 'sa': 'Sanskrit',
  'bn': 'Bengali', 'pa': 'Punjabi (Gurmukhi)', 'gu': 'Gujarati', 'or': 'Odia',
  'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam', 'th': 'Thai',
  'lo': 'Lao', 'km': 'Khmer', 'my': 'Burmese', 'si': 'Sinhala', 'hy': 'Armenian',
  'ka': 'Georgian', 'iu': 'Canadian Aboriginal', 'chr': 'Cherokee'
};

function getLocaleLanguages() {
  const languages = new Set();
  const uiLocale = (typeof browser !== 'undefined' && browser.i18n?.getUILanguage?.()) || null;
  const locales = [...(uiLocale ? [uiLocale] : []), ...(navigator.languages || [navigator.language || 'en'])];
  for (const locale of locales) {
    const lower = locale.toLowerCase();
    const prefix = lower.split('-')[0];
    if (prefix === 'zh') {
      languages.add(
        (lower.includes('hant') || lower.includes('tw') || lower.includes('hk') || lower.includes('mo'))
          ? 'Chinese (Traditional)' : 'Chinese (Simplified)'
      );
      continue;
    }
    const lang = LOCALE_TO_LANGUAGE[prefix];
    if (lang) languages.add(lang);
  }
  return [...languages];
}

// Returns the set of non-always-permitted scripts from the browser's locale languages.
function getLocaleScripts() {
  const scripts = new Set();
  for (const lang of getLocaleLanguages()) {
    for (const s of (LANGUAGE_SCRIPTS[lang] || [])) {
      if (!ALWAYS_PERMITTED.has(s)) scripts.add(s);
    }
  }
  return scripts;
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
let themePref = 'auto'; // tracks stored preference so the change listener can use it

function applyTheme(pref) {
  themePref = pref;
  let effective;
  if (pref === 'opposite') {
    effective = systemDark.matches ? 'light' : 'dark';
  } else {
    effective = pref; // 'auto', 'dark', 'light'
  }
  if (effective === 'auto') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = effective;
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const labels = { auto: 'Auto', opposite: 'Opposite', dark: 'Dark', light: 'Light' };
    const tips   = {
      auto:     'Following system theme — click for opposite',
      opposite: 'Opposite to system theme — click for always dark',
      dark:     'Always dark — click for always light',
      light:    'Always light — click to follow system',
    };
    btn.textContent = labels[pref] ?? 'Auto';
    btn.title       = tips[pref]   ?? '';
  }
}

// Re-apply when system theme changes so Opposite mode stays correct.
systemDark.addEventListener('change', () => {
  if (themePref === 'opposite') applyTheme('opposite');
});

// Shadows default ON. Only suppress when explicitly disabled (false). Mirrors
// the logic in theme.js so blocked/warning/help pages stay in sync.
function applyShadowPref(showShadows) {
  document.documentElement.classList.toggle('no-shadows', showShadows === false);
  const cb = document.getElementById('show-shadows');
  if (cb) cb.checked = showShadows !== false;
}

function updateCompactLanguageList() {
  const list = document.getElementById('compact-language-list');
  if (!list) return;
  list.replaceChildren();
  for (const lang of [...enabledLanguages].sort()) {
    const item = document.createElement('div');
    item.className = 'compact-lang-item';
    item.textContent = lang;
    list.appendChild(item);
  }
  for (const lang of [...derivedTicked].sort()) {
    const item = document.createElement('div');
    item.className = 'compact-lang-item compact-lang-always';
    item.textContent = lang;
    list.appendChild(item);
  }
  const latinItem = document.createElement('div');
  latinItem.className = 'compact-lang-item compact-lang-always';
  latinItem.textContent = 'Latin languages (always permitted)';
  list.appendChild(latinItem);
}

function applyCompactMode(enabled) {
  document.documentElement.classList.toggle('compact-mode', !!enabled);
  const cb = document.getElementById('compact-mode');
  if (cb) cb.checked = !!enabled;
  if (enabled) updateCompactLanguageList();
}

async function initCompactMode(storedValue) {
  if (storedValue === undefined) {
    const isPhone = Math.min(screen.width, screen.height) < 600;
    await browser.storage.local.set({ compactMode: isPhone });
    applyCompactMode(isPhone);
  } else {
    applyCompactMode(storedValue === true);
  }
}

let languageModalCleanup = null;

function openLanguageModal() {
  const section = document.getElementById('section-languages');
  const placeholder = document.createElement('div');
  placeholder.id = 'language-modal-placeholder';
  placeholder.style.height = section.getBoundingClientRect().height + 'px';
  section.parentNode.insertBefore(placeholder, section);
  document.documentElement.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  languageModalCleanup = trapFocus(
    section,
    document.getElementById('edit-languages-btn'),
    closeLanguageModal
  );
}

function closeLanguageModal() {
  if (languageModalCleanup) { languageModalCleanup(); languageModalCleanup = null; }
  document.documentElement.classList.remove('modal-open');
  document.body.style.overflow = '';
  const placeholder = document.getElementById('language-modal-placeholder');
  if (placeholder) placeholder.remove();
  updateCompactLanguageList();
}

let whitelistModalCleanup = null;

function openWhitelistModal() {
  const section = document.getElementById('section-whitelist');
  const placeholder = document.createElement('div');
  placeholder.id = 'whitelist-modal-placeholder';
  placeholder.style.height = section.getBoundingClientRect().height + 'px';
  section.parentNode.insertBefore(placeholder, section);
  document.documentElement.classList.add('whitelist-modal-open');
  document.body.style.overflow = 'hidden';
  whitelistModalCleanup = trapFocus(
    section,
    document.getElementById('edit-whitelist-btn'),
    closeWhitelistModal
  );
}

function closeWhitelistModal() {
  if (whitelistModalCleanup) { whitelistModalCleanup(); whitelistModalCleanup = null; }
  document.documentElement.classList.remove('whitelist-modal-open');
  document.body.style.overflow = '';
  const placeholder = document.getElementById('whitelist-modal-placeholder');
  if (placeholder) placeholder.remove();
  renderCompactWhitelist();
}

document.addEventListener('DOMContentLoaded', async () => {
  const [syncSettings, syncWhitelist, localResult] = await Promise.all([
    readSyncedSettings(),
    readSyncedWhitelist(),
    browser.storage.local.get(['theme', 'showShadows', 'compactMode', 'whitelist', 'enabledLanguages'])
  ]);

  // Apply theme: sync value if available, else local
  const theme = syncSettings?.theme ?? localResult.theme ?? 'auto';
  applyTheme(theme);
  try { localStorage.setItem('theme', theme); } catch (e) { /* unavailable */ }

  // Apply shadows
  const showShadows = syncSettings?.showShadows ?? localResult.showShadows;
  applyShadowPref(showShadows);
  try {
    if (showShadows === undefined) localStorage.removeItem('showShadows');
    else localStorage.setItem('showShadows', String(showShadows));
  } catch (e) { /* unavailable */ }

  await initCompactMode(localResult.compactMode);
  await loadSettings(syncSettings, syncWhitelist, localResult);
  buildLanguageTable();
  setupLanguageTableKeyboard();
  refreshState();
  setupEventListeners();
  const latinLink = document.getElementById('latin-help-link');
  if (latinLink) latinLink.href = browser.runtime.getURL('help.html#latin-languages');
  await initTabSelector();
  await checkPrivateBrowsingAccess();

  // Register this tab with background.js so it can close it on Apply even
  // after a background-page restart (which resets optionsTabId to null).
  browser.tabs.getCurrent().then(tab => {
    if (tab) browser.runtime.sendMessage({ type: 'registerOptionsTab', tabId: tab.id }).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncTabDots();
  });

  // Listen for events from background.js
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'addBlockedTab') {
      addTabDot(message.tabId, message.url, message.color);
    }
    if (message.type === 'blockedTabClosed') {
      removeTabDot(message.tabId);
    }
    if (message.type === 'whitelistUpdated') {
      // A blocked/warning page just permanently allowed a domain — update the
      // whitelist display without requiring a manual reload. Treat the new
      // entry as already saved (update initialWhitelist too) so it doesn't
      // appear as an unsaved change.
      whitelist = message.whitelist;
      initialWhitelist = [...whitelist];
      renderWhitelist();
      checkDirty();
    }
  });
});

async function loadSettings(syncSettings, syncWhitelist, localResult) {
  if (syncSettings !== null) {
    enabledLanguages = new Set(syncSettings.enabledLanguages || []);
    whitelist = syncWhitelist !== null ? syncWhitelist : (localResult.whitelist || []);
  } else {
    whitelist = localResult.whitelist || [];
    if (localResult.enabledLanguages !== undefined) {
      enabledLanguages = new Set(localResult.enabledLanguages);
    } else {
      // Fresh install — seed from browser locale.
      enabledLanguages = new Set(getLocaleLanguages());
      await applyToStorage();
    }
  }
  ({ additionalScripts } = computeScriptsFromLanguages(enabledLanguages));

  initialLanguages = new Set(enabledLanguages);
  initialWhitelist = [...whitelist];
  renderWhitelist();
}

// Saves the current language settings to storage and notifies background.js.
// Used on first run and on Reset so permissions take effect without requiring Apply.
async function applyToStorage() {
  const showShadows = document.getElementById('show-shadows')?.checked ?? true;
  try {
    await writeSyncedSettings({
      enabledLanguages: [...enabledLanguages],
      theme: themePref,
      showShadows
    });
  } catch (e) { /* No Firefox account or quota error — ok */ }
  // Keep local storage in sync as fallback for users without a Firefox account.
  await browser.storage.local.set({ enabledLanguages: [...enabledLanguages] });
  // Background state is synced via storage.onChanged in background.js.
  // Do NOT send applySettings here — that message closes the options tab.
}

function checkDirty() {
  let anyLanguageDirty = false;
  document.querySelectorAll('.dirty-dot[data-language]').forEach(dot => {
    const lang = dot.dataset.language;
    const changed = initialLanguages.has(lang) !== enabledLanguages.has(lang);
    dot.style.display = changed ? 'inline-block' : 'none';
    if (changed) anyLanguageDirty = true;
  });
  isDirty = anyLanguageDirty || !arraysEqualSorted(whitelist, initialWhitelist);
  const bar = document.getElementById('sticky-apply-bar');
  if (bar) bar.style.display = isDirty ? 'flex' : 'none';
  document.body.classList.toggle('has-sticky-bar', isDirty);
}

function arraysEqualSorted(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function encodeToPunycode(unicodeDomain) {
  try { return new URL('http://' + unicodeDomain).hostname; }
  catch (e) { return unicodeDomain; }
}

function getOffendingChars(unicodeDomain) {
  const alwaysPermitted = new Set(['Common', 'Inherited', 'Latin']);
  const chars = [], seen = new Set();
  for (const char of unicodeDomain) {
    if (!seen.has(char)) {
      const s = getCharScript(char);
      if (s && !alwaysPermitted.has(s)) { chars.push({ char, script: s }); seen.add(char); }
    }
  }
  return chars;
}

function renderCompactWhitelist() {
  const summary = document.getElementById('compact-whitelist-summary');
  if (!summary) return;
  summary.replaceChildren();
  if (whitelist.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'compact-whitelist-empty';
    empty.textContent = 'No whitelisted domains.';
    summary.appendChild(empty);
    return;
  }
  for (const domain of whitelist) {
    const offendingSet = new Set(getOffendingChars(domain).map(o => o.char));
    const item = document.createElement('div');
    item.className = 'compact-whitelist-item';
    for (const char of domain) {
      if (offendingSet.has(char)) {
        const span = document.createElement('span');
        span.className = 'offending-char-glyph';
        span.textContent = char;
        item.appendChild(span);
      } else {
        item.appendChild(document.createTextNode(char));
      }
    }
    summary.appendChild(item);
  }
}

function renderWhitelist() {
  renderCompactWhitelist();
  const container = document.getElementById('whitelist');
  container.replaceChildren();

  if (whitelist.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No whitelisted domains.';
    container.appendChild(p);
    return;
  }

  whitelist.forEach(domain => {
    const punycode = encodeToPunycode(domain);
    const offending = getOffendingChars(domain);
    const offendingSet = new Set(offending.map(o => o.char));

    const item = document.createElement('div');
    item.className = 'whitelist-item';
    const info = document.createElement('div');
    info.className = 'whitelist-info';

    const unicodeRow = document.createElement('div');
    const unicodeLabel = document.createElement('strong');
    unicodeLabel.textContent = 'Unicode Domain: ';
    const unicodeDomainSpan = document.createElement('span');
    unicodeDomainSpan.className = 'whitelist-unicode-domain';
    for (const char of domain) {
      if (offendingSet.has(char)) {
        const highlight = document.createElement('span');
        highlight.className = 'offending-char-glyph';
        highlight.textContent = char;
        unicodeDomainSpan.appendChild(highlight);
      } else {
        unicodeDomainSpan.appendChild(document.createTextNode(char));
      }
    }
    unicodeRow.appendChild(unicodeLabel);
    unicodeRow.appendChild(unicodeDomainSpan);

    const punycodeRow = document.createElement('div');
    const punycodeLabel = document.createElement('strong');
    punycodeLabel.textContent = 'Punycode: ';
    const punycodeSpan = document.createElement('span');
    punycodeSpan.className = 'whitelist-punycode';
    punycodeSpan.textContent = punycode;
    punycodeRow.appendChild(punycodeLabel);
    punycodeRow.appendChild(punycodeSpan);

    info.appendChild(unicodeRow);
    info.appendChild(punycodeRow);

    if (offending.length > 0) {
      const table = document.createElement('table');
      table.className = 'offending-chars-table';
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const heading of ['Character', 'Codepoint', 'Script']) {
        const th = document.createElement('th');
        th.textContent = heading;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const { char, script: s } of offending) {
        const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
        const tr = document.createElement('tr');
        for (const [text, cls] of [[char, 'offending-char-glyph'], [codepoint, ''], [s, '']]) {
          const td = document.createElement('td');
          if (cls) td.className = cls;
          td.textContent = text;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      info.appendChild(table);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeFromWhitelist(domain));
    item.appendChild(info);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

function buildLanguageTable() {
  const container = document.getElementById('script-tree');
  container.replaceChildren();

  const sortedLanguages = Object.keys(LANGUAGE_SCRIPTS).sort();
  const latinOnly = lang => LANGUAGE_SCRIPTS[lang].every(s => ALWAYS_PERMITTED.has(s));
  const toggleable = sortedLanguages.filter(lang => !latinOnly(lang));

  const table = document.createElement('table');
  table.className = 'script-table';
  const thead = document.createElement('thead');
  const theadRow = document.createElement('tr');
  for (const text of ['Language', 'Scripts']) {
    const th = document.createElement('th');
    th.textContent = text;
    theadRow.appendChild(th);
  }
  thead.appendChild(theadRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  toggleable.forEach(language => {
    const allScripts = LANGUAGE_SCRIPTS[language];

    const tr = document.createElement('tr');
    tr.dataset.language = language;
    tr.className = 'lang-row';

    const langTd = document.createElement('td');
    const langLabel = document.createElement('label');
    langLabel.className = 'lang-label';
    const langCb = document.createElement('input');
    langCb.type = 'checkbox';
    langCb.dataset.language = language;
    langCb.addEventListener('change', () => onLanguageToggle(language, langCb.checked));
    langLabel.appendChild(langCb);
    langLabel.appendChild(document.createTextNode(' ' + language));
    const dot = document.createElement('span');
    dot.className = 'dirty-dot';
    dot.dataset.language = language;
    dot.style.display = 'none';
    langLabel.appendChild(dot);
    langTd.appendChild(langLabel);
    tr.appendChild(langTd);

    const scriptsTd = document.createElement('td');
    allScripts.forEach(script => {
      const tag = document.createElement('span');
      tag.className = 'script-tag';
      tag.dataset.script = script;
      tag.textContent = script.replace(/_/g, ' ');
      scriptsTd.appendChild(tag);
    });
    tr.appendChild(scriptsTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Sets up roving tabindex and keyboard navigation on the language table.
// Called once after buildLanguageTable().
function setupLanguageTableKeyboard() {
  const tbody = document.querySelector('#script-tree .script-table tbody');
  if (!tbody) return;
  const rows = [...tbody.querySelectorAll('.lang-row')];
  if (rows.length === 0) return;
  rows[0].setAttribute('tabindex', '0');
  rows.slice(1).forEach(r => r.setAttribute('tabindex', '-1'));

  let typeaheadBuffer = '';
  let typeaheadTimeout = null;

  tbody.addEventListener('keydown', (e) => {
    const currentRows = [...tbody.querySelectorAll('.lang-row')];
    const idx = currentRows.indexOf(document.activeElement);
    if (idx < 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveLangFocus(Math.min(idx + 1, currentRows.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveLangFocus(Math.max(idx - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        moveLangFocus(0);
        break;
      case 'End':
        e.preventDefault();
        moveLangFocus(currentRows.length - 1);
        break;
      case ' ':
        e.preventDefault();
        currentRows[idx].querySelector('input[type="checkbox"]')?.click();
        break;
      default:
        if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
          clearTimeout(typeaheadTimeout);
          typeaheadBuffer += e.key.toLowerCase();
          typeaheadTimeout = setTimeout(() => { typeaheadBuffer = ''; }, 1500);
          const start = (idx + 1) % currentRows.length;
          const ordered = [...currentRows.slice(start), ...currentRows.slice(0, start)];
          const match = ordered.find(r =>
            (r.dataset.language || '').toLowerCase().startsWith(typeaheadBuffer)
          );
          if (match) moveLangFocus(currentRows.indexOf(match));
        }
        break;
    }
  });
}

function moveLangFocus(newIndex) {
  const rows = [...document.querySelectorAll('#script-tree .script-table tbody .lang-row')];
  if (newIndex < 0 || newIndex >= rows.length) return;
  rows.forEach((r, i) => r.setAttribute('tabindex', i === newIndex ? '0' : '-1'));
  rows[newIndex].focus();
}

// Installs a focus trap on modalEl. Returns a cleanup function.
// Pressing Escape closes the modal via closeFn and returns focus to returnEl.
function trapFocus(modalEl, returnEl, closeFn) {
  const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableEls() {
    return [...modalEl.querySelectorAll(focusableSelector)].filter(
      el => el.offsetParent !== null
    );
  }

  const initial = getFocusableEls();
  if (initial.length > 0) initial[0].focus();

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
      closeFn();
      returnEl?.focus();
      return;
    }
    if (e.key !== 'Tab') return;
    const els = getFocusableEls();
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  modalEl.addEventListener('keydown', onKeydown);
  function cleanup() { modalEl.removeEventListener('keydown', onKeydown); }
  return cleanup;
}

function onLanguageToggle(language, checked) {
  if (checked) {
    enabledLanguages.add(language);
    for (const s of (LANGUAGE_SCRIPTS[language] || []).filter(s => !ALWAYS_PERMITTED.has(s))) {
      additionalScripts.add(s);
    }
  } else {
    untickLanguage(language);
  }
  refreshState();
  checkDirty();
}

// Unticking always means "I don't want these scripts" — the same rule whether the
// language was explicitly enabled or auto-ticked. Removes the language's scripts
// and cascades to any other enabled language that needed them.
// Locale-seeded scripts are skipped: they live in additionalScripts (seeded at first
// run, persisted to storage). Removing them would stop the background permitting them
// while refreshState (which unions getLocaleScripts() for display) would still show
// them green — a permanent display mismatch and re-tick loop.
function untickLanguage(language) {
  enabledLanguages.delete(language);
  const localeScripts = getLocaleScripts();
  const scripts = (LANGUAGE_SCRIPTS[language] || []).filter(s => !ALWAYS_PERMITTED.has(s));
  for (const s of scripts) {
    if (localeScripts.has(s)) continue; // cannot veto a locale-seeded script
    additionalScripts.delete(s);
    const casualties = [...enabledLanguages].filter(
      lang => (LANGUAGE_SCRIPTS[lang] || []).includes(s)
    );
    for (const lang of casualties) untickLanguage(lang);
  }
}

// Recolours script tags, re-derives auto-ticked single-script languages, and
// updates all checkboxes. Called after every explicit checkbox change.
// Permitted set = explicit additionalScripts ∪ locale scripts ∪ always-permitted,
// matching the set the background uses — so the display always reflects reality.
function refreshState() {
  const localeScripts = getLocaleScripts();
  const { derivedLanguages } = computeScriptsFromLanguages(enabledLanguages, localeScripts);
  derivedTicked = derivedLanguages;

  const permittedScripts = new Set([...ALWAYS_PERMITTED, ...additionalScripts, ...localeScripts]);

  document.querySelectorAll('.script-tag[data-script]').forEach(tag => {
    tag.classList.toggle('script-permitted', permittedScripts.has(tag.dataset.script));
  });

  document.querySelectorAll('input[data-language]').forEach(cb => {
    const lang = cb.dataset.language;
    const isExplicit = enabledLanguages.has(lang);
    const isDerived  = derivedTicked.has(lang);
    cb.checked = isExplicit || isDerived;
    cb.indeterminate = false;
    const label = cb.closest('label');
    if (label) label.classList.toggle('lang-derived', isDerived && !isExplicit);
  });

  if (document.documentElement.classList.contains('compact-mode')) {
    updateCompactLanguageList();
  }
}

// --- Tab selector ---

function tabColor(tabId) {
  const hue = Math.round((tabId * 137.508) % 360);
  return `hsl(${hue}, 65%, 42%)`;
}

async function initTabSelector() {
  // Wrap the background query in a try-catch: if the background event page was
  // restarted (Firefox can suspend idle extensions), the message channel may be
  // briefly unavailable or blockedTabs may be empty.
  let tabs = [];
  try {
    const result = await browser.runtime.sendMessage({ type: 'getBlockedTabs' });
    if (Array.isArray(result)) tabs = result;
  } catch (e) {
    // Background page unavailable; fall through to the URL-param fallback below.
  }

  // Fallback: if background state was wiped and we were opened for a specific
  // blocked tab, synthesise an entry from the URL params so the dot still shows.
  if (tabs.length === 0 && initialBlockedTabId !== null) {
    const urlFromParams = urlParams.get('blockedUrl') || '';
    tabs = [{ tabId: initialBlockedTabId, url: urlFromParams, color: tabColor(initialBlockedTabId) }];
  }

  for (const { tabId, url, color } of tabs) {
    addTabDot(tabId, url, color);
  }
}

function addTabDot(tabId, url, color) {
  // Don't add a duplicate dot for a tab already in the selector.
  if (document.querySelector(`.tab-dot-btn[data-tab-id="${tabId}"]`)) return;

  const container = document.getElementById('tab-selector');
  container.style.display = 'flex';

  const btn = document.createElement('button');
  btn.className = 'tab-dot-btn';
  btn.dataset.tabId = tabId;
  btn.style.background = color || tabColor(tabId);
  btn.title = url;
  // Clicking a dot switches focus to that blocked tab.
  btn.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'switchToTab', tabId });
  });
  container.appendChild(btn);
}

function removeTabDot(tabId) {
  const btn = document.querySelector(`.tab-dot-btn[data-tab-id="${tabId}"]`);
  if (btn) btn.remove();
  // Hide the bar when no dots remain.
  if (document.querySelectorAll('.tab-dot-btn').length === 0) {
    document.getElementById('tab-selector').style.display = 'none';
  }
}

async function syncTabDots() {
  let current = [];
  try {
    const result = await browser.runtime.sendMessage({ type: 'getBlockedTabs' });
    if (Array.isArray(result)) current = result;
  } catch (e) {
    return;
  }
  const currentIds = new Set(current.map(t => t.tabId));
  document.querySelectorAll('.tab-dot-btn').forEach(btn => {
    const id = parseInt(btn.dataset.tabId, 10);
    if (!currentIds.has(id)) removeTabDot(id);
  });
  for (const { tabId, url, color } of current) {
    addTabDot(tabId, url, color);
  }
}

function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  renderWhitelist();
  checkDirty();
}

// Show a warning banner if the extension has not been granted access to
// private windows AND the user has not dismissed the warning. The dismissal
// flag exists for environments where access cannot be granted (locked-down
// corporate Firefox builds with policy-disabled private windows) — without it
// the warning would be permanent noise the user cannot act on.
let privateAccessAllowed = false;
async function checkPrivateBrowsingAccess() {
  try {
    privateAccessAllowed = await browser.extension.isAllowedIncognitoAccess();
  } catch (e) {
    // API unavailable — assume allowed so the warning never shows.
    privateAccessAllowed = true;
  }
  const { dismissedPrivateWarning } = await browser.storage.local.get('dismissedPrivateWarning');
  applyPrivateWarningVisibility(!!dismissedPrivateWarning);
  const cb = document.getElementById('show-private-warning');
  if (cb) {
    cb.checked = !dismissedPrivateWarning;
    cb.disabled = privateAccessAllowed;
    if (privateAccessAllowed) cb.title = 'Extension is allowed in private windows — warning is never shown';
  }
}

// Visibility = not granted AND not dismissed. The user can toggle visibility
// via the Interface options checkbox or the inline Dismiss button.
function applyPrivateWarningVisibility(dismissed) {
  const el = document.getElementById('private-warning');
  if (!el) return;
  el.style.display = (!privateAccessAllowed && !dismissed) ? 'flex' : 'none';
}

function setupEventListeners() {
  document.getElementById('help-btn').addEventListener('click', () => {
    browser.tabs.create({ url: browser.runtime.getURL('help.html') });
  });

  // Footer Help link mirrors the header Help button — opens help.html in a
  // new tab so any unsaved Options edits are preserved.
  document.getElementById('help-footer-link').addEventListener('click', (e) => {
    e.preventDefault();
    browser.tabs.create({ url: browser.runtime.getURL('help.html') });
  });

  document.getElementById('theme-toggle').addEventListener('click', async () => {
    const next = { auto: 'opposite', opposite: 'dark', dark: 'light', light: 'auto' }[themePref] || 'auto';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* unavailable */ }
    const showShadows = document.getElementById('show-shadows')?.checked ?? true;
    // Write to both sync and local so other devices and theme.js stay in sync.
    try {
      await writeSyncedSettings({ enabledLanguages: [...enabledLanguages], theme: next, showShadows });
    } catch (e) { /* no Firefox account or quota */ }
    await browser.storage.local.set({ theme: next });
  });

  // Instant-apply cosmetic toggle — no dirty bar, persisted immediately so
  // already-open blocked/warning/help tabs react via theme.js's storage listener.
  document.getElementById('show-shadows').addEventListener('change', async (e) => {
    const showShadows = e.target.checked;
    applyShadowPref(showShadows);
    try { localStorage.setItem('showShadows', String(showShadows)); } catch (e) { /* unavailable */ }
    try {
      await writeSyncedSettings({ enabledLanguages: [...enabledLanguages], theme: themePref, showShadows });
    } catch (e) { /* no Firefox account or quota */ }
    await browser.storage.local.set({ showShadows });
  });

  // Compact mode toggle — instant-apply, same pattern as show-shadows.
  document.getElementById('compact-mode').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    applyCompactMode(enabled);
    await browser.storage.local.set({ compactMode: enabled });
  });

  document.getElementById('edit-languages-btn').addEventListener('click', () => {
    openLanguageModal();
  });

  document.getElementById('modal-close-btn').addEventListener('click', () => {
    closeLanguageModal();
  });

  document.getElementById('language-modal-backdrop').addEventListener('click', () => {
    closeLanguageModal();
  });

  document.getElementById('edit-whitelist-btn').addEventListener('click', () => {
    openWhitelistModal();
  });

  document.getElementById('whitelist-modal-close-btn').addEventListener('click', () => {
    closeWhitelistModal();
  });

  document.getElementById('whitelist-modal-backdrop').addEventListener('click', () => {
    closeWhitelistModal();
  });

  // Show private-browsing warning toggle. Checkbox checked = show warning =
  // dismissed flag false. Inverted internally so the storage default (undefined)
  // means "not dismissed" and the warning shows naturally on first run.
  document.getElementById('show-private-warning').addEventListener('change', async (e) => {
    const dismissed = !e.target.checked;
    applyPrivateWarningVisibility(dismissed);
    await browser.storage.local.set({ dismissedPrivateWarning: dismissed });
  });

  // Inline dismiss link inside the warning banner. Sets the same flag and
  // keeps the Interface options checkbox in sync.
  document.getElementById('private-warning-dismiss').addEventListener('click', async () => {
    applyPrivateWarningVisibility(true);
    const cb = document.getElementById('show-private-warning');
    if (cb) cb.checked = false;
    await browser.storage.local.set({ dismissedPrivateWarning: true });
  });

  document.getElementById('reset-scripts').addEventListener('click', async () => {
    additionalScripts = getLocaleScripts();
    enabledLanguages = new Set(getLocaleLanguages());
    await applyToStorage();
    initialLanguages = new Set(enabledLanguages);
    refreshState();
    checkDirty();
  });

  document.getElementById('apply-btn').addEventListener('click', async () => {
    const wl = [...whitelist];
    const showShadows = document.getElementById('show-shadows').checked;

    // Clear dirty state before the awaits so the beforeunload guard does not
    // block the tab close that background.js will trigger.
    initialLanguages = new Set(enabledLanguages);
    initialWhitelist = [...whitelist];
    isDirty = false;
    checkDirty();

    // Write to sync (source of truth) and local (fallback).
    try {
      await Promise.all([
        writeSyncedSettings({ enabledLanguages: [...enabledLanguages], theme: themePref, showShadows }),
        writeSyncedWhitelist(wl)
      ]);
    } catch (e) {
      // Sync quota exceeded or no Firefox account — settings are saved locally only.
      // TODO: surface a "Sync storage full" warning in the UI when quota is hit.
    }
    await browser.storage.local.set({
      enabledLanguages: [...enabledLanguages],
      whitelist: wl
    });

    // background.js applies the settings, returns focus to the appropriate
    // blocked tab, and closes this options tab.
    await browser.runtime.sendMessage({
      type: 'applySettings',
      enabledLanguages: [...enabledLanguages],
      whitelist: wl
    });
  });

  document.getElementById('discard-btn').addEventListener('click', () => {
    isDirty = false;
    window.location.reload();
  });

  window.addEventListener('beforeunload', e => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}

// DEV-BEGIN
// Bridge for pages-dev.js — exposes options internals that are not on window.
window._devHooks = {
  getWhitelist:      () => whitelist,
  setWhitelist:      v  => { whitelist = v; },
  renderWhitelist:   () => renderWhitelist(),
  getLanguages:      () => ({ scripts: new Set(additionalScripts), languages: new Set(enabledLanguages) }),
  setLanguages:      ({ scripts, languages }) => {
    additionalScripts = new Set(scripts);
    enabledLanguages  = new Set(languages);
    refreshState();
  },
};
// DEV-END
