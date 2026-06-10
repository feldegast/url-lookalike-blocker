// options.js
// Holds changes in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let additionalScripts = new Set(); // Set of enabled script names, e.g. 'Cyrillic', 'Han'
let enabledLanguages = new Set(); // Explicitly enabled language names — source of truth for langScriptSets
let whitelist = [];

// Snapshot of language state as loaded from storage, used to detect unsaved changes.
let initialLanguages = new Set();
let initialWhitelist = [];
let isDirty = false;


const urlParams = new URLSearchParams(window.location.search);
const initialBlockedTabId = urlParams.get('blockedTabId')
  ? parseInt(urlParams.get('blockedTabId'), 10) : null;

const LANGUAGE_SCRIPTS = {
  'English': ['Latin'],
  'Spanish': ['Latin'],
  'French': ['Latin'],
  'German': ['Latin'],
  'Italian': ['Latin'],
  'Portuguese': ['Latin'],
  'Dutch': ['Latin'],
  'Swedish': ['Latin'],
  'Norwegian': ['Latin'],
  'Danish': ['Latin'],
  'Finnish': ['Latin'],
  'Polish': ['Latin'],
  'Czech': ['Latin'],
  'Slovak': ['Latin'],
  'Hungarian': ['Latin'],
  'Romanian': ['Latin'],
  'Turkish': ['Latin'],
  'Vietnamese': ['Latin'],
  'Indonesian': ['Latin'],
  'Malay': ['Latin'],
  'Filipino': ['Latin'],
  'Catalan': ['Latin'],
  'Galician': ['Latin'],
  'Basque': ['Latin'],
  'Afrikaans': ['Latin'],
  'Esperanto': ['Latin'],
  'Russian': ['Cyrillic'],
  'Ukrainian': ['Cyrillic'],
  'Bulgarian': ['Cyrillic'],
  'Serbian': ['Cyrillic', 'Latin'],
  'Macedonian': ['Cyrillic'],
  'Belarusian': ['Cyrillic'],
  'Kazakh': ['Cyrillic'],
  'Kyrgyz': ['Cyrillic'],
  'Tajik': ['Cyrillic'],
  'Uzbek': ['Cyrillic'],
  'Mongolian (Cyrillic)': ['Cyrillic'],
  'Greek': ['Greek'],
  'Arabic': ['Arabic'],
  'Urdu': ['Arabic'],
  'Persian': ['Arabic'],
  'Pashto': ['Arabic'],
  'Hebrew': ['Hebrew'],
  'Japanese': ['Han', 'Hiragana', 'Katakana'],
  'Chinese (Simplified)': ['Han'],
  'Chinese (Traditional)': ['Han'],
  'Korean': ['Han', 'Hangul'],
  'Hindi': ['Devanagari'],
  'Marathi': ['Devanagari'],
  'Sanskrit': ['Devanagari'],
  'Bengali': ['Bengali'],
  'Punjabi (Gurmukhi)': ['Gurmukhi'],
  'Gujarati': ['Gujarati'],
  'Odia': ['Oriya'],
  'Tamil': ['Tamil'],
  'Telugu': ['Telugu'],
  'Kannada': ['Kannada'],
  'Malayalam': ['Malayalam'],
  'Thai': ['Thai'],
  'Lao': ['Lao'],
  'Khmer': ['Khmer'],
  'Burmese': ['Myanmar'],
  'Sinhala': ['Sinhala'],
  'Armenian': ['Armenian'],
  'Georgian': ['Georgian'],
  'Canadian Aboriginal': ['Canadian_Aboriginal'],
  'Cherokee': ['Cherokee']
};

// Scripts that are always permitted regardless of settings (hardcoded in unicode-scripts.js)
const ALWAYS_PERMITTED = new Set(['Latin', 'Common', 'Inherited']);

const LOCALE_TO_LANGUAGE = {
  'ru': 'Russian', 'uk': 'Ukrainian', 'bg': 'Bulgarian', 'sr': 'Serbian',
  'mk': 'Macedonian', 'be': 'Belarusian', 'kk': 'Kazakh', 'ky': 'Kyrgyz',
  'tg': 'Tajik', 'uz': 'Uzbek', 'mn': 'Mongolian (Cyrillic)', 'el': 'Greek',
  'ar': 'Arabic', 'ur': 'Urdu', 'fa': 'Persian', 'ps': 'Pashto', 'he': 'Hebrew',
  'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi', 'mr': 'Marathi', 'sa': 'Sanskrit',
  'bn': 'Bengali', 'pa': 'Punjabi (Gurmukhi)', 'gu': 'Gujarati', 'or': 'Odia',
  'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam', 'th': 'Thai',
  'lo': 'Lao', 'km': 'Khmer', 'my': 'Burmese', 'si': 'Sinhala', 'hy': 'Armenian',
  'ka': 'Georgian', 'iu': 'Canadian Aboriginal', 'chr': 'Cherokee'
};

