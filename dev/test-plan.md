# Test Plan — URL Lookalike Blocker

Use `test-urls.html` for all links — open it in Firefox and click the links from there. The bare hostnames shown in the checklists below are identifiers only; do not type them into the address bar (Firefox will treat them as search queries without the `https://` prefix). Reset the options page to defaults before starting.

---

## 0. Locale detection on first run and reset

Add a non-Latin language to Firefox (Settings → General → Language) before testing.

- [x] Fresh install: open options — the language matching your Firefox locale is already checked
- [x] A domain using that script passes through without the user manually enabling anything
- [x] Remove that language from the options page and apply — the domain is now blocked
- [x] Click "Reset to Locale Defaults" — the language is re-checked and the domain passes again

---

## 1. Latin pass-through (false positive check)

These must NEVER be blocked regardless of settings.

- [x] `www.example.com` — passes through to the real site
- [x] `www.google.com` — passes through to the real site

---

## 2. Default blocking — representative sample

With factory settings (Latin only), each of these must show the block page.

- [x] `www.xn--80ak6aa92e.com` — Cyrillic — shows block page
- [x] `xn--ggle-0nda.com` — Greek — shows block page
- [x] `xn--zckzah.com` — Japanese (Katakana) — shows block page
- [x] `xn--4db7d.com` — Hebrew — shows block page
- [x] `xn--3e0b707e.com` — Korean — shows block page
- [x] `xn--o3cw4h.com` — Thai — shows block page
- [x] `xn--h2brj9c.com` — Devanagari — shows block page
- [x] `xn--node.com` — Georgian — shows block page
- [x] `xn--y9a3aq.com` — Armenian — shows block page
- [x] `xn--fiqs8s.com` — Chinese — shows block page

---

## 3. Block page UI check

Pick any blocked URL from step 2 and verify the block page content.

- [x] Page title includes the extension name and the domain
- [x] Offending Unicode domain is shown (decoded form)
- [x] Punycode form is shown
- [x] Character table lists each flagged character with its Unicode codepoint and script name
- [x] "Allow This Domain" button is present
- [x] "Open Settings" button is present
- [x] "Go Back" button is present

---

## 4. Homograph attacks (always blocked)

These mix one non-Latin character into an otherwise Latin domain. They must be blocked with default settings AND remain blocked even when the relevant script is enabled.

- [x] `xn--pple-43d.com` — Cyrillic 'а' in apple.com — shows block/warning page
- [x] `xn--googl-3we.com` — Cyrillic 'е' in google.com — shows block/warning page
- [x] `xn--aypal-uye.com` — Cyrillic 'р' in paypal.com — shows block/warning page
- [x] `xn--microsft-sbh.com` — Cyrillic 'о' in microsoft.com — shows block/warning page
- [x] `xn--mazon-3ve.com` — Cyrillic 'а' in amazon.com — shows block/warning page
- [x] `xn--yah-czca.com` — Greek 'ο' in yahoo.com — shows block/warning page
- [x] `xn--vidia-ece.com` — Greek 'ν' in nvidia.com — shows block/warning page
- [x] Enable Cyrillic in settings → `xn--pple-43d.com` still shows warning page (does NOT pass through)
- [x] With Cyrillic enabled, warning page for `xn--pple-43d.com` shows the confusable character (а) highlighted red with "Looks like: a" — not amber
- [x] Disable Cyrillic again after the above check

---

## 5. Script toggle tests

**Part A — Enable all, verify all pass**

Open settings, enable all 10 languages below, click Apply, then click each link.

- [x] Russian enabled → `www.xn--80ak6aa92e.com` passes
- [x] Greek enabled → `xn--qxa2abc.com` passes
- [x] Japanese enabled → `xn--zckzah.com` passes
- [x] Hebrew enabled → `xn--4db7d.com` passes
- [x] Korean enabled → `xn--3e0b707e.com` passes
- [x] Thai enabled → `xn--o3cw4h.com` passes
- [x] Hindi enabled → `xn--h2brj9c.com` passes
- [x] Georgian enabled → `xn--node.com` passes
- [x] Armenian enabled → `xn--y9a3aq.com` passes
- [x] Chinese enabled → `xn--fiqs8s.com` passes

**Part B — Disable all, verify all block**

Open settings, manually uncheck all languages enabled in Part A, click Apply, then click each link.

- [x] Russian disabled → `www.xn--80ak6aa92e.com` blocks
- [x] Greek disabled → `xn--qxa2abc.com` blocks
- [x] Japanese disabled → `xn--zckzah.com` blocks
- [x] Hebrew disabled → `xn--4db7d.com` blocks
- [x] Korean disabled → `xn--3e0b707e.com` blocks
- [x] Thai disabled → `xn--o3cw4h.com` blocks
- [x] Hindi disabled → `xn--h2brj9c.com` blocks
- [x] Georgian disabled → `xn--node.com` blocks
- [x] Armenian disabled → `xn--y9a3aq.com` blocks
- [x] Chinese disabled → `xn--fiqs8s.com` blocks

