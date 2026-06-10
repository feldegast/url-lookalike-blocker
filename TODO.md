# TODO / Future Features

## Firefox for Android compatibility

**Goal:** Make the extension installable and usable on Firefox for Android, so the homograph protection extends to mobile browsing.

**What ports for free:** The detection logic itself is platform-agnostic. `webRequest`, `storage`, and the Unicode-script work in `background.js` and `unicode-scripts.js` would behave identically on Android, so the core security value carries over without code changes.

**What needs attention:**

- **Responsive CSS** across `options.html`, `blocked.html`, `warning.html`, and `help.html`. The options page's wide language table, the multi-button rows on the block/warning pages, and the dense whitelist/coloured-squares layouts are all desktop-first and will overflow or wrap badly on narrow screens. Add `@media (max-width: …)` rules to stack buttons vertically, narrow the language table, and reduce padding.
- **`menus` API on Android** — Firefox for Android has no traditional right-click, so the "Open Options" / "Help" context menu items either won't surface or will behave differently. Verify whether the menus declarations are silently ignored or cause errors; either way the toolbar-icon flow and in-page links should remain the primary entry points.
- **Toolbar icon UX** — on Android the extension icon lives inside the browser menu rather than the toolbar, so the icon-click → options flow still works but the badge may not appear (Android doesn't show toolbar badges). Confirm and adjust expectations in the help docs if needed.
- **`gecko_android` declaration** in `browser_specific_settings.gecko_android` so Firefox for Android treats the extension as supported (currently only `gecko` is declared, which is desktop-only).
- **Testing** on an Android device or emulator before submission — manifest-only changes are risky to ship blind.

**Estimated effort:** Half a day for an acceptable port (mostly CSS + manifest), more for a polished one with Android-specific UX tweaks. Reasonable as a 1.1 follow-up after gathering any feedback from the 1.0 desktop submission.

## User-visible copyright and licensing

**Goal:** Show the copyright and licence inside the extension's own UI so a user who installed it (and may never look at the AMO listing or GitHub) can see who wrote it and under what terms.

**What needs attention:**

- **"About" section on the Help page** — a short block near the bottom of `help.html` with: copyright line ("© 2026 Lee MacKinnell"), licence summary ("Dual-licensed MPL-2.0 OR GPL-3.0"), and a link to the full licence text in the repo. Optional one-line credit for any libraries used (currently none, but worth a slot if Pillow-rendered icons stay in scope).
- **Footer line on the Options page** — a small, low-contrast line under the bottom-most section ("© 2026 Lee MacKinnell · MPL-2.0 / GPL-3.0 · [Help]"). Keeps the Help page as the canonical place, but the Options page is where users go most often, so a footer makes the info one click away from every session.
- **Link from the toolbar right-click menu** — already has "Open Options" and "Help"; consider whether an explicit "About" item is worth adding, or whether the Help-page "About" block is enough. Probably enough — keeps the menu minimal.

**Estimated effort:** Half an hour. Pure copy + small CSS for the footer; no logic changes.

## Unified 128×128 extension icon

**Goal:** Have a single, identical 128×128 icon used everywhere — the Firefox toolbar, the AMO listing, the addons manager, and the help-page header — rather than the current SVG (rendered live with system-font fallback) versus PNG (baked from Pillow with Arial Unicode MS) split that produces small but visible differences in the Armenian Մ glyph.

**Approach options:**

- **Render a master 128×128 PNG** from a definitive source (Pillow with a pinned font, or Inkscape from an SVG with embedded fonts) and reference that PNG for both the manifest icons block and the action's default_icon. Drop the SVG-based toolbar render. Smaller, identical everywhere, but loses scalability — the browser will downscale to ~16px / 32px for the toolbar.
- **Embed the font in `extension/icon.svg`** so the toolbar render becomes deterministic. Keeps SVG for the toolbar (crisp at any zoom level) and have Inkscape/cairosvg re-render the PNG from the same SVG so AMO and the toolbar match exactly. Larger SVG (~50–100 KB depending on the embedded glyphs) but full visual parity.
- **Hand-craft a vector icon** that doesn't depend on a font for the Armenian glyph — trace the letter as a `<path>` so it renders identically on every system without font dependencies. Smallest SVG, full parity, but requires icon-design work.

**Recommendation:** Option 3 if you want a long-term clean answer; option 2 if you want the quickest path to visual parity without redesigning. Skip option 1 unless toolbar pixel-precision at 16/32 matters more than scalable rendering.

## Domain Age Check (RDAP)

**Goal:** Catch typosquatting by flagging recently registered domains.

**Approach:** Query RDAP (free, standard HTTP/JSON protocol — e.g. `https://rdap.org/domain/<hostname>`) to retrieve the domain registration date, then display it as extra context on the block page alongside the existing character table. Not a blocking condition on its own — too noisy — just an informational signal for the user.

**Only run on already-flagged domains** to avoid adding latency to normal browsing. Cache results in `browser.storage.local` so repeat visits don't re-query.

**Concerns to address before implementing:**
- RDAP coverage gaps for some ccTLDs
- Rate limits on public RDAP servers
- The async lookup should not delay the block page render — fetch in parallel and update the page if/when the result arrives
- Consider making this an opt-in setting in the options page
