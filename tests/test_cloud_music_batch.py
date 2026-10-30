"""Exercise cost-sensitive batch failure paths without importing GPU libraries."""
import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import types
import unittest
import os
from unittest.mock import MagicMock, patch


class CloudBatchTests(unittest.TestCase):
    def run_setup_prerequisites(self, missing='', fail_apt=False):
        """Execute the real shell branch with isolated command stubs; never rent or install."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            commands = root / 'bin'; commands.mkdir()
            stub = '''#!/bin/bash
name=${0##*/}
printf '%s %s\\n' "$name" "$*" >> "$PROBE_LOG"
case "$name" in
 python)
  if [[ $1 == -m ]]; then exit 73; fi
  [[ $MISSING != python || -e $INSTALLED ]] ;;
 ffmpeg) [[ $MISSING != ffmpeg || -e $INSTALLED ]] ;;
 apt-get)
  [[ $FAIL_APT != 1 ]] || exit 42
  [[ " $* " != *' install '* ]] || touch "$INSTALLED" ;;
 timeout) shift; exec "$@" ;;
esac
'''
            for name in ('python', 'ffmpeg', 'apt-get', 'timeout'):
                file = commands / name; file.write_text(stub); file.chmod(0o755)
            source = Path(__file__).resolve().parents[1] / 'scripts/cloud_music_setup.sh'
            script = root / 'setup.sh'
            script.write_text(source.read_text().replace('/workspace', str(root)))
            log = root / 'commands.log'
            env = {**os.environ, 'PATH': str(commands) + os.pathsep + os.environ['PATH'],
                   'PROBE_LOG': str(log), 'INSTALLED': str(root/'installed'),
                   'MISSING': missing, 'FAIL_APT': str(int(fail_apt))}
            result = subprocess.run(['bash', str(script), '--afro-house'], env=env, capture_output=True, timeout=10)
            return result.returncode, log.read_text(), (root/'setup.stage').read_text().strip()

    def test_prepared_image_skips_package_manager(self):
        code, log, stage = self.run_setup_prerequisites()
        self.assertEqual(code, 73)  # Intercepted before any Python/model installation.
        self.assertNotIn('apt-get ', log)
        self.assertEqual(stage, 'python-bootstrap')

    def test_missing_prerequisite_installs_only_missing_package(self):
        for missing, package in [('python', 'python3-venv'), ('ffmpeg', 'ffmpeg')]:
            with self.subTest(missing=missing):
                code, log, stage = self.run_setup_prerequisites(missing)
                self.assertEqual(code, 73)
                install = next(line for line in log.splitlines() if line.startswith('apt-get ') and ' install ' in line)
                self.assertTrue(install.endswith('--no-install-recommends ' + package))
                self.assertIn('Acquire::Retries=0', install)
                self.assertIn('DPkg::Lock::Timeout=30', install)
                self.assertEqual(stage, 'python-bootstrap')

    def test_failed_package_index_stops_before_model_setup(self):
        code, log, stage = self.run_setup_prerequisites('ffmpeg', True)
        self.assertEqual(code, 42)
        self.assertNotIn('python -m', log)
        self.assertEqual(stage, 'system-package-index')

    def test_setup_rejects_unknown_mode_before_starting(self):
        script = Path(__file__).resolve().parents[1] / 'scripts/cloud_music_setup.sh'
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(['bash', str(script), '--invalid'], cwd=directory, capture_output=True)
        self.assertEqual(result.returncode, 2)

    def load_batch(self):
        names = ('numpy', 'soundfile', 'torch', 'acestep', 'acestep.handler',
                 'acestep.llm_inference', 'acestep.inference')
        modules = {name: MagicMock() for name in names}
        modules['torch'].__version__ = 'test'
        modules['torch'].version.cuda = 'test'
        modules['torch'].cuda.get_device_name.return_value = 'mock GPU'
        modules['torch'].cuda.max_memory_allocated.return_value = 0
        modules['torch'].cuda.max_memory_reserved.return_value = 0
        modules['acestep.handler'].AceStepHandler.return_value.initialize_service.return_value = ('ready', True)
        modules['acestep.inference'].GenerationParams.return_value.to_dict.return_value = {}
        modules['acestep.inference'].generate_music.return_value = types.SimpleNamespace(success=False, error='provider failure')
        spec = importlib.util.spec_from_file_location('cloud_batch_under_test',
            Path(__file__).resolve().parents[1] / 'scripts/cloud_music_batch.py')
        batch = importlib.util.module_from_spec(spec)
        with patch.dict('sys.modules', modules):
            spec.loader.exec_module(batch)
        return batch

    def test_stop_after_first_failure_and_preserve_results(self):
        batch = self.load_batch()
        with self.assertRaisesRegex(ValueError, 'Unsupported bounded'):
            batch.main([], duration=3600)
        cases = [('first', 'Original house', 124, 1, False),
                 ('second', 'Original techno', 136, 2, False)]
        with tempfile.TemporaryDirectory() as directory:
            batch.OUT = Path(directory)
            with self.assertRaisesRegex(AssertionError, 'batch cases failed'):
                batch.main(cases, stop_on_failure=True)
            batch.generate_music.assert_called_once()
            receipt = (batch.OUT / 'batch.json').read_bytes()
            records = json.loads(receipt)['cases']
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]['status'], 'FAIL')
            with self.assertRaisesRegex(ValueError, 'Preserve previous'):
                batch.main(cases, stop_on_failure=True)
            self.assertEqual((batch.OUT / 'batch.json').read_bytes(), receipt)
            batch.generate_music.assert_called_once()


if __name__ == '__main__':
    unittest.main()
