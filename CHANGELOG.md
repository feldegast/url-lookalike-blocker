# Changelog

All notable changes to URL Lookalike Blocker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **"Mongolian (Cyrillic)" renamed to "Mongolian" in the Options language table.** The `(Cyrillic)` qualifier was added when the table had no other way to communicate script information; now that every language row shows its scripts as coloured tags, the qualifier is redundant and has been removed.
- **Warning pages now identify themselves by type in their heading.** The on-page heading (and browser tab title) now reads "Confusable Character Domain Warning" or "Mixed Script Domain Warning" instead of the previous "Confusable Character Domain" / "Mixed Script Domain", so it is clear to the user which kind of warning they are looking at.
- **Help page: new "Latin-script languages — always permitted" section.** Documents the broader set of Latin-script languages whose URLs always load normally. Grouped into European, Africa/Oceania/Americas, and multi-script edge cases (Bosnian, Azerbaijani, Uzbek, Turkmen, Kazakh, Kurdish). The always-permitted language list has been removed from the Options page; a link to this Help section appears in its place.
- **Help page: warning sections split into two top-level sections.** The single "Warning page" section (which contained confusable and mixed-script as sub-headings) has been replaced with two independent sections — "Confusable Character Domain Warning" and "Mixed Script Domain Warning" — matching the headings now shown on the pages themselves. Each section has its own introduction, screenshots, and "What you can do" list.

## [1.1] — 2026-06-13

### Added

- **Script-coloured tags on the Options language table.** Each script tag next to a language name is now coloured: green means that script is currently permitted (because the user or locale has enabled it), grey means it is not. The colour reflects the real permitted set used by the background blocker, so the display honestly shows what will and will not be blocked.
- **Single-script language auto-tick.** Languages whose only non-Latin script is already permitted are ticked automatically with a dimmed label — for example, enabling Japanese enables the Han script, which causes Chinese (Simplified) and Chinese (Traditional) to tick themselves. Languages with more than one script (Japanese, Korean, Serbian) are never auto-ticked; they must be enabled explicitly.
- **Cascade on untick.** Unticking a language removes its scripts from the permitted set. Any other enabled language that relied solely on those scripts is also unticked, and its scripts are removed in turn. This ensures no orphaned scripts remain permitted after a language is disabled.
- **Copyright and licence visible inside the extension UI.** The Help page now has an "About" section with the copyright line, the MPL-2.0 OR GPL-3.0 dual-licence summary, and a link to the GitHub repo where the full licence text lives. The Options page has a small footer line with the same information plus a Help link that opens the Help page in a new tab so unsaved Options edits are preserved.

### Changed

