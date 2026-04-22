// blocked.js
// Handles the blocked page UI and whitelist functionality

// Copy necessary functions from unicode-scripts.js
function decodePunycode(punycode) {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  const INITIAL_BIAS = 72;
  const INITIAL_N = 128;

  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  let output = [];

  const lastHyphen = punycode.lastIndexOf('-');
  let encoded;
  if (lastHyphen >= 0) {
    for (let j = 0; j < lastHyphen; j++) {
      output.push(punycode.charCodeAt(j));
    }
    encoded = punycode.slice(lastHyphen + 1);
  } else {
    encoded = punycode;
  }

  let pos = 0;
  while (pos < encoded.length) {
    let oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      const cp = encoded.charCodeAt(pos++);
      let val;
      if (cp >= 48 && cp <= 57) {
        val = cp - 22;
      } else if (cp >= 65 && cp <= 90) {
        val = cp - 65;
      } else if (cp >= 97 && cp <= 122) {
        val = cp - 97;
      } else {
        return punycode;
      }
      if (pos > encoded.length) return punycode;
      i += val * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (val < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    output.splice(i, 0, n);
    i++;
  }

  return String.fromCodePoint(...output);
}

function adapt(delta, numpoints, first) {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  
  delta = first ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  delta += Math.floor(delta / numpoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) / 2) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor((BASE - TMIN + 1) * delta / (delta + SKEW));
}

function decodeHostname(url) {
  try {
    let hostname = new URL(url).hostname;
    return hostname.split('.').map(label => {
      if (label.toLowerCase().startsWith('xn--')) {
        return decodePunycode(label.slice(4));
      }
      return label;
    }).join('.');
  } catch (e) {
    return '';
  }
}

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

  // Extract and display domain versions
  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      const punycodeDomain = urlObj.hostname;
      const unicodeDomain = decodeHostname(blockedUrl);

      document.getElementById('punycode-domain').textContent = punycodeDomain;

      // Highlight all offending characters in the Unicode domain
      const highlighted = unicodeDomain.split('').map(char => {
        if (offendingSet.has(char)) {
          return `<span style="color: red; font-weight: bold;">${char}</span>`;
        }
        return char;
      }).join('');
      document.getElementById('unicode-domain').innerHTML = highlighted;
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
    row.innerHTML = `<td class="offending-char-glyph">${char}</td><td>${codepoint}</td><td>${s}</td>`;
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

        // Redirect to original URL
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