import sys
from pathlib import Path
import unittest
from unittest.mock import patch
import json
import subprocess
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from render_source_first import GIB, resource_problem
import render_source_first


class ResourceLimits(unittest.TestCase):
    def test_start_requires_headroom(self):
        self.assertIsNone(resource_problem(8 * GIB, 15 * GIB, starting=True))
        self.assertIn('memory', resource_problem(8 * GIB - 1, 15 * GIB, starting=True))

    def test_low_disk_stops_before_exhaustion(self):
        self.assertIn('disk', resource_problem(8 * GIB, 15 * GIB - 1))

    def test_memory_swap_and_timeout_are_independent(self):
        for arguments, word in [({'available': GIB - 1}, 'memory'),
                                ({'rss': 8 * GIB + 1}, 'memory'),
                                ({'swap_growth': 2 * GIB + 1}, 'Swap'),
                                ({'elapsed': 601}, 'deadline')]:
            with self.subTest(arguments=arguments):
                self.assertIn(word, resource_problem(**{'available': 4 * GIB,
                                                       'disk': 20 * GIB, **arguments}))

    def test_running_child_is_stopped_and_failure_is_durable(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            work = root / 'renders/study'
            work.mkdir(parents=True)
            for name in ['plan.json', 'conditioning.json']:
                (work / name).write_text('{}')
            child = None
            real_popen = subprocess.Popen
            def launch(_command, **kwargs):
                nonlocal child
                child = real_popen([sys.executable, '-c', 'import time; time.sleep(60)'], **kwargs)
                return child
            with patch.object(render_source_first, 'ROOT', root), \
                 patch.object(render_source_first, 'load_plan', return_value={'cases': [{'id': 'study', 'duration': 30}]}), \
                 patch.object(render_source_first, 'source_conditioning', return_value={'instrumental': True}), \
                 patch.object(render_source_first.subprocess, 'Popen', side_effect=launch), \
                 patch.object(render_source_first.subprocess, 'check_output', return_value=''), \
                 patch.object(render_source_first, 'resource_problem', side_effect=[None, 'Free disk reserve reached']):
                with self.assertRaisesRegex(RuntimeError, 'disk reserve'):
                    render_source_first.run(work, work / 'band')
            self.assertIsNotNone(child.poll())
            receipt = json.loads((work / 'band-execution.json').read_text())
            self.assertEqual(receipt['status'], 'FAIL')
            self.assertEqual(receipt['error'], 'Free disk reserve reached')
            self.assertFalse((work / 'band/complete.json').exists())

    def test_existing_attempt_is_preserved(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            work = root / 'renders/study'
            output = work / 'band'
            output.mkdir(parents=True)
            marker = output / '.partial'
            marker.write_text('previous attempt')
            with patch.object(render_source_first, 'ROOT', root):
                with self.assertRaises(FileExistsError):
                    render_source_first.run(work, output)
            self.assertEqual(marker.read_text(), 'previous attempt')


if __name__ == '__main__':
    unittest.main()
