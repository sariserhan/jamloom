import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from singing_response import source_conditioning
from source_first_improvise import prepare


class SourceFirstPreparation(unittest.TestCase):
    def test_short_input_leaves_rest_without_rejecting_or_stretching_the_phrase(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'source.wav'
            t = np.arange(round(1.18 * RATE)) / RATE
            signal = .1 * np.sin(2 * np.pi * 196 * t) * (.6 + .4 * np.cos(2 * np.pi * 3 * t))
            write_pcm(source, np.repeat(signal[:, None], 2, axis=1))
            before = digest(source)
            output = root / 'prepared'
            prepare(source, output, consent=True)
            direction = json.loads((output / 'direction.json').read_text())
            self.assertEqual(direction['bpm'], 84)
            self.assertEqual(direction['source_frames'], len(t))
            self.assertGreater(direction['tail_rest_seconds'], 0)
            self.assertEqual(digest(source), before)
            self.assertEqual(direction['source_sha256'], before)
            self.assertFalse(direction['performer_reference_used'])
            self.assertTrue(source_conditioning(output / 'conditioning.json')['instrumental'])
            self.assertEqual(read_pcm(output / 'guide.wav', (30, 30)).shape, (30 * RATE, 2))
            with self.assertRaises(FileExistsError):
                prepare(source, output, consent=True)

    def test_missing_consent_and_silence_produce_no_prepared_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'source.wav'
            write_pcm(source, np.zeros((RATE, 2)))
            for consent in (False, True):
                with self.assertRaises(ValueError):
                    prepare(source, root / 'prepared', consent=consent)
                self.assertFalse((root / 'prepared').exists())


if __name__ == '__main__':
    unittest.main()
