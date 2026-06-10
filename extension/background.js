// background.js
// Handles webRequest interception for blocking suspicious domains

// ── Dev mode ─────────────────────────────────────────────────────────────────
// Set DEV_MODE to false before each AMO submission.
const DEV_MODE = true;

// Fixed colours for the three screenshot capture tabs so they always look good.
// Same saturation/lightness as the live tabColor() formula.
const DEV_SCREENSHOT_COLORS = [
  'hsl(198, 65%, 42%)',  // steel blue   — block page
  'hsl(142, 65%, 42%)',  // forest green — confusable warning
  'hsl(  0, 65%, 42%)',  // pure red     — mixed-script warning
];

// Test URLs and the extension settings required to trigger each page type.
const DEV_TEST_CAPTURES = [
  { url: 'https://xn--pple-43d.com/',  name: 'blocked',            scripts: [] },
  { url: 'https://xn--aypal-uye.com/', name: 'warning-confusable', scripts: ['Cyrillic'] },
  { url: 'https://xn--test-34d.com/',  name: 'warning-mixed',      scripts: ['Cyrillic'] },
];
// ─────────────────────────────────────────────────────────────────────────────

// Global state
// Permitted scripts are derived solely from user-enabled languages — browser
// locale is intentionally ignored so permissions are always visible in the UI.
let permittedScripts = new Set(['Latin', 'Common', 'Inherited']);
let whitelist = new Set();
let additionalScripts = new Set();
let additionalLangScripts = []; // array of script arrays for explicitly-enabled languages
let enabledLangScriptSets = []; // derived from user-enabled languages only; used by step 3

// Tracks whether initialize() has resolved so the blocking listener can gate
// on the init promise only during the brief startup window.
let settingsLoaded = false;
let initPromise;

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

// The blocked/warning tab that most recently caused the options page to open
// (either by clicking its dot, or by the toolbar being clicked while on a
// blocked tab). Used by applySettings to return focus here after applying.
let sourceTabId = null;

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

// Updates the toolbar icon badge to show the number of currently blocked/warning
// tabs. Clears the badge when there are none.
function updateBadge() {
  const count = blockedTabs.size;
  browser.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  if (count > 0) {
    browser.action.setBadgeBackgroundColor({ color: '#d32f2f' });
  }
}

// Notify the options tab of a new or closed blocked tab. Silently ignored if
// options is not open or the message channel is not yet ready.
function notifyOptions(message) {
  if (optionsTabId !== null) {
    browser.tabs.sendMessage(optionsTabId, message).catch(() => {});
  }
}

// On startup (or after a background-page restart), scan all open tabs for any
// that are showing our blocked/warning pages and restore them to blockedTabs.
// Firefox can suspend the background event page, wiping the in-memory map, so
// this recovery step ensures every already-blocked tab gets its dot back.
async function recoverBlockedTabs() {
  const blockedBase = browser.runtime.getURL('blocked.html');
  const warningBase = browser.runtime.getURL('warning.html');
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (tab.url.startsWith(blockedBase) || tab.url.startsWith(warningBase)) {
        const originalUrl = new URL(tab.url).searchParams.get('url');
        if (originalUrl && !blockedTabs.has(tab.id)) {
          blockedTabs.set(tab.id, { url: originalUrl, color: tabColor(tab.id) });
        }
      }
    }
  } catch (e) {
    // Non-fatal: start with an empty blockedTabs map if the query fails.
  }
  updateBadge();
}

