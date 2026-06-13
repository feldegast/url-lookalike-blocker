# Test Plan — URL Lookalike Blocker

Use `test-urls.html` for all links — open it in Firefox and click the links from there. The bare hostnames shown in the checklists below are identifiers only; do not type them into the address bar (Firefox will treat them as search queries without the `https://` prefix). Reset the options page to defaults before starting.

---

## 0. Locale detection on first run and reset

Add **Japanese** to Firefox (Settings → General → Language) before testing. Japanese is unambiguous — its scripts (Hiragana, Katakana, Han) have no Latin crossover, so there is no risk of accidentally permitting Latin+Cyrillic combinations during this section.

- [x] Fresh install: open options — Japanese is already checked
- [x] `xn--zckzah.com` (Katakana) passes through without manually enabling anything
- [x] Remove Japanese from the options page and apply — `xn--zckzah.com` is now blocked
- [x] Click "Reset to Locale Defaults" — Japanese is re-checked and `xn--zckzah.com` passes again

---

## 1. Latin pass-through (false positive check)

These must NEVER be blocked regardless of settings.

- [x] `www.example.com` — passes through to the real site
- [x] `www.google.com` — passes through to the real site

---

## 2. Default blocking — representative sample

**Before starting:** Remove Japanese from Firefox's language settings (Settings → General → Language) and click "Reset to Locale Defaults" in Options. Japanese includes the Han script, which is shared with Chinese and Korean — leaving it enabled will cause those two URLs to pass through instead of blocking.

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
- [x] "Try Again" button is present

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

- [x] Armenian enabled → `xn--y9a3aq.com` passes
- [x] Chinese enabled → `xn--fiqs8s.com` passes
- [x] Georgian enabled → `xn--node.com` passes
- [x] Greek enabled → `xn--qxa2abc.com` passes
- [x] Hebrew enabled → `xn--4db7d.com` passes
- [x] Hindi enabled → `xn--h2brj9c.com` passes
- [x] Japanese enabled → `xn--zckzah.com` passes
- [x] Korean enabled → `xn--3e0b707e.com` passes
- [x] Russian enabled → `www.xn--80ak6aa92e.com` passes
- [x] Thai enabled → `xn--o3cw4h.com` passes

**Part B — Disable all, verify all block**

Click "Reset to Locale Defaults" in settings (faster than unchecking all 10 individually), then click each link.

- [x] Armenian disabled → `xn--y9a3aq.com` blocks
- [x] Chinese disabled → `xn--fiqs8s.com` blocks
- [x] Georgian disabled → `xn--node.com` blocks
- [x] Greek disabled → `xn--qxa2abc.com` blocks
- [x] Hebrew disabled → `xn--4db7d.com` blocks
- [x] Hindi disabled → `xn--h2brj9c.com` blocks
- [x] Japanese disabled → `xn--zckzah.com` blocks
- [x] Korean disabled → `xn--3e0b707e.com` blocks
- [x] Russian disabled → `www.xn--80ak6aa92e.com` blocks
- [x] Thai disabled → `xn--o3cw4h.com` blocks

**Part C — Options page behaviour during toggles**

- [x] "Unsaved changes" indicator (orange) appears when a language checkbox changes
- [x] "Unsaved changes" disappears after clicking Apply Changes
- [x] "Discard Changes" button reverts checkboxes and clears the unsaved indicator
- [x] "Reset to Locale Defaults" re-seeds locale scripts, applies immediately, and clears the unsaved indicator
- [x] ~~"Apply Changes" becomes "Apply & Retry" when opened from a blocked page~~ *(removed: Apply now always closes options and returns focus to the appropriate blocked tab; use "Try again" on the blocked page to retry the URL)*
- [x] Private-browsing warning banner shows instruction to type `about:addons` in the address bar (button removed — Firefox privilege restrictions made it unreliable)
- [x] **v1.1** Options tab stays open on first click after fresh install — clicking the toolbar icon opens options and it remains visible (regression: first click used to close the tab immediately)
- [x] **v1.1** When the extension has private-window access granted, the "Show private-browsing warning" checkbox is disabled/greyed out with a tooltip explaining why

**Part D — Language permission distinction (mixed-script labels)**

Enabling a **language** both permits its scripts and allows all scripts from that language to appear together within a single domain label.

- [x] Enable Russian → `www.xn--80ak6aa92e.com` (pure Cyrillic domain) passes through
- [x] Enable Russian → click `xn--test-34d.com` (testж.com) — warning page appears; the ж is highlighted amber (not red); text says "There are no enabled languages that permit combining Latin and Cyrillic characters in a URL"; hint says "To allow this combination, enable Serbian in Extension Settings"
- [x] Enable Serbian → click `xn--test-34d.com` — passes through (Serbian blesses Latin+Cyrillic together)
- [x] Disable Serbian → click `xn--test-34d.com` — warning page appears again

**Part E — v1.1 Script-coloured tags, auto-tick, and cascade**

Reset to locale defaults before starting. These checks exercise the largest auto-tick fan-out in the table (the Cyrillic cluster) and confirm the cascade unwinds correctly.

- [x] **v1.1** Enable Russian → Cyrillic tag turns green; the nine other single-script Cyrillic languages (Belarusian, Bulgarian, Kazakh, Kyrgyz, Macedonian, Mongolian, Tajik, Ukrainian, Uzbek) tick automatically with a dimmed label; Serbian does not auto-tick (it also requires Latin — which is always permitted — but auto-tick requires the raw script list to have exactly one entry)
- [x] **v1.1** Untick Russian → all nine auto-ticked Cyrillic languages untick in the cascade; Cyrillic tag turns grey on all rows; Serbian (never ticked) is unaffected
- [x] **v1.1** Enable Japanese → Han, Hiragana, Katakana turn green; Chinese (Simplified) and Chinese (Traditional) auto-tick (Han only); Korean does not auto-tick (also requires Hangul)
- [x] **v1.1** Untick Japanese → Chinese (Simplified) and Chinese (Traditional) cascade-untick; Han, Hiragana, Katakana turn grey; Korean is unaffected

