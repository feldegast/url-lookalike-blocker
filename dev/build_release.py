#!/usr/bin/env python3
"""
Build a clean AMO-ready release zip from the extension/ directory.

Strips dev-only files and markers:
  - Removes background-dev.js and pages-dev.js from the zip
  - Removes background-dev.js from manifest background.scripts
  - Removes the 'downloads' permission from manifest.permissions
  - Removes <script src="pages-dev.js"> tags from HTML files
  - Strips // DEV-BEGIN ... // DEV-END blocks from JS files

Output: url-lookalike-blocker-{version}.zip in the project root.
"""

import json
import os
import re
import shutil
import tempfile
import zipfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTENSION_DIR = os.path.join(REPO_ROOT, 'extension')

DEV_FILES = {'background-dev.js', 'pages-dev.js'}
DEV_SCRIPT_TAG = re.compile(
    r'\s*<script src="(?:background-dev|pages-dev)\.js"></script>\n?'
)
DEV_BLOCK = re.compile(
    r'// DEV-BEGIN\n.*?// DEV-END\n?', re.DOTALL
)


def strip_js(src):
    return DEV_BLOCK.sub('', src)


def strip_html(src):
    return DEV_SCRIPT_TAG.sub('', src)


def strip_manifest(src):
    data = json.loads(src)
    data['background']['scripts'] = [
        s for s in data['background']['scripts']
        if s not in DEV_FILES
    ]
    data['permissions'] = [
        p for p in data['permissions']
        if p != 'downloads'
    ]
    return json.dumps(data, indent=2) + '\n'


def build():
    manifest_path = os.path.join(EXTENSION_DIR, 'manifest.json')
    with open(manifest_path) as f:
        version = json.load(f)['version']

    out_zip = os.path.join(REPO_ROOT, f'url-lookalike-blocker-{version}.zip')

    with tempfile.TemporaryDirectory() as tmp:
        for dirpath, dirnames, filenames in os.walk(EXTENSION_DIR):
            for filename in filenames:
                if filename in DEV_FILES:
                    continue
                src_path = os.path.join(dirpath, filename)
                rel = os.path.relpath(src_path, EXTENSION_DIR)
                dst_path = os.path.join(tmp, rel)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)

                with open(src_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()

                if filename == 'manifest.json':
                    content = strip_manifest(content)
                elif filename.endswith('.js'):
                    content = strip_js(content)
                elif filename.endswith('.html'):
                    content = strip_html(content)

                with open(dst_path, 'w', encoding='utf-8') as f:
                    f.write(content)

        with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
            for dirpath, dirnames, filenames in os.walk(tmp):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    arcname = os.path.relpath(file_path, tmp)
                    zf.write(file_path, arcname)

    size_kb = os.path.getsize(out_zip) // 1024
    print(f'Built: {os.path.basename(out_zip)} ({size_kb} KB)')
    print(f'Path:  {out_zip}')


if __name__ == '__main__':
    build()
