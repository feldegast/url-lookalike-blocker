#!/usr/bin/env python3
"""
Normalise help-page screenshot padding.

Trims any inconsistent whitespace from the edges of a captured screenshot
and re-pads to a fixed margin, so that a 1 px CSS border on <img> elements
in help.html always has the same gap to the content regardless of how the
original capture was cropped.

Background colour is auto-detected from the four corners of each image.
Light-theme captures (container bg #ffffff) and dark-theme captures
(container bg #2a2a2a) are handled automatically.

Usage:
    # Normalise in-place (overwrites the originals):
    python3 dev/normalise_screenshots.py extension/img/blocked-white.png extension/img/blocked-black.png

    # Normalise all help-page screenshots at once:
    python3 dev/normalise_screenshots.py extension/img/*.png

    # Custom padding (default is 20 px):
    python3 dev/normalise_screenshots.py --padding 24 extension/img/blocked-white.png

Capture instructions (do this BEFORE running the script):
    1. Open the relevant extension page in Firefox with the extension loaded
       via about:debugging.
    2. Open DevTools (F12) → Inspector tab.
    3. Select the <div class="container"> node.
    4. Right-click the node in the Inspector → "Screenshot Node".
       Firefox saves a PNG of that element's exact bounds, no browser chrome.
    5. Rename and move the saved PNG to extension/img/ with the appropriate
       name (e.g. blocked-white.png, blocked-black.png, etc.).
    6. Run this script to normalise the padding.

Why "Screenshot Node" and not a full-page capture:
    Full-page captures include the grey body background (margin: 50px auto)
    which varies with viewport width. "Screenshot Node" captures the .container
    element bounds exactly, giving a consistent starting point for trimming.
"""

import os
import sys
from PIL import Image, ImageOps

PADDING   = 0    # px of background colour to preserve — borders are applied in CSS instead
TOLERANCE = 10   # max per-channel distance to treat a pixel as background


def detect_bg(img):
    """Sample the four corners and return their average as the background colour."""
    px = img.load()
    w, h = img.size
    samples = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return (r, g, b)


def is_bg_pixel(px_val, bg, tol=TOLERANCE):
    return all(abs(int(px_val[i]) - int(bg[i])) <= tol for i in range(3))


def content_bbox(img, bg):
    """Return (left, top, right, bottom) bounding box of non-background content."""
    px = img.load()
    w, h = img.size

    def row_is_bg(y):
        return all(is_bg_pixel(px[x, y], bg) for x in range(w))

    def col_is_bg(x):
        return all(is_bg_pixel(px[x, y], bg) for y in range(h))

    top    = next((y for y in range(h)          if not row_is_bg(y)), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if not row_is_bg(y)), h - 1)
    left   = next((x for x in range(w)          if not col_is_bg(x)), 0)
    right  = next((x for x in range(w - 1, -1, -1) if not col_is_bg(x)), w - 1)

    return left, top, right + 1, bottom + 1


def normalise(path, padding=PADDING):
    img = Image.open(path).convert('RGB')
    bg  = detect_bg(img)
    box = content_bbox(img, bg)

    content_w = box[2] - box[0]
    content_h = box[3] - box[1]

    cropped = img.crop(box)
    result  = ImageOps.expand(cropped, border=padding, fill=bg)
    result.save(path)

    ow, oh = img.size
    nw, nh = result.size
    trimmed_top    = box[1]
    trimmed_bottom = oh - box[3]
    trimmed_left   = box[0]
    trimmed_right  = ow - box[2]
    print(
        f"  {os.path.basename(path):<40}  bg={bg}  "
        f"{ow}×{oh} → {nw}×{nh}  "
        f"trimmed t{trimmed_top}/b{trimmed_bottom}/l{trimmed_left}/r{trimmed_right}  "
        f"content {content_w}×{content_h}"
    )


def main():
    args = sys.argv[1:]

    padding = PADDING
    paths   = []
    i = 0
    while i < len(args):
        if args[i] == '--padding' and i + 1 < len(args):
            padding = int(args[i + 1])
            i += 2
        else:
            paths.append(args[i])
            i += 1

    if not paths:
        import glob as _glob
        staging = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'listing-screenshots')
        paths = sorted(_glob.glob(os.path.join(staging, '*.png')))
        if not paths:
            print('No PNGs found in dev/listing-screenshots/')
            sys.exit(1)

    print(f"Normalising {len(paths)} image(s) with {padding} px padding …")
    for path in paths:
        normalise(path, padding)
    print("Done.")


if __name__ == '__main__':
    main()
