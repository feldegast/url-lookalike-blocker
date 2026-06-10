// blocked.js
// Handles the blocked page UI and whitelist functionality.
// decodeHostname, getCharScript are provided by unicode-scripts.js
// which is loaded before this script in blocked.html.

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');

  // Self-identify this tab so the colour dot and openOptions message use the
  // correct tab ID without needing it passed through the redirect URL.
  const myTab = await browser.tabs.getCurrent();
  const myTabId = myTab ? myTab.id : null;

  // Derive colour from tab ID using the same formula as background.js.
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

  // Re-derive all non-compliant characters from the decoded hostname.
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

  // Include the Unicode domain in the tab title so multiple blocked tabs are
  // distinguishable without switching to each one.
  const titleDomain = decodeHostname(blockedUrl || '');
  if (titleDomain) {
    document.title = `URL Lookalike Blocker — Navigation Blocked — ${titleDomain}`;
  }

  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      const punycodeDomain = urlObj.hostname;
      const unicodeDomain = decodeHostname(blockedUrl);

      // Show the blocked URL with the hostname decoded to Unicode so the
      // offending characters are immediately visible with red highlights.
      // The raw punycode form is preserved in the Punycode domain row below.
      const blockedUrlEl = document.getElementById('blocked-url');
      const domainStart = blockedUrl.toLowerCase().indexOf(punycodeDomain);
      blockedUrlEl.appendChild(document.createTextNode(blockedUrl.slice(0, domainStart)));
      for (const char of unicodeDomain) {
        if (offendingSet.has(char)) {
          const span = document.createElement('span');
          span.style.color = 'red';
          span.style.fontWeight = 'bold';
          span.textContent = char;
          blockedUrlEl.appendChild(span);
        } else {
          blockedUrlEl.appendChild(document.createTextNode(char));
        }
      }
      let suffix = blockedUrl.slice(domainStart + punycodeDomain.length);
      try { suffix = decodeURIComponent(suffix); } catch (e) { /* keep encoded form on malformed input */ }
      blockedUrlEl.appendChild(document.createTextNode(suffix));

      document.getElementById('punycode-domain').textContent = punycodeDomain;

      // Unicode domain row: redundant now that the decoded form is inline
      // in the Blocked URL line above — hide it.
      if (unicodeDomain !== punycodeDomain) {
        document.getElementById('unicode-row').style.display = 'none';
      }
    } catch (e) {
      document.getElementById('blocked-url').textContent = blockedUrl;
      document.getElementById('punycode-domain').textContent = 'Error parsing URL';
      document.getElementById('unicode-domain').textContent = 'Error parsing URL';
    }
  } else {
    document.getElementById('blocked-url').textContent = 'Unknown';
  }

  const descEl = document.getElementById('script-description');
  descEl.textContent = offendingChars.length === 1
    ? "This character belongs to a script not permitted by your settings."
    : "These characters belong to scripts not permitted by your settings.";

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
    row.append(tdChar, tdCode, tdScript);
    tbody.appendChild(row);
  }

  document.getElementById('allow-btn').addEventListener('click', () => allowDomain(blockedUrl));

  // Try again — navigate back to the original URL after applying new settings.
  // If settings now permit it the page will load; otherwise it will be re-blocked.
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
