// options.js
// Handles the options page UI for managing whitelist and permitted scripts.
// Changes are held in memory until the user clicks Apply — nothing is saved
// to storage automatically on checkbox change or whitelist removal.

let whitelist = [];
let additionalScripts = new Set();

// Snapshots of the state as loaded from storage, used to detect whether the
// current state truly differs from what was saved (so toggling back to the
// original state correctly clears the "Unsaved changes" indicator).
let initialScripts = new Set();
let initialWhitelist = [];

// Whether the current state differs from the saved state.
// Recomputed after every change rather than set on first edit, so it goes
// back to false if the user undoes all their changes.
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
  'Japanese': ['Hiragana', 'Han', 'Katakana'],
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
  // Snapshot the loaded state so checkDirty can compare against it
  initialScripts = new Set(additionalScripts);
  initialWhitelist = [...whitelist];
  renderWhitelist();
  updateTableState();
}

// Recompute whether the current state differs from the saved state and
// update the indicator accordingly. Called after every user change so that
// undoing all edits correctly hides the "Unsaved changes" text.
function checkDirty() {
  const scriptsDiffer = !setsEqual(additionalScripts, initialScripts);
  const whitelistDiffer = !arraysEqualSorted(whitelist, initialWhitelist);
  isDirty = scriptsDiffer || whitelistDiffer;
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

  // Max scripts any single language has — sets the number of script columns.
  // Japanese (Hiragana, Katakana, Han) is currently the maximum at 3.
  const MAX_SCRIPTS = 3;

  const table = document.createElement('table');
  table.className = 'script-table';

  // Fix column widths so all 3 script columns are equal regardless of content.
  // 40% for the language column, remaining 60% split evenly across script columns.
  const colgroup = document.createElement('colgroup');
  const langCol = document.createElement('col');
  langCol.style.width = '40%';
  colgroup.appendChild(langCol);
  for (let i = 0; i < MAX_SCRIPTS; i++) {
    const scriptCol = document.createElement('col');
    scriptCol.style.width = `${60 / MAX_SCRIPTS}%`;
    colgroup.appendChild(scriptCol);
  }
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th>Language</th><th colspan="${MAX_SCRIPTS}">Scripts</th></tr>`;
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

    // Script columns — one <td> per script, last cell gets colspan to fill
    // remaining columns so single-script rows span the full scripts section.
    scripts.forEach((script, index) => {
      const isAlwaysPermitted = ALWAYS_PERMITTED.has(script);
      const scriptTd = document.createElement('td');
      if (index === scripts.length - 1) {
        scriptTd.colSpan = MAX_SCRIPTS - scripts.length + 1;
      }
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
      scriptTd.appendChild(scriptLabel);
      tr.appendChild(scriptTd);
    });
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

  checkDirty();
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
  checkDirty();
}

function setupEventListeners() {
  // Reset clears scripts in memory only — still requires Apply to take effect
  document.getElementById('reset-scripts').addEventListener('click', () => {
    additionalScripts.clear();
    updateTableState();
    checkDirty();
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
