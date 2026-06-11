"""Generate help-file SVG illustrations of the toolbar icon's badged states.

Reads extension/icon.svg and writes two SVGs to extension/img/:

- badge-0.svg: the icon as-is, used to illustrate the "no warnings open"
  state on the help page.
- badge-1.svg: the icon with a red square containing "1" overlaid in the
  top-right corner, illustrating the "one warning open" state. The badge
  sits in the same corner Firefox draws the live toolbar badge, so the
  help illustration matches what users actually see. The in-icon warning
  shield is in the bottom-right, so the badge and shield don't overlap.

Both SVGs work on any background (light or dark help-page theme) because
the icon's previously-black elements (R, underline, shield border) were
recoloured to #1976d2 to be theme-neutral.

Badge fill #d32f2f matches browser.action.setBadgeBackgroundColor in
background.js, so the static illustration uses the same red as the live
toolbar.

Run from the repo root:  python dev/render_help_badges.py
"""

import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_SVG = os.path.join(SCRIPT_DIR, '..', 'extension', 'icon.svg')
IMG_DIR = os.path.join(SCRIPT_DIR, '..', 'extension', 'img')

# Badge geometry — 44×44 square in the top-right of the 128×128 viewBox,
# with a 4px margin from the icon edge.
BADGE_SVG = '''  <rect x="80" y="4" width="44" height="44" rx="4" ry="4" fill="#d32f2f"/>
  <text x="102" y="26" font-family="sans-serif" font-size="34" font-weight="bold"
        fill="#ffffff" text-anchor="middle" dominant-baseline="central">1</text>'''


with open(ICON_SVG, 'r', encoding='utf-8') as f:
    icon = f.read()

# badge-0: identical to icon.svg; written as its own file so help.html
# can reference both states from the same img/ directory.
out_0 = os.path.join(IMG_DIR, 'badge-0.svg')
with open(out_0, 'w', encoding='utf-8') as f:
    f.write(icon)
print(f'wrote {os.path.normpath(out_0)}  ({os.path.getsize(out_0)} bytes)')

# badge-1: icon + badge elements inserted just before the closing </svg>
# so they render on top of everything else (matching Firefox's behaviour).
badged = icon.replace('</svg>', BADGE_SVG + '\n</svg>')
out_1 = os.path.join(IMG_DIR, 'badge-1.svg')
with open(out_1, 'w', encoding='utf-8') as f:
    f.write(badged)
print(f'wrote {os.path.normpath(out_1)}  ({os.path.getsize(out_1)} bytes)')
