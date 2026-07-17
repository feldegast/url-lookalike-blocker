// background.js (Chromium)
// Uses webNavigation.onBeforeNavigate instead of webRequest for Chrome MV3 compatibility.
// All other logic is identical to the Firefox version.

importScripts('browser-compat.js', 'unicode-scripts.js', 'storage-sync.js');

// Global state
let permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
let whitelist = new Set();
let additionalScripts = new Set();
let additionalLangScripts = [];
let enabledLangScriptSets = [];

let settingsLoaded = false;
let initPromise;

const sessionAllowed = new Set();
const blockedTabs = new Map();
let optionsTabId = null;
let sourceTabId = null;
const hostnameCache = new Map();

function tabColor(tabId) {
  const hue = Math.round((tabId * 137.508) % 360);
  return `hsl(${hue}, 65%, 42%)`;
}

function updateBadge() {
  const count = blockedTabs.size;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  }
}

function notifyOptions(message) {
  if (optionsTabId !== null) {
    chrome.tabs.sendMessage(optionsTabId, message).catch(() => {});
  }
}

async function recoverBlockedTabs() {
  const blockedBase = chrome.runtime.getURL('blocked.html');
  const warningBase = chrome.runtime.getURL('warning.html');
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (tab.url.startsWith(blockedBase) || tab.url.startsWith(warningBase)) {
        const originalUrl = new URL(tab.url).searchParams.get('url');
        if (originalUrl && !blockedTabs.has(tab.id)) {
          blockedTabs.set(tab.id, { url: originalUrl, color: tabColor(tab.id) });
        }
      }
    }
  } catch (e) {}
  updateBadge();
}

async function initialize() {
  await loadSettings();
  updatePermittedScripts();
  await recoverBlockedTabs();
}

async function loadSettings() {
  const [syncSettings, syncWhitelist] = await Promise.all([
    readSyncedSettings(),
    readSyncedWhitelist()
  ]);

  if (syncSettings !== null && syncWhitelist !== null) {
    ({ additionalScripts, additionalLangScripts } =
      computeScriptsFromLanguages(syncSettings.enabledLanguages || []));
    whitelist = new Set(syncWhitelist);
  } else {
    const result = await chrome.storage.local.get(['whitelist', 'enabledLanguages']);
    whitelist = new Set(result.whitelist || []);
    ({ additionalScripts, additionalLangScripts } =
      computeScriptsFromLanguages(result.enabledLanguages || []));
  }
}

function updatePermittedScripts() {
  permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
  for (const script of additionalScripts) {
    permittedScripts.add(script);
  }
  enabledLangScriptSets = additionalLangScripts.map(scripts => new Set(scripts));
  hostnameCache.clear();
}

function isWhitelisted(hostname) {
  for (const domain of whitelist) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
  }
  return false;
}

async function openOptions() {
  if (optionsTabId !== null) {
    chrome.tabs.update(optionsTabId, { active: true });
  } else {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab && blockedTabs.has(currentTab.id)) {
      sourceTabId = currentTab.id;
    }
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html'),
      ...(currentTab && { index: currentTab.index + 1 })
    }).then(tab => { optionsTabId = tab.id; });
  }
}

