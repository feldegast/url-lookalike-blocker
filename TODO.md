# TODO / Future Features

## Pending before v1.1 submission

- [x] Bump `extension/manifest.json` version from `"1.0"` to `"1.1"`.
- [x] Rename `## [Unreleased]` in `CHANGELOG.md` to `## [1.1] — YYYY-MM-DD` (the submission date).
- [ ] Run the full pre-submission checklist in `RELEASE.md`.
- [ ] Submit to Mozilla AMO. Once accepted, tag the commit (`git tag -a v1.1 <commit> -m "..."` then `git push --tags`).

## Fix automated capture cutting off bottom of options page

The `devCaptureFullPage` function in `background-dev.js` measures the page height before capturing strips. If the private-browsing warning is shown/hidden mid-loop it changes the page height between measurement and stitching, causing the bottom to be cut off. Fix: send `devHidePrivateWarning` immediately before calling `devCaptureFullPage` (and `devShowPrivateWarning` after if needed), so the page height is stable for the entire capture.

---

## Split warning page help section into separate sections

**Goal:** Replace the single "Warning page" section in `help.html` (which currently has confusable and mixed-script as sub-types) with two separate top-level sections — "Confusable warning" and "Mixed-script warning" — so each matches its screenshot name and the navigation is self-explanatory.

**Prerequisite:** The warning pages themselves (`warning.html`) currently contain no text that identifies them as "warning" pages. Add a visible "Warning" label or heading to both warning page types in the UI before updating the help page, otherwise the help section headings will not match what the user sees on screen.

**Estimated effort:** Small once the UI change is in place.

---

## Script-coloured tags and single-script language auto-tick

**Goal:** Make the options page accurately reflect what the extension actually permits. When Japanese is enabled, Han is permitted — but Chinese (Han-only) shows as unchecked, giving the user a false picture. This feature fixes that with visual script colouring and a cascade-aware auto-tick system.

### Visual behaviour

Each language row's script tags are coloured live as the user ticks and unticks languages:
- **Green** — script is currently in the permitted set
- **Grey** — script is not currently permitted (not red — a default install would show a wall of red tags which reads as alarming; grey is neutral. Red/green is also the worst colourblind pairing)

Pair the colour with a second cue — a ✓ in the tag or a border-style difference — so the distinction works without colour alone. Add dark-theme variants for both classes.

The colouring updates immediately on every checkbox change, before the user clicks Apply, so the user can see the effect of a change in real time.

**Colour source:** compute from the same permitted-set function Apply uses — explicit languages' scripts ∪ locale-seeded scripts ∪ always-Latin — not just a walk over ticked checkboxes. Otherwise a locale-seeded script with no corresponding ticked row renders grey while the background is actually permitting it, recreating the exact display-lies-about-effective-state bug this feature exists to fix.

### Auto-tick rule (single-script languages only)

After recolouring, every **single-script language** whose sole script is green is automatically ticked. Multi-script languages (e.g. Japanese: Hiragana + Katakana + Han) are **never** auto-ticked regardless of how many of their scripts are green — because ticking a multi-script language also blesses those scripts appearing together in a single domain label (mixed-script logic), which must remain an explicit user choice.

Auto-ticked checkboxes are **not disabled** — the user can untick them directly (see cascade below). However they must be **visually distinct** from explicit ticks (dimmed checkbox, or a small "via Japanese" annotation) because their untick behaviour differs and the user needs to see the provenance.

**Example — Japanese ticked:**
1. Permitted scripts: {Hiragana, Katakana, Han} ∪ locale scripts ∪ Latin
2. Hiragana tag → green (Japanese row)
3. Katakana tag → green (Japanese row)
4. Han tag → green (Japanese row, Chinese row, Korean row)
5. Chinese is single-script (Han only) — no mixed-script logic applies — Han is green → Chinese auto-ticks (shown dimmed)
6. Korean is multi-script (Hangul + Han) — Han is green but Hangul is grey, and Korean would not auto-tick even if both were green → Korean stays unticked
7. Hebrew is single-script (Hebrew script only) — Hebrew script is grey → Hebrew stays unticked

**Latin-only languages must not appear in the language table** — Latin is always permitted, so they would be permanently auto-ticked and their veto would be undefined. The existing `LANGUAGE_SCRIPTS` table already excludes Latin-only languages for unrelated reasons; the auto-tick rule makes this load-bearing.

### Bookkeeping — two sets, not one

Keep derived ticks out of `enabledLanguages`, storage, and dirty-tracking. Use two separate sets:

- **`explicitLanguages`** — what `enabledLanguages` is today. Stored, dirty-tracked, fed to `computeLangScripts`. Never contains auto-ticked languages.
- **`derivedTicked`** — computed at render time only. Never persisted. Never compared in `checkDirty`.

