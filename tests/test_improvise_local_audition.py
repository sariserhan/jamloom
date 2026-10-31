import hashlib
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import improvise_local_audition as audition


class LocalAudition(unittest.TestCase):
    def test_source_identity_and_location_are_required(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder).resolve();manifest=root/'renders/neural-qualification-20261030/manifest.json';manifest.parent.mkdir(parents=True)
            audio=root/'renders/input.wav';audio.write_bytes(b'licensed test input')
            row=dict(id='source',path='renders/input.wav',sha256=hashlib.sha256(audio.read_bytes()).hexdigest())
            data=dict(fixtures=[dict(label='source-funk',source_id='source')],sources=[row]);manifest.write_text(json.dumps(data))
            with patch.object(audition,'ROOT',root):
                self.assertEqual(audition.fixture_source('source-funk')[2],audio)
                with self.assertRaisesRegex(ValueError,'Unknown'):audition.fixture_source('other')
                audio.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError,'changed'):audition.fixture_source('source-funk')
                row.update(path='../outside.wav');manifest.write_text(json.dumps(data))
                with self.assertRaisesRegex(ValueError,'changed'):audition.fixture_source('source-funk')

    def test_low_memory_blocks_start_and_records_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder).resolve();(root/'renders').mkdir();output=root/'renders/improvise-local-audition-test'
            with patch.object(audition,'ROOT',root),patch.object(audition.psutil,'virtual_memory',return_value=SimpleNamespace(available=3*1024**3)),patch.object(audition.shutil,'disk_usage',return_value=SimpleNamespace(free=30*1024**3)),patch.object(audition.subprocess,'Popen') as launch:
                with self.assertRaisesRegex(RuntimeError,'memory floor'):audition.run(output)
                launch.assert_not_called()
            report=json.loads((output/'execution.json').read_text())
            self.assertEqual(report['status'],'FAIL');self.assertFalse(report['paid_compute']);self.assertTrue(report['child_stopped'])

if __name__=='__main__':unittest.main()