// Initialize on startup
async function initialize() {
  await loadSettings();
  updatePermittedScripts();
  await recoverBlockedTabs();
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

// Opens the options tab, or switches to it if already open. Extracted so it
// can be called from both the toolbar click and the context menu.
async function openOptions() {
  if (optionsTabId !== null) {
    browser.tabs.update(optionsTabId, { active: true });
  } else {
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
    // If the toolbar is clicked while viewing a blocked/warning page, treat
    // that tab as the source so Apply returns focus there.
    if (currentTab && blockedTabs.has(currentTab.id)) {
      sourceTabId = currentTab.id;
    }
    browser.tabs.create({
      url: browser.runtime.getURL('options.html'),
      index: currentTab ? currentTab.index + 1 : undefined
    }).then(tab => { optionsTabId = tab.id; });
  }
}

// Toolbar icon left-click — open/focus the options page.
// A full tab is needed because the options page has an explicit Apply/Discard
// workflow; popups are destroyed the moment they lose focus, which would
// silently discard unsaved changes.
browser.action.onClicked.addListener(openOptions);

// Right-click context menu on the toolbar icon.
browser.menus.create({ id: 'open-options', title: 'Open Options', contexts: ['action'] });
browser.menus.create({ id: 'open-help',    title: 'Help',         contexts: ['action'] });
if (DEV_MODE) {
  browser.menus.create({ id: 'dev-sep',     type: 'separator',                                    contexts: ['action'] });
  browser.menus.create({ id: 'dev-capture', title: 'Developer: Capture screenshots', contexts: ['action'] });
}

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-options') {
    openOptions();
  } else if (info.menuItemId === 'open-help') {
    browser.tabs.create({ url: browser.runtime.getURL('help.html') });
  } else if (info.menuItemId === 'dev-capture') {
    devCapture(tab.windowId);
  }
});

// Clean up when any tab closes.
browser.tabs.onRemoved.addListener((tabId) => {
  if (blockedTabs.has(tabId)) {
    blockedTabs.delete(tabId);
    notifyOptions({ type: 'blockedTabClosed', tabId });
    updateBadge();
  }
  if (tabId === optionsTabId) {
    optionsTabId = null;
    sourceTabId = null; // Options closed without applying — reset source
  }
  if (tabId === sourceTabId) {
    sourceTabId = null; // Source tab was closed before options was applied
  }
});

