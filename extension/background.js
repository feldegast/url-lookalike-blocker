// background.js
// Handles webRequest interception for blocking suspicious domains

// Global state
// Permitted scripts are derived solely from user-enabled languages — browser
// locale is intentionally ignored so permissions are always visible in the UI.
let permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
let whitelist = new Set();
let additionalScripts = new Set();
let additionalLangScripts = []; // array of script arrays for explicitly-enabled languages
let enabledLangScriptSets = []; // derived from user-enabled languages only; used by step 3

// Domains the user has chosen to continue past the mixed-script warning for
// this browser session. Stored in memory only — cleared on browser restart.
const sessionAllowed = new Set();

// Per-tab record of blocked navigations: tabId -> {url, color}.
// color is a CSS string derived from the tabId so the blocked tab and its
// matching options context share a visual identifier.
const blockedTabs = new Map();

// The single options tab. When it exists, toolbar clicks switch to it rather
// than opening a second one.
let optionsTabId = null;

// Cache of hostname detection results. Keyed by hostname; value is the
// redirect URL string to return, or '' for allow. Cleared whenever settings
// or the whitelist change so stale results are never served.
const hostnameCache = new Map();

// Generates a stable HSL colour from a tab ID using the golden angle so
// successive tab IDs produce visually distinct hues.
function tabColor(tabId) {
  const hue = Math.round((tabId * 137.508) % 360);
  return `hsl(${hue}, 65%, 42%)`;
}

// Notify the options tab of a new or closed blocked tab. Silently ignored if
// options is not open or the message channel is not yet ready.
function notifyOptions(message) {
  if (optionsTabId !== null) {
    browser.tabs.sendMessage(optionsTabId, message).catch(() => {});
  }
}

// Initialize on startup
async function initialize() {
  await loadSettings();
  updatePermittedScripts();
}

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts', 'additionalLangScripts']);
  whitelist = new Set(result.whitelist || []);
  additionalScripts = new Set(result.additionalScripts || []);
  additionalLangScripts = result.additionalLangScripts || [];
}

function updatePermittedScripts() {
  permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
  for (const script of additionalScripts) {
    permittedScripts.add(script);
  }
  enabledLangScriptSets = additionalLangScripts.map(scripts => new Set(scripts));
  hostnameCache.clear();
}

// Returns true if hostname exactly matches a whitelisted domain or is a
// subdomain of one. Suffix matching means allowing example.com also allows
// www.example.com and login.example.com without requiring separate entries.
function isWhitelisted(hostname) {
  for (const domain of whitelist) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
  }
  return false;
}

// Toolbar icon click — switch to the existing options tab if one is open,
// otherwise create a new one. A full tab is needed because the options page
// has an explicit Apply/Discard workflow; popups are destroyed the moment
// they lose focus, which would silently discard unsaved changes.
browser.action.onClicked.addListener(async () => {
  if (optionsTabId !== null) {
    browser.tabs.update(optionsTabId, { active: true });
  } else {
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
    browser.tabs.create({
      url: browser.runtime.getURL('options.html'),
      index: currentTab ? currentTab.index + 1 : undefined
    }).then(tab => { optionsTabId = tab.id; });
  }
});

// Clean up when any tab closes.
browser.tabs.onRemoved.addListener((tabId) => {
  if (blockedTabs.has(tabId)) {
    blockedTabs.delete(tabId);
    notifyOptions({ type: 'blockedTabClosed', tabId });
  }
  if (tabId === optionsTabId) {
    optionsTabId = null;
  }
});

// Storage change listener keeps background state in sync after a browser
// restart (when the options page may not be open to send an applySettings
// message). This is the recovery path; the primary update path during normal
// use is the applySettings message below.
browser.storage.onChanged.addListener((changes) => {
  if (changes.whitelist) {
    whitelist = new Set(changes.whitelist.newValue || []);
    hostnameCache.clear();
  }
  if (changes.additionalScripts) {
    additionalScripts = new Set(changes.additionalScripts.newValue || []);
  }
  if (changes.additionalLangScripts) {
    additionalLangScripts = changes.additionalLangScripts.newValue || [];
  }
  if (changes.additionalScripts || changes.additionalLangScripts) {
    updatePermittedScripts();
  }
});

