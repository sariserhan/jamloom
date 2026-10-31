"""Known signals check the independent estimator; they are not human evidence."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_produced_pitch import intervals, pitch


class PitchAuditTests(unittest.TestCase):
    def test_known_notes_across_singing_range(self):
        t = np.arange(4096)/48000
        for frequency in (82.41, 110, 220, 440, 880, 987.77):
            with self.subTest(frequency=frequency):
                note = pitch(.15*np.sin(2*np.pi*frequency*t))
                self.assertIsNotNone(note)
                self.assertLess(abs(note-(69+12*np.log2(frequency/440)))*100, 2)

    def test_harmonics_do_not_force_octave_error(self):
        t = np.arange(4096)/48000
        signal = .08*np.sin(2*np.pi*220*t)+.15*np.sin(2*np.pi*440*t)+.05*np.sin(2*np.pi*660*t)
        self.assertAlmostEqual(pitch(signal), 57, delta=.02)

    def test_silence_dc_low_level_and_noise_are_not_known_pitch(self):
        t = np.arange(4096)/48000
        for signal in (np.zeros(4096), np.full(4096, .2), .2+.001*np.sin(2*np.pi*220*t),
                       np.random.default_rng(17).normal(0, .02, 4096)):
            self.assertIsNone(pitch(signal))

    def test_invalid_pcm_is_rejected(self):
        for signal in (np.zeros(32), np.zeros((512, 2)), np.full(512, float('nan')), np.full(512, 2.)):
            with self.assertRaises(ValueError):
                pitch(signal)

    def test_candidate_notes_never_bridge_uncertainty_or_time_gaps(self):
        trace = [(round(.05+i*.02, 4), 57) for i in range(6)]
        trace += [(.17, None)] + [(round(.19+i*.02, 4), 57) for i in range(6)]
        trace += [(.5, 57), (.52, 57)]
        self.assertEqual(intervals(trace), [{'at': .04, 'end': .16, 'note': 57}, {'at': .18, 'end': .3, 'note': 57}])

    def test_short_or_changed_notes_do_not_become_long_note(self):
        self.assertEqual(intervals([(.05,57),(.07,58),(.09,57),(.11,58)]), [])


if __name__ == '__main__':
    unittest.main()
