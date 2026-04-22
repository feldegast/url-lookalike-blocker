Development files — not part of the Firefox extension submission
================================================================

These files are used during development but are not included in the
extension package submitted to the Firefox Add-ons store.

render_icon_pillow.py
  Python script that generates icon.png using the Pillow library.
  Run this whenever the icon design needs to change. The output
  (icon.png in the project root) is what the extension actually uses.
  Requires: pip install Pillow

test URLs.txt
  A set of manually curated URLs for testing the extension against
  known homograph attacks. Includes both URLs that should be blocked
  (Cyrillic, Greek, Arabic, mixed-script homographs) and URLs that
  should always be allowed (standard Latin domains). Each entry is
  annotated with whether it resolves to a real site [FULL FLOW] or
  is detection-only [DETECTION ONLY].

url-lookalike-blocker.code-workspace
  VS Code workspace configuration for this project.

Full-Context.txt
  Full design and implementation context document used as a reference
  when building the extension.

prompt.txt
  Original specification prompt used to define the extension's
  requirements and behaviour.
