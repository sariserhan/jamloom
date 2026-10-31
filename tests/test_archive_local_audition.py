import hashlib
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from archive_local_audition import archive


class PreserveTrial(unittest.TestCase):
    def test_archive_preserves_every_byte_and_final_audio(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);studio=root/'studio';studio.mkdir();(studio/'stem.npy').write_bytes(b'original samples'*100)
            audio=root/'performance.wav';audio.write_bytes(b'final fixture')
            (root/'execution.json').write_text(json.dumps(dict(status='PASS technical',child_stopped=True)))
            (root/'result.json').write_text(json.dumps(dict(status='PASS technical',sha256=hashlib.sha256(audio.read_bytes()).hexdigest())))
            report=archive(root);self.assertFalse(studio.exists());self.assertEqual(audio.read_bytes(),b'final fixture')
            with tarfile.open(root/report['archive']) as bundle:self.assertEqual(bundle.extractfile('studio/stem.npy').read(),b'original samples'*100)

    def test_running_or_changed_output_never_removed(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);studio=root/'studio';studio.mkdir();(studio/'keep').write_bytes(b'preserve')
            (root/'execution.json').write_text(json.dumps(dict(status='RUNNING',child_stopped=False)))
            (root/'result.json').write_text(json.dumps(dict(status='PASS technical',sha256='wrong')))
            with self.assertRaises(ValueError):archive(root)
            self.assertTrue((studio/'keep').exists());self.assertFalse((root/'studio-preservation.tar.xz').exists())

if __name__=='__main__':unittest.main()