// Remove stale blockedTabs entries when a blocked/warning tab navigates away
// (e.g. user clicks Go Back, or Try Again succeeds). We check whether the new
// URL is still one of our own pages — if not, the dot should disappear.
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url === undefined) return; // Not a URL change
  if (!blockedTabs.has(tabId)) return;
  const blockedBase = browser.runtime.getURL('blocked.html');
  const warningBase = browser.runtime.getURL('warning.html');
  if (!changeInfo.url.startsWith(blockedBase) && !changeInfo.url.startsWith(warningBase)) {
    blockedTabs.delete(tabId);
    notifyOptions({ type: 'blockedTabClosed', tabId });
    updateBadge();
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

  if (message.type === 'registerOptionsTab') {
    optionsTabId = message.tabId;
    return;
  }

  if (message.type === 'openOptionsPage') {
    openOptions();
    return;
  }

  if (message.type === 'addToWhitelist') {
    // Sync in-memory whitelist when a page allows a domain permanently,
    // so the webRequest check passes before storage.onChanged can fire.
    whitelist.add(message.domain);
    hostnameCache.clear();
    // Tell the options page to refresh its whitelist display immediately.
    notifyOptions({ type: 'whitelistUpdated', whitelist: [...whitelist] });
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
      updateBadge();
    }
    return;
  }

  if (message.type === 'openOptions') {
    // Called by blocked/warning pages when the user clicks "Open settings" or
    // their coloured dot. Switches to the existing options tab (adding this
    // tab's dot) or creates one.
    // blockedUrl is passed by the sender so we can reconstruct state if the
    // background event page was suspended and restarted (clearing blockedTabs).
    const { tabId: blockedTabId, color, blockedUrl: msgUrl } = message;

    // Remember who opened options so Apply can return focus here.
    sourceTabId = blockedTabId;

    // Restore a lost entry: Firefox can suspend the background event page,
    // wiping blockedTabs. The sender always includes the original URL now.
    if (!blockedTabs.has(blockedTabId) && msgUrl) {
      blockedTabs.set(blockedTabId, { url: msgUrl, color: color || tabColor(blockedTabId) });
      updateBadge();
    }

    const entry = blockedTabs.get(blockedTabId);
    if (optionsTabId !== null) {
      browser.tabs.update(optionsTabId, { active: true });
      notifyOptions({
        type: 'addBlockedTab',
        tabId: blockedTabId,
        url: entry ? entry.url : '',
        color
      });
    } else {
      browser.tabs.query({ active: true, currentWindow: true }).then(([currentTab]) => {
        // Include the blocked URL in the query string so options.js can show
        // the dot even if getBlockedTabs returns empty on the first call.
        const entryUrl = entry ? entry.url : (msgUrl || '');
        const urlSuffix = entryUrl ? `&blockedUrl=${encodeURIComponent(entryUrl)}` : '';
        browser.tabs.create({
          url: browser.runtime.getURL('options.html') + `?blockedTabId=${blockedTabId}${urlSuffix}`,
          index: currentTab ? currentTab.index + 1 : undefined
        }).then(tab => { optionsTabId = tab.id; });
      });
    }
    return;
  }

  if (message.type === 'getBlockedTabs') {
    // Options page queries this on load and on visibilitychange. Await initPromise
    // so recovery completes before we respond — prevents a race where Firefox
    // wakes the background page and getBlockedTabs arrives before recoverBlockedTabs
    // has finished, returning an empty array and wiping the options page dots.
    return initPromise.then(() =>
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
    // is updated before the user retries a blocked tab — no race condition.
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

    // Return focus to the blocked tab that opened options, falling back to the
    // most-recently-recorded blocked tab. Then close options.
    const returnTabId = blockedTabs.has(sourceTabId)
      ? sourceTabId
      : ([...blockedTabs.keys()].at(-1) ?? null);
    if (returnTabId !== null) {
      browser.tabs.update(returnTabId, { active: true }).catch(() => {});
    }
    if (optionsTabId !== null) {
      browser.tabs.remove(optionsTabId).catch(() => {});
    }
    sourceTabId = null;
    return;
  }
});

// Records a tab as blocked and notifies options if it is already open.
function recordBlockedTab(tabId, url) {
  const color = tabColor(tabId);
  blockedTabs.set(tabId, { url, color });
  notifyOptions({ type: 'addBlockedTab', tabId, url, color });
  updateBadge();
  return color;
}

// Core request evaluation logic, extracted so the blocking listener can defer
// it until after initialize() resolves during the startup window.
function evaluateRequest(details) {
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

  // Return cached result for this hostname if available. The cache is
  // cleared whenever settings or the whitelist change.
  const cached = hostnameCache.get(hostname);
  if (cached !== undefined) {
    if (cached) {
      if (details.tabId >= 0) recordBlockedTab(details.tabId, url);
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
    if (details.tabId >= 0) recordBlockedTab(details.tabId, url);
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
      if (details.tabId >= 0) recordBlockedTab(details.tabId, url);
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
    if (details.tabId >= 0) recordBlockedTab(details.tabId, url);
    return { redirectUrl: warningPageUrl };
  }

  hostnameCache.set(hostname, '');
  return {};
}

// WebRequest listener — intercepts main-frame navigations only.
// sub_frame is excluded to avoid breaking embedded content (CDNs, widgets).
// Returns a Promise during the brief startup window so the first navigation
// after an idle-suspension isn't evaluated with an empty whitelist.
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!settingsLoaded) return initPromise.then(() => evaluateRequest(details));
    return evaluateRequest(details);
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame"]
  },
  ["blocking"]
);

// ── Dev-mode screenshot capture tool ─────────────────────────────────────────

function devDelay(ms) { return new Promise(r => setTimeout(r, ms)); }

