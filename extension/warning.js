// warning.js
// Handles the mixed-script warning page UI.
// Shown when a domain uses characters from multiple permitted scripts —
// all scripts are allowed by the user's settings, but the mix is suspicious.

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

  // Find all non-Common/Inherited characters in the domain — these are the
  // characters that contribute to the mixed-script nature of the domain.
  const alwaysIgnored = new Set(['Common', 'Inherited']);
  const unicodeDomain = decodeHostname(blockedUrl || '');
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

  // Collect the distinct scripts present
  const scriptsPresent = [...new Set(mixedChars.map(o => o.script))];

  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      document.getElementById('punycode-domain').textContent = urlObj.hostname;

      // Highlight every non-Common/Inherited character in the Unicode domain
      const charSet = new Set(mixedChars.map(o => o.char));
      const highlighted = unicodeDomain.split('').map(char =>
        charSet.has(char)
          ? `<span class="offending-char-glyph">${char}</span>`
          : char
      ).join('');
      document.getElementById('unicode-domain').innerHTML = highlighted;
    } catch (e) {
      document.getElementById('punycode-domain').textContent = 'Error parsing URL';
      document.getElementById('unicode-domain').textContent = 'Error parsing URL';
    }
  }

  const descEl = document.getElementById('script-description');
  descEl.textContent = `This domain mixes ${scriptsPresent.join(' and ')} characters.`;

  // Populate the mixed characters table
  const tbody = document.getElementById('offending-chars-body');
  for (const { char, script: s } of mixedChars) {
    const codepoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    const row = document.createElement('tr');
    row.innerHTML = `<td class="offending-char-glyph">${char}</td><td>${codepoint}</td><td>${s}</td>`;
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
