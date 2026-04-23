// options.js
// Handles the options page UI for managing whitelist and permitted scripts.
// Changes are held in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let whitelist = [];
let additionalScripts = new Set();

// Whether the user has made any changes since the page loaded or was last saved.
// Used to warn before closing the tab with unsaved work.
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
  'Japanese': ['Hiragana', 'Katakana', 'Han'],
  'Chinese (Simplified)': ['Han'],
  'Chinese (Traditional)': ['Han'],
  'Korean': ['Hangul', 'Han'],
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

// Build reverse mapping: script -> languages that use it
// Used to keep script checkboxes in sync across languages that share a script (e.g. Han in Japanese and Korean)
function buildScriptToLanguages() {
  const map = {};
  Object.entries(LANGUAGE_SCRIPTS).forEach(([lang, scripts]) => {
    scripts.forEach(script => {
      if (!map[script]) map[script] = [];
      map[script].push(lang);
    });
  });
  return map;
}

const SCRIPT_TO_LANGUAGES = buildScriptToLanguages();

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  buildScriptTable();
  setupEventListeners();

  // Update the Apply button label when the page was opened from a blocked tab,
  // so the user knows clicking it will also navigate that tab back to the URL.
  if (blockedUrl) {
    document.getElementById('apply-btn').textContent = 'Apply & Retry';
  }
});

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts']);
  whitelist = result.whitelist || [];
  additionalScripts = new Set(result.additionalScripts || []);
  renderWhitelist();
  updateTableState();
  // Loading from storage is not a user change — do not mark dirty
}

// Show the unsaved-changes indicator and set the dirty flag.
// Called whenever the user makes any change to the UI.
function markDirty() {
  isDirty = true;
  document.getElementById('unsaved-indicator').style.display = '';
}

// Convert a Unicode domain back to its punycode (ACE) form.
// The URL constructor handles IDN encoding natively.
function encodeToPunycode(unicodeDomain) {
  try {
    return new URL('http://' + unicodeDomain).hostname;
  } catch (e) {
    return unicodeDomain;
  }
}

// Return the non-Latin/Common/Inherited characters in a domain,
// using the same detection logic as blocked.js and background.js.
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

    // Highlight offending characters in the Unicode domain display
    const highlightedDomain = [...domain].map(char =>
      offendingSet.has(char)
        ? `<span class="offending-char-glyph">${char}</span>`
        : char
    ).join('');

    // Build the offending characters table rows
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

    // Use a closure over domain rather than a data attribute to avoid encoding issues
    // with Unicode characters in HTML attributes.
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeFromWhitelist(domain));

    item.appendChild(info);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

