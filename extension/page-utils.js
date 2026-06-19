// page-utils.js — shared utilities for blocked.html and warning.html.
// Loaded after unicode-scripts.js (provides decodeHostname).

// Permanently whitelists the domain from blockedUrl, syncs background.js
// in-memory state so the webRequest check passes immediately, then navigates
// to the original URL.
async function allowDomain(blockedUrl) {
  if (!blockedUrl) return;
  const hostname = decodeHostname(blockedUrl);
  if (!hostname) return;
  const syncedWl = await readSyncedWhitelist();
  const localResult = await browser.storage.local.get('whitelist');
  const wl = new Set(syncedWl ?? localResult.whitelist ?? []);
  wl.add(hostname);
  const wlArray = Array.from(wl);
  await Promise.all([
    writeSyncedWhitelist(wlArray).catch(() => {}),
    browser.storage.local.set({ whitelist: wlArray })
  ]);
  await browser.runtime.sendMessage({ type: 'addToWhitelist', domain: hostname });
  window.location.href = blockedUrl;
}