---

## 6. Whitelist cycle

- [x] Click any blocked URL — block page appears; badge shows "1" on the toolbar icon
- [x] Click "Allow This Domain" — domain is added to the whitelist, the page loads automatically, and that tab's coloured square disappears from options; badge clears
- [x] Open settings, remove the domain from the whitelist, apply
- [x] Revisit the URL — it blocks again

**Part B — Multi-tab navigation — coloured square system**

Open two or more different blocked URLs in separate tabs before starting these tests. The badge should increment with each new blocked tab.

**Part C — Coloured square basics:**
- [x] Each blocked/warning page shows a coloured rounded square in its heading
- [x] Clicking the square opens the options tab (or switches to it if already open)
- [x] The coloured squares at the top of the options page shows a matching coloured square for each coloured square at the top of each open blocked or warning page

**Part D — Options tab as hub:**
- [x] With two blocked tabs open, open options via toolbar — options shows two coloured squares, one per blocked tab; badge shows "2"
- [x] Clicking a square in options switches browser focus to that blocked tab (no selection state, no border highlight)

**Part E — New blocked tab while options is already open:**
- [x] Navigate to a new blocked URL while options is open → new square appears in options bar without changing language settings or unsaved changes

**Part F — Apply changes:**
- [x] Apply changes → options closes and browser focus returns to the tab that opened options (or the most-recently-blocked tab if opened via toolbar with no clear source tab)
- [x] "Try again" button on blocked/warning page → navigates to the original URL; if settings now cover it the page loads; if not the block page reappears *(this is a re-test of the Russian/Serbian test above — skippable)*

**Part G — Tab closed:**
- [x] Close a blocked tab → its square disappears from options automatically; badge decrements by 1
- [x] If no squares remain after a tab is closed, the tab-selector bar hides; badge clears

**Part H — Continue Anyway (warning pages):**
- [x] On a warning page click "Allow This Domain" → domain is added to the whitelist, the URL retries and loads, and that tab's square disappears from options *(re-test of 6A — skippable)*

**Part I — Options tab reopened:**
- [x] Open options from a blocked/warning page → close options WITHOUT clicking Apply → the blocked page is still showing → click the coloured square on the blocked page → options reopens showing that tab's coloured square (Tabs bar must be visible) *(regression: background state loss caused an empty Tabs bar — fixed by passing `blockedUrl` through `openOptions` and adding a fallback in `initTabSelector`)*
- [x] Close the options tab → navigate to its original blocked URL (still blocked) → click square on blocked page → options reopens showing that tab's coloured square and all other currently-blocked tabs' squares

**Part J — Warning page badge:**
- [x] Navigate to a warning page — badge shows "1"
- [x] Click "Go back" on the warning page — badge clears

---

## 7. Latin pass-through recheck

Repeat step 1 after all the above to confirm nothing broke pass-through for normal domains.

- [x] `www.example.com` — still passes
- [x] `www.google.com` — still passes

---

## 8. Help page

- [x] Right-click the toolbar icon — context menu shows "Open Options" and "Help"
- [x] Click "Help" in the context menu — help page opens in a new tab
- [x] Click the "Help" button on the options page — help page opens in a new tab
- [x] Click "Open Options" on the help page — options page opens (or switches to it if already open)
- [x] Help page respects dark/light mode and the theme toggle works
- [x] All sections are present: What does this extension do, Block page, Warning page, Extension icon (toolbar), Options page, Coloured squares, Private browsing protection, Interface options, Whitelisted domains, Permitted languages, Reset to locale defaults, Apply changes / Discard changes, About
- [x] Right-click the toolbar icon → Developer: Capture screenshots — regenerates all 18 help-page screenshots
- [x] Copy screenshots from the browser's Downloads folder to `extension/img/`
- [x] Run `python3 dev/normalise_screenshots.py`

---

## Polish notes (post-testing)

- **Badge recovery after background-page suspension** — not manually testable via extension reload (reload closes all extension pages). `recoverBlockedTabs()` guards against Firefox silently suspending the idle background script while blocked tabs remain open; this happens automatically and cannot be triggered from about:debugging.

- **v2 idea — cross-blocked-page navigation dots:** Show other blocked tabs' coloured squares directly on blocked/warning pages (labelled "Other blocked pages:") so the user can hop between blocked pages without going via options. Deferred: options hub covers the workflow in two clicks, and adding `getBlockedTabs` + live message listeners to blocked/warning pages adds meaningful complexity for a one-click saving.

- **Dark/light mode theming:** All extension pages now have `@media (prefers-color-scheme: dark)` overrides. Verify in both modes: body/card backgrounds, detail boxes, table headers, tag chips, and the private-browsing banner all render correctly. Check `color-scheme: light dark` is declared so native form controls (checkboxes) also adapt.

- **Block page — redundant Punycode Domain line:** The block page shows three lines: Blocked URL, Punycode Domain, and Unicode Domain. For simple cases (e.g. `http://xn--zckzah.com/`) the Punycode Domain is already fully visible inside the Blocked URL, making it redundant. Consider hiding the Punycode Domain line when it adds no new information over the Blocked URL. Also note: the "Blocked URL" label includes the protocol (`http://` / `https://`) which most users would not consider part of the domain — the labelling could be clearer about what each line represents.
