#!/usr/bin/env python3
"""Package the audited shared performance console for the native iOS app."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
from studio_build_lock import studio_build_lock
from verify_web_bundle import verify

ROOT = Path(__file__).resolve().parents[1]

def prepare():
    verify()
    # Keep Xcode's resource input intact until the complete replacement is ready.
    (ROOT / 'build-ios-studio').mkdir(exist_ok=True)
    staging = tempfile.TemporaryDirectory(prefix='studio-', dir=ROOT / 'build-ios-studio')
    target = Path(staging.name) / 'Studio'
    shutil.copytree(ROOT / 'dist/web', target)
    for path in (ROOT / 'apps/ios/Studio').iterdir():
        if path.is_file():
            shutil.copy2(path, target / path.name)
    page = target / 'dj.html'
    html = page.read_text()
    needle = '<script type="module" src="./dj.js"></script>'
    assert html.count(needle) == 1
    html = html.replace(needle, '<link rel="stylesheet" href="./mobile-studio.css"><script src="./mobile-boot.js"></script>' + needle)
    page.write_text(html)
    singing = target / 'singing.html'
    html = singing.read_text().replace('href="/"', 'href="./singing-home.html"').replace('href="/singing-academy"', 'href="./singing-home.html"').replace('href="/singing-academy/warmups"', 'href="./singing-home.html#warmups"')
    for route in ['report-bug', 'licenses']:
        html = html.replace('href="/' + route + '"', 'href="https://jamloom.com/' + route + '"')
    singing.write_text(html)
    # The native navigation gate reads the same free lesson IDs as the web course.
    free_ids = subprocess.check_output(['node', '--input-type=module', '-e',
        "import {singingLessons} from './apps/web/singing-course.js'; console.log(JSON.stringify([...singingLessons.map(l=>l.id),'first-light']))"], cwd=ROOT)
    (target / 'singing-free-lessons.json').write_bytes(free_ids)
    destination = ROOT / 'build-ios-studio/Studio'
    destination.mkdir(parents=True, exist_ok=True)
    prepared_files = {p.relative_to(target).as_posix() for p in target.rglob('*') if p.is_file()}
    for path in target.rglob('*'):
        relative = path.relative_to(target)
        output = destination / relative
        if path.is_dir():
            output.mkdir(parents=True, exist_ok=True)
        elif not output.exists() or output.read_bytes() != path.read_bytes():
            os.replace(path, output)
    for path in destination.rglob('*'):
        if path.is_file() and path.relative_to(destination).as_posix() not in prepared_files:
            path.unlink()
    staging.cleanup()
    print('Prepared audited native DJ studio and Singing Academy.')

if __name__ == '__main__':
    with studio_build_lock():
        prepare()
