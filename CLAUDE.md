# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**url-lookalike-blocker** is a Firefox browser extension (Manifest V3) that protects users from IDN homograph attacks by blocking navigation to domains containing characters outside the scripts associated with the user's locale.

**Current state**: The repository contains specification documents only — source code has not been implemented yet. Key specs are in `prompt.txt` and `documents/Full-Context.txt`.

## Build & Development Commands

No build tooling has been set up yet. When implemented, the extension will be a plain JS/HTML project loaded directly into Firefox via `about:debugging` (no bundler required for MVP). If a test runner is added for `unicode-scripts.js`, document it here.

## Architecture

### Planned File Structure

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; declares `webRequest`, `webRequestBlocking`, `storage`, `<all_urls>` |
| `background.js` | Request interception via `browser.webRequest.onBeforeRequest` (blocking); whitelist lookup; redirect to block page |
| `unicode-scripts.js` | Core detection logic: locale→scripts mapping, character script detection, punycode handling — keep isolated for unit testability |
| `blocked.html/js` | Block page UI; shows offending characters with Unicode codepoints and script names; one-click whitelist |
| `options.html/js` | Whitelist manager; additional language/script picker |

### Core Detection Flow

1. `browser.webRequest.onBeforeRequest` fires with the request URL
2. Extract and punycode-decode the hostname
3. Identify Unicode scripts present in hostname characters via `/\p{Script=...}/u`
4. Determine permitted scripts from `navigator.languages` + user-configured extras
5. Always permit: **Common**, **Inherited**, and **Latin** scripts
6. If disallowed script found → cancel request and redirect to `blocked.html`
7. Check whitelist (stored in `browser.storage.local` as decoded Unicode) before blocking

### Key Design Decisions

- **Firefox MV3 only**: Firefox preserves blocking `webRequest` in MV3; Chrome's `declarativeNetRequest` cannot do dynamic Unicode script detection
- **Locale detection**: Use full `navigator.languages` array, not just `navigator.language`
- **Scope**: Check hostname only — paths and query strings legitimately contain non-ASCII
- **Whitelist storage**: Store decoded Unicode form (human-readable); match against decoded hostname at request time
- **Script detection**: ES2018 Unicode property escapes (`/\p{Script=Cyrillic}/u`)

## Implementation Priority

Build and unit-test `unicode-scripts.js` first (pure logic, no browser APIs). Test cases:
- `example.com` (Latin only) → allow
- Mixed Cyrillic/Latin homograph → block
- Legitimate Japanese domain → allow when Japanese scripts permitted
- Whitelisted domain → allow regardless

Then wire up `background.js`, then the block/options UI.