chrome.action.onClicked.addListener(openOptions);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'open-options', title: 'Open Options', contexts: ['action'] });
  chrome.contextMenus.create({ id: 'open-help',    title: 'Help',         contexts: ['action'] });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-options') {
    openOptions();
  } else if (info.menuItemId === 'open-help') {
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (blockedTabs.has(tabId)) {
    blockedTabs.delete(tabId);
    notifyOptions({ type: 'blockedTabClosed', tabId });
    updateBadge();
  }
  if (tabId === optionsTabId) {
    optionsTabId = null;
    sourceTabId = null;
  }
  if (tabId === sourceTabId) {
    sourceTabId = null;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url === undefined) return;
  if (!blockedTabs.has(tabId)) return;
  const blockedBase = chrome.runtime.getURL('blocked.html');
  const warningBase = chrome.runtime.getURL('warning.html');
  if (!changeInfo.url.startsWith(blockedBase) && !changeInfo.url.startsWith(warningBase)) {
    blockedTabs.delete(tabId);
    notifyOptions({ type: 'blockedTabClosed', tabId });
    updateBadge();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.sync_settings) {
      const settings = changes.sync_settings.newValue || {};
      const { additionalScripts: scripts, additionalLangScripts: langScripts } =
        computeScriptsFromLanguages(settings.enabledLanguages || []);
      additionalScripts = scripts;
      additionalLangScripts = langScripts;
      updatePermittedScripts();
    }
    const whitelistChanged = Object.keys(changes).some(
      k => k === 'sync_meta' || k.startsWith('whitelist_')
    );
    if (whitelistChanged) {
      readSyncedWhitelist().then(wl => {
        if (wl !== null) {
          whitelist = new Set(wl);
          hostnameCache.clear();
        }
      });
    }
    return;
  }
  if (changes.whitelist) {
    whitelist = new Set(changes.whitelist.newValue || []);
    hostnameCache.clear();
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {

  if (message.type === 'registerOptionsTab') {
    optionsTabId = message.tabId;
    return;
  }

  if (message.type === 'openOptionsPage') {
    openOptions();
    return;
  }

  if (message.type === 'addToWhitelist') {
    whitelist.add(message.domain);
    hostnameCache.clear();
    notifyOptions({ type: 'whitelistUpdated', whitelist: [...whitelist] });
    return;
  }

  if (message.type === 'allowOnce') {
    sessionAllowed.add(message.domain);
    if (message.url && sender.tab) {
      chrome.tabs.update(sender.tab.id, { url: message.url });
      blockedTabs.delete(sender.tab.id);
      notifyOptions({ type: 'blockedTabClosed', tabId: sender.tab.id });
      updateBadge();
    }
    return;
  }

  if (message.type === 'openOptions') {
    const { tabId: blockedTabId, color, blockedUrl: msgUrl } = message;
    sourceTabId = blockedTabId;

    if (!blockedTabs.has(blockedTabId) && msgUrl) {
      blockedTabs.set(blockedTabId, { url: msgUrl, color: color || tabColor(blockedTabId) });
      updateBadge();
    }

    const entry = blockedTabs.get(blockedTabId);
    if (optionsTabId !== null) {
      chrome.tabs.update(optionsTabId, { active: true });
      notifyOptions({
        type: 'addBlockedTab',
        tabId: blockedTabId,
        url: entry ? entry.url : '',
        color
      });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([currentTab]) => {
        const entryUrl = entry ? entry.url : (msgUrl || '');
        const urlSuffix = entryUrl ? `&blockedUrl=${encodeURIComponent(entryUrl)}` : '';
        chrome.tabs.create({
          url: chrome.runtime.getURL('options.html') + `?blockedTabId=${blockedTabId}${urlSuffix}`,
          ...(currentTab && { index: currentTab.index + 1 })
        }).then(tab => { optionsTabId = tab.id; });
      });
    }
    return;
  }

  if (message.type === 'getBlockedTabs') {
    return initPromise.then(() =>
      [...blockedTabs.entries()].map(([tabId, { url, color }]) => ({ tabId, url, color }))
    );
  }

  if (message.type === 'switchToTab') {
    chrome.tabs.update(message.tabId, { active: true }).catch(() => {});
    return;
  }

  if (message.type === 'focusOptions') {
    if (optionsTabId !== null) {
      chrome.tabs.update(optionsTabId, { active: true }).catch(() => {});
    }
    return;
  }

  if (message.type === 'applySettings') {
    if (message.enabledLanguages !== undefined) {
      ({ additionalScripts, additionalLangScripts } =
        computeScriptsFromLanguages(message.enabledLanguages));
      updatePermittedScripts();
    }
    if (message.whitelist !== undefined) {
      whitelist = new Set(message.whitelist);
      hostnameCache.clear();
    }

    const returnTabId = blockedTabs.has(sourceTabId)
      ? sourceTabId
      : ([...blockedTabs.keys()].at(-1) ?? null);
    if (returnTabId !== null) {
      chrome.tabs.update(returnTabId, { active: true }).catch(() => {});
    }
    if (optionsTabId !== null) {
      chrome.tabs.remove(optionsTabId).catch(() => {});
    }
    sourceTabId = null;
    return;
  }
});

function recordBlockedTab(tabId, url) {
  const color = tabColor(tabId);
  blockedTabs.set(tabId, { url, color });
  notifyOptions({ type: 'addBlockedTab', tabId, url, color });
  updateBadge();
  return color;
}

// Evaluate a navigation and return the redirect URL, or empty string to allow.
function evaluateRequest(details) {
  const url = details.url;
  const hostname = decodeHostname(url);

  if (isWhitelisted(hostname)) return {};
  if (sessionAllowed.has(hostname)) return {};

  const cached = hostnameCache.get(hostname);
  if (cached !== undefined) {
    if (cached) {
      recordBlockedTab(details.tabId, url);
      return { redirectUrl: cached };
    }
    return {};
  }

  const result = isHostnameAllowed(hostname, permittedScripts);
  if (!result.allowed) {
    const blockedPageUrl = chrome.runtime.getURL('blocked.html') +
      `?url=${encodeURIComponent(url)}`;
    hostnameCache.set(hostname, blockedPageUrl);
    recordBlockedTab(details.tabId, url);
    return { redirectUrl: blockedPageUrl };
  }

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
      const warningPageUrl = chrome.runtime.getURL('warning.html') +
        `?url=${encodeURIComponent(url)}`;
      hostnameCache.set(hostname, warningPageUrl);
      recordBlockedTab(details.tabId, url);
      return { redirectUrl: warningPageUrl };
    }
  }

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
    const warningPageUrl = chrome.runtime.getURL('warning.html') +
      `?url=${encodeURIComponent(url)}`;
    hostnameCache.set(hostname, warningPageUrl);
    recordBlockedTab(details.tabId, url);
    return { redirectUrl: warningPageUrl };
  }

  hostnameCache.set(hostname, '');
  return {};
}

// webNavigation listener — intercepts main-frame http/https navigations.
// Unlike Firefox's webRequest approach, this cannot cancel the request at the
// network level; it redirects the tab immediately after navigation starts.
chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    if (!settingsLoaded) await initPromise;
    const result = evaluateRequest(details);
    if (result.redirectUrl) {
      chrome.tabs.update(details.tabId, { url: result.redirectUrl });
    }
  },
  { url: [{ schemes: ['http', 'https'] }] }
);

initPromise = initialize();
initPromise.then(() => { settingsLoaded = true; });
