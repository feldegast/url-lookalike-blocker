# Changelog

All notable changes to URL Lookalike Blocker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Copyright and licence visible inside the extension UI.** The Help page now has an "About" section with the copyright line, the MPL-2.0 OR GPL-3.0 dual-licence summary, and a link to the GitHub repo where the full licence text lives. The Options page has a small footer line with the same information plus a Help link that opens the Help page in a new tab so unsaved Options edits are preserved.

### Changed

- **Icon homograph theme expanded.** The toolbar icon and AMO listing icon now read as Armenian Մ + Latin R + Armenian Լ — two of the three "URL" letters are non-Latin homograph substitutions instead of one, both rendered in red. The diagonal slash crosses the Latin R, the only letter that remains as itself.
- **Icon SVG is now font-independent.** `extension/icon.svg` embeds the Մ, R, and Լ glyph contours as `<path>` elements instead of `<text>` elements with font references. The toolbar icon renders identically on every system regardless of which fonts are installed (previously the SVG depended on Arial Unicode MS being present, with sans-serif fallbacks each producing slightly different glyphs). A new `dev/render_icon_paths.py` regenerates the SVG from the source fonts using `fonttools`; `dev/render_icon_pillow.py` continues to produce the PNG from the same source fonts at build time so both formats remain visually identical.

## [1.0] — 2026-06-10

Initial release submitted to Mozilla AMO.

### Added

- **IDN homograph detection** — every navigation's hostname is decoded from punycode and checked against the user's permitted Unicode scripts.
- **Block page** — shown when a domain contains characters from a script the user has not permitted. Lists every offending character with its Unicode codepoint and script, and offers actions to allow the domain permanently, retry after settings change, go back, or open settings.
- **Warning page** with two flavours:
  - **Confusable character in a mixed-script label** — for example, Cyrillic `р` (U+0440) mimicking Latin `p` in `рaypal.com`. The offending character is highlighted in red with a "Looks like" annotation.
  - **Mixed-script label** — the domain mixes characters from two or more scripts in a way that is not common for any single language. Highlighted in amber with a hint about which language setting would permit the combination if it is legitimate.
- **Options page** with:
  - **Permitted languages** — enable additional languages whose Unicode scripts are allowed beyond the browser locale defaults. Latin is always permitted.
  - **Whitelisted domains** — explicitly trusted domains added from a block or warning page, listed with each offending character annotated.
  - **Reset to locale defaults** — restore the locale-derived language set, discarding manual selections.
  - **Apply / Discard changes** — language and whitelist changes are held in memory until applied, with an unsaved-changes banner showing the current dirty state.
  - **Interface options** — instant-apply preferences for `Show shadows` and `Show private-browsing warning`.
- **Multi-tab handling** — a numeric badge on the toolbar icon counts open blocked/warning tabs, and each tab is identified by a unique coloured square in Options for one-click switching between them.
- **Toolbar icon menu** — left-click opens Options; right-click offers "Open Options" and "Help" items.
- **Help page** — full documentation with screenshots of every feature, accessible from the toolbar icon's right-click menu.
- **Dark / light / auto theme** — every extension page respects the user's preference, with a per-page toggle button. A small `localStorage` cache applies the preference synchronously on page load so there is no flash of incorrect theme.
- **Private browsing protection guidance** — banner on the Options page explaining the manual `about:addons` opt-in for private windows, with a dismiss option for managed environments where access cannot be granted.

### Security & Privacy

- No data collected, logged, or transmitted. Settings are stored locally via `browser.storage.local`.
- Manifest declares `data_collection_permissions: { "required": ["none"] }`.
- Minimum permission set: `webRequest`, `webRequestBlocking`, `storage`, `menus`, and `<all_urls>` host permission used only to inspect navigation hostnames.

### Platform

- Firefox-only (Manifest V3 with blocking `webRequest`).
- Minimum Firefox version: 126 (the `options_page` manifest key was introduced in 126).
