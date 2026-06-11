import math
import os
from PIL import Image, ImageDraw, ImageFont

size = 128
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

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

# Output path is anchored to this script's location so the renderer works
# regardless of the current working directory at invocation. The extension
# reads icon.png from extension/, so we write directly there rather than
# copying manually after each render.
out_path = os.path.join(script_dir, '..', 'extension', 'icon.png')
# Strip any incidental metadata Pillow might attach and re-encode with
# optimize=True so the saved file matches the byte-economy of the other
# stripped PNGs in extension/img/.
img.info = {}
img.save(out_path, format='PNG', optimize=True)
print(f'rendered {os.path.normpath(out_path)}  ({os.path.getsize(out_path)} bytes)')
