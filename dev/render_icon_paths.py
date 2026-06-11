"""Extract Մ, R, L glyph paths from their source fonts and write a new
extension/icon.svg with <path> elements instead of <text>. This makes the
icon render identically on any system, independent of which fonts are
installed.

Sources match render_icon_pillow.py exactly:
    Մ (U+0544)  →  Noto Sans Armenian Bold, red (#d32f2f)
    R           →  Segoe UI Bold, blue (#1976d2; kept Latin so it reads
                   correctly behind the red diagonal slash, recoloured from
                   black so the icon stays legible on dark toolbars)
    Լ (U+053C)  →  Noto Sans Armenian Bold, red (Armenian Liwn — a homograph
                   for Latin L, matching the homograph theme set by Մ)

Fonts:
    NotoSansArmenian-Bold.ttf — OFL-licensed, supplied in dev/.
    segoeuib.ttf (Segoe UI Bold) — Microsoft proprietary, NOT supplied with
        this repo (Microsoft's EULA does not permit redistribution). Each
        developer installs it locally so the script can find it:
            Windows: ships with the OS at C:\\Windows\\Fonts\\segoeuib.ttf
            Linux:   drop segoeuib.ttf into ~/.local/share/fonts/ then
                     run `fc-cache -f`

Layout math also matches render_icon_pillow.py:
    canvas 128×128, font_size 54, spacing −9, baseline y = 82,
    horizontally centred row.

After running this script, re-run dev/render_icon_pillow.py to regenerate
extension/icon.png. Both files derive from the same source fonts and should
render visually identically.

Run from the repo root:  python dev/render_icon_paths.py
"""

import math
import os
from PIL import ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NOTO_ARMENIAN_BOLD = os.path.join(_SCRIPT_DIR, 'NotoSansArmenian-Bold.ttf')


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


SEGOE_UI_BOLD = _find_segoe_ui_bold()

SIZE = 128
FONT_SIZE = 64
SPACING = -9
BASELINE_Y = 86


def pillow_advance(font_path, char):
    """Advance width matching what render_icon_pillow.py measures via Pillow."""
    return ImageFont.truetype(font_path, FONT_SIZE).getlength(char)


def glyph_path_and_bbox(font_path, char):
    """Return (svg_path_data, em_to_svg_scale, em_bbox) for the glyph."""
    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    glyph_name = font.getBestCmap()[ord(char)]
    glyph = glyph_set[glyph_name]

    svg_pen = SVGPathPen(glyph_set)
    glyph.draw(svg_pen)
    path_d = svg_pen.getCommands()

    bounds_pen = BoundsPen(glyph_set)
    glyph.draw(bounds_pen)
    em_bbox = bounds_pen.bounds  # (xMin, yMin, xMax, yMax) in em units

    scale = FONT_SIZE / font['head'].unitsPerEm
    return path_d, scale, em_bbox


# Step 1: advance widths via Pillow (matches the existing render exactly).
u_advance = pillow_advance(NOTO_ARMENIAN_BOLD, 'Մ')
r_advance = pillow_advance(SEGOE_UI_BOLD, 'R')
l_advance = pillow_advance(NOTO_ARMENIAN_BOLD, 'Լ')

# Step 2: layout — same math as render_icon_pillow.py.
total_width = u_advance + r_advance + l_advance + 2 * SPACING
origin_x = (SIZE - total_width) / 2

u_x_centre = origin_x + u_advance / 2
r_x_centre = origin_x + u_advance + SPACING + r_advance / 2
l_x_centre = origin_x + u_advance + SPACING + r_advance + SPACING + l_advance / 2

# Step 3: glyph paths and visual midpoints (em units).
u_path, u_scale, u_em_bbox = glyph_path_and_bbox(NOTO_ARMENIAN_BOLD, 'Մ')
r_path, r_scale, r_em_bbox = glyph_path_and_bbox(SEGOE_UI_BOLD, 'R')
l_path, l_scale, l_em_bbox = glyph_path_and_bbox(NOTO_ARMENIAN_BOLD, 'Լ')

u_em_mid = (u_em_bbox[0] + u_em_bbox[2]) / 2
r_em_mid = (r_em_bbox[0] + r_em_bbox[2]) / 2
l_em_mid = (l_em_bbox[0] + l_em_bbox[2]) / 2

# Step 4: translate each path so the glyph's visual horizontal midpoint
# (matching Pillow's anchor='ms') lands at the row position.
# Transform is translate(tx, baseline) scale(s, −s); after that a font-space
# point (em_x, em_y) maps to (tx + em_x·s, baseline − em_y·s).
# Want em_x = em_mid to map to x_centre → tx = x_centre − em_mid·scale.
u_tx = u_x_centre - u_em_mid * u_scale
r_tx = r_x_centre - r_em_mid * r_scale
l_tx = l_x_centre - l_em_mid * l_scale

# Step 5: underline, diagonal strikethrough line, and shield badge.
# Underline: 4px at 128px = 1px at 32px.
underline_x1 = origin_x
underline_x2 = origin_x + total_width
underline_y = BASELINE_Y + 7

# Diagonal: left side higher (upper-left → lower-right) at 10° from horizontal.
line_colour = '#b71c1c'
stroke_width = 11
cx, cy = 64, 64
half_w = 60  # horizontal half-extent from centre
angle = math.radians(10)
x1 = cx - half_w
y1 = cy - half_w * math.tan(angle)
x2 = cx + half_w
y2 = cy + half_w * math.tan(angle)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
  <line x1="{underline_x1:.4f}" y1="{underline_y}" x2="{underline_x2:.4f}" y2="{underline_y}" stroke="#1976d2" stroke-width="4" stroke-linecap="square"/>
  <g transform="translate({u_tx:.4f} {BASELINE_Y}) scale({u_scale:.6f} {-u_scale:.6f})">
    <path fill="#d32f2f" d="{u_path}"/>
  </g>
  <g transform="translate({r_tx:.4f} {BASELINE_Y}) scale({r_scale:.6f} {-r_scale:.6f})">
    <path fill="#1976d2" d="{r_path}"/>
  </g>
  <g transform="translate({l_tx:.4f} {BASELINE_Y}) scale({l_scale:.6f} {-l_scale:.6f})">
    <path fill="#d32f2f" d="{l_path}"/>
  </g>
  <line x1="{x1:.4f}" y1="{y1:.4f}" x2="{x2:.4f}" y2="{y2:.4f}" stroke="{line_colour}" stroke-width="{stroke_width}" stroke-linecap="round"/>
  <path d="M 90 83 L 126 83 L 126 105 C 126 117 108 123 108 123 C 108 123 90 117 90 105 Z" fill="#ffc107" stroke="#1976d2" stroke-width="3" stroke-linejoin="round"/>
  <line x1="108" y1="91" x2="108" y2="108" stroke="#000000" stroke-width="5" stroke-linecap="round"/>
  <circle cx="108" cy="115" r="3" fill="#000000"/>
</svg>
'''

out_path = os.path.join('extension', 'icon.svg')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(svg)
print(f'wrote {out_path}  ({len(svg)} bytes)')
