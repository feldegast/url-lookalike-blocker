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
- [ ] With Cyrillic enabled, warning page for `xn--pple-43d.com` shows the confusable character (а) highlighted red with "Looks like: a" — not amber
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

Open settings, disable all languages (use "Disable All Languages" button), click Apply, then click each link.

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
- [x] "Apply Changes" becomes "Apply & Retry" when opened from a blocked page
- [x] Each language row shows its scripts as read-only tags (no script checkboxes)

### Language permission distinction (mixed-script labels)

Enabling a **language** both permits its scripts and blesses that script combination within a single domain label.

- [x] Enable Russian → `www.xn--80ak6aa92e.com` (pure Cyrillic domain) passes through
- [x] Enable Russian → click `xn--test-34d.com` (testж.com) — warning page appears; the ж is highlighted amber (not red); text says "There are no enabled languages that permit combining Latin and Cyrillic characters in a URL"; hint says "To allow this combination, enable Serbian in Extension Settings"
- [x] Enable Serbian → click `xn--test-34d.com` — passes through (Serbian blesses Latin+Cyrillic together)
- [x] Disable Serbian → click `xn--test-34d.com` — warning page appears again

---

## 6. Whitelist cycle

- [ ] Click any blocked URL — block page appears
- [ ] Click "Allow This Domain" — domain is added to the whitelist in settings
- [ ] Revisit the same URL — it passes through
- [ ] Open settings, remove the domain from the whitelist, apply
- [ ] Revisit the URL — it blocks again

### Apply and retry — multi-tab edge cases

- [ ] Open two different blocked URLs in separate tabs → open settings from one → apply → confirm only that tab navigates back to its URL (the other blocked tab stays on its block page)
- [ ] Open the same blocked URL in two tabs → open settings → apply → confirm the correct tab is retried
- [ ] Open settings from a blocked page → open a second settings tab manually → apply in the second tab → confirm the retry still works and the first settings tab does not cause a double-navigation
- [ ] Open two settings tabs → apply in each in succession → no errors or unexpected navigations

---

## 7. Latin pass-through recheck

Repeat step 1 after all the above to confirm nothing broke pass-through for normal domains.

- [ ] `www.example.com` — still passes
- [ ] `www.google.com` — still passes

---

## Polish notes (post-testing)

- **Dark/light mode theming:** Review all extension pages (blocked.html, options.html) to ensure they respect the system colour scheme via `prefers-color-scheme` media query. Check both modes explicitly.

- **Block page — redundant Punycode Domain line:** The block page shows three lines: Blocked URL, Punycode Domain, and Unicode Domain. For simple cases (e.g. `http://xn--zckzah.com/`) the Punycode Domain is already fully visible inside the Blocked URL, making it redundant. Consider hiding the Punycode Domain line when it adds no new information over the Blocked URL. Also note: the "Blocked URL" label includes the protocol (`http://` / `https://`) which most users would not consider part of the domain — the labelling could be clearer about what each line represents.