- **Language table no longer shows per-script sub-rows.** Multi-script languages such as Japanese previously showed an indented sub-row for each script below the main language row; these were redundant with the script tags already visible on the same row and added unnecessary scrolling. They have been removed.
- **Help page: Permitted languages section updated.** The section now documents the script-colouring and auto-tick behaviour in full: how green tags indicate permitted scripts, how single-script languages tick automatically when their script is enabled, how the cascade works when a language is unticked, and why multi-script languages must be enabled explicitly. New screenshots (`options-languages-white/black.png`) show Japanese enabled with Han, Hiragana and Katakana green and Chinese auto-ticked; Korean remains unticked because Hangul is not yet permitted.
- **Screenshot capture tool improvements.** Full-element stitching (`devCaptureElementFull`) captures elements taller than the viewport correctly. A `devSetTheme` message forces the options page to switch theme immediately without relying on a storage listener. New `devSetLanguages`/`devRestoreLanguages` hooks temporarily set the language state for screenshot purposes.
- **Icon homograph theme expanded.** The toolbar icon and AMO listing icon now read as Armenian Մ + Latin R + Armenian Լ — two of the three "URL" letters are non-Latin homograph substitutions instead of one, both rendered in red. The diagonal slash crosses the Latin R, the only letter that remains as itself.
- **Icon SVG is now font-independent.** `extension/icon.svg` embeds the Մ, R, and Լ glyph contours as `<path>` elements instead of `<text>` elements with font references. The toolbar icon renders identically on every system regardless of which fonts are installed (previously the SVG depended on Arial Unicode MS being present, with sans-serif fallbacks each producing slightly different glyphs). A new `dev/render_icon_paths.py` regenerates the SVG from the source fonts using `fonttools`; `dev/render_icon_pillow.py` continues to produce the PNG from the same source fonts at build time so both formats remain visually identical.
- **Icon recoloured for theme neutrality.** The Latin R, the underline beneath the text, and the warning-shield border are now Material blue (`#1976d2`) instead of black, so the toolbar icon stays legible against the full range of possible toolbar background colours including pure-black themes. The Armenian Մ and Լ (`#d32f2f`) and the diagonal strikethrough (`#b71c1c`) are unchanged, preserving the intentional visual hierarchy of "threat letters" with the slash sitting on top.
- **Help-file badge illustrations now SVG.** `extension/img/badge-0.svg` and `extension/img/badge-1.svg` replace the four previous `badge-{0,1}-{white,black}.png` files. Because the icon is now theme-neutral the per-theme PNG pairs are unnecessary, so the Help page's `.badge-light` / `.badge-dark` CSS swap structure has also been removed. A new `dev/render_help_badges.py` regenerates the two SVGs from the current `extension/icon.svg`.
- **Icon-render scripts no longer bundle Segoe UI Bold.** Microsoft's EULA does not permit redistribution of `segoeuib.ttf`, so the .ttf has been removed from `dev/` (and from git history). `dev/render_icon_paths.py` and `dev/render_icon_pillow.py` now locate Segoe UI Bold via the OS font directories — Windows users get it from `C:\Windows\Fonts` automatically; Linux users install it once to `~/.local/share/fonts/`. The OFL-licensed `NotoSansArmenian-Bold.ttf` continues to ship in `dev/`. See `CONTRIBUTING.md` for the regeneration workflow.
- **Extension icon is now SVG-only.** `extension/icon.png` has been removed; `manifest.json` now declares `icon.svg` at numeric sizes (`32`, `48`, `96`, `128`) — Firefox renders the SVG at every size it needs (toolbar, about:addons, etc.). The PNG copies needed for the AMO listing-icon slots now live in `dev/listing-icons/` and are produced by the refactored `dev/render_icon_pillow.py` (which previously wrote the in-extension PNG; that job is no longer needed since the extension ships SVG-only).
- **AMO listing-screenshot reuse.** New `dev/gather-listing-screenshots.py` curates a numbered subset of the help-page screenshots from `extension/img/` into `dev/listing-screenshots/`, ready to upload to the AMO listing carousel. Re-capturing screenshots is only needed when the underlying UI actually changes, not as a routine step on every listing update. The previous `dev/render_listing_icons.py` has been removed as redundant — `render_icon_pillow.py` now handles its job directly.
- **Help-page figure layout simplified.** The horizontal rule above each `<figure>` and above each `<figcaption>` (CSS `border-top` rules) has been removed; screenshots in `.img-light` / `.img-dark` figures now have a 1px border instead, which reads more cleanly and removes the visual repetition.
- **Help-page header is now sticky.** The title bar and theme-toggle button remain visible while scrolling long pages; the background colour and drop shadow update for both light and dark themes.
- **Help-page section order and screenshots revised.** In the Extension icon section, the badge illustrations now appear before the right-click menu screenshot so the visual flow matches the descriptive text. The Private browsing protection section has moved to after Coloured squares, closer to the Interface options content it cross-references. A new Interface options screenshot pair (`options-interface-black/white.png`) has been added to document that section.
- **Screenshot capture tool: full-page capture fixed.** When capturing a page taller than the viewport, Firefox clamps the scroll position at the page bottom — the last strip was being sourced from the wrong Y offset in the captured bitmap, producing a repeated or misaligned bottom slice. The capture now computes the correct source rectangle (`srcY = (cssY − actualScrollY) × dpr`). The options page capture also hides the private-browsing warning banner and page footer before capturing so they do not appear in the help-page screenshots. A race condition in `devDownload` where a download completing before the `onChanged` listener was registered caused the capture to hang; fixed with a post-registration poll and a resolved-once guard.
- **Test plan and test-URL file reorganised.** Language entries in §5 are now alphabetical and Part B's instruction now uses "Reset to Locale Defaults" rather than manually unchecking all ten languages. The standalone toolbar-badge section has been merged into §6 where the badge behaviour naturally arises during testing; §6 is split into labelled parts (A–J) for easier navigation. The Help page section lists every section name. `test-urls.html` gains matching numbered sections (Test #0–#7) in the same order as the test plan so URLs can be found without hunting.
- **Minimum Firefox version raised to 140.** `strict_min_version` in `manifest.json` has been updated from `126.0` to `140.0`. Firefox 140 introduced native support for the `data_collection_permissions` manifest key; earlier versions produced AMO validator warnings for that field.

### Fixed

- **Options tab closing on first run.** On a fresh install with no stored settings, `loadSettings()` calls `applyToStorage()` to seed locale defaults. That function was also sending an `applySettings` message to the background, which closes the Options tab as part of the normal Apply-button flow — inadvertently closing the tab the moment it opened. Fixed by removing the message; background state is now synced solely via the `storage.onChanged` listener in `background.js`.
- **Private-browsing warning checkbox disabled when private access is already granted.** When the extension is allowed to run in private windows the private-browsing warning can never appear, so the "Show private-browsing warning" checkbox in Interface options was interactive but had no effect. It is now disabled in that state, with a tooltip explaining why.

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