function getLocaleLanguages() {
  const languages = new Set();
  for (const locale of (navigator.languages || [navigator.language || 'en'])) {
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

async function initTheme() {
  const result = await browser.storage.local.get('theme');
  const value = result.theme || 'auto';
  applyTheme(value);
  // Mirror to localStorage so apply-theme-early.js has a fresh sync cache next paint.
  try { localStorage.setItem('theme', value); } catch (e) { /* unavailable */ }
}

// Shadows default ON. Only suppress when explicitly disabled (false). Mirrors
// the logic in theme.js so blocked/warning/help pages stay in sync.
function applyShadowPref(showShadows) {
  document.documentElement.classList.toggle('no-shadows', showShadows === false);
  const cb = document.getElementById('show-shadows');
  if (cb) cb.checked = showShadows !== false;
}

async function initShadows() {
  const result = await browser.storage.local.get('showShadows');
  applyShadowPref(result.showShadows);
  // Mirror to localStorage so apply-theme-early.js has a fresh sync cache next paint.
  try {
    if (result.showShadows === undefined) localStorage.removeItem('showShadows');
    else localStorage.setItem('showShadows', String(result.showShadows));
  } catch (e) { /* unavailable */ }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initShadows();
  await loadSettings();
  buildLanguageTable();
  updateTableState();
  setupEventListeners();
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

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts', 'enabledLanguages']);
  whitelist = result.whitelist || [];

  if (result.additionalScripts === undefined) {
    // First run: seed from the browser locale so the user immediately sees
    // what has been permitted and can adjust if needed.
    additionalScripts = getLocaleScripts();
    enabledLanguages = new Set(getLocaleLanguages());
    await applyToStorage();
  } else {
    additionalScripts = new Set(result.additionalScripts);
    if (result.enabledLanguages !== undefined) {
      enabledLanguages = new Set(result.enabledLanguages);
    } else {
      // Backward compat: infer from additionalScripts using old logic.
      // Runs once — after the user applies, enabledLanguages is stored permanently.
      for (const [lang, scripts] of Object.entries(LANGUAGE_SCRIPTS)) {
        const required = scripts.filter(s => !ALWAYS_PERMITTED.has(s));
        if (required.length > 0 && required.every(s => additionalScripts.has(s))) {
          enabledLanguages.add(lang);
        }
      }
    }
  }

  initialLanguages = new Set(enabledLanguages);
  initialWhitelist = [...whitelist];
  renderWhitelist();
}

// Builds additionalLangScripts for background.js mixed-script detection.
// Uses enabledLanguages (explicitly checked by the user) rather than inferring
// from which scripts happen to be present — prevents a language that shares
// scripts with an enabled language (e.g. Serbian sharing Cyrillic with Russian)
// from being silently added to the blessed-mix list.
function computeLangScripts() {
  const out = [];
  for (const lang of enabledLanguages) {
    if (LANGUAGE_SCRIPTS[lang]) out.push(LANGUAGE_SCRIPTS[lang]);
  }
  return out;
}

// Saves the current additionalScripts to storage and notifies background.js.
// Used on first run and on reset so permissions take effect without requiring Apply.
async function applyToStorage() {
  const scripts = Array.from(additionalScripts);
  const langScripts = computeLangScripts();
  await browser.storage.local.set({
    additionalScripts: scripts,
    additionalLangScripts: langScripts,
    enabledLanguages: [...enabledLanguages]
  });
  await browser.runtime.sendMessage({
    type: 'applySettings',
    additionalScripts: scripts,
    additionalLangScripts: langScripts
  });
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

function renderWhitelist() {
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
  const latinContainer = document.getElementById('latin-section');
  latinContainer.replaceChildren();

  const sortedLanguages = Object.keys(LANGUAGE_SCRIPTS).sort();
  const latinOnly = lang => LANGUAGE_SCRIPTS[lang].every(s => ALWAYS_PERMITTED.has(s));
  const toggleable = sortedLanguages.filter(lang => !latinOnly(lang));
  const alwaysOn   = sortedLanguages.filter(lang =>  latinOnly(lang));

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
    const nonPermitted = allScripts.filter(s => !ALWAYS_PERMITTED.has(s));

    // Language parent row
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
      tag.textContent = script.replace(/_/g, ' ');
      scriptsTd.appendChild(tag);
    });
    tr.appendChild(scriptsTd);
    tbody.appendChild(tr);

    // Per-script sub-rows — read-only labels showing each script for any language
    // with 2+ total scripts. Language checkboxes are the only control; individual
    // scripts are not toggled separately.
    if (allScripts.length > 1) {
      allScripts.forEach(script => {
        const subTr = document.createElement('tr');
        subTr.className = 'script-sub-row';
        const subTd = document.createElement('td');
        const note = document.createElement('span');
        note.className = 'lang-label script-sub-label';
        note.textContent = script.replace(/_/g, ' ');
        subTd.appendChild(note);
        subTr.appendChild(subTd);
        subTr.appendChild(document.createElement('td'));
        tbody.appendChild(subTr);
      });
    }
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const separator = document.createElement('div');
  separator.className = 'latin-only-separator';
  separator.textContent = 'The following languages use the Latin script exclusively, which is always permitted and so these languages cannot be disabled.';
  latinContainer.appendChild(separator);
  const latinList = document.createElement('div');
  latinList.className = 'latin-only-list';
  latinList.textContent = alwaysOn.join(', ');
  latinContainer.appendChild(latinList);
}

// Toggling a language parent checks or unchecks all languages with the same full
// script set together. This keeps identical-script languages (e.g. Russian and
// Belarusian, both ['Cyrillic']) in sync so the checkbox state honestly reflects
// which scripts are permitted. Languages with a different set (e.g. Serbian
// ['Cyrillic','Latin']) are unaffected and stay in their own group.
function onLanguageToggle(language, checked) {
  const scripts = LANGUAGE_SCRIPTS[language] || [];

  // Find all languages whose full script set is identical to this one.
  const group = Object.keys(LANGUAGE_SCRIPTS).filter(lang => {
    const ls = LANGUAGE_SCRIPTS[lang];
    return ls.length === scripts.length && scripts.every(s => ls.includes(s));
  });

  for (const lang of group) {
    if (checked) enabledLanguages.add(lang);
    else enabledLanguages.delete(lang);
  }

  const nonPermitted = scripts.filter(s => !ALWAYS_PERMITTED.has(s));
  for (const s of nonPermitted) {
    if (checked) {
      additionalScripts.add(s);
    } else {
      // Only remove this script if no other enabled language still needs it.
      const stillNeeded = [...enabledLanguages].some(lang => (LANGUAGE_SCRIPTS[lang] || []).includes(s));
      if (!stillNeeded) additionalScripts.delete(s);
    }
  }
  updateTableState();
  checkDirty();
}

// Reflects the current state in all language checkboxes.
// Checked if in enabledLanguages; same-script languages are toggled as a group
// so Serbian stays unchecked when Russian is enabled (different script set).
function updateTableState() {
  document.querySelectorAll('input[data-language]').forEach(cb => {
    cb.checked = enabledLanguages.has(cb.dataset.language);
    cb.indeterminate = false;
  });
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
  if (cb) cb.checked = !dismissedPrivateWarning;
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
    const current = themePref;
    const next = { auto: 'opposite', opposite: 'dark', dark: 'light', light: 'auto' }[current] || 'auto';
    applyTheme(next);
    // Mirror to localStorage so apply-theme-early.js can apply this synchronously
    // on the next page load and avoid a flash of the previous theme.
    try { localStorage.setItem('theme', next); } catch (e) { /* unavailable */ }
    await browser.storage.local.set({ theme: next });
  });

  // Instant-apply cosmetic toggle — no dirty bar, persisted immediately so
  // already-open blocked/warning/help tabs react via theme.js's storage listener.
  document.getElementById('show-shadows').addEventListener('change', async (e) => {
    const showShadows = e.target.checked;
    applyShadowPref(showShadows);
    try { localStorage.setItem('showShadows', String(showShadows)); } catch (e) { /* unavailable */ }
    await browser.storage.local.set({ showShadows });
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
    updateTableState();
    checkDirty();
  });

  document.getElementById('apply-btn').addEventListener('click', async () => {
    const scripts = Array.from(additionalScripts);
    const langScripts = computeLangScripts();
    const wl = [...whitelist];

    // Clear dirty state before the awaits so the beforeunload guard does not
    // block the tab close that background.js will trigger.
    initialLanguages = new Set(enabledLanguages);
    initialWhitelist = [...whitelist];
    isDirty = false;
    checkDirty();

    await browser.storage.local.set({
      additionalScripts: scripts,
      additionalLangScripts: langScripts,
      enabledLanguages: [...enabledLanguages],
      whitelist: wl
    });

    // background.js applies the settings, returns focus to the appropriate
    // blocked tab, and closes this options tab.
    await browser.runtime.sendMessage({
      type: 'applySettings',
      additionalScripts: scripts,
      additionalLangScripts: langScripts,
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

// Bridge for pages-dev.js — exposes options internals that are not on window.
window._devHooks = {
  getWhitelist:    () => whitelist,
  setWhitelist:    v  => { whitelist = v; },
  renderWhitelist: () => renderWhitelist(),
};
