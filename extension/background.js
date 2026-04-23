// background.js
// Handles webRequest interception for blocking suspicious domains

// Global state
let permittedScripts = getPermittedScripts([navigator.language || 'en']);
let whitelist = new Set();
let additionalScripts = new Set();

// Domains the user has chosen to continue past the mixed-script warning for
// this browser session. Stored in memory only — cleared on browser restart.
const sessionAllowed = new Set();

// Track the most recent tab that was blocked so the options page can navigate
// it back to the original URL after the user applies new script permissions.
// Only the most recent blocked tab is tracked; if multiple tabs are blocked
// simultaneously the user would need to retry the others manually, but this
// covers the common case of one blocked page leading to one settings change.
let lastBlockedTabId = null;
let lastBlockedUrl = null;

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
  const locales = navigator.languages || [navigator.language || 'en'];
  permittedScripts = getPermittedScripts(locales);
  for (const script of additionalScripts) {
    permittedScripts.add(script);
  }
}

// Toolbar icon click — open options in a new tab rather than a popup.
// A full tab is needed because the options page has an explicit Apply/Discard
// workflow; popups are destroyed the moment they lose focus, which would
// silently discard any unsaved changes the user had made.
browser.action.onClicked.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL('options.html') });
});

// Storage change listener keeps background state in sync after a browser
// restart (when the options page may not be open to send an applySettings
// message). This is the recovery path; the primary update path during normal
// use is the applySettings message below.
browser.storage.onChanged.addListener((changes) => {
  if (changes.whitelist) {
    whitelist = new Set(changes.whitelist.newValue || []);
  }
  if (changes.additionalScripts) {
    additionalScripts = new Set(changes.additionalScripts.newValue || []);
    updatePermittedScripts();
  }
});

// Message from the options page when the user clicks Apply Changes.
// Accepting the new settings in the message (rather than waiting for the
// storage.onChanged event to propagate) means permittedScripts is updated
// synchronously before we navigate the blocked tab — no race condition between
// the settings taking effect and the webRequest check for the retried URL.
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'addToWhitelist') {
    // Sync in-memory whitelist when warning.js allows a domain permanently,
    // so the webRequest check passes before storage.onChanged can fire.
    whitelist.add(message.domain);
  }

  if (message.type === 'allowOnce') {
    // Add to session-allowed Set then navigate the warning tab to the original
    // URL. The webRequest check will pass because sessionAllowed is checked
    // before the mixed-script scan.
    sessionAllowed.add(message.domain);
    if (message.url && lastBlockedTabId !== null) {
      browser.tabs.update(lastBlockedTabId, { url: message.url });
      lastBlockedTabId = null;
      lastBlockedUrl = null;
    }
  }

  if (message.type === 'applySettings') {
    if (message.additionalScripts !== undefined) {
      additionalScripts = new Set(message.additionalScripts);
      updatePermittedScripts();
    }
    if (message.whitelist !== undefined) {
      whitelist = new Set(message.whitelist);
    }

    // If the user opened options from a blocked page, navigate that tab back
    // to the original URL. permittedScripts is already updated above, so the
    // webRequest handler will allow or re-block based on the new settings.
    if (message.blockedUrl && lastBlockedTabId !== null) {
      browser.tabs.update(lastBlockedTabId, { url: message.blockedUrl });
      lastBlockedTabId = null;
      lastBlockedUrl = null;
    }
  }
});

// WebRequest listener — intercepts all main-frame and sub-frame navigations
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const hostname = decodeHostname(url);

    // Whitelisted domains are always allowed regardless of script settings
    if (whitelist.has(hostname)) {
      return {};
    }

    // Domains the user has chosen to continue past a mixed-script warning this
    // session are allowed through without re-showing the warning.
    if (sessionAllowed.has(hostname)) {
      return {};
    }

    if (!permittedScripts) {
      permittedScripts = getPermittedScripts([navigator.language || 'en']);
    }

    // Step 1: block if any character's script is not in the permitted set
    const result = isHostnameAllowed(hostname, permittedScripts);
    if (!result.allowed) {
      // Remember which tab was blocked so the options page can retry it after
      // the user applies new permissions.
      lastBlockedTabId = details.tabId;
      lastBlockedUrl = url;

      const blockedPageUrl = browser.runtime.getURL('blocked.html') +
        `?url=${encodeURIComponent(url)}&char=${encodeURIComponent(result.offendingChar)}&script=${encodeURIComponent(result.script)}&chars=${encodeURIComponent(JSON.stringify(result.offendingChars))}`;
      return { redirectUrl: blockedPageUrl };
    }

    // Step 2: warn if any character is a known confusable (looks like a
    // different character). Catches attacks like а (Cyrillic) used in place of
    // a (Latin) even when Cyrillic is in the user's permitted script set.
    const confusables = getConfusableChars(hostname);
    if (confusables.length > 0) {
      lastBlockedTabId = details.tabId;
      lastBlockedUrl = url;
      const warningPageUrl = browser.runtime.getURL('warning.html') +
        `?url=${encodeURIComponent(url)}`;
      return { redirectUrl: warningPageUrl };
    }

    // Step 3: warn if the domain mixes characters from 2+ distinct scripts.
    // All scripts are permitted (step 1 passed) but the mix is suspicious —
    // this is the pattern used in homograph attacks like аpple.com (Cyrillic а
    // + Latin) when Cyrillic is in the user's permitted set.
    const domainScripts = new Set();
    for (const char of hostname) {
      const s = getCharScript(char);
      if (s && s !== 'Common' && s !== 'Inherited') {
        domainScripts.add(s);
      }
    }
    if (domainScripts.size >= 2) {
      lastBlockedTabId = details.tabId;
      lastBlockedUrl = url;
      const warningPageUrl = browser.runtime.getURL('warning.html') +
        `?url=${encodeURIComponent(url)}`;
      return { redirectUrl: warningPageUrl };
    }

    return {};
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame"]
  },
  ["blocking"]
);

initialize();
