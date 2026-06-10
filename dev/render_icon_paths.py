"""Extract Մ, R, L glyph paths from their source fonts and write a new
extension/icon.svg with <path> elements instead of <text>. This makes the
icon render identically on any system, independent of which fonts are
installed.

Sources match render_icon_pillow.py exactly:
    Մ (U+0544)  →  Arial Unicode MS, red
    R           →  Segoe UI Bold, black (kept Latin so it reads correctly
                   behind the red diagonal slash)
    Լ (U+053C)  →  Arial Unicode MS, red (Armenian Liwn — a homograph for
                   Latin L, matching the homograph theme already set by Մ)

Layout math also matches render_icon_pillow.py:
    canvas 128×128, font_size 54, spacing −9, baseline y = 82,
    horizontally centred row.

After running this script, re-run dev/render_icon_pillow.py to regenerate
extension/icon.png. Both files now derive from the same source fonts and
should render visually identically.

Run from the repo root:  python dev/render_icon_paths.py
"""

import math
import os
from PIL import ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ARIAL_UNICODE = r'C:\Windows\Fonts\ARIALUNI.TTF'
SEGOE_UI_BOLD = r'C:\Windows\Fonts\segoeuib.ttf'

SIZE = 128
FONT_SIZE = 54
SPACING = -9
BASELINE_Y = 82


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
u_advance = pillow_advance(ARIAL_UNICODE, 'Մ')
r_advance = pillow_advance(SEGOE_UI_BOLD, 'R')
l_advance = pillow_advance(ARIAL_UNICODE, 'Լ')

# Step 2: layout — same math as render_icon_pillow.py.
total_width = u_advance + r_advance + l_advance + 2 * SPACING
origin_x = (SIZE - total_width) / 2

u_x_centre = origin_x + u_advance / 2
r_x_centre = origin_x + u_advance + SPACING + r_advance / 2
l_x_centre = origin_x + u_advance + SPACING + r_advance + SPACING + l_advance / 2

# Step 3: glyph paths and visual midpoints (em units).
u_path, u_scale, u_em_bbox = glyph_path_and_bbox(ARIAL_UNICODE, 'Մ')
r_path, r_scale, r_em_bbox = glyph_path_and_bbox(SEGOE_UI_BOLD, 'R')
l_path, l_scale, l_em_bbox = glyph_path_and_bbox(ARIAL_UNICODE, 'Լ')

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

# Step 5: circle and diagonal slash (same constants as the Pillow render).
circle_colour = '#b71c1c'
stroke_width = 11
cx, cy, circle_r = 64, 64, 50
d = circle_r / math.sqrt(2)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
  <g transform="translate({u_tx:.4f} {BASELINE_Y}) scale({u_scale:.6f} {-u_scale:.6f})">
    <path fill="#d32f2f" d="{u_path}"/>
  </g>
  <g transform="translate({r_tx:.4f} {BASELINE_Y}) scale({r_scale:.6f} {-r_scale:.6f})">
    <path fill="#000000" d="{r_path}"/>
  </g>
  <g transform="translate({l_tx:.4f} {BASELINE_Y}) scale({l_scale:.6f} {-l_scale:.6f})">
    <path fill="#d32f2f" d="{l_path}"/>
  </g>
  <circle cx="{cx}" cy="{cy}" r="{circle_r}" fill="none" stroke="{circle_colour}" stroke-width="{stroke_width}"/>
  <path d="M {cx-d:.4f} {cy-d:.4f} L {cx+d:.4f} {cy+d:.4f}" stroke="{circle_colour}" stroke-width="{stroke_width}" stroke-linecap="round"/>
</svg>
'''

out_path = os.path.join('extension', 'icon.svg')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(svg)
print(f'wrote {out_path}  ({len(svg)} bytes)')
