#!/usr/bin/env bash
# dev/build.sh — builds submission and dev zip bundles for Firefox and Chromium.
#
# Usage:  bash dev/build.sh
# Output:
#   url-lookalike-blocker-<version>.zip            — Firefox / AMO submission
#   url-lookalike-blocker-<version>-dev.zip        — Firefox dev bundle (local testing)
#   url-lookalike-blocker-<version>-chromium.zip   — Chrome Web Store submission
#
# All zips are written to the repo root and are gitignored.
# Run from anywhere inside the repo — the script locates itself.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
EXT="$ROOT/extension"
EXT_CHROMIUM="$ROOT/extension-chromium"

VERSION=$(python3 -c "import json; print(json.load(open('$EXT/manifest.json'))['version'])")
echo "Building version $VERSION..."

# ── Files included in both Firefox bundles ───────────────────────────────────
#
# To add a new production file: add it here. Do NOT add *-dev.js files here.
#
COMMON_FILES=(
  apply-theme-early.js
  background.js
  blocked.html    blocked.js
  help.html       help.js
  icon.svg
  options.html    options.js
  page-utils.js
  storage-sync.js
  theme.js
  unicode-scripts.js
  warning.html    warning.js
)

# ── Helper: copy common files + img into a staging dir ──────────────────────
_populate() {
  local dest="$1"
  for f in "${COMMON_FILES[@]}"; do
    cp "$EXT/$f" "$dest/"
  done
  mkdir "$dest/img"
  cp "$EXT/img/"*.png "$EXT/img/"*.svg "$dest/img/"
}

# ── Firefox public (AMO submission) bundle ───────────────────────────────────
#
# Excluded vs dev bundle:
#   - background-dev.js          (file omitted entirely)
#   - pages-dev.js               (file omitted; script tags stripped from HTML)
#   - "downloads" permission     (stripped from manifest)
#   - DEV-BEGIN…DEV-END blocks   (stripped from options.js)
#
build_firefox_public() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" RETURN

  cp "$EXT/manifest.json" "$tmp/"
  _populate "$tmp"

  # Strip manifest
  python3 - "$tmp/manifest.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f: m = json.load(f)
m['background']['scripts'] = [s for s in m['background']['scripts'] if s != 'background-dev.js']
m['permissions']            = [p for p in m['permissions']            if p != 'downloads']
with open(path, 'w') as f: json.dump(m, f, indent=2)
PY

  # Strip pages-dev.js script tags; normalise CRLF → LF
  for f in blocked.html options.html warning.html; do
    sed 's/\r//' "$tmp/$f" | grep -v 'pages-dev\.js' > "$tmp/$f.tmp"
    mv "$tmp/$f.tmp" "$tmp/$f"
  done

  # Strip DEV blocks
  for f in options.js; do
    sed '/\/\/ DEV-BEGIN/,/\/\/ DEV-END/d' "$tmp/$f" > "$tmp/$f.tmp"
    mv "$tmp/$f.tmp" "$tmp/$f"
  done

  # Verify
  if grep -rq 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks\|"downloads"' "$tmp" 2>/dev/null; then
    echo "ERROR: dev references found in Firefox public bundle — aborting" >&2
    grep -rn 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks\|"downloads"' "$tmp" >&2
    exit 1
  fi

  local out="$ROOT/url-lookalike-blocker-$VERSION.zip"
  rm -f "$out"
  (cd "$tmp" && zip -qr "$out" .)
  echo "  Firefox (AMO) : $(basename "$out")"
}

# ── Firefox dev bundle ───────────────────────────────────────────────────────
build_firefox_dev() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" RETURN

  cp "$EXT/manifest.json" "$tmp/"
  cp "$EXT/background-dev.js" "$EXT/pages-dev.js" "$tmp/"
  _populate "$tmp"

  local out="$ROOT/url-lookalike-blocker-$VERSION-dev.zip"
  rm -f "$out"
  (cd "$tmp" && zip -qr "$out" .)
  echo "  Firefox (dev) : $(basename "$out")"
}

# ── Chromium (Chrome Web Store submission) bundle ────────────────────────────
#
# Source: extension-chromium/ (symlinks resolved by cp -rL).
# Excluded vs local testing copy:
#   - pages-dev.js               (file removed; script tags stripped from HTML)
#   - DEV-BEGIN…DEV-END blocks   (stripped from JS files)
# Patched:
#   - options.html               (Firefox private-browsing text → Chrome equivalent)
#
build_chromium() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" RETURN

  # Resolve all symlinks to real files
  cp -rL "$EXT_CHROMIUM/." "$tmp/"

  # Chrome cannot decode SVG; the manifest references PNGs only, so drop it.
  rm -f "$tmp/icon.svg"

  # Patch Firefox-specific private-browsing instructions
  sed -i 's|open the Firefox menu (≡) → <em>Extensions and Themes</em>, find this extension, and set <em>Run in Private Windows</em> to <em>Allow</em>. Alternatively, type <code>about:addons</code> in a new tab'\''s address bar\.|go to <code>chrome://extensions</code>, find this extension, and enable <em>Allow in Incognito</em>.|' "$tmp/options.html"

  # Remove pages-dev.js
  rm -f "$tmp/pages-dev.js"

  # Strip pages-dev.js script tags from HTML files
  for f in blocked.html options.html warning.html; do
    grep -v 'pages-dev\.js' "$tmp/$f" > "$tmp/$f.tmp"
    mv "$tmp/$f.tmp" "$tmp/$f"
  done

  # Strip DEV blocks from all JS files
  for f in "$tmp"/*.js; do
    sed '/\/\/ DEV-BEGIN/,/\/\/ DEV-END/d' "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  done

  # Verify
  if grep -rq 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks' "$tmp" 2>/dev/null; then
    echo "ERROR: dev references found in Chromium bundle — aborting" >&2
    grep -rn 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks' "$tmp" >&2
    exit 1
  fi

  local out="$ROOT/url-lookalike-blocker-$VERSION-chromium.zip"
  rm -f "$out"
  (cd "$tmp" && zip -qr "$out" .)
  echo "  Chromium (CWS): $(basename "$out")"
}

build_firefox_public
build_firefox_dev
build_chromium
echo "Done."
