"""Fetch and verify the pinned four-stem Spleeter checkpoint at image build time."""
import hashlib
import json
from pathlib import Path
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/spleeter-hosted.json'


def extract_verified(archive_path, target, manifest):
    ignored = manifest.get('ignored_archive_files', {})
    expected_files = {**manifest['files'], **ignored}
    with tarfile.open(archive_path, 'r:gz') as archive:
        members = archive.getmembers()
        if len(members) != len(expected_files) or {item.name for item in members} != set(expected_files):
            raise ValueError('Unexpected Spleeter archive contents')
        for item in members:
            if not item.isfile():
                raise ValueError('Invalid Spleeter archive member')
            expected = expected_files[item.name]
            if item.size != expected['bytes']:
                raise ValueError('Spleeter model file size mismatch')
            with archive.extractfile(item) as source:
                data = source.read(expected['bytes'] + 1)
            if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
                raise ValueError('Spleeter model file checksum mismatch')
            if item.name in ignored:
                continue  # Exact checksum-pinned publisher metadata; never installed.
            if Path(item.name).name != item.name:
                raise ValueError('Invalid Spleeter model path')
            with (target / item.name).open('xb') as output:
                output.write(data)


def prepare():
    manifest = json.loads(MANIFEST.read_text())
    target = ROOT / manifest['model_dir']
    target.mkdir(parents=True, exist_ok=True)
    if all((target / name).is_file() and (target / name).stat().st_size == item['bytes'] and
           hashlib.sha256((target / name).read_bytes()).hexdigest() == item['sha256']
           for name, item in manifest['files'].items()):
        return
    digest = hashlib.sha256()
    with tempfile.TemporaryDirectory(dir=target.parent) as folder:
        archive_path = Path(folder) / '4stems.tar.gz'
        downloaded = 0
        with urllib.request.urlopen(manifest['archive_url'], timeout=60) as response, archive_path.open('xb') as output:
            while chunk := response.read(1024 * 1024):
                downloaded += len(chunk)
                if downloaded > manifest['archive_bytes']:
                    raise ValueError('Spleeter archive exceeds pinned size')
                digest.update(chunk)
                output.write(chunk)
        if archive_path.stat().st_size != manifest['archive_bytes'] or digest.hexdigest() != manifest['archive_sha256']:
            raise ValueError('Spleeter archive checksum mismatch')
        # Verify every member before touching an existing or interrupted installation.
        staged = Path(folder) / 'verified'
        staged.mkdir()
        extract_verified(archive_path, staged, manifest)
        for name in manifest['files']:
            (staged / name).replace(target / name)
        # If replacement is interrupted, the next run verifies the set and repairs it.



if __name__ == '__main__':
    prepare()