### Options page behaviour during toggles

- [x] "Unsaved changes" indicator (orange) appears when a language checkbox changes
- [x] "Unsaved changes" disappears after clicking Apply Changes
- [x] "Discard Changes" button reverts checkboxes and clears the unsaved indicator
- [x] "Reset to Locale Defaults" re-seeds locale scripts, applies immediately, and clears the unsaved indicator
- [x] ~~"Apply Changes" becomes "Apply & Retry" when opened from a blocked page~~ *(removed: Apply now always closes options and returns focus to the appropriate blocked tab; use "Try again" on the blocked page to retry the URL)*
- [x] Each language row shows its scripts as read-only tags (no script checkboxes)

### Language permission distinction (mixed-script labels)

Enabling a **language** both permits its scripts and blesses that script combination within a single domain label.

- [x] Enable Russian → `www.xn--80ak6aa92e.com` (pure Cyrillic domain) passes through
- [x] Enable Russian → click `xn--test-34d.com` (testж.com) — warning page appears; the ж is highlighted amber (not red); text says "There are no enabled languages that permit combining Latin and Cyrillic characters in a URL"; hint says "To allow this combination, enable Serbian in Extension Settings"
- [x] Enable Serbian → click `xn--test-34d.com` — passes through (Serbian blesses Latin+Cyrillic together)
- [x] Disable Serbian → click `xn--test-34d.com` — warning page appears again

---

## 6. Whitelist cycle

- [x] Click any blocked URL — block page appears
- [x] Click "Allow This Domain" — domain is added to the whitelist in settings
- [x] Revisit the same URL — it passes through
- [x] Open settings, remove the domain from the whitelist, apply
- [x] Revisit the URL — it blocks again

### Multi-tab navigation — coloured square system

Open two or more different blocked URLs in separate tabs before starting these tests.

**Coloured square basics:**
- [x] Each blocked/warning page shows a coloured rounded square in its heading
- [x] Clicking the square opens the options tab (or switches to it if already open) with that tab's square selected
- [x] The square colour in the blocked/warning heading matches the square shown in the options tab

**Options tab as hub:**
- [x] With two blocked tabs open, open options via toolbar — options shows two coloured squares, one per blocked tab
- [ ] Clicking a square in options switches browser focus to that blocked tab (no selection state, no border highlight)

**New blocked tab while options is already open:**
- [ ] Navigate to a new blocked URL while options is open → new square appears in options bar without changing language settings or unsaved changes

**Apply changes:**
- [ ] Apply changes → options closes and browser focus returns to the tab that opened options (or the most-recently-blocked tab if opened via toolbar with no clear source tab)
- [ ] "Try again" button on blocked/warning page → navigates to the original URL; if settings now cover it the page loads; if not the block page reappears

**Tab closed:**
- [ ] Close a blocked tab → its square disappears from options automatically
- [ ] If no squares remain after a tab is closed, the tab-selector bar hides

**Continue Anyway (warning pages):**
- [ ] On a warning page click "Continue Anyway" → that tab's square disappears from options (session-allowed, no longer blocked)

**Options tab reopened:**
- [x] Open options from a blocked/warning page → close options WITHOUT clicking Apply → the blocked page is still showing → click the coloured square on the blocked page → options reopens showing that tab's coloured square (Tabs bar must be visible) *(regression: background state loss caused an empty Tabs bar — fixed by passing `blockedUrl` through `openOptions` and adding a fallback in `initTabSelector`)*
- [ ] Close the options tab → navigate to its original blocked URL (still blocked) → click square on blocked page → options reopens showing that tab's coloured square and all other currently-blocked tabs' squares

---

## 7. Latin pass-through recheck

Repeat step 1 after all the above to confirm nothing broke pass-through for normal domains.

- [x] `www.example.com` — still passes
- [x] `www.google.com` — still passes

---

## Polish notes (post-testing)

- **v2 idea — cross-blocked-page navigation dots:** Show other blocked tabs' coloured squares directly on blocked/warning pages (labelled "Other blocked pages:") so the user can hop between blocked pages without going via options. Deferred: options hub covers the workflow in two clicks, and adding `getBlockedTabs` + live message listeners to blocked/warning pages adds meaningful complexity for a one-click saving.

- **Dark/light mode theming:** All extension pages now have `@media (prefers-color-scheme: dark)` overrides. Verify in both modes: body/card backgrounds, detail boxes, table headers, tag chips, and the private-browsing banner all render correctly. Check `color-scheme: light dark` is declared so native form controls (checkboxes) also adapt.

- **Block page — redundant Punycode Domain line:** The block page shows three lines: Blocked URL, Punycode Domain, and Unicode Domain. For simple cases (e.g. `http://xn--zckzah.com/`) the Punycode Domain is already fully visible inside the Blocked URL, making it redundant. Consider hiding the Punycode Domain line when it adds no new information over the Blocked URL. Also note: the "Blocked URL" label includes the protocol (`http://` / `https://`) which most users would not consider part of the domain — the labelling could be clearer about what each line represents.
