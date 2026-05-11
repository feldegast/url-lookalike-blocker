// warning.js
// Handles the mixed-script warning page UI.
// Shown when a domain uses characters from multiple permitted scripts —
// all scripts are allowed by the user's settings, but the mix is suspicious.
// decodeHostname, getCharScript, getConfusableChars are provided by unicode-scripts.js
// which is loaded before this script in warning.html.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');

  const unicodeDomain = decodeHostname(blockedUrl || '');

  // Check for confusable characters first — these are the highest-confidence
  // signal (a specific character known to mimic a different character).
  const confusables = getConfusableChars(unicodeDomain);
  const confusableSet = new Set(confusables.map(c => c.char));

  // Also collect all non-Common/Inherited characters for the mixed-script case.
  const alwaysIgnored = new Set(['Common', 'Inherited']);
  const mixedChars = [];
  const seen = new Set();
  for (const char of unicodeDomain) {
    if (!seen.has(char)) {
      const s = getCharScript(char);
      if (s && !alwaysIgnored.has(s)) {
        mixedChars.push({ char, script: s });
        seen.add(char);
      }
    }
  }

  // Decide which characters to show in the table: confusables if any were
  // found, otherwise the full mixed-script character set.
  const tableChars = confusables.length > 0
    ? confusables.map(({ char, looksLike, script }) => ({ char, looksLike, script }))
    : mixedChars.map(({ char, script }) => ({ char, looksLike: null, script }));

  // Collect the distinct scripts present (for the description line)
  const scriptsPresent = [...new Set(mixedChars.map(o => o.script))];

  // Characters to highlight in the Unicode domain display
  const highlightSet = confusables.length > 0 ? confusableSet
    : new Set(mixedChars.map(o => o.char));

  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  // Include the Unicode domain in the tab title so multiple warning tabs are
  // distinguishable without switching to each one.
  if (unicodeDomain) {
    document.title = `URL Lookalike Blocker — Mixed Script Domain — ${unicodeDomain}`;
  }

  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      document.getElementById('punycode-domain').textContent = urlObj.hostname;

      const domainEl = document.getElementById('unicode-domain');
      domainEl.textContent = '';
      for (const char of unicodeDomain) {
        if (highlightSet.has(char)) {
          const span = document.createElement('span');
          span.className = 'offending-char-glyph';
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

  const descEl = document.getElementById('script-description');
  if (confusables.length > 0) {
    descEl.textContent = 'This domain contains characters that look like different characters and may be impersonating a trusted site.';
  } else {
    descEl.textContent = `This domain mixes ${scriptsPresent.join(' and ')} characters.`;
  }

  // Populate the table — includes "Looks like" for confusables, "—" otherwise
  const tbody = document.getElementById('offending-chars-body');
  for (const { char, looksLike, script: s } of tableChars) {
    const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    const row = document.createElement('tr');
    const tdChar = document.createElement('td');
    tdChar.className = 'offending-char-glyph';
    tdChar.textContent = char;
    const tdLooks = document.createElement('td');
    if (looksLike) {
      const span = document.createElement('span');
      span.className = 'offending-char-glyph';
      span.textContent = looksLike;
      tdLooks.appendChild(span);
    } else {
      tdLooks.textContent = '—';
    }
    const tdCode = document.createElement('td');
    tdCode.textContent = codepoint;
    const tdScript = document.createElement('td');
    tdScript.textContent = s;
    row.appendChild(tdChar);
    row.appendChild(tdLooks);
    row.appendChild(tdCode);
    row.appendChild(tdScript);
    tbody.appendChild(row);
  }

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
      // background.js navigates this tab to blockedUrl
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
