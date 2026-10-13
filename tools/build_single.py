#!/usr/bin/env python3
"""Bundle the whole game into one HTML file you can email or keep offline.

Run from the project folder:
    python3 tools/build_single.py
The result is written to dist/thornvale-chronicles.html.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')

    def inline_css(m):
        return '<style>\n' + read(m.group(1)) + '</style>'

    def inline_js(m):
        return '<script>\n' + read(m.group(1)) + '</script>'

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'thornvale-chronicles.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Wrote', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    main()
