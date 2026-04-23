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

// Language to scripts mapping
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
  buildScriptTree();
  setupEventListeners();
  updateTreeControls();

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
  updateTreeState();
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

function buildScriptTree() {
  const container = document.getElementById('script-tree');
  container.innerHTML = '';
  const latinContainer = document.getElementById('latin-section');
  latinContainer.innerHTML = '';

  const sortedLanguages = Object.keys(LANGUAGE_SCRIPTS).sort();
  const latinOnly = lang => LANGUAGE_SCRIPTS[lang].every(s => ALWAYS_PERMITTED.has(s));

  const toggleable = sortedLanguages.filter(lang => !latinOnly(lang));
  const alwaysOn   = sortedLanguages.filter(lang =>  latinOnly(lang));

  function appendLanguage(language, showBadge) {
    const scripts = LANGUAGE_SCRIPTS[language];
    const languageNode = createTreeNode(language, scripts, 'language', showBadge);
    container.appendChild(languageNode);

    const languageChildren = document.createElement('div');
    languageChildren.className = 'tree-children expanded';

    scripts.forEach(script => {
      const scriptNode = createTreeNode(script, script, 'script', showBadge);
      languageChildren.appendChild(scriptNode);
    });

    languageNode.appendChild(languageChildren);
  }

  toggleable.forEach(lang => appendLanguage(lang, true));

  const separator = document.createElement('div');
  separator.className = 'latin-only-separator';
  separator.textContent = 'The following languages use only the Latin script, which is always permitted and cannot be disabled.';
  latinContainer.appendChild(separator);

  const latinList = document.createElement('div');
  latinList.className = 'latin-only-list';
  latinList.textContent = alwaysOn.join(', ');
  latinContainer.appendChild(latinList);
}

function createTreeNode(label, data, type, showBadge = true) {
  const node = document.createElement('div');
  node.className = `tree-node ${type}`;

  const toggle = document.createElement('span');
  toggle.className = 'tree-toggle';
  if (type === 'language') {
    toggle.textContent = '▼';
    toggle.addEventListener('click', () => toggleNode(node));
  } else if (type === 'script') {
    toggle.textContent = '•';
  }

  const checkbox = document.createElement('span');
  checkbox.className = 'tree-checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.label = label;
  input.dataset.type = type;
  if (data) {
    if (Array.isArray(data)) {
      input.dataset.scripts = JSON.stringify(data);
    } else {
      input.dataset.script = data;
    }
  }
  const isAlwaysPermitted = type === 'script'
    ? ALWAYS_PERMITTED.has(data)
    : Array.isArray(data) && data.every(s => ALWAYS_PERMITTED.has(s));

  if (isAlwaysPermitted) {
    input.checked = true;
    input.disabled = true;
    node.classList.add('always-permitted');
  } else {
    input.addEventListener('change', () => handleCheckboxChange(input));
  }
  checkbox.appendChild(input);

  const text = document.createElement('span');
  text.textContent = label;

  node.appendChild(toggle);
  node.appendChild(checkbox);
  node.appendChild(text);

  if (isAlwaysPermitted && showBadge) {
    const badge = document.createElement('span');
    badge.className = 'always-permitted-label';
    badge.textContent = 'always permitted';
    node.appendChild(badge);
  }

  return node;
}

function toggleNode(node) {
  const children = node.querySelector('.tree-children');
  const toggle = node.querySelector('.tree-toggle');

  if (children.classList.contains('expanded')) {
    children.classList.remove('expanded');
    toggle.textContent = '▶';
  } else {
    children.classList.add('expanded');
    toggle.textContent = '▼';
  }
  updateTreeControls();
}

function updateTreeControls() {
  const allChildren = Array.from(document.querySelectorAll('.tree-node.language .tree-children'));
  const expandedCount = allChildren.filter(c => c.classList.contains('expanded')).length;
  const total = allChildren.length;

  document.getElementById('collapse-all').style.display = expandedCount > 0 ? '' : 'none';
  document.getElementById('expand-all').style.display   = expandedCount < total ? '' : 'none';
}