// Message handler for all extension pages.
browser.runtime.onMessage.addListener((message, sender) => {

  if (message.type === 'addToWhitelist') {
    // Sync in-memory whitelist when a page allows a domain permanently,
    // so the webRequest check passes before storage.onChanged can fire.
    whitelist.add(message.domain);
    hostnameCache.clear();
    return;
  }

  if (message.type === 'allowOnce') {
    // Add to session-allowed Set then navigate the warning tab to the original
    // URL. The webRequest check will pass because sessionAllowed is checked
    // before the mixed-script scan. sender.tab.id is the warning page tab —
    // the same tab that needs to be navigated to the original URL.
    sessionAllowed.add(message.domain);
    if (message.url && sender.tab) {
      browser.tabs.update(sender.tab.id, { url: message.url });
      blockedTabs.delete(sender.tab.id);
      notifyOptions({ type: 'blockedTabClosed', tabId: sender.tab.id });
    }
    return;
  }

  if (message.type === 'openOptions') {
    // Called by blocked/warning pages when the user clicks "Open Settings".
    // Switches to the existing options tab (adding this tab's dot) or creates one.
    const { tabId: blockedTabId, color } = message;
    const entry = blockedTabs.get(blockedTabId);
    if (optionsTabId !== null) {
      browser.tabs.update(optionsTabId, { active: true });
      notifyOptions({
        type: 'addBlockedTab',
        tabId: blockedTabId,
        url: entry ? entry.url : '',
        color,
        select: true
      });
    } else {
      browser.tabs.query({ active: true, currentWindow: true }).then(([currentTab]) => {
        browser.tabs.create({
          url: browser.runtime.getURL('options.html') + `?blockedTabId=${blockedTabId}`,
          index: currentTab ? currentTab.index + 1 : undefined
        }).then(tab => { optionsTabId = tab.id; });
      });
    }
    return;
  }

  if (message.type === 'getBlockedTabs') {
    // Options page queries this on load to populate the tab colour selector.
    return Promise.resolve(
      [...blockedTabs.entries()].map(([tabId, { url, color }]) => ({ tabId, url, color }))
    );
  }

  if (message.type === 'switchToTab') {
    // Options page wants to focus a specific blocked tab.
    browser.tabs.update(message.tabId, { active: true }).catch(() => {});
    return;
  }

  if (message.type === 'focusOptions') {
    // Blocked/warning page wants to switch browser focus to the options tab.
    if (optionsTabId !== null) {
      browser.tabs.update(optionsTabId, { active: true }).catch(() => {});
    }
    return;
  }

  if (message.type === 'applySettings') {
    // Accept new settings from the options page synchronously so permittedScripts
    // is updated before we navigate the blocked tab — no race condition.
    if (message.additionalScripts !== undefined) {
      additionalScripts = new Set(message.additionalScripts);
    }
    if (message.additionalLangScripts !== undefined) {
      additionalLangScripts = message.additionalLangScripts;
    }
    if (message.additionalScripts !== undefined || message.additionalLangScripts !== undefined) {
      updatePermittedScripts();
    }
    if (message.whitelist !== undefined) {
      whitelist = new Set(message.whitelist);
      hostnameCache.clear();
    }

    // Navigate the selected blocked tab back to its original URL.
    // permittedScripts is already updated so the webRequest check will
    // allow or re-block based on the new settings.
    if (message.retryTabId !== undefined && blockedTabs.has(message.retryTabId)) {
      const { url } = blockedTabs.get(message.retryTabId);
      browser.tabs.update(message.retryTabId, { url });
      blockedTabs.delete(message.retryTabId);
      notifyOptions({ type: 'blockedTabClosed', tabId: message.retryTabId });
    }
    return;
  }
});

