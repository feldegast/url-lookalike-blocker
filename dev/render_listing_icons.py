"""Generate icon-32.png, icon-64.png, icon-128.png from extension/icon.png
for upload to the AMO listing icon slots. These are listing-only — they
are NOT bundled with the extension.

Outputs to dev/listing-icons/. High-quality downscale via LANCZOS.

Run from the repo root:  python dev/render_listing_icons.py
"""
import os
from PIL import Image

src = os.path.join("extension", "icon.png")
out_dir = os.path.join("dev", "listing-icons")
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src)
img.info = {}  # strip any XMP/Photoshop metadata
print(f"source: {src}  size={img.size[0]}x{img.size[1]}")

for size in (32, 64, 128):
    if size == img.size[0]:
        resized = img.copy()
    else:
        resized = img.resize((size, size), Image.LANCZOS)
    resized.info = {}
    out_path = os.path.join(out_dir, f"icon-{size}.png")
    resized.save(out_path, format="PNG", optimize=True)
    bytes_ = os.path.getsize(out_path)
    print(f"  wrote {out_path}  {bytes_} bytes")
