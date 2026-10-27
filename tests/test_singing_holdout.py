from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import io
import json
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_singing_holdout import RangeReader, prepare


class RangeTests(unittest.TestCase):
    def test_new_manifest_cannot_expand_download_scope_before_network_access(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for count in (0, 41):
                manifest = root / 'manifest.json'
                manifest.write_text(json.dumps({'archiveURL': 'https://zenodo.org/records/10200775/files/VocalSet.zip',
                                                'archiveBytes': 2488206010, 'tracks': [{}] * count}))
                with patch('urllib.request.urlopen') as fetch:
                    with self.assertRaises(AssertionError): prepare(root / 'output', manifest)
                    fetch.assert_not_called()
                self.assertFalse((root / 'output').exists())

    def test_exact_ranges_and_seek_bounds(self):
        response = io.BytesIO(b'abcd')
        response.status = 206
        response.headers = {'Content-Range': 'bytes 6-9/10'}
        reader = RangeReader('https://example.test/data', 10)
        self.assertEqual(reader.seek(-4, 2), 6)
        with patch('urllib.request.urlopen', return_value=response):
            self.assertEqual(reader.read(20), b'abcd')
        self.assertEqual(reader.tell(), 10)
        self.assertEqual(reader.read(), b'')
        with self.assertRaises(ValueError): reader.seek(-1)
        with self.assertRaises(ValueError): reader.seek(11)

    def test_full_archive_and_oversized_reads_are_rejected(self):
        response = io.BytesIO(b'full archive')
        response.status = 200
        response.headers = {}
        reader = RangeReader('https://example.test/data', 9_000_000)
        with patch('urllib.request.urlopen', return_value=response):
            with self.assertRaisesRegex(ValueError, 'full download refused'): reader.read(4)
        self.assertEqual(reader.transferred, 0)
        with self.assertRaisesRegex(ValueError, 'limit'): reader.read()


if __name__ == '__main__': unittest.main()
