#!/usr/bin/env python3
"""Normalise all extension/img/*.png files, then gather listing screenshots.

Run from the repo root after capturing screenshots:
    python dev/normalise_and_gather.py
"""

import glob
import os
import subprocess
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root  = os.path.dirname(script_dir)
img_dir    = os.path.join(repo_root, 'extension', 'img')

pngs = sorted(glob.glob(os.path.join(img_dir, '*.png')))
if not pngs:
    print('No PNGs found in extension/img/ — nothing to do.')
    sys.exit(1)

print(f'=== Normalise ({len(pngs)} files) ===')
subprocess.run(
    [sys.executable, os.path.join(script_dir, 'normalise_screenshots.py')] + pngs,
    check=True,
)

print()
print('=== Gather listing screenshots ===')
subprocess.run(
    [sys.executable, os.path.join(script_dir, 'gather-listing-screenshots.py')],
    check=True,
)