If auto-ticks leak into `explicitLanguages`, Apply persists them, the next page load can't distinguish explicit from derived, dirty dots fire on rows the user never touched, and Reset-to-locale-defaults comparisons go murky. A single-script language contributes no new script and no new mixed-script blessing, so a derived tick is purely informational — nothing about blocking behaviour changes whether it is stored or not.

### Cascade on untick — operational pipeline

**Rule:** untick always means "I don't want these scripts" — the same rule for explicit and auto-ticked languages, no provenance tracking needed. The permitted set only ever shrinks on an untick.

**Pipeline (order matters):**
1. Remove the unticked language from `explicitLanguages` (or from `derivedTicked` if auto-ticked)
2. Recompute permitted scripts from surviving `explicitLanguages`
3. Any currently-ticked language whose scripts are no longer fully covered → cascade-untick it (remove from `explicitLanguages`), repeat from step 2 until stable
4. Run `refreshState()` on the surviving set — recolour tags, re-derive auto-ticks

The cascade must complete **before** `refreshState()` runs. If `refreshState()` runs first it sees Japanese still providing Han and re-ticks Chinese, producing a re-tick loop. After the cascade the permitted set has only shrunk, so nothing can newly qualify for auto-tick.

**Invariant to encode as a test assertion:** after any single untick event, the count of ticked languages (explicit + derived) strictly decreases — never stays equal via a re-tick, never grows.

**Example — Japanese and Korean both explicitly ticked, Chinese auto-ticked. User unticks Chinese:**
1. Chinese removed from `derivedTicked`; recompute scripts from {Japanese, Korean} → Han still green (both provide it)
2. Han is still green — but Chinese's untick is a veto on Han itself, so Han is removed from the permitted set
3. Han tag → grey on all rows (Chinese, Japanese, Korean)
4. Japanese requires Han — Han is grey → Japanese cascade-unticks (removed from `explicitLanguages`)
5. Korean requires Han — Han is grey → Korean cascade-unticks (removed from `explicitLanguages`)
6. `explicitLanguages` now empty; recompute: Hiragana, Katakana, Hangul all grey
7. `refreshState()` runs: all tags grey, no auto-ticks qualify, all languages unticked

**Example — user unticks Japanese directly (Korean still explicit):**
1. Japanese removed from `explicitLanguages`; recompute from {Korean} → Han green (Korean provides it), Hangul green
2. Hiragana: no remaining provider → grey. Katakana: no remaining provider → grey
3. No cascade needed — Korean still has all its scripts
4. `refreshState()` runs: Han green on Chinese and Korean rows, Hangul green on Korean row, Chinese auto-ticks (dimmed), Korean stays explicit-ticked

**Make the cascade legible:** dirty dots will appear on cascaded rows (explicit state changed), and the live colour flip is visible. Eyeball the Japanese→Korean case during testing to confirm a user would notice multiple rows changed from one click.

### Key test cases

- **CJK cluster:** Japanese + Korean explicit, Chinese auto-ticked. Untick Chinese → all off. Untick Japanese (Korean explicit) → Korean and Chinese survive, Hiragana/Katakana go grey.
- **Cyrillic cluster:** Russian, Ukrainian, Bulgarian, Serbian — all single-script Cyrillic (Serbian also has Latin). Ticking Russian auto-ticks Ukrainian, Bulgarian; ticking Serbian enables Latin+Cyrillic blessing. Unticking any one Cyrillic language cascades through the others if it is the last Cyrillic provider.
- **Locale-seeded scripts show green** even with no explicit tick — verify the colour source is the real permitted set, not just the checkbox walk.
- **Strict-decrease assertion:** write a test that after any untick, `explicitLanguages.size + derivedTicked.size` is strictly less than before.

### What's involved

- **`options.js`** — two sets (`explicitLanguages`, `derivedTicked`); a `runCascade(vetoedLanguage)` function that mutates `explicitLanguages` until stable; a `refreshState()` that recolours tags (grey/green + secondary cue) and re-derives `derivedTicked` from the surviving explicit set. Checkbox change handler: run cascade first, then `refreshState()`. `checkDirty` compares `explicitLanguages` only.
- **`options.html` / CSS** — `.script-green` and `.script-grey` tag styles with a secondary visual cue; dimmed style for auto-ticked checkboxes; dark-theme variants for both.
- **Screenshots** — options page screenshots need recapturing after the tag colours are in place.
- **Testing** — full options page re-test against the key test cases above, plus the strict-decrease assertion.

**Estimated effort:** Medium-large — the cascade logic and two-set bookkeeping are the main complexity; `refreshState()` itself is straightforward once the sets are clean.

---

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