// Records a tab as blocked and notifies options if it is already open.
function recordBlockedTab(tabId, url) {
  const color = tabColor(tabId);
  blockedTabs.set(tabId, { url, color });
  notifyOptions({ type: 'addBlockedTab', tabId, url, color, select: false });
  return color;
}

// WebRequest listener — intercepts main-frame navigations only.
// sub_frame is excluded to avoid breaking embedded content (CDNs, widgets).
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    const hostname = decodeHostname(url);

    // Whitelisted domains (and their subdomains) are always allowed
    if (isWhitelisted(hostname)) {
      return {};
    }

    // Domains the user has chosen to continue past a mixed-script warning this
    // session are allowed through without re-showing the warning.
    if (sessionAllowed.has(hostname)) {
      return {};
    }

    if (!permittedScripts) {
      permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
    }

    // Return cached result for this hostname if available. The cache is
    // cleared whenever settings or the whitelist change.
    const cached = hostnameCache.get(hostname);
    if (cached !== undefined) {
      if (cached) {
        recordBlockedTab(details.tabId, url);
        return { redirectUrl: cached };
      }
      return {};
    }

    // Step 1: block if any character's script is not in the permitted set
    const result = isHostnameAllowed(hostname, permittedScripts);
    if (!result.allowed) {
      const blockedPageUrl = browser.runtime.getURL('blocked.html') +
        `?url=${encodeURIComponent(url)}`;
      hostnameCache.set(hostname, blockedPageUrl);
      recordBlockedTab(details.tabId, url);
      return { redirectUrl: blockedPageUrl };
    }

    // Step 2: warn if a confusable character appears in a label that also
    // mixes scripts. Requiring both conditions targets real homograph attacks
    // (e.g. Cyrillic 'а' alongside Latin letters in 'аpple.com') without
    // warning on legitimate international domains where confusable characters
    // appear in a purely single-script label (e.g. a Russian domain where
    // 'а' is surrounded only by other Cyrillic characters).
    const confusables = getConfusableChars(hostname);
    if (confusables.length > 0) {
      const confusableSet = new Set(confusables.map(c => c.char));
      const hasConfusableInMixedLabel = hostname.split('.').some(label => {
        if (![...label].some(c => confusableSet.has(c))) return false;
        const scripts = new Set(
          [...label].map(getCharScript).filter(s => s && s !== 'Common' && s !== 'Inherited')
        );
        return scripts.size >= 2;
      });
      if (hasConfusableInMixedLabel) {
        const warningPageUrl = browser.runtime.getURL('warning.html') +
          `?url=${encodeURIComponent(url)}`;
        hostnameCache.set(hostname, warningPageUrl);
        recordBlockedTab(details.tabId, url);
        return { redirectUrl: warningPageUrl };
      }
    }

    // Step 3: warn if any single label mixes scripts from 2+ locales.
    // Checks per-label (not per-hostname) so Latin TLDs like .com don't trigger
    // false positives. Uses isSingleLocaleScriptMix to allow legitimate multi-
    // script languages (Japanese: Han + Hiragana + Katakana) while flagging
    // cross-locale mixes like Latin + Hiragana in the same label.
    const labels = hostname.split('.');
    const hasSuspiciousMix = labels.some(label => {
      const labelScripts = new Set();
      for (const char of label) {
        const s = getCharScript(char);
        if (s && s !== 'Common' && s !== 'Inherited') labelScripts.add(s);
      }
      return labelScripts.size >= 2 && !isSingleLocaleScriptMix(labelScripts, enabledLangScriptSets);
    });
    if (hasSuspiciousMix) {
      const warningPageUrl = browser.runtime.getURL('warning.html') +
        `?url=${encodeURIComponent(url)}`;
      hostnameCache.set(hostname, warningPageUrl);
      recordBlockedTab(details.tabId, url);
      return { redirectUrl: warningPageUrl };
    }

    hostnameCache.set(hostname, '');
    return {};
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame"]
  },
  ["blocking"]
);

initialize();
