# Test Plan — URL Lookalike Blocker

Use `test-urls.html` for all links. Reset the options page to defaults before starting.

---

## 0. Locale detection on first run and reset

On first run and after "Reset to Locale Defaults", the extension reads Firefox's
language settings and pre-populates the Permitted Languages list so the user can
see exactly what is enabled. No permissions are ever granted silently — everything
is visible and editable in the options page.

Add a non-Latin language to Firefox (Settings → General → Language) before testing.

- [ ] Fresh install: open options — the language matching your Firefox locale is already checked
- [ ] A domain using that script passes through without the user manually enabling anything
- [ ] Remove that language from the options page and apply — the domain is now blocked
- [ ] Click "Reset to Locale Defaults" — the language is re-checked and the domain passes again

---

## 1. Latin pass-through (false positive check)

These must NEVER be blocked regardless of settings.

- [ ] `www.example.com` — passes through to the real site
- [ ] `www.google.com` — passes through to the real site

---

## 2. Default blocking — representative sample

With factory settings (Latin only), each of these must show the block page.
One URL per script is enough to confirm the detection pipeline is working.

| Script | URL to click |
|---|---|
| Cyrillic | `www.xn--80ak6aa92e.com` |
| Greek | `xn--ggle-0nda.com` |
| Japanese | `xn--r8jz45g.xn--zckzah` |
| Hebrew | `xn--4db7d.com` |
| Korean | `xn--3e0b707e.com` |
| Thai | `xn--o3cw4h.com` |
| Devanagari | `xn--h2brj9c.com` |
| Georgian | `xn--node.com` |
| Armenian | `xn--y9a3aq.com` |
| Chinese | `xn--fiqs8s.com` |

- [ ] All 10 above show the block page

---

## 3. Block page UI check

Pick any blocked URL from step 2 and verify the block page content.

- [ ] Page title includes the extension name and the domain
- [ ] Offending Unicode domain is shown (decoded form)
- [ ] Punycode form is shown
- [ ] Character table lists each flagged character with its Unicode codepoint and script name
- [ ] "Allow This Domain" button is present
- [ ] "Open Settings" button is present
- [ ] "Go Back" button is present

---

## 4. Homograph attacks (always blocked)

These mix one non-Latin character into an otherwise Latin domain — the most dangerous
attack type. They must be blocked with default settings AND remain blocked if the
relevant script is enabled (a mixed-script domain is still suspicious even when that
script is permitted, because legitimate sites don't mix scripts in a single label).

- [ ] `xn--pple-43d.com` — Cyrillic 'а' in apple.com
- [ ] `xn--googl-3we.com` — Cyrillic 'е' in google.com
- [ ] `xn--aypal-uye.com` — Cyrillic 'р' in paypal.com
- [ ] `xn--microsft-sbh.com` — Cyrillic 'о' in microsoft.com
- [ ] `xn--mazon-3ve.com` — Cyrillic 'а' in amazon.com
- [ ] `xn--yah-czca.com` — Greek 'ο' in yahoo.com
- [ ] `xn--vidia-ece.com` — Greek 'ν' in nvidia.com

> **Note:** even with Cyrillic enabled in settings, the first five will show the **warning page**
> rather than the block page — they do not pass through. The confusables check (step 2) catches
> them because each contains a Cyrillic character that visually resembles a Latin letter (а→a,
> е→e, р→p, о→o). Test these with default settings.

---

## 5. Script toggle tests

For each row: enable that language in the options page → apply → click the URL →
confirm it passes. Then disable it → apply → click again → confirm it blocks.

| Language to enable | URL to test |
|---|---|
| Cyrillic (Russian) | `www.xn--80ak6aa92e.com` |
| Greek | `xn--ggle-0nd42c.com` |
| Japanese | `xn--r8jz45g.xn--zckzah` |
| Hebrew | `xn--4db7d.com` |
| Korean | `xn--3e0b707e.com` |
| Thai | `xn--o3cw4h.com` |
| Hindi (Devanagari) | `xn--h2brj9c.com` |
| Georgian | `xn--node.com` |
| Armenian | `xn--y9a3aq.com` |
| Chinese | `xn--fiqs8s.com` |

- [ ] Each URL passes when its language is enabled
- [ ] Each URL blocks again after disabling the language

### Options page behaviour during toggles

- [ ] "Unsaved changes" indicator appears when a language checkbox changes
- [ ] "Unsaved changes" disappears after clicking Apply
- [ ] "Unsaved changes" disappears after clicking Discard (and the checkbox reverts)
- [ ] "Disable All Languages" button unchecks all language rows
- [ ] Each language row shows its scripts as read-only tags (no script checkboxes)

### Language permission distinction (step 3)

Enabling a **language** both permits its scripts (step 1) and blesses that script combination within a single domain label (step 3).

- [ ] Enable Russian → `www.xn--80ak6aa92e.com` (pure Cyrillic domain) **passes**
- [ ] Enable Russian → `testж.com` (Cyrillic ж + Latin in one label) still **warns** — Russian uses only Cyrillic, so Latin+Cyrillic mix is not blessed
- [ ] Enable **Serbian** → `testж.com` now **passes** (Serbian blesses Latin+Cyrillic together)
- [ ] Disable Serbian → `testж.com` **warns** again

---

## 6. Whitelist cycle

- [ ] Click any blocked URL — block page appears
- [ ] Click "Allow This Domain" — domain is added to the whitelist in settings
- [ ] Revisit the same URL — it passes through
- [ ] Open settings, remove the domain from the whitelist, apply
- [ ] Revisit the URL — it blocks again

---

## 7. Latin pass-through recheck

Repeat step 1 after all the above to confirm nothing in the settings changes broke
pass-through for normal domains.

- [ ] `www.example.com` — still passes
- [ ] `www.google.com` — still passes