function buildScriptTable() {
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

    // Language cell — checkbox controls all scripts in this row
    const langTd = document.createElement('td');
    const langLabel = document.createElement('label');
    langLabel.className = 'lang-label';
    const langCheckbox = document.createElement('input');
    langCheckbox.type = 'checkbox';
    langCheckbox.dataset.type = 'language';
    langCheckbox.dataset.label = language;
    langCheckbox.dataset.scripts = JSON.stringify(scripts);
    if (scripts.every(s => ALWAYS_PERMITTED.has(s))) {
      langCheckbox.checked = true;
      langCheckbox.disabled = true;
    } else {
      langCheckbox.addEventListener('change', () => handleCheckboxChange(langCheckbox));
    }
    langLabel.appendChild(langCheckbox);
    langLabel.appendChild(document.createTextNode(' ' + language));
    langTd.appendChild(langLabel);
    tr.appendChild(langTd);

    // Scripts cell — individual checkboxes, one per script, shown inline
    const scriptsTd = document.createElement('td');
    scripts.forEach(script => {
      const isAlwaysPermitted = ALWAYS_PERMITTED.has(script);
      const scriptLabel = document.createElement('label');
      scriptLabel.className = 'script-label';
      const scriptCheckbox = document.createElement('input');
      scriptCheckbox.type = 'checkbox';
      scriptCheckbox.dataset.type = 'script';
      scriptCheckbox.dataset.label = script;
      scriptCheckbox.dataset.script = script;
      if (isAlwaysPermitted) {
        scriptCheckbox.checked = true;
        scriptCheckbox.disabled = true;
      } else {
        scriptCheckbox.addEventListener('change', () => handleCheckboxChange(scriptCheckbox));
      }
      scriptLabel.appendChild(scriptCheckbox);
      scriptLabel.appendChild(document.createTextNode(' ' + script));
      if (isAlwaysPermitted) {
        const badge = document.createElement('span');
        badge.className = 'always-permitted-label';
        badge.textContent = ' (always permitted)';
        scriptLabel.appendChild(badge);
      }
      scriptsTd.appendChild(scriptLabel);
    });
    tr.appendChild(scriptsTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const separator = document.createElement('div');
  separator.className = 'latin-only-separator';
  separator.textContent = 'The following languages use only the Latin script, which is always permitted and cannot be disabled.';
  latinContainer.appendChild(separator);

  const latinList = document.createElement('div');
  latinList.className = 'latin-only-list';
  latinList.textContent = alwaysOn.join(', ');
  latinContainer.appendChild(latinList);
}

function handleCheckboxChange(checkbox) {
  const type = checkbox.dataset.type;
  const checked = checkbox.checked;
  const row = checkbox.closest('tr');

  if (type === 'language') {
    row.querySelectorAll('input[data-type="script"]').forEach(scriptCheckbox => {
      if (!scriptCheckbox.disabled) {
        scriptCheckbox.checked = checked;
        updateScriptState(scriptCheckbox.dataset.script, checked);
        propagateScriptChange(scriptCheckbox.dataset.script, checked, row);
      }
    });
    updateLanguageState(row);
  } else if (type === 'script') {
    updateScriptState(checkbox.dataset.script, checked);
    updateLanguageState(row);
    propagateScriptChange(checkbox.dataset.script, checked, row);
  }

  markDirty();
}

// When a script checkbox changes, sync the same script checkbox in any other language row that shares it.
// E.g. enabling Han for Japanese should also check Han for Korean and Chinese.
function propagateScriptChange(script, checked, originRow) {
  (SCRIPT_TO_LANGUAGES[script] || []).forEach(otherLang => {
    const otherRow = findLanguageRow(otherLang);
    if (otherRow && otherRow !== originRow) {
      const otherScriptCheckbox = otherRow.querySelector(`input[data-script="${script}"]`);
      if (otherScriptCheckbox && otherScriptCheckbox.checked !== checked) {
        otherScriptCheckbox.checked = checked;
        updateLanguageState(otherRow);
      }
    }
  });
}

function findLanguageRow(languageLabel) {
  // querySelectorAll attribute values are quoted so parentheses in language names (e.g. "Mongolian (Cyrillic)") are safe
  return document.querySelector(`tr[data-language="${languageLabel}"]`);
}

function updateScriptState(script, enabled) {
  if (enabled) {
    additionalScripts.add(script);
  } else {
    additionalScripts.delete(script);
  }
}

function updateLanguageState(row) {
  const langCheckbox = row.querySelector('input[data-type="language"]');
  if (!langCheckbox || langCheckbox.disabled) return;

  const scriptCheckboxes = Array.from(row.querySelectorAll('input[data-type="script"]')).filter(cb => !cb.disabled);
  const checkedCount = scriptCheckboxes.filter(cb => cb.checked).length;

  if (checkedCount === 0) {
    langCheckbox.checked = false;
    langCheckbox.indeterminate = false;
  } else if (checkedCount === scriptCheckboxes.length) {
    langCheckbox.checked = true;
    langCheckbox.indeterminate = false;
  } else {
    // Some but not all scripts checked — show indeterminate state
    langCheckbox.checked = false;
    langCheckbox.indeterminate = true;
  }
}

function updateTableState() {
  document.querySelectorAll('input[data-type="script"]').forEach(checkbox => {
    if (!checkbox.disabled) {
      checkbox.checked = additionalScripts.has(checkbox.dataset.script);
    }
  });
  document.querySelectorAll('tr[data-language]').forEach(row => {
    updateLanguageState(row);
  });
}

// Remove a domain from the in-memory whitelist and re-render.
// The change is not saved to storage until the user clicks Apply.
function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  renderWhitelist();
  markDirty();
}

function setupEventListeners() {
  // Reset clears scripts in memory only — still requires Apply to take effect
  document.getElementById('reset-scripts').addEventListener('click', () => {
    additionalScripts.clear();
    updateTableState();
    markDirty();
  });

  document.getElementById('apply-btn').addEventListener('click', async () => {
    const scripts = Array.from(additionalScripts);
    const wl = [...whitelist];

    // Save to storage first so the settings persist across browser restarts
    await browser.storage.local.set({ additionalScripts: scripts, whitelist: wl });

    // Send new settings directly to background.js so permittedScripts is updated
    // synchronously before it navigates the blocked tab — relying on storage.onChanged
    // alone could introduce a race between the event arriving and the tab navigation.
    await browser.runtime.sendMessage({
      type: 'applySettings',
      additionalScripts: scripts,
      whitelist: wl,
      blockedUrl: blockedUrl || null
    });

    isDirty = false;

    // Close this tab — the user is done. If opened from a blocked page, the
    // blocked tab has already been navigated by background.js at this point.
    const tab = await browser.tabs.getCurrent();
    browser.tabs.remove(tab.id);
  });

  document.getElementById('discard-btn').addEventListener('click', () => {
    // Clear the dirty flag before reloading so the beforeunload prompt does not
    // fire and interrupt the discard — the user explicitly chose to throw away changes.
    isDirty = false;
    window.location.reload();
  });

  // Warn when the user tries to close the tab with unsaved changes.
  // Modern browsers control the dialog text (always something like
  // "Leave site? Changes you made may not be saved") — we cannot customise it.
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      // returnValue must be set for Firefox to show the dialog
      e.returnValue = '';
    }
  });
}
