"""Fetch and verify the pinned four-stem Spleeter checkpoint at image build time."""
import hashlib
import json
from pathlib import Path
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'assets/manifests/spleeter-hosted.json'


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
        with urllib.request.urlopen(manifest['archive_url'], timeout=60) as response, archive_path.open('xb') as output:
            while chunk := response.read(1024 * 1024):
                digest.update(chunk)
                output.write(chunk)
        if archive_path.stat().st_size != manifest['archive_bytes'] or digest.hexdigest() != manifest['archive_sha256']:
            raise ValueError('Spleeter archive checksum mismatch')
        with tarfile.open(archive_path, 'r:gz') as archive:
            if {item.name for item in archive.getmembers()} != set(manifest['files']):
                raise ValueError('Unexpected Spleeter archive contents')
            for item in archive.getmembers():
                if not item.isfile():
                    raise ValueError('Invalid Spleeter archive member')
                source = archive.extractfile(item)
                target_path = target / item.name
                data = source.read()
                expected = manifest['files'][item.name]
                if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
                    raise ValueError('Spleeter model file checksum mismatch')
                with target_path.open('xb') as output:
                    output.write(data)


if __name__ == '__main__':
    prepare()
