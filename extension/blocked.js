// blocked.js
// Handles the blocked page UI and whitelist functionality
// decodeHostname, getCharScript, getConfusableChars are provided by unicode-scripts.js
// which is loaded before this script in blocked.html.

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');

  // Re-derive all non-compliant characters from the decoded hostname.
  // This is more reliable than passing them through URL params.
  // getCharScript is available via the unicode-scripts.js script tag.
  const alwaysPermitted = new Set(['Common', 'Inherited', 'Latin']);
  const unicodeDomainForScan = decodeHostname(blockedUrl || '');
  const offendingChars = [];
  const seen = new Set();
  for (const char of unicodeDomainForScan) {
    if (!seen.has(char)) {
      const s = getCharScript(char);
      if (s && !alwaysPermitted.has(s)) {
        offendingChars.push({ char, script: s });
        seen.add(char);
      }
    }
  }
  const offendingSet = new Set(offendingChars.map(o => o.char));

  // Display blocked URL
  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  // Include the Unicode domain in the tab title so multiple blocked tabs are
  // distinguishable without switching to each one.
  const titleDomain = decodeHostname(blockedUrl || '');
  if (titleDomain) {
    document.title = `URL Lookalike Blocker — Navigation Blocked — ${titleDomain}`;
  }

  // Extract and display domain versions
  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      const punycodeDomain = urlObj.hostname;
      const unicodeDomain = decodeHostname(blockedUrl);

      document.getElementById('punycode-domain').textContent = punycodeDomain;

      // Highlight all offending characters in the Unicode domain
      const domainEl = document.getElementById('unicode-domain');
      domainEl.textContent = '';
      for (const char of unicodeDomain) {
        if (offendingSet.has(char)) {
          const span = document.createElement('span');
          span.style.color = 'red';
          span.style.fontWeight = 'bold';
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

  // Set description text based on number of non-compliant characters
  const descEl = document.getElementById('script-description');
  if (offendingChars.length === 1) {
    descEl.textContent = "This character belongs to a script not permitted by this plugin's settings.";
  } else {
    descEl.textContent = "These characters belong to scripts not permitted by this plugin's settings.";
  }

  // Populate all non-compliant characters table
  const tbody = document.getElementById('offending-chars-body');
  for (const { char, script: s } of offendingChars) {
    const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    const row = document.createElement('tr');
    const tdChar = document.createElement('td');
    tdChar.className = 'offending-char-glyph';
    tdChar.textContent = char;
    const tdCode = document.createElement('td');
    tdCode.textContent = codepoint;
    const tdScript = document.createElement('td');
    tdScript.textContent = s;
    row.appendChild(tdChar);
    row.appendChild(tdCode);
    row.appendChild(tdScript);
    tbody.appendChild(row);
  }

  // Allow button
  document.getElementById('allow-btn').addEventListener('click', async () => {
    if (blockedUrl) {
      const hostname = decodeHostname(blockedUrl);
      if (hostname) {
        // Add to whitelist
        const result = await browser.storage.local.get('whitelist');
        const whitelist = new Set(result.whitelist || []);
        whitelist.add(hostname);
        await browser.storage.local.set({ whitelist: Array.from(whitelist) });

        // Sync background.js in-memory whitelist before navigating so the
        // webRequest check sees the updated whitelist when the page loads.
        await browser.runtime.sendMessage({ type: 'addToWhitelist', domain: hostname });

        window.location.href = blockedUrl;
      }
    }
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });

  // Settings button — open options in a new tab, passing the blocked URL so the
  // options page can navigate this tab back to it after the user applies changes.
  document.getElementById('settings-btn').addEventListener('click', () => {
    const optionsUrl = browser.runtime.getURL('options.html') +
      (blockedUrl ? '?blockedUrl=' + encodeURIComponent(blockedUrl) : '');
    browser.tabs.create({ url: optionsUrl });
  });
});