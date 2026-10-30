"""Regression for the paid diagnostic's missing research separator import."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from vocal_identity import finish_identity, ROOT


class HostedIdentitySeparator(unittest.TestCase):
    def test_hosted_identity_runs_packaged_separator_without_importing_research_module(self):
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory).resolve()
            (output/'singer.wav').write_bytes(b'original generated singer fixture')
            receipt={'case':{'voice':'female','vocal_identity':'af_bella'},'source_conditioning':None}
            (output/'complete.json').write_text(json.dumps(receipt))
            def separator(command, **kwargs):
                self.assertEqual(command, ['/isolated/python', str(ROOT/'services/runpod/separate_spleeter.py'),
                    '--input', str(output/'base.wav'), '--output', str(output/'identity-stems')])
                self.assertEqual(kwargs, {'check':True,'timeout':600})
                self.assertEqual((output/'base.wav').read_bytes(), b'original generated singer fixture')
                raise subprocess.CalledProcessError(3, command)
            with patch.dict(os.environ, {'JAMLOOM_SEPARATOR_PYTHON':'/isolated/python'}), \
                 patch.dict(sys.modules, {'separate_singer':None}), \
                 patch('vocal_identity.subprocess.run', side_effect=separator) as call, \
                 patch('vocal_identity.subprocess.Popen') as conversion:
                with self.assertRaises(subprocess.CalledProcessError):
                    finish_identity(output)
            call.assert_called_once();conversion.assert_not_called()
            self.assertTrue((output/'.partial').exists())
            self.assertFalse((output/'complete.json').exists())
            self.assertEqual(json.loads((output/'base.complete.json').read_text()), receipt)

    def test_hosted_separator_completes_before_conversion_is_started(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); output=root/'song';output.mkdir()
            (output/'singer.wav').write_bytes(b'generated')
            (output/'complete.json').write_text(json.dumps({'case':{'voice':'male','vocal_identity':'am_michael'}}))
            runtime=root/'.venv-vocal-identity/bin/python';runtime.parent.mkdir(parents=True);runtime.touch()
            def separator(command, **kwargs):
                self.assertEqual(Path(command[1]), root/'services/runpod/separate_spleeter.py')
                (output/'identity-stems').mkdir()
                (output/'identity-stems/complete.json').write_text('{"technical":"PASS"}')
            def convert(command, **kwargs):
                self.assertTrue((output/'identity-stems/complete.json').exists())
                self.assertEqual(command[0],str(runtime))
                self.assertIn('am_michael',command)
                from unittest.mock import Mock
                child=Mock();child.wait.return_value=0;child.poll.return_value=0;return child
            with patch.dict(os.environ, {'JAMLOOM_SEPARATOR_PYTHON':'/isolated/python'}), \
                 patch.dict(sys.modules, {'separate_singer':None}), \
                 patch('vocal_identity.ROOT',root), \
                 patch('vocal_identity.subprocess.run',side_effect=separator) as separate, \
                 patch('vocal_identity.subprocess.Popen',side_effect=convert) as conversion:
                finish_identity(output)
            separate.assert_called_once();conversion.assert_called_once()


if __name__=='__main__': unittest.main()
