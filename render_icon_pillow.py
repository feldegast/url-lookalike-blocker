import math
from PIL import Image, ImageDraw, ImageFont

size = 128
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

font_u = ImageFont.truetype(r'C:\Windows\Fonts\ARIALUNI.TTF', 54)   # Armenian Մ — distinct hook
font_rl = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 54)  # R and L

text_u = 'Մ'  # Armenian Մ (U+0544) — lookalike for U
text_r = 'R'
text_l = 'L'
spacing = -9

u_width = draw.textlength(text_u, font=font_u)
r_width = draw.textlength(text_r, font=font_rl)
l_width = draw.textlength(text_l, font=font_rl)

total_width = u_width + r_width + l_width + 2 * spacing
origin_x = (size - total_width) / 2

u_x = origin_x + u_width / 2
r_x = origin_x + u_width + spacing + r_width / 2
l_x = origin_x + u_width + spacing + r_width + spacing + l_width / 2

y = 82

# Draw text first so the circle and slash render on top
draw.text((u_x, y), text_u, font=font_u,  fill=(211, 47, 47, 255), anchor='ms')
draw.text((r_x, y), text_r, font=font_rl, fill=(0, 0, 0, 255),     anchor='ms')
draw.text((l_x, y), text_l, font=font_rl, fill=(0, 0, 0, 255),     anchor='ms')

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

img.save('icon.png')
print('rendered icon.png')
