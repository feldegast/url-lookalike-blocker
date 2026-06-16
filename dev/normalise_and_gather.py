#!/usr/bin/env python3
import os, subprocess, sys
d = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(d, 'gather-listing-screenshots.py')], check=True)
subprocess.run([sys.executable, os.path.join(d, 'normalise_screenshots.py')], check=True)
