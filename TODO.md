# TODO / Future Features

## Pending before v1.1 submission

- [ ] Bump `extension/manifest.json` version from `"1.0"` to `"1.1"`.
- [ ] Rename `## [Unreleased]` in `CHANGELOG.md` to `## [1.1] — YYYY-MM-DD` (the submission date).
- [ ] Run the full pre-submission checklist in `RELEASE.md`.
- [ ] Submit to Mozilla AMO. Once accepted, tag the commit (`git tag -a v1.1 <commit> -m "..."` then `git push --tags`).

## Expand "always-permitted Latin languages" reference

**Goal:** Make it clearer that permitting Latin by default means URLs written in *every* Latin-script language load normally — not just the ~26 languages currently named at the bottom of the options page. Move the comprehensive list into `help.html` and leave a brief pointer on the options page.

**Framing for the help section** (the wording matters — the extension doesn't "protect languages", it just permits URLs in those languages): *"Latin is permitted by default, so URLs written in any Latin-script language load normally — the extension doesn't block them or warn you about them. The list below covers which languages that includes, beyond the common ones in the options panel."*

**What's involved:**

- **`extension/help.html`** — add a new section "Latin-script languages — always permitted" with `id="latin-languages"` as an anchor target. Group the languages by region (European / African / Asian and Pacific / multi-script edge cases). Lead with the framing above.
- **`extension/options.js`** — append a small hyperlink after the existing always-on list: *"See Help for additional Latin-script languages also permitted by default."* Use `browser.runtime.getURL('help.html#latin-languages')` so it deep-links to the new anchor.
- **`extension/options.html`** — minor CSS for the new note element so it visually matches the existing `.latin-only-list` styling.

**Languages to add to the help-file list (beyond the 26 already in `options.js`):**

*Major European:* Croatian, Slovenian, Lithuanian, Latvian, Estonian, Albanian, Icelandic, Irish (Gaeilge), Welsh, Scottish Gaelic, Maltese, Luxembourgish, Faroese.

*Widely-spoken non-European:* Swahili, Somali, Hausa, Yoruba, Igbo, Zulu, Xhosa, Maori, Samoan, Hawaiian, Cebuano.

*Multi-script edge cases — list with explanatory notes:*
- **Bosnian** — Latin and Cyrillic both in use depending on author preference.
- **Azerbaijani** — Latin since 1991; Cyrillic still used in some contexts.
- **Uzbek** — Latin officially since 1995, but Cyrillic remains common in print.
- **Turkmen** — Latin officially.
- **Kazakh** — transitioning Cyrillic → Latin, target completion 2031.
- **Kurdish** — Kurmanji (Turkey/Syria) is Latin; Sorani (Iraq/Iran) uses an Arabic-derived script and falls under separate script-permission rules.

**Estimated effort:** 15-20 minutes plus a visual check in Firefox.

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

## Internationalisation (i18n)

**Goal:** Render the extension UI in the user's Firefox **display language** (the one Firefox itself uses for its UI, returned by `browser.i18n.getUILanguage()` — distinct from the page-content language preferences). Firefox supports ~100 display languages, so the target is a curated subset; see staging below. Optionally add an in-extension language override (a dropdown in Options) so the user can pick a different language for the extension specifically, defaulting to Firefox's display language.

**What's involved:**

- Refactor all hardcoded strings in `options.html`, `help.html`, `blocked.html`, `warning.html`, and their supporting `.js` files to use the WebExtensions `i18n` API (`browser.i18n.getMessage('key')` in code, `__MSG_key__` placeholders in manifest and HTML).
- Add `"default_locale": "en"` to `manifest.json`.
- Create `_locales/en/messages.json` as the canonical English source.
- Per-language translations live in `_locales/<lang>/messages.json` and are auto-selected by Firefox; if no file exists for the user's display language, Firefox falls back to `default_locale`.
- The optional in-extension override needs a workaround — MV3 doesn't expose locale switching directly, so the override would store the user's choice and load the chosen `messages.json` manually via `browser.runtime.getURL()`.

**Scope of strings:**
- Options page: labels, buttons, language names (for script permissions), whitelist headers, interface options.
- Block/warning pages: titles, action buttons, character-table headers, the "Looks like" annotation.
- Help page: substantial body copy — by far the biggest translation burden.

**Concerns to address:**
- Some technical terms (Cyrillic, homograph, mixed-script, punycode) may not have natural translations in every language; may need to coin or borrow.
- Right-to-left support (Hebrew, Arabic, Persian) — the CSS uses left-to-right layout implicitly in many places; would need `[dir="rtl"]` overrides.
- Pluralisation is minimal in WebExtensions i18n — usually handled by separate keys (`oneTab` / `manyTabs`).
- Translation maintenance burden when strings change — every locale file needs an update.

**Staging:**
- **Tier 1** — English (canonical), French, German, Spanish, Italian, Portuguese, Dutch. Cover the bulk of Firefox's European user base; AI translation quality is high enough to ship without mandatory native review.
- **Tier 2** — Russian, Polish, Japanese, Simplified Chinese, Korean. Worth shipping, but flag on the AMO listing as "translations AI-assisted, native corrections welcome" so users know to push back on awkward phrasing.
- **Tier 3** — anything else. Scaffolding makes these possible without us writing the translations — Firefox falls back to English, and AMO's community translation flow lets native speakers fill them in over time.

**Estimated effort:** A few hours for the i18n scaffolding (string-extraction refactor) plus Tier 1 translations. Tier 2 is another half-day. The optional in-extension override is half a day on top. Land in stages: scaffolding + English-only first as a no-op refactor, then Tier 1 as a single follow-up, then Tier 2 once the scaffolding has had real-world testing.

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
