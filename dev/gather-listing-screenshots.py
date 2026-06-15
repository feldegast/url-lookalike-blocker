"""Curate help-file screenshots into dev/listing-screenshots/ for upload
to the Mozilla AMO listing page.

The help page (extension/help.html) embeds light-theme and dark-theme
screenshots of every UI surface — block page, warning pages, options
page, toolbar menu, etc. For the AMO listing carousel we want a focused
subset, light-theme only, in a numbered order that controls how they
appear on the listing page.

This script copies the chosen PNGs from extension/img/ into
dev/listing-screenshots/ with curated names. There is no image
processing — the PNGs are uploaded to AMO as-is, which is why
extension/img/ should be kept clean (see dev/normalise_screenshots.py).

Edit the SCREENSHOTS list below to add, remove, or reorder images.
The numeric prefix in the target filename controls the carousel order.

Run from the repo root:  python dev/gather-listing-screenshots.py
"""

import os
import shutil

# (source filename in extension/img/, target filename in dev/listing-screenshots/)
SCREENSHOTS = [
    ('blocked-white.png',                      '01-block-page.png'),
    ('warning-confusable-white.png',           '02-warning-confusable.png'),
    ('warning-mixed-white.png',                '03-warning-mixed.png'),
    ('options-white.png',                      '04-options.png'),
    ('options-compact-white.png',              '05-options-compact.png'),
    ('options-compact-languages-white.png',    '06-options-compact-languages.png'),
    ('options-compact-whitelist-white.png',    '07-options-compact-whitelist.png'),
    ('options-private-warning-white.png',      '08-options-private-warning.png'),
    ('menu-white.png',                         '09-toolbar-menu.png'),
]


script_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(script_dir, '..', 'extension', 'img')
dst_dir = os.path.join(script_dir, 'listing-screenshots')

os.makedirs(dst_dir, exist_ok=True)

copied = 0
skipped = 0
for src_name, dst_name in SCREENSHOTS:
    src = os.path.join(src_dir, src_name)
    dst = os.path.join(dst_dir, dst_name)
    if not os.path.exists(src):
        print(f'SKIPPED (source missing): {src_name}')
        skipped += 1
        continue
    shutil.copyfile(src, dst)
    print(f'copied {src_name:<40} -> {dst_name}  ({os.path.getsize(dst)} bytes)')
    copied += 1

print(f'\n{copied} copied, {skipped} skipped. Upload from {os.path.normpath(dst_dir)}.')
