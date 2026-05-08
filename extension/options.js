// options.js
// Handles the options page UI for managing whitelist and permitted languages.
// Changes are held in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let whitelist = [];
let additionalLanguages = new Set();

// Snapshots of the state as loaded from storage, used to detect whether the
// current state truly differs from what was saved.
let initialLanguages = new Set();
let initialWhitelist = [];

let isDirty = false;

// If the options page was opened from a blocked page, this holds the URL that
// was blocked so Apply can navigate the blocked tab back to it after saving.
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
  'Odia': ['Odia'],
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

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildLanguageTable();
  setupEventListeners();

  if (blockedUrl) {
    document.getElementById('apply-btn').textContent = 'Apply & Retry';
  }
});

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalLanguages']);
  whitelist = result.whitelist || [];
  additionalLanguages = new Set(result.additionalLanguages || []);
  initialLanguages = new Set(additionalLanguages);
  initialWhitelist = [...whitelist];
  renderWhitelist();
  updateTableState();
}

function checkDirty() {
  const languagesDiffer = !setsEqual(additionalLanguages, initialLanguages);
  const whitelistDiffer = !arraysEqualSorted(whitelist, initialWhitelist);
  isDirty = languagesDiffer || whitelistDiffer;
  document.getElementById('unsaved-indicator').style.display = isDirty ? '' : 'none';
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function arraysEqualSorted(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// Convert a Unicode domain back to its punycode (ACE) form.
function encodeToPunycode(unicodeDomain) {
  try {
    return new URL('http://' + unicodeDomain).hostname;
  } catch (e) {
    return unicodeDomain;
  }
}

// Return the non-Latin/Common/Inherited characters in a domain.
function getOffendingChars(unicodeDomain) {
  const alwaysPermitted = new Set(['Common', 'Inherited', 'Latin']);
  const chars = [];
  const seen = new Set();
  for (const char of unicodeDomain) {
    if (!seen.has(char)) {
      const s = getCharScript(char);
      if (s && !alwaysPermitted.has(s)) {
        chars.push({ char, script: s });
        seen.add(char);
      }
    }
  }
  return chars;
}

function renderWhitelist() {
  const container = document.getElementById('whitelist');
  container.innerHTML = '';

  if (whitelist.length === 0) {
    container.innerHTML = '<p>No whitelisted domains.</p>';
    return;
  }

  whitelist.forEach(domain => {
    const punycode = encodeToPunycode(domain);
    const offending = getOffendingChars(domain);
    const offendingSet = new Set(offending.map(o => o.char));

    const highlightedDomain = [...domain].map(char =>
      offendingSet.has(char)
        ? `<span class="offending-char-glyph">${char}</span>`
        : char
    ).join('');

    const rows = offending.map(({ char, script: s }) => {
      const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
      return `<tr><td class="offending-char-glyph">${char}</td><td>${codepoint}</td><td>${s}</td></tr>`;
    }).join('');

    const item = document.createElement('div');
    item.className = 'whitelist-item';

    const info = document.createElement('div');
    info.className = 'whitelist-info';
    info.innerHTML = `
      <div><strong>Unicode Domain:</strong> <span class="whitelist-unicode-domain">${highlightedDomain}</span></div>
      <div><strong>Punycode:</strong> <span class="whitelist-punycode">${punycode}</span></div>
      ${offending.length > 0 ? `
      <table class="offending-chars-table">
        <thead><tr><th>Character</th><th>Codepoint</th><th>Script</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : ''}
    `;

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
    const scripts = LANGUAGE_SCRIPTS[language];
    const tr = document.createElement('tr');
    tr.dataset.language = language;

    // Language cell — checkbox toggles the entire language
    const langTd = document.createElement('td');
    const langLabel = document.createElement('label');
    langLabel.className = 'lang-label';
    const langCheckbox = document.createElement('input');
    langCheckbox.type = 'checkbox';
    langCheckbox.dataset.language = language;
    langCheckbox.addEventListener('change', () => {
      if (langCheckbox.checked) {
        additionalLanguages.add(language);
      } else {
        additionalLanguages.delete(language);
      }
      checkDirty();
    });
    langLabel.appendChild(langCheckbox);
    langLabel.appendChild(document.createTextNode(' ' + language));
    langTd.appendChild(langLabel);
    tr.appendChild(langTd);

    // Scripts cell — read-only tags showing which scripts this language uses
    const scriptsTd = document.createElement('td');
    scripts.forEach(script => {
      const tag = document.createElement('span');
      tag.className = ALWAYS_PERMITTED.has(script) ? 'script-tag always-permitted' : 'script-tag';
      tag.textContent = script;
      scriptsTd.appendChild(tag);
    });
    tr.appendChild(scriptsTd);

    tbody.appendChild(tr);
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

function updateTableState() {
  document.querySelectorAll('input[data-language]').forEach(checkbox => {
    checkbox.checked = additionalLanguages.has(checkbox.dataset.language);
  });
}

function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  renderWhitelist();
  checkDirty();
}

function setupEventListeners() {
  document.getElementById('reset-scripts').addEventListener('click', () => {
    additionalLanguages.clear();
    updateTableState();
    checkDirty();
  });

  document.getElementById('apply-btn').addEventListener('click', async () => {
    const langs = Array.from(additionalLanguages);
    // Derive script permissions from enabled languages
    const scripts = [...new Set(langs.flatMap(l => LANGUAGE_SCRIPTS[l] || []))];
    const langScripts = langs.map(l => LANGUAGE_SCRIPTS[l]).filter(Boolean);
    const wl = [...whitelist];

    await browser.storage.local.set({
      additionalLanguages: langs,
      additionalScripts: scripts,
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

  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
