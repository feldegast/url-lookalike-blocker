#!/usr/bin/env bash
# dev/build.sh — builds the public (AMO submission) and dev zip bundles.
#
# Usage:  bash dev/build.sh
# Output: url-lookalike-blocker-<version>.zip        — AMO submission (no dev code)
#         url-lookalike-blocker-<version>-dev.zip     — full bundle for local testing
#
# Both zips are written to the repo root and are gitignored.
# Run from anywhere inside the repo — the script locates itself.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
EXT="$ROOT/extension"

VERSION=$(python3 -c "import json; print(json.load(open('$EXT/manifest.json'))['version'])")
echo "Building $VERSION..."

# ── Files included in both bundles ──────────────────────────────────────────
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

# ── Public (AMO submission) bundle ──────────────────────────────────────────
#
# Excluded from public bundle (vs dev bundle):
#   - background-dev.js          (file omitted entirely)
#   - pages-dev.js               (file omitted; script tags stripped from HTML)
#   - "downloads" permission     (stripped from manifest — only used by dev tools)
#   - DEV-BEGIN…DEV-END blocks   (stripped from options.js)
#
build_public() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" RETURN

  cp "$EXT/manifest.json" "$tmp/"
  _populate "$tmp"

  # Strip manifest: remove background-dev.js from scripts array and downloads from permissions
  python3 - "$tmp/manifest.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f: m = json.load(f)
m['background']['scripts'] = [s for s in m['background']['scripts'] if s != 'background-dev.js']
m['permissions']            = [p for p in m['permissions']            if p != 'downloads']
with open(path, 'w') as f: json.dump(m, f, indent=2)
PY

  # Strip <script src="pages-dev.js"> tags from HTML; also normalise CRLF → LF
  for f in blocked.html options.html warning.html; do
    sed 's/\r//' "$tmp/$f" | grep -v 'pages-dev\.js' > "$tmp/$f.tmp"
    mv "$tmp/$f.tmp" "$tmp/$f"
  done

  # Strip // DEV-BEGIN … // DEV-END blocks from JS files
  for f in options.js; do
    sed '/\/\/ DEV-BEGIN/,/\/\/ DEV-END/d' "$tmp/$f" > "$tmp/$f.tmp"
    mv "$tmp/$f.tmp" "$tmp/$f"
  done

  # Verify — abort if any dev references survived the strip
  if grep -rq 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks\|"downloads"' "$tmp" 2>/dev/null; then
    echo "ERROR: dev references found in public bundle — aborting" >&2
    grep -rn 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks\|"downloads"' "$tmp" >&2
    exit 1
  fi

  local out="$ROOT/url-lookalike-blocker-$VERSION.zip"
  rm -f "$out"
  (cd "$tmp" && zip -qr "$out" .)
  echo "  Public : $(basename "$out")"
}

# ── Dev bundle ───────────────────────────────────────────────────────────────
#
# Includes everything in the public bundle plus:
#   - background-dev.js          (screenshot capture background script)
#   - pages-dev.js               (screenshot capture page-side hooks)
#   - "downloads" permission     (kept in manifest)
#   - DEV-BEGIN…DEV-END blocks   (kept in options.js)
#
build_dev() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" RETURN

  cp "$EXT/manifest.json" "$tmp/"
  cp "$EXT/background-dev.js" "$EXT/pages-dev.js" "$tmp/"
  _populate "$tmp"

  local out="$ROOT/url-lookalike-blocker-$VERSION-dev.zip"
  rm -f "$out"
  (cd "$tmp" && zip -qr "$out" .)
  echo "  Dev    : $(basename "$out")"
}

build_public
build_dev
echo "Done."
