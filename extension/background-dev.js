// background-dev.js — developer-only screenshot capture tool.
// Excluded from AMO submissions — see RELEASE.md step 3.

const DEV_SCREENSHOT_COLORS = [
  'hsl(198, 65%, 42%)',  // steel blue   — block page
  'hsl(142, 65%, 42%)',  // forest green — confusable warning
  'hsl(  0, 65%, 42%)',  // pure red     — mixed-script warning
];

const DEV_TEST_CAPTURES = [
  { url: 'https://xn--pple-43d.com/',  name: 'blocked',            scripts: [] },
  { url: 'https://xn--aypal-uye.com/', name: 'warning-confusable', scripts: ['Cyrillic'] },
  { url: 'https://xn--test-34d.com/',  name: 'warning-mixed',      scripts: ['Cyrillic'] },
];

browser.menus.create({ id: 'dev-sep',     type: 'separator',                              contexts: ['action'] });
browser.menus.create({ id: 'dev-capture', title: 'Developer: Capture screenshots',        contexts: ['action'] });

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'dev-capture') devCapture(tab.windowId);
});

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

    // Phase 1: open the three test tabs with required settings
    let currentScripts = null;
    for (let i = 0; i < DEV_TEST_CAPTURES.length; i++) {
      const { url, scripts } = DEV_TEST_CAPTURES[i];
      const urlPrefix = scripts.length === 0 ? blockedBase : warningBase;

      if (JSON.stringify(scripts) !== JSON.stringify(currentScripts)) {
        additionalScripts     = new Set(scripts);
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

    // Phase 2: capture each block/warning tab in light + dark
    for (let i = 0; i < DEV_TEST_CAPTURES.length; i++) {
      const { name } = DEV_TEST_CAPTURES[i];
      for (const [theme, suffix] of [['light', 'white'], ['dark', 'black']]) {
        await browser.storage.local.set({ theme });
        await devDelay(250);
        queue.push({ filename: `${name}-${suffix}.png`,
          blob: await devCaptureElement(captureTabIds[i], windowId, '.container') });
      }
    }

    // Phase 3: open options and capture each section
    const optTab = await browser.tabs.create({ url: optionsBase, active: true });
    optionsTabId = optTab.id;
    await devWaitForTabReady(optTab.id, optionsBase);
    await devDelay(600);

    for (const [theme, suffix] of [['light', 'white'], ['dark', 'black']]) {
      await browser.storage.local.set({ theme });
      await devDelay(250);

      queue.push({ filename: `options-coloured-squares-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#tab-selector') });

      queue.push({ filename: `options-interface-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#section-interface') });

      await browser.tabs.sendMessage(optTab.id, { type: 'devShowPrivateWarning' });
      await devDelay(100);
      queue.push({ filename: `options-private-warning-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#private-warning') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devHidePrivateWarning' });
      await devDelay(100);

      await browser.tabs.sendMessage(optTab.id, { type: 'devSetWhitelist', entries: ['testж.com'] });
      await devDelay(150);
      queue.push({ filename: `whitelist-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#section-whitelist') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devRestoreWhitelist' });
      await devDelay(100);

      await browser.tabs.sendMessage(optTab.id, { type: 'devShowApplyBar' });
      await devDelay(100);
      queue.push({ filename: `options-apply-bar-${suffix}.png`,
        blob: await devCaptureElement(optTab.id, windowId, '#sticky-apply-bar') });
      await browser.tabs.sendMessage(optTab.id, { type: 'devHideApplyBar' });
      await devDelay(100);

      queue.push({ filename: `options-${suffix}.png`,
        blob: await devCaptureFullPage(optTab.id, windowId) });
    }

    // Phase 4: download all captures
    for (const { blob, filename } of queue) {
      await devDownload(blob, filename);
    }

  } finally {
    additionalScripts     = savedScripts;
    additionalLangScripts = savedLangScripts;
    whitelist             = savedWhitelist;
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
