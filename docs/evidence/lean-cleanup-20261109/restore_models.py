#!/usr/bin/env python3
"""List removed public downloads; --restore explicitly downloads and verifies them."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = Path(__file__).with_name('models-restore.json')


def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024**2), b''):
            hasher.update(block)
    return hasher.hexdigest()


def restore(row):
    target = ROOT / row['path']
    assert target.is_relative_to(ROOT / 'build-style-training')
    assert target.resolve().is_relative_to(ROOT / 'build-style-training')
    assert row['url'].startswith(('https://huggingface.co/', 'https://download.pytorch.org/'))
    if target.exists():
        if target.is_symlink() or digest(target) != row['sha256']:
            raise ValueError(f'Refusing to replace an existing different file: {row["path"]}')
        print('Already verified:', row['path'])
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.model-restore-', dir=target.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, 'wb') as output:
            with urllib.request.urlopen(row['url'], timeout=120) as response:
                total = 0
                while block := response.read(8 * 1024**2):
                    total += len(block)
                    if total > row['bytes']:
                        raise ValueError('Download exceeds the recorded size')
                    output.write(block)
            output.flush()
            os.fsync(output.fileno())
        if temporary.stat().st_size != row['bytes'] or digest(temporary) != row['sha256']:
            raise ValueError('Downloaded model does not match its pinned size/checksum')
        temporary.chmod(0o644)
        # Atomic no-overwrite installation; keep any file created concurrently.
        os.link(temporary, target)
        print('Restored and verified:', row['path'])
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore', action='store_true')
    parser.add_argument('--only', help='Restore/list one exact manifest path')
    args = parser.parse_args()
    rows = json.loads(MANIFEST.read_text())['files']
    if args.only:
        rows = [row for row in rows if row['path'] == args.only]
        if not rows:
            parser.error('--only must match an exact manifest path')
    print(f'{len(rows)} files, {sum(row["bytes"] for row in rows) / 1024**3:.2f} GiB')
    for row in rows:
        if args.restore:
            restore(row)
        else:
            print(row['path'])
    if not args.restore:
        print('No downloads made. Pass --restore to recover these local model files.')


if __name__ == '__main__':
    main()
