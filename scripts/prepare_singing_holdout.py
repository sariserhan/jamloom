#!/usr/bin/env python3
"""Fetch only the frozen evaluation subset; never unpack the full VocalSet archive."""
import hashlib
import io
import json
from pathlib import Path
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs/evidence/singing-holdout-20261027/selection.json'


class RangeReader(io.RawIOBase):
    def __init__(self, url, size):
        self.url, self.size, self.position, self.transferred = url, size, 0, 0

    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset, whence=0):
        if whence not in (0, 1, 2): raise ValueError('Invalid seek')
        position = offset + (0 if whence == 0 else self.position if whence == 1 else self.size)
        if not 0 <= position <= self.size: raise ValueError('Invalid archive offset')
        self.position = position
        return position

    def read(self, count=-1):
        count = self.size-self.position if count < 0 else min(count, self.size-self.position)
        if not count: return b''
        if not 0 < count <= 8_000_000 or self.transferred+count > 80_000_000:
            raise ValueError('Subset download limit exceeded')
        end = self.position+count-1
        request = urllib.request.Request(self.url, headers={'Range': f'bytes={self.position}-{end}'})
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 206 or response.headers.get('Content-Range') != f'bytes {self.position}-{end}/{self.size}':
                raise ValueError('Server did not honor exact range; full download refused')
            data = response.read(count+1)
        if len(data) != count: raise ValueError('Incomplete range')
        self.transferred += count
        self.position += count
        return data


def prepare(destination, manifest_path=MANIFEST):
    manifest = json.loads(manifest_path.read_text())
    if destination.exists(): raise ValueError('Use a new output directory')
    assert manifest['archiveURL'] == 'https://zenodo.org/records/10200775/files/VocalSet.zip'
    assert manifest['archiveBytes'] == 2488206010 and 0 < len(manifest['tracks']) <= 40
    destination.mkdir(parents=True)
    reader = RangeReader(manifest['archiveURL'], manifest['archiveBytes'])
    receipt = {'manifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(), 'files': []}
    with zipfile.ZipFile(reader) as archive:
        for row in manifest['tracks']:
            for kind in ('audio', 'annotation'):
                expected = row[kind]
                info = archive.getinfo(expected['name'])
                assert (info.file_size, info.compress_size, info.header_offset, info.CRC) == (expected['bytes'], expected['compressed'], expected['offset'], expected['crc'])
                assert 0 < info.file_size <= 8_000_000
                data = archive.read(info)  # ZipFile validates the CRC of every extracted member.
                name = Path(info.filename).name
                target = destination/name
                if target.exists(): raise ValueError('Duplicate output name')
                target.write_bytes(data)
                receipt['files'].append({'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            print(row['singer'], row['condition'], flush=True)
    receipt['downloadedBytes'] = reader.transferred
    receipt['scope'] = 'Selected member CRCs and hashes; entire multi-gigabyte archive MD5 not verified'
    (destination/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3): raise SystemExit('Usage: prepare_singing_holdout.py NEW_OUTPUT_DIRECTORY [FROZEN_MANIFEST]')
    prepare(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else MANIFEST)
