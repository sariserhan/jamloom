"""Exercise cost-sensitive batch failure paths without importing GPU libraries."""
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import MagicMock, patch


class CloudBatchTests(unittest.TestCase):
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