function devWaitForTabReady(tabId, urlPrefix) {
  return new Promise(resolve => {
    function check(tid, changeInfo, tab) {
      if (tid === tabId && changeInfo.status === 'complete' &&
          tab.url && tab.url.startsWith(urlPrefix)) {
        browser.tabs.onUpdated.removeListener(check);
        resolve();
      }
    }
    browser.tabs.onUpdated.addListener(check);
  });
}

async function devCropToBounds(dataUrl, bounds, dpr, bg) {
  const bm = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const sw = Math.round(bounds.width  * dpr);
  const sh = Math.round(bounds.height * dpr);
  const canvas = new OffscreenCanvas(Math.max(sw, 1), Math.max(sh, 1));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg || '#ffffff';
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(bm, -Math.round(bounds.x * dpr), -Math.round(bounds.y * dpr));
  return canvas.convertToBlob({ type: 'image/png' });
}

async function devCaptureElement(tabId, windowId, selector) {
  await browser.tabs.update(tabId, { active: true });
  await devDelay(200);
  const r = await browser.tabs.sendMessage(tabId, { type: 'devCapturePrepare', selector });
  if (!r) throw new Error(`devCapturePrepare: element not found for "${selector}"`);
  await devDelay(100);
  const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: 'png' });
  await browser.tabs.sendMessage(tabId, { type: 'devCaptureRestore' });
  return devCropToBounds(dataUrl, r.bounds, r.dpr, r.bg);
}

async function devCaptureFullPage(tabId, windowId) {
  await browser.tabs.update(tabId, { active: true });
  await devDelay(200);
  const d = await browser.tabs.sendMessage(tabId, { type: 'devGetPageDimensions' });
  const pw = Math.round(d.captureWidth * d.dpr);
  const ph = Math.round(d.scrollHeight * d.dpr);
  const canvas = new OffscreenCanvas(pw, ph);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = d.bodyBg;
  ctx.fillRect(0, 0, pw, ph);
  let cssY = 0;
  while (cssY < d.scrollHeight) {
    await browser.tabs.sendMessage(tabId, { type: 'devScrollTo', y: cssY });
    await devDelay(150);
    const bm = await createImageBitmap(await (await fetch(
      await browser.tabs.captureVisibleTab(windowId, { format: 'png' })
    )).blob());
    const cssStripH  = Math.min(d.viewportHeight, d.scrollHeight - cssY);
    const physStripH = Math.round(cssStripH * d.dpr);
    const srcX       = Math.round(d.contentLeft * d.dpr);
    ctx.drawImage(bm, srcX, 0, pw, physStripH, 0, Math.round(cssY * d.dpr), pw, physStripH);
    cssY += d.viewportHeight;
  }
  await browser.tabs.sendMessage(tabId, { type: 'devScrollTo', y: 0 });
  return canvas.convertToBlob({ type: 'image/png' });
}

