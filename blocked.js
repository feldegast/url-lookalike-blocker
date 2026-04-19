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
  const offendingChar = urlParams.get('char');
  const script = urlParams.get('script');

  // Display blocked URL
  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  // Extract and display domain versions
  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      const punycodeDomain = urlObj.hostname;
      const unicodeDomain = decodeHostname(blockedUrl);
      
      document.getElementById('punycode-domain').textContent = punycodeDomain;
      
      // Highlight offending characters in Unicode domain
      if (offendingChar && unicodeDomain) {
        const highlighted = unicodeDomain.split('').map(char => {
          if (char === offendingChar) {
            return `<span style="color: red; font-weight: bold;">${char}</span>`;
          }
          return char;
        }).join('');
        document.getElementById('unicode-domain').innerHTML = highlighted;
      } else {
        document.getElementById('unicode-domain').textContent = unicodeDomain;
      }
    } catch (e) {
      document.getElementById('punycode-domain').textContent = 'Error parsing URL';
      document.getElementById('unicode-domain').textContent = 'Error parsing URL';
    }
  }

  // Display offending character details
  if (offendingChar) {
    document.getElementById('offending-char').textContent = offendingChar;
    document.getElementById('codepoint').textContent = `U+${offendingChar.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    document.getElementById('script').textContent = script || 'Unknown';
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
});