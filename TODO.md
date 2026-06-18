# TODO / Future Features

## Optional: disable "always permit Latin"

**Goal:** Allow users to opt out of Latin being unconditionally permitted, for contexts where Latin-script domains are not needed or are a security risk (e.g. a Chinese school network where all legitimate browsing is Han-script only).

**Background:** Latin is currently hardcoded into `ALWAYS_PERMITTED` alongside Common and Inherited — a eurocentric assumption that every user has a legitimate reason to visit Latin-script domains. For non-Latin-script users this increases their homograph attack surface unnecessarily.

**Design intent:** Latin should be removed from the hardcoded `ALWAYS_PERMITTED` set in the core logic. Instead, a UI setting — "Always enable Latin script" — controls it, defaulting **on**. The net effect for most users is unchanged; the setting exists so non-Latin-script users can opt out.

**What's involved:**

- Remove Latin from the hardcoded `ALWAYS_PERMITTED` (`['Common', 'Inherited']` only).
- Add an "Always enable Latin script" toggle to the options page (default: on).
- Store the preference in sync storage alongside `showShadows`/`theme`.
- When the setting is on, Latin is added to `permittedScripts` at runtime exactly as any other permitted script.
- In `computeScriptsFromLanguages`, thread the setting through so the derivation check reflects whether Latin is currently permitted.
- Update the help page to explain the setting and when disabling it makes sense.

**Notes:**
- Common and Inherited remain hardcoded as always permitted — they cover punctuation, digits, and combining marks shared across all scripts.
- Step 3 mixed-script warnings already catch Latin+non-Latin mixing for users who haven't enabled a Latin-bridging language, so the main benefit of disabling Latin is at step 1 (hard blocking of pure Latin-script domains entirely).

**Estimated effort:** Small to medium — the toggle itself is simple; the main care is threading the setting through `ALWAYS_PERMITTED` consistently across background.js, options.js, and unicode-scripts.js.

---

## Help page: explain coloured squares in compact view if requested

Coloured squares are functional in compact mode but rarely useful on phones/tablets where multiple blocked tabs are unlikely. Add a note to the Compact view section only if users ask about it.

---

## Animate script-tag colour transitions on the options page

**Goal:** When the user ticks or unticks a language, script tags change colour (grey ↔ green) with a staggered delay so the change visibly propagates top-to-bottom, left-to-right — making the cascade feel tangible rather than instantaneous.

**What's involved:**

- Add a CSS `transition` on `.script-tag` for `background-color`, `color`, and `border-color` (a short fade, ~150ms).
- In `refreshState()`, collect all tags whose `script-permitted` class is about to change, sort them by DOM order, and assign increasing inline `transition-delay` values (e.g. 40–60ms per step) before toggling the class.
- Store the scheduled timeout IDs and cancel any in-flight animation before starting a new one, so rapid clicks don't stack multiple waves.

**Estimated effort:** Small — an hour or two. Pure polish, no logic changes.

---

## Sync settings across devices (browser.storage.sync)

**Goal:** Whitelist and language settings follow the user across all their Firefox installs automatically — particularly relevant now that the extension supports both desktop and Android.

**What's involved:**

- Switch `browser.storage.local` to `browser.storage.sync` for whitelist and language settings (interface preferences like theme and shadows can stay local).
- Handle the sync storage quota: 100KB total, 8KB per item. A very large whitelist could hit this. Graceful fallback: detect quota errors and warn the user, or offer a "local only" toggle.
- Test that changes on one device propagate to another via `storage.onChanged`.

**Estimated effort:** Small to medium — the storage calls are already centralised, so the switch is straightforward. The quota handling adds some complexity.

---

## Content Security Policy (CSP)

**Goal:** Declare an explicit CSP in the manifest rather than relying on the MV3 default.

**What's involved:**

