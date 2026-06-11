"""Render the extension icon as PNG at the sizes Mozilla AMO listing needs,
written to dev/listing-icons/.

The in-extension icon is now SVG-only (extension/icon.svg, produced by
dev/render_icon_paths.py and referenced from manifest.json). This script
exists purely to produce the AMO listing-icon uploads — those PNGs are
NOT bundled with the extension package.

The icon is rendered natively at 128×128 from the source fonts (same
geometry and colours as render_icon_paths.py uses for the SVG), then
high-quality LANCZOS-downscaled for the 32 and 64 sizes.

Fonts:
    NotoSansArmenian-Bold.ttf — OFL-licensed, supplied in dev/. Provides
        the Armenian Մ (U+0544) and Լ (U+053C) glyphs.
    segoeuib.ttf (Segoe UI Bold) — Microsoft proprietary, NOT supplied with
        this repo (Microsoft's EULA does not permit redistribution).
        Provides the Latin R glyph. Each developer installs it locally:
            Windows: ships with the OS at C:\\Windows\\Fonts\\segoeuib.ttf
            Linux:   drop segoeuib.ttf into ~/.local/share/fonts/ then
                     run `fc-cache -f`

Run from the repo root:  python dev/render_icon_pillow.py
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont


def _find_segoe_ui_bold():
    # Segoe UI Bold is Microsoft proprietary and isn't redistributed via this
    # repo. Each developer installs it locally:
    #   Windows: ships with the OS at C:\Windows\Fonts\segoeuib.ttf
    #   Linux:   drop segoeuib.ttf into ~/.local/share/fonts/ then fc-cache -f
    candidates = [
        os.path.expanduser('~/.local/share/fonts/segoeuib.ttf'),
        '/usr/share/fonts/truetype/segoeuib.ttf',
        r'C:\Windows\Fonts\segoeuib.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(
        'Segoe UI Bold (segoeuib.ttf) not found. Tried:\n  ' +
        '\n  '.join(candidates)
    )


script_dir = os.path.dirname(os.path.abspath(__file__))
font_arm = ImageFont.truetype(os.path.join(script_dir, 'NotoSansArmenian-Bold.ttf'), 64)  # Armenian Մ and Լ
font_r   = ImageFont.truetype(_find_segoe_ui_bold(), 64)                                  # Latin R


def render_master():
    """Render the icon natively at 128×128 and return the RGBA image."""
    size = 128
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    text_u = 'Մ'  # Armenian Մ (U+0544) — homograph for Latin U
    text_r = 'R'  # Latin R kept (no Armenian homograph for R, and the red diagonal slash crosses it)
    text_l = 'Լ'  # Armenian Liwn (U+053C) — homograph for Latin L
    spacing = -9

    u_width = draw.textlength(text_u, font=font_arm)
    r_width = draw.textlength(text_r, font=font_r)
    l_width = draw.textlength(text_l, font=font_arm)

    total_width = u_width + r_width + l_width + 2 * spacing
    origin_x = (size - total_width) / 2

    u_x = origin_x + u_width / 2
    r_x = origin_x + u_width + spacing + r_width / 2
    l_x = origin_x + u_width + spacing + r_width + spacing + l_width / 2

    y = 86

    # Underline spans the full text row — 4px at 128px = 1px at 32px.
    underline_y = y + 7
    draw.line([(origin_x, underline_y), (origin_x + total_width, underline_y)],
              fill=(25, 118, 210, 255), width=4)

    # Draw text first so the circle and slash render on top.
    # Both Armenian letters are red to mark them as the non-Latin substitutes.
    draw.text((u_x, y), text_u, font=font_arm, fill=(211, 47, 47, 255), anchor='ms')
    draw.text((r_x, y), text_r, font=font_r,   fill=(25, 118, 210, 255), anchor='ms')
    draw.text((l_x, y), text_l, font=font_arm, fill=(211, 47, 47, 255), anchor='ms')

    # Warning shield badge — bottom right corner, drawn before circle/slash
    # so the slash renders on top of the shield where they overlap.
    shield_pts = [(90, 83), (126, 83), (126, 105), (108, 123), (90, 105)]
    draw.polygon(shield_pts, fill=(255, 193, 7, 255), outline=(25, 118, 210, 255), width=3)
    draw.line([(108, 91), (108, 108)], fill=(0, 0, 0, 255), width=5)
    draw.ellipse([105, 112, 111, 118], fill=(0, 0, 0, 255))

    # 30° diagonal strikethrough line — left side higher (upper-left → lower-right).
    line_color = (183, 28, 28, 255)
    stroke_width = 11
    cx, cy = 64, 64
    half_w = 60
    angle = math.radians(10)
    x1 = cx - half_w
    y1 = cy - half_w * math.tan(angle)
    x2 = cx + half_w
    y2 = cy + half_w * math.tan(angle)
    draw.line((x1, y1, x2, y2), fill=line_color, width=stroke_width)

    return img


# Output to dev/listing-icons/. These PNGs are uploaded to the AMO listing
# page and are NOT bundled with the extension itself.
out_dir = os.path.join(script_dir, 'listing-icons')
os.makedirs(out_dir, exist_ok=True)

master = render_master()

for size in (32, 64, 128):
    if size == 128:
        img = master
    else:
        # LANCZOS downscale gives clean antialiasing for the smaller sizes
        # without re-rendering text at sizes too small for the source fonts
        # to read well.
        img = master.resize((size, size), Image.LANCZOS)
    img.info = {}
    out_path = os.path.join(out_dir, f'icon-{size}.png')
    img.save(out_path, format='PNG', optimize=True)
    print(f'rendered {os.path.normpath(out_path)}  ({os.path.getsize(out_path)} bytes)')
