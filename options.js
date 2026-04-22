// options.js
// Handles the options page UI for managing whitelist and additional scripts

let whitelist = [];
let additionalScripts = new Set();

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
});

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts']);
  whitelist = result.whitelist || [];
  additionalScripts = new Set(result.additionalScripts || []);
  renderWhitelist();
  updateTreeState();
}

function renderWhitelist() {
  const container = document.getElementById('whitelist');
  container.innerHTML = '';

  if (whitelist.length === 0) {
    container.innerHTML = '<p>No whitelisted domains.</p>';
    return;
  }

  whitelist.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      <span>${domain}</span>
      <button class="remove-btn" data-domain="${domain}">Remove</button>
    `;
    container.appendChild(item);
  });

  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      removeFromWhitelist(domain);
    });
  });
}

function buildScriptTree() {
  const container = document.getElementById('script-tree');
  container.innerHTML = '';

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
  container.appendChild(separator);

  alwaysOn.forEach(lang => appendLanguage(lang, false));
}

function createTreeNode(label, data, type, showBadge = true) {
  const node = document.createElement('div');
  node.className = `tree-node ${type}`;

  const toggle = document.createElement('span');
  toggle.className = 'tree-toggle';
  if (type === 'language') {
    toggle.textContent = '▼'; // Languages always expanded
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
}

function handleCheckboxChange(checkbox) {
  const type = checkbox.dataset.type;
  const checked = checkbox.checked;

  if (type === 'language') {
    // When language checkbox changes, update all its scripts
    const scripts = JSON.parse(checkbox.dataset.scripts);
    const languageNode = checkbox.closest('.tree-node');
    const scriptCheckboxes = languageNode.querySelectorAll('.tree-node.script input[type="checkbox"]');

    scriptCheckboxes.forEach(scriptCheckbox => {
      scriptCheckbox.checked = checked;
      const script = scriptCheckbox.dataset.script;
      
      // Update the script state
      updateScriptState(script, checked);
      
      // Propagate this script change to all other languages with this script
      propagateScriptChange(script, checked, languageNode);
    });

    updateLanguageState(languageNode);
  } else if (type === 'script') {
    // When script checkbox changes:
    const script = checkbox.dataset.script;
    const languageNode = checkbox.closest('.tree-node.language');
    
    // Update the script state
    updateScriptState(script, checked);
    
    // Update the parent language state
    updateLanguageState(languageNode);
    
    // Propagate to all other languages with this script
    propagateScriptChange(script, checked, languageNode);
  }

  saveAdditionalScripts();
}

function propagateScriptChange(script, checked, originLanguageNode) {
  const otherLanguages = SCRIPT_TO_LANGUAGES[script] || [];
  
  otherLanguages.forEach(otherLang => {
    const otherLangNode = findLanguageNode(otherLang);
    if (otherLangNode && otherLangNode !== originLanguageNode) {
      const otherScriptCheckbox = otherLangNode.querySelector(`.tree-node.script input[data-script="${script}"]`);
      if (otherScriptCheckbox) {
        // Only update if different from the new state
        if (otherScriptCheckbox.checked !== checked) {
          otherScriptCheckbox.checked = checked;
          updateLanguageState(otherLangNode);
        }
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

  // Don't touch always-permitted language rows
  if (languageCheckbox.disabled) return;

  // Only count non-always-permitted scripts when determining state
  const toggleableCheckboxes = Array.from(scriptCheckboxes).filter(cb => !cb.disabled);
  const totalScripts = toggleableCheckboxes.length;
  const checkedScripts = toggleableCheckboxes.filter(cb => cb.checked).length;

  checkboxContainer.classList.remove('partial');

  if (checkedScripts === 0) {
    languageCheckbox.checked = false;
    languageCheckbox.indeterminate = false;
  } else if (checkedScripts === totalScripts) {
    languageCheckbox.checked = true;
    languageCheckbox.indeterminate = false;
  } else {
    // Partial: some scripts checked, some not
    languageCheckbox.checked = false;
    languageCheckbox.indeterminate = true;
    checkboxContainer.classList.add('partial');
  }
}

function updateTreeState() {
  // Update all checkboxes based on current additionalScripts
  document.querySelectorAll('.tree-node.script input[type="checkbox"]').forEach(checkbox => {
    const script = checkbox.dataset.script;
    checkbox.checked = additionalScripts.has(script);
  });

  // Update all language checkboxes
  document.querySelectorAll('.tree-node.language').forEach(languageNode => {
    updateLanguageState(languageNode);
  });
}

async function saveAdditionalScripts() {
  await browser.storage.local.set({ additionalScripts: Array.from(additionalScripts) });
}

async function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  await browser.storage.local.set({ whitelist });
  renderWhitelist();
}

function setupEventListeners() {
  document.getElementById('collapse-all').addEventListener('click', () => {
    document.querySelectorAll('.tree-node.language').forEach(langNode => {
      const children = langNode.querySelector('.tree-children');
      if (children) {
        children.classList.remove('expanded');
      }
      const toggle = langNode.querySelector('.tree-toggle');
      if (toggle) toggle.textContent = '▶';
    });
  });

  document.getElementById('reset-scripts').addEventListener('click', async () => {
    additionalScripts.clear();
    await browser.storage.local.set({ additionalScripts: [] });
    updateTreeState();
  });
}