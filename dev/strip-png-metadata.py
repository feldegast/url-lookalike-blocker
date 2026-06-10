"""One-shot helper: re-save every PNG in extension/img/ (excluding subdirs)
without any ancillary chunks (XMP, tEXt, iCCP, etc.). Keeps only the pixel
data and the chunks Pillow writes by default for a fresh PNG.

Run from the repo root:  python dev/strip-png-metadata.py
"""
import os
from PIL import Image

IMG_DIR = os.path.join("extension", "img")
total_before = 0
total_after = 0
for name in sorted(os.listdir(IMG_DIR)):
    path = os.path.join(IMG_DIR, name)
    if not os.path.isfile(path) or not name.lower().endswith(".png"):
        continue
    before = os.path.getsize(path)
    img = Image.open(path)
    # Force a clean info dict so Pillow does not carry XMP/iTXt forward.
    img.info = {}
    # Save without passing a PngInfo — Pillow then only emits required chunks.
    img.save(path, format="PNG", optimize=True)
    after = os.path.getsize(path)
    total_before += before
    total_after += after
    print(f"{name:50s}  {before:>7} -> {after:>7}  ({after-before:+d})")

print(f"\nTotal: {total_before} -> {total_after}  ({total_after-total_before:+d} bytes)")
