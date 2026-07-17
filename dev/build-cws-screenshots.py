#!/usr/bin/env python3
"""
Generate Chrome Web Store listing screenshots (1280x800, 24-bit RGB PNG).

Output: dev/cws-screenshots/
  cws-1-options.png       — Options page light + dark side by side
  cws-2-alerts-light.png  — Block and warning pages, light theme
  cws-3-alerts-dark.png   — Block and warning pages, dark theme

Run from anywhere in the repo:
  python3 dev/build-cws-screenshots.py
"""

from pathlib import Path
from PIL import Image

REPO = Path(__file__).parent.parent
IMG  = REPO / 'extension' / 'img'
OUT  = REPO / 'dev' / 'cws-screenshots'
OUT.mkdir(exist_ok=True)

W, H   = 1280, 800
PAD    = 24
SHADOW = 6


def fit(img, max_w, max_h):
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)


def paste_with_shadow(canvas, img, x, y, shadow_hex):
    r, g, b = int(shadow_hex[1:3], 16), int(shadow_hex[3:5], 16), int(shadow_hex[5:7], 16)
    shadow = Image.new('RGB', (img.width + SHADOW, img.height + SHADOW), (r, g, b))
    canvas.paste(shadow, (x + SHADOW, y + SHADOW))
    canvas.paste(img, (x, y))


# ── Image 1: Options page light + dark side by side ──────────────────────────
def make_options():
    canvas = Image.new('RGB', (W, H), '#222222')

    slot_w = (W - PAD * 3) // 2
    slot_h = H - PAD * 2

    for i, name in enumerate(('options-white.png', 'options-black.png')):
        src = Image.open(IMG / name)
        # Crop to top portion — captures interface options + language table header
        crop_h = min(src.height, int(src.width * slot_h / slot_w))
        src = src.crop((0, 0, src.width, crop_h))
        img = fit(src, slot_w, slot_h)

        slot_x = PAD + i * (slot_w + PAD)
        x = slot_x + (slot_w - img.width) // 2
        y = (H - img.height) // 2
        paste_with_shadow(canvas, img, x, y, '#111111')

    canvas.save(OUT / 'cws-1-options.png')
    print('  cws-1-options.png')


# ── Images 2 & 3: Block and warning pages ────────────────────────────────────
def make_alerts(theme):
    is_light   = theme == 'white'
    bg_color   = '#f0f0f0' if is_light else '#1a1a1a'
    shadow_hex = '#cccccc' if is_light else '#0a0a0a'
    suffix     = 'light'   if is_light else 'dark'

    canvas = Image.new('RGB', (W, H), bg_color)

    names = [
        f'blocked-{theme}.png',
        f'warning-confusable-{theme}.png',
        f'warning-mixed-{theme}.png',
    ]

    n      = len(names)
    slot_w = (W - PAD * (n + 1)) // n
    slot_h = H - PAD * 2

    for i, name in enumerate(names):
        src = Image.open(IMG / name)
        img = fit(src, slot_w, slot_h)

        slot_x = PAD + i * (slot_w + PAD)
        x = slot_x + (slot_w - img.width) // 2
        y = (H - img.height) // 2
        paste_with_shadow(canvas, img, x, y, shadow_hex)

    out_name = f'cws-2-alerts-{suffix}.png'
    canvas.save(OUT / out_name)
    print(f'  {out_name}')


print(f'Generating CWS screenshots → {OUT}')
make_options()
make_alerts('white')
make_alerts('black')
print('Done.')
