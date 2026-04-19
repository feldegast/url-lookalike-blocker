// background.js
// Handles webRequest interception for blocking suspicious domains

// Global variables
let permittedScripts = null;
let whitelist = new Set();
let additionalScripts = new Set();

// Initialize on startup
async function initialize() {
  await loadSettings();
  updatePermittedScripts();
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

    // Skip if whitelisted
    if (whitelist.has(hostname)) {
      return {};
    }

    // Check if hostname is allowed
    const result = isHostnameAllowed(hostname, permittedScripts);
    if (!result.allowed) {
      // Block and redirect to blocked page
      const blockedUrl = browser.runtime.getURL('blocked.html') +
        `?url=${encodeURIComponent(url)}&char=${encodeURIComponent(result.offendingChar)}&script=${encodeURIComponent(result.script)}`;
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