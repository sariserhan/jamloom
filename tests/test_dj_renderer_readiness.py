"""No provider calls: startup exits, SSH faults, deadlines and retained diagnostics."""
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_renderer_readiness import wait_ready, STATUS_COMMAND

TOKEN = 'a'*64


class ReadinessTests(unittest.TestCase):
    def test_ready_and_setup_failure_retain_private_evidence(self):
        for code, expected in [('', 'ready'), ('1', 'renderer_exited'), ('0', 'renderer_exited')]:
            with self.subTest(code=code), tempfile.TemporaryDirectory() as directory:
                result = subprocess.CompletedProcess([], 0, f'EXIT={code}\nSTAGE=python-dependencies\nALIVE=yes\nLOG\nsetup {TOKEN}', '')
                health = Mock(return_value=io.BytesIO(b'{"ready":true}'))
                args = (['ssh'], TOKEN, 200, directory)
                if code:
                    with self.assertRaisesRegex(RuntimeError, 'exited before'):
                        wait_ready(*args, clock=lambda:100, execute=Mock(return_value=result), open_url=health)
                    health.assert_not_called()
                else:
                    self.assertTrue(wait_ready(*args, clock=lambda:100, execute=Mock(return_value=result), open_url=health)['ready'])
                self.assertEqual(json.loads((Path(directory)/'startup.json').read_text())['status'], expected)
                log=Path(directory)/'boot-private.log'
                self.assertNotIn(TOKEN, log.read_text())
                self.assertEqual(log.stat().st_mode & 0o777, 0o600)

    def test_ssh_exit_is_not_reported_as_renderer_exit_or_retried(self):
        for result, status in [(subprocess.CompletedProcess([],255,'','transport failed'), 'ssh_failed'),
                               (subprocess.TimeoutExpired('ssh', 10), 'ssh_timeout')]:
            with tempfile.TemporaryDirectory() as directory:
                execute=Mock(side_effect=result) if isinstance(result, Exception) else Mock(return_value=result)
                with self.assertRaises(RuntimeError):
                    wait_ready(['ssh'],TOKEN,200,directory,clock=lambda:100,execute=execute)
                self.assertEqual(execute.call_count,1)
                self.assertEqual(json.loads((Path(directory)/'startup.json').read_text())['status'],status)

    def test_deadline_preserves_last_log_without_an_extra_connection(self):
        with tempfile.TemporaryDirectory() as directory:
            now=[100]
            def sleep(seconds):now[0]+=seconds
            execute=Mock(return_value=subprocess.CompletedProcess([],0,'EXIT=\nSTAGE=model-download\nALIVE=yes\nLOG\nlast progress',''))
            with self.assertRaisesRegex(RuntimeError,'deadline'):
                wait_ready(['ssh'],TOKEN,105,directory,clock=lambda:now[0],sleep=sleep,
                           execute=execute,open_url=Mock(side_effect=ConnectionRefusedError()))
            self.assertEqual(now[0],105);self.assertEqual(execute.call_count,1)
            self.assertEqual((Path(directory)/'boot-private.log').read_text(),'last progress')

    def test_remote_snapshot_is_bounded_and_distinguishes_dead_process(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)
            (p/'boot.log').write_text('x'*100000)
            (p/'setup.stage').write_text('model-loading\n')
            result=subprocess.run(['bash','-c',STATUS_COMMAND.replace('/workspace/',directory+'/')],capture_output=True,text=True,check=True)
            self.assertLess(len(result.stdout),65700)
            with self.assertRaisesRegex(RuntimeError,'no longer running'):
                wait_ready(['ssh'],TOKEN,200,p/'evidence',clock=lambda:100,execute=Mock(return_value=result))

    def test_invalid_token_or_deadline_never_connects(self):
        execute=Mock()
        for token,deadline in [('secret',200),(TOKEN,float('nan')),(TOKEN,100),(TOKEN,2601)]:
            with self.assertRaises(ValueError):
                wait_ready(['ssh'],token,deadline,'unused',clock=lambda:100,execute=execute)
        execute.assert_not_called()


if __name__ == '__main__':unittest.main()
