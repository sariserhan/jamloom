import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import generation_timing as timing
import singing_response as singing


class GenerationTimingTests(unittest.TestCase):
    def test_concurrent_processes_record_crossing_phase_boundaries(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'timing.jsonl';target.touch();children=[]
            prefix='from generation_timing import phase; from pathlib import Path; import sys,time; p=Path(sys.argv[1])\n'
            separator=prefix+"with phase('identity-separate'):\n while not (p/'loaded').exists(): time.sleep(.01)\n(p/'separated').touch()"
            loader=prefix+"with phase('identity-load'):\n (p/'loaded').touch()\n while not (p/'separated').exists(): time.sleep(.01)"
            try:
                with patch.dict(os.environ,JAMLOOM_TIMING_FILE=str(target),JAMLOOM_TIMING_START_NS=str(time.monotonic_ns())):
                    for code in (separator,loader):children.append(subprocess.Popen([sys.executable,'-c',code,folder],cwd=ROOT/'scripts'))
                    for child in children:self.assertEqual(child.wait(timeout=5),0)
                self.assertEqual(timing.snapshot(target)['active'],[])
                self.assertEqual(len(timing.snapshot(target)['events']),4)
            finally:
                for child in children:
                    if child.poll() is None:child.kill()
                for child in children:child.wait()

    def test_overlapping_phases_are_valid_but_duplicate_starts_are_not(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'timing.jsonl'
            events=[('identity','start'),('identity-separate','start'),('identity-load','start'),
                    ('identity-separate','end'),('identity-load','end'),('identity','end')]
            def write(items):
                target.write_text(''.join(json.dumps({'phase':name,'event':event,'ms':i})+'\n'
                                         for i,(name,event) in enumerate(items)))
            write(events)
            self.assertEqual(timing.snapshot(target)['active'],[])
            write(events[:3])
            self.assertEqual(timing.snapshot(target)['active'],['identity','identity-separate','identity-load'])
            write(events[:3]+[('identity-load','start')])
            self.assertIsNone(timing.snapshot(target))

    def test_identity_subprocess_phases_keep_a_valid_nested_trace(self):
        with tempfile.TemporaryDirectory() as folder:
            target=Path(folder)/'timing.jsonl';target.touch()
            with patch.dict(os.environ,JAMLOOM_TIMING_FILE=str(target),
                            JAMLOOM_TIMING_START_NS=str(time.monotonic_ns())):
                with timing.phase('identity'):
                    for name in ('identity-separate','identity-verify','identity-load','identity-generate','identity-stems'):
                        code="from generation_timing import phase\nwith phase(%r): pass" % name
                        subprocess.run([sys.executable,'-c',code],cwd=ROOT/'scripts',check=True,capture_output=True)
            trace=timing.snapshot(target)
            self.assertEqual(trace['active'],[])
            self.assertEqual(len(trace['events']),12)

    def test_trace_contains_only_fixed_names_and_elapsed_times(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'timing.jsonl'
            target.touch()
            with patch.dict(os.environ, JAMLOOM_TIMING_FILE=str(target),
                            JAMLOOM_TIMING_START_NS=str(time.monotonic_ns())):
                with timing.phase('improvise'):
                    with timing.phase('lyrics'):
                        timing.mark('lyric-load', 'start')
                        active = timing.snapshot(target)
                        self.assertEqual(active['active'], ['improvise', 'lyrics', 'lyric-load'])
                        timing.mark('lyric-load', 'end')
                self.assertEqual(timing.snapshot(target)['active'], [])
                with self.assertRaises(ValueError):
                    timing.mark('private transcript https://secret.invalid', 'start')
            self.assertNotIn('private', target.read_text())
            self.assertEqual(len(timing.snapshot(target)['events']), 6)

    def test_invalid_or_private_trace_content_is_never_emitted(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'timing.jsonl'
            valid = {'phase': 'sing-load', 'event': 'start', 'ms': 10}
            for bad in [{**valid, 'phrase': 'private'}, {**valid, 'phase': 'private'},
                        {**valid, 'phase': []}, {**valid, 'ms': True},
                        {**valid, 'ms': -1}, {**valid, 'ms': timing.MAX_MS+1},
                        {**valid, 'event': 'end'}, {**valid, 'ms': 'secret'}]:
                with self.subTest(bad=bad):
                    target.write_text(json.dumps(bad)+'\n')
                    self.assertIsNone(timing.snapshot(target))
            for data in ['{unfinished', 'x'*(timing.MAX_BYTES+1),
                         (json.dumps(valid)+'\n')*(timing.MAX_EVENTS+1)]:
                target.write_text(data)
                self.assertIsNone(timing.snapshot(target))

    def test_unavailable_diagnostics_do_not_fail_generation(self):
        with patch.dict(os.environ, JAMLOOM_TIMING_FILE='/nonexistent/timing.jsonl',
                        JAMLOOM_TIMING_START_NS='invalid'):
            with timing.phase('source'):
                result = 42
        self.assertEqual(result, 42)

    def test_real_timeout_preserves_active_phase_without_private_stdout(self):
        spec = importlib.util.spec_from_file_location('timing_worker', ROOT/'services/runpod/handler.py')
        worker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(worker)
        real_popen = subprocess.Popen
        code = "import time; from generation_timing import phase; print('PRIVATE TRANSCRIPT',flush=True)\nwith phase('sing-load'): time.sleep(30)"
        def launch(command, **kwargs):
            kwargs['env']['PYTHONPATH'] = str(ROOT/'scripts')
            return real_popen([sys.executable, '-c', code], **kwargs)
        with tempfile.TemporaryDirectory() as folder, patch.object(worker.subprocess, 'Popen', side_effect=launch):
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout), self.assertRaisesRegex(worker.GenerationFailure, 'worker-timeout'):
                worker.execute(Path(folder), 1)
            self.assertNotIn('PRIVATE', stdout.getvalue())
            receipt = json.loads(stdout.getvalue().split('JAMLOOM_PHASE_TIMINGS ', 1)[1])
            self.assertEqual(receipt['active'], ['sing-load'])
            self.assertEqual(receipt['outcome'], 'timeout')
            self.assertGreaterEqual(receipt['elapsed_ms'], 1000)
            self.assertIn('PRIVATE TRANSCRIPT', (Path(folder)/'private.log').read_text())

    def test_draft_skips_unused_singer_weights_but_singing_checks_every_byte(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); runtime = root/'runtime'
            (runtime/'acestep').mkdir(parents=True)
            code = runtime/'acestep/inference.py'; code.write_bytes(b'# pinned fixture\n')
            weight = runtime/'weight'; weight.write_bytes(b'pinned-weight')
            tree = hashlib.sha256(b'acestep/inference.py\0'+bytes.fromhex(singing.digest(code))).hexdigest()
            manifest = {'code_files': 1, 'code_tree_sha256': tree,
                        'weights_sha256': {'weight': singing.digest(weight)}}
            manifests = root/'assets/manifests'; manifests.mkdir(parents=True)
            (manifests/'singing-model.json').write_text(json.dumps(manifest))
            with patch.object(singing, 'ROOT', root), patch.object(singing, 'digest', wraps=singing.digest) as digest:
                singing.runtime(runtime, singer_weights=False)
                self.assertNotIn(weight.resolve(), [c.args[0] for c in digest.call_args_list])
                singing.runtime(runtime)
                self.assertIn(weight.resolve(), [c.args[0] for c in digest.call_args_list])
                weight.write_bytes(b'changed-weight')
                singing.runtime(runtime, singer_weights=False)
                with self.assertRaisesRegex(ValueError, 'checkpoint checksum'):
                    singing.runtime(runtime)
                code.write_bytes(b'# altered code\n')
                with self.assertRaisesRegex(ValueError, 'Runtime code'):
                    singing.runtime(runtime, singer_weights=False)


if __name__ == '__main__':
    unittest.main()
