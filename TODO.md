# TODO / Future Features

## Compact mode for the Options page

**Goal:** Add a "Compact mode" toggle in the Interface options section that hides the language table entirely, leaving just the whitelist and interface options visible. Aimed at users who want homograph protection without needing to understand scripts and locales — particularly useful on mobile (tablet and phone) and for Latin-script language users who will rarely if ever need to adjust language settings.

**Behaviour:**
- When compact mode is on, the full language table is replaced with a read-only list of currently permitted languages (one per line, no checkboxes or script tags) with an [Edit] button that opens a modal/dialogue containing just the language table, Reset to locale defaults, and Apply/Discard. Everything else (whitelist, interface options) remains on the main options page.
- When compact mode is off, the full language table is shown inline as it is today.
- The locale-derived permitted scripts still apply in the background — compact mode is purely a UI simplification, not a change to the detection logic.
- The toggle itself lives in Interface options and takes effect immediately (no Apply step required, same as the other interface options).

**Default by platform:**
- **Phone:** compact mode on by default — the full language table is too complex for a small screen.
- **Tablet and desktop:** compact mode off by default — screen real estate is sufficient for the full table, and power users should not have to drill down unnecessarily.
- Platform detection via `navigator.userAgent` or screen width at first run to set the initial default; user can override via the toggle at any time.

**Why it helps:**
- Makes the extension approachable for casual users who just want the protection.
- Dramatically simplifies the options page for phone layouts.
- The edit dialogue approach means language configuration is still accessible on any device without cluttering the default view.

**Implementation order:**
1. **Compact mode toggle** — add the storage flag and the Interface options checkbox; no behaviour change yet, just the on/off mechanism.
2. **Permitted languages read-only list + Edit dialogue** — core of compact mode and most complex piece; tackle while design is fresh.
3. **Whitelist read-only summary + Edit dialogue** — same pattern as languages, easier second time around.
4. **Platform default detection** — set compact mode on by default for phones once the feature itself is working.
5. **Help page update** — document compact mode once the design is finalised, not before.

Coloured squares and private browsing warning require no changes in compact mode.

**Estimated effort:** Small to medium — the read-only list and modal dialogue are slightly more than a pure CSS show/hide, but the detection logic and storage pattern are straightforward.

---

## Animate script-tag colour transitions on the options page

**Goal:** When the user ticks or unticks a language, script tags change colour (grey ↔ green) with a staggered delay so the change visibly propagates top-to-bottom, left-to-right — making the cascade feel tangible rather than instantaneous.

**What's involved:**

- Add a CSS `transition` on `.script-tag` for `background-color`, `color`, and `border-color` (a short fade, ~150ms).
- In `refreshState()`, collect all tags whose `script-permitted` class is about to change, sort them by DOM order, and assign increasing inline `transition-delay` values (e.g. 40–60ms per step) before toggling the class.
- Store the scheduled timeout IDs and cancel any in-flight animation before starting a new one, so rapid clicks don't stack multiple waves.

**Estimated effort:** Small — an hour or two. Pure polish, no logic changes.

---

## Firefox for Android compatibility

**Status: initial support shipped.** `gecko_android` declared in manifest, touch-friendly CSS added to all pages, blocked/warning buttons stack vertically on narrow screens.

**Remaining:**

- **Toolbar badge** — on Android the extension icon lives inside the browser menu rather than the toolbar; confirm whether the numeric badge appears. If not, adjust help docs expectations.
- **Context menu** — Firefox for Android has no right-click menu. The `menus` declaration is silently ignored. This is acceptable: the extension icon tap opens Options, and the Help button inside Options opens the help page — both entry points work without the context menu.
- **Testing** on a real Android 16 tablet and phone (both available) before submission.

## Internationalisation (i18n)

**Goal:** Render the extension UI in the user's Firefox **display language** (the one Firefox itself uses for its UI, returned by `browser.i18n.getUILanguage()` — distinct from the page-content language preferences).

**Help page approach — per-language files:** Rather than extracting the help page's body text into `messages.json` (which would mean hundreds of JS-injected string substitutions and be a maintenance nightmare), each language gets its own `help.<lang>.html` file. A small redirect script checks `browser.i18n.getUILanguage()` on load and serves the appropriate file, falling back to `help.html` (English GB) if no translation exists. This keeps help pages as normal readable HTML. The downside is that translated help files can drift if the English version changes, but this is acceptable given how infrequently translations would be updated.

