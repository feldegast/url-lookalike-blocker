# Changelog

All notable changes to URL Lookalike Blocker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1] — 2026-06-12

### Added

- **Copyright and licence visible inside the extension UI.** The Help page now has an "About" section with the copyright line, the MPL-2.0 OR GPL-3.0 dual-licence summary, and a link to the GitHub repo where the full licence text lives. The Options page has a small footer line with the same information plus a Help link that opens the Help page in a new tab so unsaved Options edits are preserved.

### Changed

- **Icon homograph theme expanded.** The toolbar icon and AMO listing icon now read as Armenian Մ + Latin R + Armenian Լ — two of the three "URL" letters are non-Latin homograph substitutions instead of one, both rendered in red. The diagonal slash crosses the Latin R, the only letter that remains as itself.
- **Icon SVG is now font-independent.** `extension/icon.svg` embeds the Մ, R, and Լ glyph contours as `<path>` elements instead of `<text>` elements with font references. The toolbar icon renders identically on every system regardless of which fonts are installed (previously the SVG depended on Arial Unicode MS being present, with sans-serif fallbacks each producing slightly different glyphs). A new `dev/render_icon_paths.py` regenerates the SVG from the source fonts using `fonttools`; `dev/render_icon_pillow.py` continues to produce the PNG from the same source fonts at build time so both formats remain visually identical.
- **Icon recoloured for theme neutrality.** The Latin R, the underline beneath the text, and the warning-shield border are now Material blue (`#1976d2`) instead of black, so the toolbar icon stays legible against the full range of possible toolbar background colours including pure-black themes. The Armenian Մ and Լ (`#d32f2f`) and the diagonal strikethrough (`#b71c1c`) are unchanged, preserving the intentional visual hierarchy of "threat letters" with the slash sitting on top.
- **Help-file badge illustrations now SVG.** `extension/img/badge-0.svg` and `extension/img/badge-1.svg` replace the four previous `badge-{0,1}-{white,black}.png` files. Because the icon is now theme-neutral the per-theme PNG pairs are unnecessary, so the Help page's `.badge-light` / `.badge-dark` CSS swap structure has also been removed. A new `dev/render_help_badges.py` regenerates the two SVGs from the current `extension/icon.svg`.
- **Icon-render scripts no longer bundle Segoe UI Bold.** Microsoft's EULA does not permit redistribution of `segoeuib.ttf`, so the .ttf has been removed from `dev/` (and from git history). `dev/render_icon_paths.py` and `dev/render_icon_pillow.py` now locate Segoe UI Bold via the OS font directories — Windows users get it from `C:\Windows\Fonts` automatically; Linux users install it once to `~/.local/share/fonts/`. The OFL-licensed `NotoSansArmenian-Bold.ttf` continues to ship in `dev/`. See `CONTRIBUTING.md` for the regeneration workflow.
- **Extension icon is now SVG-only.** `extension/icon.png` has been removed; `manifest.json` references `icon.svg` via `"any": "icon.svg"` instead. Firefox renders the SVG at every size it needs (toolbar, about:addons, etc.). The PNG copies needed for the AMO listing-icon slots now live in `dev/listing-icons/` and are produced by the refactored `dev/render_icon_pillow.py` (which previously wrote the in-extension PNG; that job is no longer needed since the extension ships SVG-only).
- **AMO listing-screenshot reuse.** New `dev/gather-listing-screenshots.py` curates a numbered subset of the help-page screenshots from `extension/img/` into `dev/listing-screenshots/`, ready to upload to the AMO listing carousel. Re-capturing screenshots is only needed when the underlying UI actually changes, not as a routine step on every listing update. The previous `dev/render_listing_icons.py` has been removed as redundant — `render_icon_pillow.py` now handles its job directly.
- **Help-page figure layout simplified.** The horizontal rule above each `<figure>` and above each `<figcaption>` (CSS `border-top` rules) has been removed; screenshots in `.img-light` / `.img-dark` figures now have a 1px border instead, which reads more cleanly and removes the visual repetition.
- **Help-page header is now sticky.** The title bar and theme-toggle button remain visible while scrolling long pages; the background colour and drop shadow update for both light and dark themes.
- **Help-page section order and screenshots revised.** In the Extension icon section, the badge illustrations now appear before the right-click menu screenshot so the visual flow matches the descriptive text. The Private browsing protection section has moved to after Coloured squares, closer to the Interface options content it cross-references. A new Interface options screenshot pair (`options-interface-black/white.png`) has been added to document that section.
- **Screenshot capture tool: full-page capture fixed.** When capturing a page taller than the viewport, Firefox clamps the scroll position at the page bottom — the last strip was being sourced from the wrong Y offset in the captured bitmap, producing a repeated or misaligned bottom slice. The capture now computes the correct source rectangle (`srcY = (cssY − actualScrollY) × dpr`). The options page capture also hides the private-browsing warning banner and page footer before capturing so they do not appear in the help-page screenshots. A race condition in `devDownload` where a download completing before the `onChanged` listener was registered caused the capture to hang; fixed with a post-registration poll and a resolved-once guard.
- **Test plan and test-URL file reorganised.** Language entries in §5 are now alphabetical and Part B's instruction now uses "Reset to Locale Defaults" rather than manually unchecking all ten languages. The standalone toolbar-badge section has been merged into §6 where the badge behaviour naturally arises during testing; §6 is split into labelled parts (A–J) for easier navigation. The Help page section lists every section name. `test-urls.html` gains matching numbered sections (Test #0–#7) in the same order as the test plan so URLs can be found without hunting.

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
