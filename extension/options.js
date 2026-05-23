// options.js
// Holds changes in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let additionalScripts = new Set(); // Set of enabled script names, e.g. 'Cyrillic', 'Han'
let enabledLanguages = new Set(); // Explicitly enabled language names — source of truth for langScriptSets
let whitelist = [];

// Snapshots of the state as loaded from storage, used to detect unsaved changes.
let initialScripts = new Set();
let initialLanguages = new Set();
let initialWhitelist = [];
let isDirty = false;

const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('blockedUrl');

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

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildLanguageTable();
  setupEventListeners();
  if (blockedUrl) {
    document.getElementById('apply-btn').textContent = 'Apply & Retry';
  }
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

  initialScripts = new Set(additionalScripts);
  initialLanguages = new Set(enabledLanguages);
  initialWhitelist = [...whitelist];
  renderWhitelist();
  updateTableState();
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
  isDirty = !setsEqual(additionalScripts, initialScripts) ||
            !setsEqual(enabledLanguages, initialLanguages) ||
            !arraysEqualSorted(whitelist, initialWhitelist);
  document.getElementById('unsaved-indicator').style.display = isDirty ? '' : 'none';
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
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
  container.innerHTML = '';

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
  container.innerHTML = '';
  const latinContainer = document.getElementById('latin-section');
  latinContainer.innerHTML = '';

  const sortedLanguages = Object.keys(LANGUAGE_SCRIPTS).sort();
  const latinOnly = lang => LANGUAGE_SCRIPTS[lang].every(s => ALWAYS_PERMITTED.has(s));
  const toggleable = sortedLanguages.filter(lang => !latinOnly(lang));
  const alwaysOn   = sortedLanguages.filter(lang =>  latinOnly(lang));

  const table = document.createElement('table');
  table.className = 'script-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Language</th><th>Scripts</th></tr>';
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
    langTd.appendChild(langLabel);
    tr.appendChild(langTd);

    const scriptsTd = document.createElement('td');
    allScripts.forEach(script => {
      const tag = document.createElement('span');
      tag.className = ALWAYS_PERMITTED.has(script) ? 'script-tag always-permitted' : 'script-tag';
      tag.textContent = script.replace(/_/g, ' ');
      scriptsTd.appendChild(tag);
    });
    tr.appendChild(scriptsTd);
    tbody.appendChild(tr);

    // Per-script sub-rows — only for languages with 2+ non-always-permitted scripts
    // (currently Japanese: Han/Hiragana/Katakana, Korean: Han/Hangul).
    // These let users enable individual scripts and expose the indeterminate parent state.
    if (nonPermitted.length > 1) {
      nonPermitted.forEach(script => {
        const subTr = document.createElement('tr');
        subTr.className = 'script-sub-row';

        const subTd = document.createElement('td');
        const subLabel = document.createElement('label');
        subLabel.className = 'lang-label script-sub-label';
        const subCb = document.createElement('input');
        subCb.type = 'checkbox';
        subCb.dataset.script = script;
        subCb.addEventListener('change', () => onScriptToggle(script, subCb.checked));
        subLabel.appendChild(subCb);
        subLabel.appendChild(document.createTextNode(' ' + script.replace(/_/g, ' ')));
        subTd.appendChild(subLabel);
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

// Toggling an individual script sub-checkbox. Because additionalScripts is a flat
// Set shared across all languages, changing Han here also updates the Han-bearing
// parent checkboxes for Korean and Chinese (Simplified/Traditional) automatically.
// When all scripts of a multi-script language are enabled via sub-rows, that
// language is added to enabledLanguages so its script mix is blessed correctly.
function onScriptToggle(script, checked) {
  if (checked) additionalScripts.add(script);
  else additionalScripts.delete(script);
  // Sync enabledLanguages for languages that have sub-rows (2+ non-always-permitted scripts).
  for (const [lang, scripts] of Object.entries(LANGUAGE_SCRIPTS)) {
    const nonPermitted = scripts.filter(s => !ALWAYS_PERMITTED.has(s));
    if (nonPermitted.length <= 1) continue;
    if (nonPermitted.every(s => additionalScripts.has(s))) enabledLanguages.add(lang);
    else enabledLanguages.delete(lang);
  }
  updateTableState();
  checkDirty();
}

// Reflects the current state in all checkboxes.
// Language parent: checked if in enabledLanguages (explicit or auto-grouped).
// Because same-script languages are toggled as a group, this accurately reflects
// which languages' scripts are permitted. Serbian stays unchecked when Russian is
// enabled — its full set ['Cyrillic','Latin'] is a different group from ['Cyrillic'].
// Indeterminate = multi-script language with only some sub-scripts enabled.
// Per-script sub-checkboxes: checked iff that script is in additionalScripts.
function updateTableState() {
  document.querySelectorAll('input[data-language]').forEach(cb => {
    const lang = cb.dataset.language;
    if (enabledLanguages.has(lang)) {
      cb.checked = true; cb.indeterminate = false;
    } else {
      const nonPermitted = (LANGUAGE_SCRIPTS[lang] || []).filter(s => !ALWAYS_PERMITTED.has(s));
      if (nonPermitted.length > 1) {
        const n = nonPermitted.filter(s => additionalScripts.has(s)).length;
        cb.checked = false; cb.indeterminate = n > 0 && n < nonPermitted.length;
      } else {
        cb.checked = false; cb.indeterminate = false;
      }
    }
  });
  document.querySelectorAll('input[data-script]').forEach(cb => {
    cb.checked = additionalScripts.has(cb.dataset.script);
    cb.indeterminate = false;
  });
}

function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  renderWhitelist();
  checkDirty();
}

function setupEventListeners() {
  document.getElementById('reset-scripts').addEventListener('click', async () => {
    additionalScripts = getLocaleScripts();
    enabledLanguages = new Set(getLocaleLanguages());
    await applyToStorage();
    initialScripts = new Set(additionalScripts);
    initialLanguages = new Set(enabledLanguages);
    updateTableState();
    checkDirty();
  });

  document.getElementById('apply-btn').addEventListener('click', async () => {
    const scripts = Array.from(additionalScripts);
    const langScripts = computeLangScripts();
    const wl = [...whitelist];

    await browser.storage.local.set({
      additionalScripts: scripts,
      additionalLangScripts: langScripts,
      enabledLanguages: [...enabledLanguages],
      whitelist: wl
    });

    await browser.runtime.sendMessage({
      type: 'applySettings',
      additionalScripts: scripts,
      additionalLangScripts: langScripts,
      whitelist: wl,
      blockedUrl: blockedUrl || null
    });

    isDirty = false;

    const tab = await browser.tabs.getCurrent();
    browser.tabs.remove(tab.id);
  });

  document.getElementById('discard-btn').addEventListener('click', () => {
    isDirty = false;
    window.location.reload();
  });

  window.addEventListener('beforeunload', e => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}
