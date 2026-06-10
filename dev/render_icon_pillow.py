import math
import os
from PIL import Image, ImageDraw, ImageFont

size = 128
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

font_arm = ImageFont.truetype(r'C:\Windows\Fonts\ARIALUNI.TTF', 54)   # Armenian Մ and Լ
font_r   = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 54)   # Latin R

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

y = 82

# Draw text first so the circle and slash render on top.
# Both Armenian letters are red to mark them as the non-Latin substitutes.
draw.text((u_x, y), text_u, font=font_arm, fill=(211, 47, 47, 255), anchor='ms')
draw.text((r_x, y), text_r, font=font_r,   fill=(0, 0, 0, 255),     anchor='ms')
draw.text((l_x, y), text_l, font=font_arm, fill=(211, 47, 47, 255), anchor='ms')

# Circle and slash drawn on top.
# Ellipse bbox is computed from circle_r so the stroke centre stays at radius 50
# regardless of stroke_width. Slash endpoints are at radius 50 along the 45° diagonal
# so round caps meet the circle stroke.
circle_color = (183, 28, 28, 255)
stroke_width = 11
cx, cy, circle_r = 64, 64, 50

half_sw = stroke_width / 2
draw.ellipse(
    [cx - circle_r - half_sw, cy - circle_r - half_sw,
     cx + circle_r + half_sw, cy + circle_r + half_sw],
    outline=circle_color, width=stroke_width
)

d = circle_r / math.sqrt(2)
draw.line((cx - d, cy - d, cx + d, cy + d), fill=circle_color, width=stroke_width)

# Output path is anchored to this script's location so the renderer works
# regardless of the current working directory at invocation. The extension
# reads icon.png from extension/, so we write directly there rather than
# copying manually after each render.
script_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(script_dir, '..', 'extension', 'icon.png')
# Strip any incidental metadata Pillow might attach and re-encode with
# optimize=True so the saved file matches the byte-economy of the other
# stripped PNGs in extension/img/.
img.info = {}
img.save(out_path, format='PNG', optimize=True)
print(f'rendered {os.path.normpath(out_path)}  ({os.path.getsize(out_path)} bytes)')
