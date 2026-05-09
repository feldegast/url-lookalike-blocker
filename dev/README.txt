Development files — not part of the Firefox extension submission
================================================================

These files are used during development but are not included in the
extension package submitted to the Firefox Add-ons store.

render_icon_pillow.py
  Python script that generates extension/icon.png using the Pillow library.
  Run this whenever the icon design needs to change.
  Requires: pip install Pillow

test-urls.html
  Clickable test page covering all supported scripts. Open in Firefox with the
  extension loaded to manually verify blocking and allow behaviour. Each link is
  annotated with whether it resolves to a real site [FULL FLOW] or is
  detection-only [DETECTION ONLY].

testing.txt
  Structured manual test checklist covering: locale seeding on first run and
  reset, blocking detection, options page behaviour, and whitelist cycle.

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
