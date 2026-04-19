// background.js
// Handles webRequest interception for blocking suspicious domains

// Global variables
let permittedScripts = getPermittedScripts([navigator.language || 'en']);
let whitelist = new Set();
let additionalScripts = new Set();

// Initialize on startup
async function initialize() {
  console.log('URL Lookalike Blocker: initialize start');
  await loadSettings();
  updatePermittedScripts();
  console.log('URL Lookalike Blocker: initialize complete', Array.from(permittedScripts));
}

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts']);
  whitelist = new Set(result.whitelist || []);
  additionalScripts = new Set(result.additionalScripts || []);
}

function updatePermittedScripts() {
  // Get user's locales
  const locales = navigator.languages || [navigator.language || 'en'];
  permittedScripts = getPermittedScripts(locales);
  // Add additional scripts from options
  for (const script of additionalScripts) {
    permittedScripts.add(script);
  }
}

// Listen for storage changes to update settings
browser.storage.onChanged.addListener((changes) => {
  if (changes.whitelist) {
    whitelist = new Set(changes.whitelist.newValue || []);
  }
  if (changes.additionalScripts) {
    additionalScripts = new Set(changes.additionalScripts.newValue || []);
    updatePermittedScripts();
  }
});

// WebRequest listener
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const hostname = decodeHostname(url);
    console.log('URL Lookalike Blocker: onBeforeRequest', url, 'decoded hostname:', hostname);

    // Skip if whitelisted
    if (whitelist.has(hostname)) {
      console.log('URL Lookalike Blocker: hostname is whitelisted', hostname);
      return {};
    }

    // Ensure permittedScripts is available
    if (!permittedScripts) {
      permittedScripts = getPermittedScripts([navigator.language || 'en']);
      console.log('URL Lookalike Blocker: permittedScripts fallback', Array.from(permittedScripts));
    }

    // Check if hostname is allowed
    const result = isHostnameAllowed(hostname, permittedScripts);
    console.log('URL Lookalike Blocker: hostname allowed?', result.allowed, result, 'permittedScripts=', Array.from(permittedScripts));
    if (!result.allowed) {
      // Block and redirect to blocked page
      const blockedUrl = browser.runtime.getURL('blocked.html') +
        `?url=${encodeURIComponent(url)}&char=${encodeURIComponent(result.offendingChar)}&script=${encodeURIComponent(result.script)}`;
      console.log('URL Lookalike Blocker: redirecting to', blockedUrl);
      return { redirectUrl: blockedUrl };
    }

    return {};
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
  },
  ["blocking"]
);

// Initialize
initialize();