Development files — not part of the Firefox extension submission
================================================================

These files are used during development but are not included in the
extension package submitted to the Firefox Add-ons store.


Fonts
-----

NotoSansArmenian-Bold.ttf
  Source font for the Armenian Մ (U+0544) and Լ (U+053C) glyphs in the
  extension icon. OFL-licensed, supplied here and read directly by the
  icon-rendering scripts.

segoeuib.ttf (NOT SUPPLIED)
  Source font for the Latin R glyph in the icon. Microsoft proprietary —
  the EULA does not permit redistribution, so this .ttf is not included
  in the repo. Install it locally before running the icon scripts:
    Windows — ships with the OS at C:\Windows\Fonts\segoeuib.ttf
    Linux   — drop segoeuib.ttf into ~/.local/share/fonts/ and run
              `fc-cache -f`
  The icon scripts probe ~/.local/share/fonts/, /usr/share/fonts/truetype/,
  and C:\Windows\Fonts in order, raising a clear error if none contain
  the font.


In-extension asset scripts
--------------------------

These scripts produce files that ship inside the extension package.

render_icon_paths.py
  Generates extension/icon.svg as font-independent <path> elements,
  extracted from the source fonts via fonttools. Run when the icon
  design changes. Requires: pip install Pillow fonttools.

render_help_badges.py
  Generates extension/img/badge-0.svg and extension/img/badge-1.svg
  from the current extension/icon.svg. badge-0 is the icon as-is;
  badge-1 overlays a red square containing "1" in the top-right
  corner, matching what users see on the live toolbar when blocked or
  warning tabs are open. Re-run after any change to icon.svg.

normalise_screenshots.py
  Trims and re-pads captured screenshots in extension/img/ so every
  image has a consistent gap between content and its 1px border in
  help.html. Run after capturing a new screenshot via Firefox DevTools
  "Screenshot Node" — see the script's own docstring for capture
  instructions. Requires: pip install Pillow.


AMO listing asset scripts
-------------------------

These scripts produce files uploaded to the Mozilla AMO listing page.
They are NOT bundled with the extension; AMO requires PNG for both
the listing icon and screenshots, which is why these stay PNG even
though the in-extension icon is now SVG-only.

render_icon_pillow.py
  Generates dev/listing-icons/icon-{32,64,128}.png from the source
  fonts (Pillow-rendered at 128 natively, then LANCZOS-downscaled for
  the smaller sizes). These PNGs are uploaded to the AMO listing-icon
  slots. Re-run after any icon design change.
  Requires: pip install Pillow.

gather-listing-screenshots.py
  Copies the curated subset of light-theme help-page screenshots from
  extension/img/ into dev/listing-screenshots/ with numbered names,
  ready for upload to the AMO listing carousel. No image processing —
  edit the SCREENSHOTS list at the top of the script to change which
  images are included or in what order.

listing-icons/
  Output directory for render_icon_pillow.py.

listing-screenshots/
  Output directory for gather-listing-screenshots.py.


Test and submission
-------------------

test-urls.html
  Clickable test page covering all supported scripts. Open in Firefox with the
  extension loaded to manually verify blocking and allow behaviour. Each link is
  annotated with whether it resolves to a real site [FULL FLOW] or is
  detection-only [DETECTION ONLY].

test-plan.md
  Detailed step-by-step test plan with checkboxes. Use this for a full
  regression test before an AMO submission.

unicode-scripts.test.js
  Jest unit tests for the core detection logic in extension/unicode-scripts.js.
  Run from the project root with: npm test

amo-submission.txt
  Copy/paste content for the Firefox Add-ons (AMO) submission form:
  name, summary, description, categories, licence, privacy policy,
  and reviewer notes.

../url-lookalike-blocker.code-workspace
  VS Code workspace configuration for this project (at the project root).
