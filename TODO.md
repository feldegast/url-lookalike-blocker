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

## Recapture help page and AMO screenshots

**Goal:** Replace the three warning/block page screenshots used in `help.html` and on the Mozilla AMO listing with fresh captures from the canonical test URLs, then switch from `<hr>` separators to a consistent 1 px border around each image.

**The three URLs (top section of `dev/test-urls.html` — "Quick test — one URL per page type"):**

1. `xn--pple-43d.com` → аpple.com (leading Cyrillic 'а') — **Block page**. Requires Cyrillic disabled in Options before navigating.
2. `xn--aypal-uye.com` → рaypal.com (Cyrillic 'р' in Latin label) — **Warning (confusable)**. Requires Cyrillic enabled.
3. `xn--test-34d.com` → testж.com (Latin + Cyrillic mix) — **Warning (mixed-script)**. Requires Cyrillic enabled and Serbian disabled.

Navigate to each link via `dev/test-urls.html` — do not type or paste URLs into the address bar.

---

### How to capture with uniform padding (so the 1 px border looks consistent)

The v1.0 images were cropped inconsistently, so the gap between the image edge and the visible content varied across screenshots. The fix is to capture a well-defined element and then normalise the padding with the script below.

**Step 1 — capture the `.container` element, not the full page.**

Using Firefox's "Screenshot Node" tool captures the exact bounds of the element, with no browser chrome and none of the grey body background (`#e8e8e8`, `margin: 50px auto`) included:

1. Load the extension as a temporary add-on via `about:debugging`.
2. Navigate to the test URL via `dev/test-urls.html` to trigger the block/warning page.
3. Open DevTools (`F12`) → **Inspector** tab.
4. Click on the `<div class="container">` node in the markup panel.
5. Right-click the node → **Screenshot Node**.
6. Firefox saves a PNG to your Downloads folder.
7. Rename and move it to `extension/img/` (e.g. `blocked-white.png`).
8. Repeat for the dark theme: click the theme toggle on the page first, then screenshot again.

**Step 2 — normalise the padding with `dev/normalise_screenshots.py`.**

The script trims any remaining inconsistent background from the edges and re-pads to exactly 20 px on every side. Background colour (white `#ffffff` for light, `#2a2a2a` for dark) is detected automatically from the corner pixels.

```bash
python3 dev/normalise_screenshots.py extension/img/blocked-white.png extension/img/blocked-black.png
# or normalise all at once:
python3 dev/normalise_screenshots.py extension/img/*.png
```

After this step every image has exactly 20 px of background between its edges and the first/last content pixels, so the 1 px CSS border always has a uniform gap.

**Step 3 — update `help.html` to use 1 px borders instead of `<hr>` separators.**

In the `<style>` block, change:
```css
figure img {
  max-width: 100%;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```
to:
```css
figure img {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid #ccc;
}
```
Also add a dark-mode override:
```css
html[data-theme="dark"] figure img { border-color: #444; }
```
Remove any `<hr>` tags that were used as separators around images.

---

**Checklist:**
- [ ] Extension loaded via `about:debugging`
- [ ] Cyrillic toggled correctly for each capture (off for block, on for both warnings, Serbian off for mixed-script)
- [ ] Six images captured: `blocked-white/black`, `warning-confusable-white/black`, `warning-mixed-white/black`
- [ ] `normalise_screenshots.py` run on all six — output shows identical `content WxH` values (confirms consistent trim)
- [ ] `help.html` updated to `border: 1px solid` — `<hr>` separators removed
- [ ] Reset extension settings to a clean state after capturing
- [ ] Same normalised images used for the AMO listing screenshots submitted to Mozilla

## Domain Age Check (RDAP)

**Goal:** Catch typosquatting by flagging recently registered domains.

**Approach:** Query RDAP (free, standard HTTP/JSON protocol — e.g. `https://rdap.org/domain/<hostname>`) to retrieve the domain registration date, then display it as extra context on the block page alongside the existing character table. Not a blocking condition on its own — too noisy — just an informational signal for the user.

**Only run on already-flagged domains** to avoid adding latency to normal browsing. Cache results in `browser.storage.local` so repeat visits don't re-query.

**Concerns to address before implementing:**
- RDAP coverage gaps for some ccTLDs
- Rate limits on public RDAP servers
- The async lookup should not delay the block page render — fetch in parallel and update the page if/when the result arrives
- Consider making this an opt-in setting in the options page