async function devDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    await browser.downloads.download({
      url,
      filename: `url-lookalike-blocker-screenshots/${filename}`,
      saveAs: false,
      conflictAction: 'overwrite',
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  await devDelay(50);
}

async function devCapture(windowId) {
  const savedScripts     = new Set(additionalScripts);
  const savedLangScripts = [...additionalLangScripts];
  const savedWhitelist   = new Set(whitelist);
  const { theme: savedTheme } = await browser.storage.local.get('theme');

  // Clear any cached evaluations for the test hostnames
  hostnameCache.clear();
  for (const { url } of DEV_TEST_CAPTURES) {
    sessionAllowed.delete(decodeHostname(url));
    whitelist.delete(decodeHostname(url));
  }

  const captureTabIds = [];
  const queue = [];

  try {
    const blockedBase = browser.runtime.getURL('blocked.html');
    const warningBase = browser.runtime.getURL('warning.html');
    const optionsBase = browser.runtime.getURL('options.html');

    // ── Phase 1: open the three test tabs with required settings ─────────
    let currentScripts = null;
    for (let i = 0; i < DEV_TEST_CAPTURES.length; i++) {
      const { url, scripts } = DEV_TEST_CAPTURES[i];
      const urlPrefix = scripts.length === 0 ? blockedBase : warningBase;

      if (JSON.stringify(scripts) !== JSON.stringify(currentScripts)) {
        additionalScripts    = new Set(scripts);
        additionalLangScripts = [];
        updatePermittedScripts();
        currentScripts = scripts;
      }

      const tab = await browser.tabs.create({ url, active: false });
      captureTabIds.push(tab.id);
      await devWaitForTabReady(tab.id, urlPrefix);
      await devDelay(350);

      const devColor = DEV_SCREENSHOT_COLORS[i];
      if (blockedTabs.has(tab.id)) blockedTabs.get(tab.id).color = devColor;
      await browser.tabs.sendMessage(tab.id, { type: 'devSetDotColor', color: devColor });
    }

    // ── Phase 2: capture each block/warning tab in light + dark ──────────
    for (let i = 0; i < DEV_TEST_CAPTURES.length; i++) {
      const { name } = DEV_TEST_CAPTURES[i];
      for (const [theme, suffix] of [['light', 'white'], ['dark', 'black']]) {
        await browser.storage.local.set({ theme });
        await devDelay(250);
        queue.push({ filename: `${name}-${suffix}.png`,
          blob: await devCaptureElement(captureTabIds[i], windowId, '.container') });
      }
    }

    // ── Phase 3: open options and capture each section ────────────────────
    const optTab = await browser.tabs.create({ url: optionsBase, active: true });
    optionsTabId = optTab.id;
    await devWaitForTabReady(optTab.id, optionsBase);
    await devDelay(600);

    for (const [theme, suffix] of [['light', 'white'], ['dark', 'black']]) {
      await browser.storage.local.set({ theme });
      await devDelay(250);

      // Coloured squares row
      queue.push({ filename: `options-coloured-squares-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#tab-selector') });

      // Interface options section
      queue.push({ filename: `options-interface-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#section-interface') });

      // Private warning banner (shown temporarily)
      await browser.tabs.sendMessage(optTab.id, { type: 'devShowPrivateWarning' });
      await devDelay(100);
      queue.push({ filename: `options-private-warning-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#private-warning') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devHidePrivateWarning' });
      await devDelay(100);

      // Whitelist section (testж.com added temporarily)
      await browser.tabs.sendMessage(optTab.id, { type: 'devSetWhitelist', entries: ['testж.com'] });
      await devDelay(150);
      queue.push({ filename: `whitelist-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#section-whitelist') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devRestoreWhitelist' });
      await devDelay(100);

      // Apply bar (shown directly without dirtying the data)
      await browser.tabs.sendMessage(optTab.id, { type: 'devShowApplyBar' });
      await devDelay(100);
      queue.push({ filename: `options-apply-bar-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#sticky-apply-bar') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devHideApplyBar' });
      await devDelay(100);

      // Full page stitch — captured last when page is in clean state
      queue.push({ filename: `options-${suffix}.png`,
        blob: await devCaptureFullPage(optTab.id, windowId) });
    }

    // ── Phase 4: download everything to Downloads/url-lookalike-blocker-screenshots/
    for (const { blob, filename } of queue) {
      await devDownload(blob, filename);
    }

  } finally {
    additionalScripts    = savedScripts;
    additionalLangScripts = savedLangScripts;
    whitelist            = savedWhitelist;
    updatePermittedScripts();
    if (savedTheme !== undefined) {
      await browser.storage.local.set({ theme: savedTheme });
    } else {
      await browser.storage.local.remove('theme');
    }
    for (const tabId of captureTabIds) {
      browser.tabs.remove(tabId).catch(() => {});
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

initPromise = initialize();
initPromise.then(() => { settingsLoaded = true; });