**UI strings — standard i18n API:** All short strings in `options.html/js`, `blocked.html/js`, and `warning.html/js` (buttons, labels, table headers, status messages, the "Looks like" annotation) use the standard WebExtensions `i18n` API — `browser.i18n.getMessage('key')` in JS, `__MSG_key__` in the manifest.

**What's involved:**

- Add `"default_locale": "en_GB"` to `manifest.json`.
- Create `_locales/en_GB/messages.json` with all UI strings — this is the canonical English (GB) source.
- Replace hardcoded UI strings in `options.js`, `blocked.html/js`, and `warning.html/js` with `browser.i18n.getMessage()` calls.
- Add a locale-redirect script so `help.html` is the en_GB fallback and `help.<lang>.html` files are served when available.
- Per-language UI translations live in `_locales/<lang>/messages.json`; Firefox falls back to `en_GB` automatically if none exists.

**Concerns to address:**
- Some technical terms (Cyrillic, homograph, mixed-script, punycode) may not have natural translations in every language; may need to coin or borrow.
- Right-to-left support (Hebrew, Arabic, Persian) — the CSS uses left-to-right layout implicitly in many places; would need `[dir="rtl"]` overrides.
- Pluralisation is minimal in WebExtensions i18n — usually handled by separate keys (`oneTab` / `manyTabs`).

**Staging:**
- **Phase 1** — Scaffolding only: `en_GB` messages.json + string extraction refactor + help redirect mechanism. No user-visible change, but the infrastructure is in place.
- **Phase 2** — Tier 1 languages: French, German, Spanish, Italian, Portuguese, Dutch. AI translation quality is high enough to ship without mandatory native review.
- **Phase 3** — Tier 2 languages: Russian, Polish, Japanese, Simplified Chinese, Korean. Flag on the AMO listing as "translations AI-assisted, native corrections welcome."
- **Phase 4** — anything else. The scaffolding makes community contributions possible; Firefox falls back to English GB for any unsupported locale.

**Estimated effort:** Phase 1 — a few hours (refactor only, no new content). Phase 2 — half a day. Phase 3 — another half-day. Help page translations are additional effort per language on top.

## Domain Age Check (RDAP)

**Goal:** Catch typosquatting by flagging recently registered domains.

**Approach:** Query RDAP (free, standard HTTP/JSON protocol — e.g. `https://rdap.org/domain/<hostname>`) to retrieve the domain registration date, then display it as extra context on the block page alongside the existing character table. Not a blocking condition on its own — too noisy — just an informational signal for the user.

**Only run on already-flagged domains** to avoid adding latency to normal browsing. Cache results in `browser.storage.local` so repeat visits don't re-query.

**Concerns to address before implementing:**
- RDAP coverage gaps for some ccTLDs
- Rate limits on public RDAP servers
- The async lookup should not delay the block page render — fetch in parallel and update the page if/when the result arrives
- Consider making this an opt-in setting in the options page

---

## Runbook: recapturing help-page screenshots

This isn't a TODO — it's the reference for when underlying UI changes warrant fresh captures. The capture/normalise/upload pipeline is automated; what stays manual is opening Firefox and triggering each page.

**The three test URLs** (top section of `dev/test-urls.html` — "Quick test — one URL per page type"):

1. `xn--pple-43d.com` → аpple.com (leading Cyrillic 'а') — **Block page**. Requires Cyrillic *disabled* in Options before navigating.
2. `xn--aypal-uye.com` → рaypal.com (Cyrillic 'р' in Latin label) — **Warning (confusable)**. Requires Cyrillic *enabled*.
3. `xn--test-34d.com` → testж.com (Latin + Cyrillic mix) — **Warning (mixed-script)**. Requires Cyrillic *enabled* and Serbian *disabled*.

Navigate to each link via `dev/test-urls.html` — do not type or paste URLs into the address bar.

For each page: capture light theme, toggle the page's theme button, capture dark theme. See `dev/normalise_screenshots.py`'s docstring for the Firefox DevTools "Screenshot Node" steps. Then:

```
python dev/normalise_screenshots.py extension/img/*.png   # normalise padding
python dev/gather-listing-screenshots.py                  # refresh AMO listing copies
```

Reset the extension settings to a clean state after capturing.
