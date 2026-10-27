from pathlib import Path
import sys
import hashlib
import json
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import prepare_ios_studio
from studio_build_lock import studio_build_lock


class StudioPackagingTests(unittest.TestCase):
    def test_competing_build_fails_without_releasing_first_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'build.lock'
            with studio_build_lock(path):
                for _ in range(2):
                    with self.assertRaisesRegex(RuntimeError, 'Another studio build'):
                        with studio_build_lock(path):
                            self.fail('Concurrent writer admitted')
            with studio_build_lock(path):
                pass
            with self.assertRaisesRegex(ValueError, 'failed build'):
                with studio_build_lock(path):
                    raise ValueError('failed build')
            with studio_build_lock(path):
                pass

    def test_native_packaging_keeps_unchanged_resource_paths_and_removes_obsolete_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'dist/web'; source.mkdir(parents=True)
            native = root / 'apps/ios/Studio'; native.mkdir(parents=True)
            (source / 'dj.html').write_text('<script type="module" src="./dj.js"></script>')
            (source / 'singing.html').write_text('<a href="/singing-academy">Songs</a>')
            (source / 'engine.wasm').write_bytes(b'unchanged engine fixture')
            (native / 'mobile-studio.css').write_text('body{}')
            recordings = root / 'assets/singing-recordings'; recordings.mkdir(parents=True)
            files = {}
            for kind in ('song', 'karaoke', 'lyrics'):
                name = 'long-way-home-' + kind + ('.json' if kind == 'lyrics' else '.mp3')
                data = b'packaging fixture'; (recordings / name).write_bytes(data)
                files[kind] = dict(file=name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            (recordings / 'manifest.json').write_text(json.dumps({'songs': [dict(id='long-way-home', files=files)]}))
            with patch.object(prepare_ios_studio, 'ROOT', root), patch.object(prepare_ios_studio, 'verify'), patch.object(prepare_ios_studio.subprocess, 'check_output', return_value=b'["first-light"]'):
                prepare_ios_studio.prepare()
                target = root / 'build-ios-studio/Studio'
                before = {str(p.relative_to(target)): (p.stat().st_ino, p.read_bytes()) for p in target.rglob('*') if p.is_file()}
                inode = target.stat().st_ino
                (target / 'obsolete.js').write_text('old')
                prepare_ios_studio.prepare()
                self.assertEqual(inode, target.stat().st_ino)
                self.assertEqual(before, {str(p.relative_to(target)): (p.stat().st_ino, p.read_bytes()) for p in target.rglob('*') if p.is_file()})
                (native / 'mobile-studio.css').write_text('body{color:white}')
                prepare_ios_studio.prepare()
                self.assertEqual((target / 'mobile-studio.css').read_text(), 'body{color:white}')
                self.assertEqual((target / 'engine.wasm').stat().st_ino, before['engine.wasm'][0])
                (recordings / files['song']['file']).write_bytes(b'changed')
                with self.assertRaisesRegex(AssertionError, 'Singing recording changed'):
                    prepare_ios_studio.prepare()
                self.assertEqual((target / 'singing-audio' / files['song']['file']).read_bytes(), b'packaging fixture')


if __name__ == '__main__':
    unittest.main()
