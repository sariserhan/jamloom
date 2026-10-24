import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from evaluate_groove_timing import observations, fit, errors


class GrooveTimingTests(unittest.TestCase):
    def test_clock_residual_and_training_only_fallback(self):
        import mido
        midi = mido.MidiFile(ticks_per_beat=1000)
        midi.tracks.append(mido.MidiTrack([
            mido.MetaMessage('set_tempo', tempo=500000),
            mido.Message('note_on', note=42, velocity=60, time=270)]))
        rows = observations(midi, 120)
        self.assertEqual(rows[0][:2], (42, 1))
        self.assertAlmostEqual(rows[0][2], 10)
        baseline = fit(rows, False)
        self.assertEqual(fit(rows, True), {})
        self.assertEqual(errors(rows, baseline)['velocity_mae'], 0)
        self.assertEqual(len(fit(rows * 20, True)), 1)
        with self.assertRaises(ValueError):
            observations(midi, 100)


if __name__ == '__main__':
    unittest.main()
