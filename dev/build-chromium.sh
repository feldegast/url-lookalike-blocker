#!/usr/bin/env bash
# Produces a CWS-ready build of the Chromium extension in dist/chromium/.
# Resolves all symlinks to real files and patches Firefox-specific UI text.
# Run from any directory — the script locates the repo root automatically.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/extension-chromium"
DST="$ROOT/dist/chromium"

echo "Building Chromium extension..."
rm -rf "$DST"
mkdir -p "$DST"

# Copy the extension, resolving all symlinks to real files.
cp -rL "$SRC/." "$DST/"

# Patch Firefox-specific private-browsing instructions.
sed -i 's|open the Firefox menu (≡) → <em>Extensions and Themes</em>, find this extension, and set <em>Run in Private Windows</em> to <em>Allow</em>. Alternatively, type <code>about:addons</code> in a new tab'\''s address bar\.|go to <code>chrome://extensions</code>, find this extension, and enable <em>Allow in Incognito</em>.|' "$DST/options.html"

echo "Done — built to $DST"
echo "To package for CWS: cd \"$DST\" && zip -r ../url-lookalike-blocker-chromium.zip ."