function handleCheckboxChange(checkbox) {
  const type = checkbox.dataset.type;
  const checked = checkbox.checked;

  if (type === 'language') {
    const languageNode = checkbox.closest('.tree-node');
    const scriptCheckboxes = languageNode.querySelectorAll('.tree-node.script input[type="checkbox"]');

    scriptCheckboxes.forEach(scriptCheckbox => {
      scriptCheckbox.checked = checked;
      updateScriptState(scriptCheckbox.dataset.script, checked);
      propagateScriptChange(scriptCheckbox.dataset.script, checked, languageNode);
    });

    updateLanguageState(languageNode);
  } else if (type === 'script') {
    const script = checkbox.dataset.script;
    const languageNode = checkbox.closest('.tree-node.language');

    updateScriptState(script, checked);
    updateLanguageState(languageNode);
    propagateScriptChange(script, checked, languageNode);
  }

  // Changes are held in memory until the user clicks Apply
  markDirty();
}

function propagateScriptChange(script, checked, originLanguageNode) {
  const otherLanguages = SCRIPT_TO_LANGUAGES[script] || [];

  otherLanguages.forEach(otherLang => {
    const otherLangNode = findLanguageNode(otherLang);
    if (otherLangNode && otherLangNode !== originLanguageNode) {
      const otherScriptCheckbox = otherLangNode.querySelector(`.tree-node.script input[data-script="${script}"]`);
      if (otherScriptCheckbox && otherScriptCheckbox.checked !== checked) {
        otherScriptCheckbox.checked = checked;
        updateLanguageState(otherLangNode);
      }
    }
  });
}

function findLanguageNode(languageLabel) {
  const allLanguageInputs = document.querySelectorAll('.tree-node.language input[data-type="language"]');
  for (let input of allLanguageInputs) {
    if (input.dataset.label === languageLabel) {
      return input.closest('.tree-node.language');
    }
  }
  return null;
}

function updateScriptState(script, enabled) {
  if (enabled) {
    additionalScripts.add(script);
  } else {
    additionalScripts.delete(script);
  }
}

function updateLanguageState(languageNode) {
  const scriptCheckboxes = languageNode.querySelectorAll('.tree-node.script input[type="checkbox"]');
  const languageCheckbox = languageNode.querySelector('input[type="checkbox"]');
  const checkboxContainer = languageNode.querySelector('.tree-checkbox');

  if (languageCheckbox.disabled) return;

  const toggleableCheckboxes = Array.from(scriptCheckboxes).filter(cb => !cb.disabled);
  const checkedScripts = toggleableCheckboxes.filter(cb => cb.checked).length;

  checkboxContainer.classList.remove('partial');

  if (checkedScripts === 0) {
    languageCheckbox.checked = false;
    languageCheckbox.indeterminate = false;
  } else if (checkedScripts === toggleableCheckboxes.length) {
    languageCheckbox.checked = true;
    languageCheckbox.indeterminate = false;
  } else {
    languageCheckbox.checked = false;
    languageCheckbox.indeterminate = true;
    checkboxContainer.classList.add('partial');
  }
}

function updateTreeState() {
  document.querySelectorAll('.tree-node.script input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = additionalScripts.has(checkbox.dataset.script);
  });

  document.querySelectorAll('.tree-node.language').forEach(languageNode => {
    updateLanguageState(languageNode);
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
  document.getElementById('collapse-all').addEventListener('click', () => {
    document.querySelectorAll('.tree-node.language').forEach(langNode => {
      const children = langNode.querySelector('.tree-children');
      if (children) children.classList.remove('expanded');
      const toggle = langNode.querySelector('.tree-toggle');
      if (toggle) toggle.textContent = '▶';
    });
    updateTreeControls();
  });

  document.getElementById('expand-all').addEventListener('click', () => {
    document.querySelectorAll('.tree-node.language').forEach(langNode => {
      const children = langNode.querySelector('.tree-children');
      if (children) children.classList.add('expanded');
      const toggle = langNode.querySelector('.tree-toggle');
      if (toggle) toggle.textContent = '▼';
    });
    updateTreeControls();
  });

  // Reset clears scripts in memory only — still requires Apply to take effect
  document.getElementById('reset-scripts').addEventListener('click', () => {
    additionalScripts.clear();
    updateTreeState();
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
