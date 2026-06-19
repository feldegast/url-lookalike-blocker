// storage-sync.js — cross-device sync storage helpers.
// LANGUAGE_SCRIPTS, ALWAYS_PERMITTED, and computeScriptsFromLanguages are defined
// in unicode-scripts.js, which is loaded before this file in all contexts.

// --- Sync storage layout ---
// sync_meta:      { whitelist_chunks: N }
// whitelist_0..N: string[] — up to SYNC_WHITELIST_CHUNK_SIZE entries each
// sync_settings:  { enabledLanguages: string[], theme: string, showShadows: boolean }

const SYNC_WHITELIST_CHUNK_SIZE = 400;

// Returns the whitelist array from sync storage, or null if no sync data exists.
// Returns [] (not null) when sync data exists but the whitelist is empty.
async function readSyncedWhitelist() {
  try {
    const metaResult = await browser.storage.sync.get('sync_meta');
    const meta = metaResult.sync_meta;
    if (!meta) return null; // no sync_meta = no sync data at all
    const chunkCount = meta.whitelist_chunks || 0;
    if (chunkCount === 0) return []; // meta exists, empty whitelist
    const keys = Array.from({ length: chunkCount }, (_, i) => `whitelist_${i}`);
    const chunks = await browser.storage.sync.get(keys);
    const whitelist = [];
    for (const key of keys) {
      if (Array.isArray(chunks[key])) whitelist.push(...chunks[key]);
    }
    return whitelist;
  } catch (e) {
    return null;
  }
}

// Writes the whitelist to sync in chunks, removing any stale chunks left over
// from a previous longer write. Throws on quota error — callers should catch
// and surface a warning to the user.
async function writeSyncedWhitelist(whitelist) {
  const chunks = [];
  for (let i = 0; i < whitelist.length; i += SYNC_WHITELIST_CHUNK_SIZE) {
    chunks.push(whitelist.slice(i, i + SYNC_WHITELIST_CHUNK_SIZE));
  }
  const metaResult = await browser.storage.sync.get('sync_meta');
  const oldCount = (metaResult.sync_meta || {}).whitelist_chunks || 0;
  const toRemove = [];
  for (let i = chunks.length; i < oldCount; i++) toRemove.push(`whitelist_${i}`);
  if (toRemove.length) await browser.storage.sync.remove(toRemove);
  const toWrite = { sync_meta: { whitelist_chunks: chunks.length } };
  chunks.forEach((chunk, i) => { toWrite[`whitelist_${i}`] = chunk; });
  await browser.storage.sync.set(toWrite);
}

// Returns sync_settings as { enabledLanguages, theme, showShadows }, or null
// if no sync data has been written yet (no Firefox account or first install).
async function readSyncedSettings() {
  try {
    const result = await browser.storage.sync.get('sync_settings');
    return result.sync_settings || null;
  } catch (e) {
    return null;
  }
}

// Writes the full sync_settings object. Always include all three fields so
// partial reads on other devices are never missing a key.
async function writeSyncedSettings(settings) {
  await browser.storage.sync.set({ sync_settings: settings });
}
