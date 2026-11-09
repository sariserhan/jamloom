import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('simulator', ROOT / 'scripts/with_ios_simulator.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
DEVICE = '00000000-0000-0000-0000-000000000001'

class SimulatorCleanupTests(unittest.TestCase):
    def scenario(self, state, result=0, fail_boot=False):
        calls = []
        def execute(command, **kwargs):
            calls.append(command[1])
            if fail_boot and command[1] == 'boot':
                raise subprocess.CalledProcessError(1, command)
        with patch.object(module.subprocess, 'check_output', return_value=json.dumps({'devices': {'runtime': [{'udid': DEVICE, 'state': state}]}}).encode()), patch.object(module.subprocess, 'run', side_effect=execute):
            try:
                status = module.run(DEVICE, [sys.executable, '-c', f'raise SystemExit({result})'], ['simctl'])
            except subprocess.CalledProcessError:
                status = 'boot-failed'
        return status, calls

    def test_failed_test_still_shuts_down_owned_device(self):
        self.assertEqual(self.scenario('Shutdown', 7), (7, ['boot', 'bootstatus', 'shutdown']))

    def test_existing_running_device_is_preserved(self):
        self.assertEqual(self.scenario('Booted', 7), (7, ['bootstatus']))

    def test_failed_boot_does_not_claim_device(self):
        self.assertEqual(self.scenario('Shutdown', fail_boot=True), ('boot-failed', ['boot']))

    def test_signal_cleans_up_owned_simulator(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            fake = path / 'fake.py'
            log = path / 'calls'
            fake.write_text('import json,sys\nfrom pathlib import Path\n'
                            f'log=Path({str(log)!r})\n'
                            "with log.open('a') as out: out.write(sys.argv[1]+'\\n')\n"
                            f"if sys.argv[1]=='list': print(json.dumps({{'devices': {{'r': [{{'udid': {DEVICE!r}, 'state': 'Shutdown'}}]}}}}))\n")
            code = f"import sys,signal,os;sys.path.insert(0,{str(ROOT / 'scripts')!r});from with_ios_simulator import run;raise SystemExit(run({DEVICE!r},[sys.executable,'-c','import os,signal;os.kill(os.getppid(),signal.SIGTERM)'],[sys.executable,{str(fake)!r}]))"
            result = subprocess.run([sys.executable, '-c', code], timeout=20)
            self.assertEqual(result.returncode, 130)
            self.assertEqual(log.read_text().splitlines()[-1], 'shutdown')

if __name__ == '__main__':
    unittest.main()
