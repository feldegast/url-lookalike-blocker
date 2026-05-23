// warning.js
// Handles the mixed-script warning page UI.
// Shown when a domain uses characters from multiple permitted scripts —
// all scripts are allowed by the user's settings, but the mix is suspicious.
// decodeHostname, getCharScript, getConfusableChars, LOCALE_SCRIPTS_MAP are
// provided by unicode-scripts.js which is loaded before this script.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');
  const unicodeDomain = decodeHostname(blockedUrl || '');

  const ALWAYS_PERMITTED = new Set(['Latin', 'Common', 'Inherited']);

  // --- Determine warning type ---
  // Step 2 trigger: confusable characters in a mixed-script label (targeted attack).
  // Step 3 trigger: mixed-script label with no confusables (suspicious combination).
  const confusables = getConfusableChars(unicodeDomain);
  const isConfusableWarning = confusables.length > 0;

  // For the mixed-script case: identify which non-Latin chars create the mix.
  let foreignChars = []; // {char, script} — non-Latin chars from suspicious labels
  let mixedScripts = []; // distinct scripts present in the suspicious label(s)

  if (!isConfusableWarning) {
    const seen = new Set();
    const allForeignScripts = new Set();
    let suspiciousLabelHasLatin = false;

    for (const label of unicodeDomain.split('.')) {
      const labelNonLatinScripts = new Set();
      let hasLatin = false;

      for (const char of label) {
        const s = getCharScript(char);
        if (s === 'Latin') hasLatin = true;
        else if (s && !ALWAYS_PERMITTED.has(s)) labelNonLatinScripts.add(s);
      }

      // Suspicious: a label with non-Latin chars alongside Latin, or 2+ non-Latin scripts
      const isSuspicious = (hasLatin && labelNonLatinScripts.size >= 1) ||
                           labelNonLatinScripts.size >= 2;

      if (isSuspicious) {
        if (hasLatin) suspiciousLabelHasLatin = true;
        for (const s of labelNonLatinScripts) allForeignScripts.add(s);
        for (const char of label) {
          const s = getCharScript(char);
          if (s && !ALWAYS_PERMITTED.has(s) && !seen.has(char)) {
            foreignChars.push({ char, script: s });
            seen.add(char);
          }
        }
      }
    }

    mixedScripts = [...allForeignScripts];
    if (suspiciousLabelHasLatin) mixedScripts.unshift('Latin');
  }

  // --- Page title and URL display ---
  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  if (unicodeDomain) {
    document.title = `URL Lookalike Blocker — Mixed Script Domain — ${unicodeDomain}`;
  }

  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      document.getElementById('punycode-domain').textContent = urlObj.hostname;

      // Build highlight map: confusable chars → red, foreign (non-Latin) chars → amber
      const highlightMap = new Map();
      if (isConfusableWarning) {
        for (const { char } of confusables) highlightMap.set(char, 'confusable');
      } else {
        for (const { char } of foreignChars) highlightMap.set(char, 'foreign');
      }

      const domainEl = document.getElementById('unicode-domain');
      domainEl.textContent = '';
      for (const char of unicodeDomain) {
        const style = highlightMap.get(char);
        if (style) {
          const span = document.createElement('span');
          span.className = style === 'confusable' ? 'confusable-char-glyph' : 'foreign-char-glyph';
          span.textContent = char;
          domainEl.appendChild(span);
        } else {
          domainEl.appendChild(document.createTextNode(char));
        }
      }
    } catch (e) {
      document.getElementById('punycode-domain').textContent = 'Error parsing URL';
      document.getElementById('unicode-domain').textContent = 'Error parsing URL';
    }
  }

  // --- Character table ---
  const thead = document.getElementById('offending-chars-head');
  const tbody = document.getElementById('offending-chars-body');
  tbody.textContent = '';

  if (isConfusableWarning) {
    document.getElementById('char-table-label').textContent = 'Suspicious characters:';
    thead.innerHTML = '<tr><th>Character</th><th>Looks like</th><th>Codepoint</th><th>Script</th></tr>';

    for (const { char, looksLike, script: s } of confusables) {
      const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
      const row = document.createElement('tr');
      const tdChar = document.createElement('td');
      tdChar.className = 'confusable-char-glyph';
      tdChar.textContent = char;
      const tdLooks = document.createElement('td');
      const span = document.createElement('span');
      span.className = 'confusable-char-glyph';
      span.textContent = looksLike;
      tdLooks.appendChild(span);
      const tdCode = document.createElement('td');
      tdCode.textContent = codepoint;
      const tdScript = document.createElement('td');
      tdScript.textContent = s;
      row.append(tdChar, tdLooks, tdCode, tdScript);
      tbody.appendChild(row);
    }
  } else {
    // Mixed-script case: show non-Latin chars without red — they're individually permitted.
    document.getElementById('char-table-label').textContent = 'Non-Latin characters in this domain:';
    thead.innerHTML = '<tr><th>Character</th><th>Codepoint</th><th>Script</th></tr>';

    for (const { char, script: s } of foreignChars) {
      const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
      const row = document.createElement('tr');
      const tdChar = document.createElement('td');
      tdChar.className = 'foreign-char-glyph';
      tdChar.textContent = char;
      const tdCode = document.createElement('td');
      tdCode.textContent = codepoint;
      const tdScript = document.createElement('td');
      tdScript.textContent = s;
      row.append(tdChar, tdCode, tdScript);
      tbody.appendChild(row);
    }
  }

  // --- Description and hint ---
  const descEl = document.getElementById('script-description');
  const hintEl = document.getElementById('script-hint');

  if (isConfusableWarning) {
    descEl.textContent = 'This domain contains characters that closely resemble different characters. This is a common technique used to impersonate trusted websites.';
    hintEl.style.display = 'none';
  } else {
    const scriptList = mixedScripts.join(' and ');
    descEl.textContent = `There are no enabled languages that permit combining ${scriptList} characters in a URL.`;

    // Find languages in LOCALE_SCRIPTS_MAP whose script set covers the mixed scripts.
    // Only look at canonical locale codes with a display name — these are the ones that
    // would appear as selectable languages in Extension Settings.
    const CANONICAL_NAMES = {
      'sr': 'Serbian',
      'ja': 'Japanese',
      'ko': 'Korean',
    };

    const nonLatinScripts = mixedScripts.filter(s => s !== 'Latin');
    const hasLatin = mixedScripts.includes('Latin');
    const blessingNames = [];

    for (const [locale, scripts] of Object.entries(LOCALE_SCRIPTS_MAP)) {
      const name = CANONICAL_NAMES[locale];
      if (!name) continue;
      const scriptSet = new Set(scripts);
      const coversNonLatin = nonLatinScripts.every(s => scriptSet.has(s));
      const coversLatin = !hasLatin || scriptSet.has('Latin');
      if (coversNonLatin && coversLatin) blessingNames.push(name);
    }

    const unique = [...new Set(blessingNames)];
    hintEl.textContent = unique.length > 0
      ? `To allow this combination, enable ${unique.join(' or ')} in Extension Settings.`
      : `To allow this combination, enable a language that uses all these scripts together in Extension Settings.`;
  }

  // --- Button handlers ---

  // Allow This Domain — permanently whitelist and navigate
  document.getElementById('allow-btn').addEventListener('click', async () => {
    if (blockedUrl) {
      const hostname = decodeHostname(blockedUrl);
      if (hostname) {
        const result = await browser.storage.local.get('whitelist');
        const wl = new Set(result.whitelist || []);
        wl.add(hostname);
        await browser.storage.local.set({ whitelist: Array.from(wl) });

        // Sync background.js in-memory whitelist before navigating so the
        // webRequest check sees the updated whitelist when the page loads.
        await browser.runtime.sendMessage({ type: 'addToWhitelist', domain: hostname });

        window.location.href = blockedUrl;
      }
    }
  });

  // Continue Anyway — allow this domain for the current browser session only.
  // background.js adds it to an in-memory Set that is cleared on restart.
  document.getElementById('continue-btn').addEventListener('click', async () => {
    if (blockedUrl) {
      const hostname = decodeHostname(blockedUrl);
      await browser.runtime.sendMessage({ type: 'allowOnce', domain: hostname, url: blockedUrl });
    }
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });

  // Open options in a new tab, passing the blocked URL so Apply can retry it
  document.getElementById('settings-btn').addEventListener('click', () => {
    const optionsUrl = browser.runtime.getURL('options.html') +
      (blockedUrl ? '?blockedUrl=' + encodeURIComponent(blockedUrl) : '');
    browser.tabs.create({ url: optionsUrl });
  });
});
