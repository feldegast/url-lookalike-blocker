// warning.js
// Handles the mixed-script warning page UI.
// Shown when a domain uses characters from multiple permitted scripts —
// all scripts are allowed by the user's settings, but the mix is suspicious.
// decodeHostname, getCharScript, getConfusableChars, LOCALE_SCRIPTS_MAP are
// provided by unicode-scripts.js which is loaded before this script.

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');
  const unicodeDomain = decodeHostname(blockedUrl || '');

  // Self-identify this tab for the colour dot and openOptions message.
  const myTab = await browser.tabs.getCurrent();
  const myTabId = myTab ? myTab.id : null;

  function tabColor(tabId) {
    const hue = Math.round((tabId * 137.508) % 360);
    return `hsl(${hue}, 65%, 42%)`;
  }

  if (myTabId !== null) {
    const dot = document.getElementById('tab-dot');
    const wrapper = document.getElementById('tab-dot-wrapper');
    dot.style.background = tabColor(myTabId);
    wrapper.style.display = 'inline-block';
    wrapper.addEventListener('click', () => {
      browser.runtime.sendMessage({ type: 'openOptions', tabId: myTabId, color: tabColor(myTabId), blockedUrl });
    });
  }

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
  const warningKind = isConfusableWarning ? 'Confusable Character Domain Warning' : 'Mixed Script Domain Warning';
  if (unicodeDomain) {
    document.title = `URL Lookalike Blocker — ${warningKind} — ${unicodeDomain}`;
  }
  document.getElementById('warning-page-title').textContent = `URL Lookalike Blocker — ${warningKind}`;
  document.getElementById('warning-intro').textContent = isConfusableWarning
    ? 'This domain contains characters that closely resemble characters from a different script. This is a common technique used to impersonate trusted websites.'
    : 'This domain contains characters from multiple different scripts. Mixed-script domains are sometimes used in homograph attacks to make a URL look like a trusted site.';

  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      const punycodeDomain = urlObj.hostname;

      // Build highlight map: confusable chars → red, foreign (non-Latin) chars → amber
      const highlightMap = new Map();
      if (isConfusableWarning) {
        for (const { char } of confusables) highlightMap.set(char, 'confusable');
      } else {
        for (const { char } of foreignChars) highlightMap.set(char, 'foreign');
      }

      // Show the URL with the hostname decoded to Unicode so highlighted chars
      // are immediately visible. Punycode form is preserved in the row below.
      const urlEl = document.getElementById('blocked-url');
      const domainStart = blockedUrl.indexOf(punycodeDomain);
      urlEl.appendChild(document.createTextNode(blockedUrl.slice(0, domainStart)));
      for (const char of unicodeDomain) {
        const style = highlightMap.get(char);
        if (style) {
          const span = document.createElement('span');
          span.className = style === 'confusable' ? 'confusable-char-glyph' : 'foreign-char-glyph';
          span.textContent = char;
          urlEl.appendChild(span);
        } else {
          urlEl.appendChild(document.createTextNode(char));
        }
      }
      let suffix = blockedUrl.slice(domainStart + punycodeDomain.length);
      try { suffix = decodeURIComponent(suffix); } catch (e) { /* keep encoded form on malformed input */ }
      urlEl.appendChild(document.createTextNode(suffix));

      document.getElementById('punycode-domain').textContent = punycodeDomain;

      // Unicode domain row: redundant now that decoded chars are inline in
      // the URL line — hide it when there is actual decoding to show.
      if (unicodeDomain !== punycodeDomain) {
        document.getElementById('unicode-row').style.display = 'none';
      }

      // Also populate the unicode-domain element in case it is visible
      // (pure-ASCII domain edge case where unicode === punycode).
      const domainEl = document.getElementById('unicode-domain');
      domainEl.textContent = unicodeDomain;

    } catch (e) {
      document.getElementById('blocked-url').textContent = blockedUrl;
      document.getElementById('punycode-domain').textContent = 'Error parsing URL';
      document.getElementById('unicode-domain').textContent = 'Error parsing URL';
    }
  } else {
    document.getElementById('blocked-url').textContent = 'Unknown';
  }

  // --- Character table ---
  const thead = document.getElementById('offending-chars-head');
  const tbody = document.getElementById('offending-chars-body');
  tbody.textContent = '';

  if (isConfusableWarning) {
    document.getElementById('char-table-label').textContent = 'Suspicious characters:';
    thead.replaceChildren();
    const theadRow4 = document.createElement('tr');
    for (const text of ['Character', 'Looks like', 'Codepoint', 'Script']) {
      const th = document.createElement('th');
      th.textContent = text;
      theadRow4.appendChild(th);
    }
    thead.appendChild(theadRow4);

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
    thead.replaceChildren();
    const theadRow3 = document.createElement('tr');
    for (const text of ['Character', 'Codepoint', 'Script']) {
      const th = document.createElement('th');
      th.textContent = text;
      theadRow3.appendChild(th);
    }
    thead.appendChild(theadRow3);

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
    descEl.style.display = 'none';
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
  document.getElementById('allow-btn').addEventListener('click', () => allowDomain(blockedUrl));

  // Continue Anyway — allow this domain for the current browser session only.
  // background.js adds it to an in-memory Set that is cleared on restart.
  document.getElementById('continue-btn').addEventListener('click', async () => {
    if (blockedUrl) {
      const hostname = decodeHostname(blockedUrl);
      await browser.runtime.sendMessage({ type: 'allowOnce', domain: hostname, url: blockedUrl });
    }
  });

  // Try again — navigate back to the original URL after applying new settings.
  document.getElementById('try-again-btn').addEventListener('click', () => {
    if (blockedUrl) window.location.href = blockedUrl;
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });

  // Open settings — switches to the existing options tab (or creates one),
  // passing this tab's ID, colour, and URL so options can add the matching dot
  // and background.js can reconstruct state if the event page was restarted.
  document.getElementById('settings-btn').addEventListener('click', () => {
    browser.runtime.sendMessage({
      type: 'openOptions',
      tabId: myTabId,
      color: myTabId !== null ? tabColor(myTabId) : null,
      blockedUrl
    });
  });

});
