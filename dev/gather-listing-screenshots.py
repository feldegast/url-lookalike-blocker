"""Copy captured screenshots from ~/Downloads/url-lookalike-blocker-screenshots/
into dev/listing-screenshots/ for review, then into extension/img/.

Run from the repo root:  python dev/gather-listing-screenshots.py
"""

import glob
import os
import shutil

script_dir    = os.path.dirname(os.path.abspath(__file__))
repo_root     = os.path.dirname(script_dir)
downloads_dir = os.path.join(os.path.expanduser('~'), 'Downloads', 'url-lookalike-blocker-screenshots')
staging_dir   = os.path.join(script_dir, 'listing-screenshots')

os.makedirs(staging_dir, exist_ok=True)

if not os.path.isdir(downloads_dir):
    print(f'Downloads folder not found: {downloads_dir}')
    raise SystemExit(1)

captured = sorted(glob.glob(os.path.join(downloads_dir, '*.png')))
if not captured:
    print(f'No PNGs found in {downloads_dir}')
    raise SystemExit(1)

print(f'Copying {len(captured)} file(s) from Downloads → listing-screenshots/')
for src in captured:
    name = os.path.basename(src)
    shutil.copy2(src, os.path.join(staging_dir, name))
    print(f'  {name}')