- Add to `manifest.json`:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
  ```
- Verify no inline scripts or `eval` calls exist anywhere in the extension pages (there shouldn't be — the reviewer's red-flag scan confirmed this).

**Estimated effort:** Trivial — one manifest change plus a quick audit.

---

## Keyboard accessibility

**Goal:** Full keyboard navigation across all extension pages — required for AMO Recommended status and important for accessibility.

### Language table (Desktop and Compact mode — same implementation, shared)

The table is a single Tab stop. Arrow keys navigate within it:

| Key | Action |
|---|---|
| Tab / Shift+Tab | Enter/leave the table (single tab stop) |
| ↑ / ↓ | Move one row up or down |
| Home / End | Jump to first / last language |
| Space | Toggle the focused language on/off |
| A–Z | Multi-character typeahead — jump to next language matching the typed prefix |
| Escape | Close the overlay (compact mode only) |

Typeahead resets after **1500ms** of inactivity. Implementation: roving tabindex pattern — only the active row has `tabindex="0"`, all others have `tabindex="-1"`.

The compact mode language overlay uses the same DOM element as the desktop inline table (moved into the modal on open, moved back on close) — so the keyboard logic is written once and works in both contexts.

### Whitelist (Desktop and Compact mode — same implementation, shared)

Tab/Shift+Tab moves between remove buttons. Space or Enter activates the focused button. Same single implementation works inline (desktop) and in the compact modal.

### Modal focus management (compact mode)

One reusable focus-trap function, called by both `openLanguageModal()` and `openWhitelistModal()`:

- On open: move focus to the first focusable element inside the modal
- Tab at the last focusable element wraps to the first (and vice versa for Shift+Tab)
- Escape closes the modal and returns focus to the button that opened it

### Blocked and warning pages

Buttons are natively focusable — just needs visible focus indicators added (CSS only).

### Focus indicators

- `.tab-dot-btn` suppresses the default outline (`outline: none`) but has `border: 3px solid transparent` — on `:focus-visible` make that border visible (white or green)
- Add a consistent `:focus-visible` style for all buttons and interactive elements across all pages

### Help page documentation

Document keyboard shortcuts once in the **Desktop view** section. The **Compact view — Additional sections** entry for keyboard navigation just says: "identical to Desktop view — see Desktop view keyboard shortcuts."

### Tab order across the options page (top to bottom)

1. Header buttons (Options, theme toggle)
2. Coloured squares
3. Private browsing warning (if shown)
4. Interface options checkboxes
5. Whitelist section
6. Language table (single Tab stop, arrow keys within)
7. Apply / Discard bar

Tab/Shift+Tab moves between sections — no section-jump shortcuts needed.

**Estimated effort:** Medium — roving tabindex and modal focus trap are the main work; everything else is CSS fixes.

---

## AMO Recommended Extensions programme

**Goal:** Apply for Mozilla's Recommended badge, which improves discoverability and signals trustworthiness to users.

**How it works:** Mozilla editorial staff curate the programme — there is no formal application form. Email **amo-featured@mozilla.org** with a link to the AMO listing. Criteria are assessed on five dimensions:

1. **Functionality** — works exceptionally well at what it promises
2. **Security** — passes rigorous review by Mozilla security staff
3. **User experience** — intuitive and delightful to use, including keyboard accessibility
4. **Relevance** — appeals to a general, international audience
5. **Active development** — maintained and evolving with Firefox

**Pre-application checklist** — complete these first:

- [x] CSP declared in manifest
- [x] storage.sync with chunked whitelist
- [x] Keyboard accessibility (language table, whitelist, modal focus trap)
- [ ] i18n Tier 1 — English (US), French, German, Spanish, Italian, Portuguese, Dutch (covers "international audience" criterion at high translation confidence)
- [ ] Email amo-featured@mozilla.org with AMO listing link

**Notes:**
- Criterion 4 (international audience) is the main reason i18n Tier 1 is a prerequisite — an extension displaying only in British English is inherently limited in scope.
- Tier 1 languages (7 Western European + en_US) should be sufficient to make the international case without needing Tier 2.

**Estimated effort:** No code beyond the prerequisites above — just the email once they are done.

---

## Internationalisation (i18n)

**Goal:** Render the extension UI in the user's Firefox **display language** (the one Firefox itself uses for its UI, returned by `browser.i18n.getUILanguage()` — distinct from the page-content language preferences).

**Help page approach — per-language files:** Rather than extracting the help page's body text into `messages.json` (which would mean hundreds of JS-injected string substitutions and be a maintenance nightmare), each language gets its own `help.<lang>.html` file. A small redirect script checks `browser.i18n.getUILanguage()` on load and serves the appropriate file, falling back to `help.html` (English GB) if no translation exists. This keeps help pages as normal readable HTML. The downside is that translated help files can drift if the English version changes, but this is acceptable given how infrequently translations would be updated.

**UI strings — standard i18n API:** All short strings in `options.html/js`, `blocked.html/js`, and `warning.html/js` (buttons, labels, table headers, status messages, the "Looks like" annotation) use the standard WebExtensions `i18n` API — `browser.i18n.getMessage('key')` in JS, `__MSG_key__` in the manifest.

**What's involved:**

- Add `"default_locale": "en_GB"` to `manifest.json`.
- Create `_locales/en_GB/messages.json` with all UI strings — this is the canonical English (GB) source.
- Replace all displayed strings across every extension page and view with `browser.i18n.getMessage()` calls — this includes desktop and compact mode, all modal/overlay labels, and all dynamically inserted text in `options.js`, `blocked.html/js`, and `warning.html/js`. No displayed string is out of scope.
- The Latin-related string (`'Latin languages (always permitted)'` or its replacement) will have been revised by the "disable Latin" feature before Phase 1 begins — extract whatever that feature leaves in place, not the current hardcoded text.
- Add a locale-redirect script so `help.html` is the en_GB fallback and `help.<lang>.html` files are served when available.
- Per-language UI translations live in `_locales/<lang>/messages.json`; Firefox falls back to `en_GB` automatically if none exists.

**Concerns to address:**
- Some technical terms (Cyrillic, homograph, mixed-script, punycode) may not have natural translations in every language; may need to coin or borrow.
- Right-to-left support (Hebrew, Arabic, Persian) — the CSS uses left-to-right layout implicitly in many places; would need `[dir="rtl"]` overrides.
- Pluralisation is minimal in WebExtensions i18n — usually handled by separate keys (`oneTab` / `manyTabs`).

**Staging:**
- **Phase 1** — Scaffolding only: `en_GB` messages.json + string extraction refactor + help redirect mechanism. No user-visible change, but the infrastructure is in place.
- **Phase 2** — Tier 1 languages: English (American), French, German, Spanish, Italian, Portuguese, Dutch. AI translation quality is high enough to ship without mandatory native review. **Completing Phase 2 is a prerequisite for applying to the AMO Recommended Extensions programme** (satisfies the "general, international audience" criterion).
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

## Country-code TLD blocking (beyond original scope — under consideration)

**Goal:** Allow users or organisations to block all navigation to domains under selected country-code TLDs (e.g. block all `.cz`, `.ru`, `.cn` traffic).

**Motivation:** Enterprise networks can enforce country-based blocking at the router or DNS level, but this is out of reach for home offices and small businesses with consumer hardware. A browser extension is often the only practical layer available to these users.

**Why this is beyond the extension's original scope:** The extension's core purpose is Unicode script anomaly detection (IDN homograph attacks). TLD blocking is access policy — it blocks destinations regardless of how the domain looks, which is a different threat model entirely.

**If implemented:**
- A dedicated section in the options page listing ccTLDs with checkboxes
- Blocking would be enforced in `background.js` at the same `onBeforeRequest` intercept point, before the script check
- Blocked navigation redirects to `blocked.html` with a message distinguishing TLD policy blocks from homograph blocks
- The feature should be clearly opt-in and off by default

**Considerations before implementing:**
- AMO review: Mozilla may question whether TLD blocking fits the extension's stated purpose — the description and permissions would need updating
- False positives: legitimate sites under blocked TLDs would be unreachable with no per-site override unless a whitelist exception is also respected
- Maintenance: ccTLD lists change rarely but do change

**Status:** Deferred — assess after core features are stable and AMO Recommended status is achieved.

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
