import sys
from pathlib import Path
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from source_bass_response import RATE, coloured_bass, source_spectrum, compose
from source_led_response import faded


def voice(harmonic=2):
    t = np.arange(round(1.2*RATE))/RATE
    envelope = .1*(.6+.4*np.cos(2*np.pi*3*t))
    pcm = envelope*(np.sin(2*np.pi*196*t)+.6*np.sin(2*np.pi*196*harmonic*t))
    return np.repeat(pcm[:, None], 2, axis=1)


class BassResponse(unittest.TestCase):
    def test_source_spectrum_changes_the_bass_sound_at_same_note(self):
        first = coloured_bass(.4, 43, source_spectrum(voice(2)), 0)
        second = coloured_bass(.4, 43, source_spectrum(voice(7)), 0)
        self.assertGreater(float(np.mean((first-second)**2)), .001)
        self.assertTrue(np.isfinite(first).all())
        self.assertEqual(first.shape, (19200, 2))

    def test_actual_stems_sum_and_clean_calls_retain_source(self):
        source = voice()
        mix, stems, plan = compose(source)
        np.testing.assert_allclose(sum(stems.values()), mix, atol=1e-14)
        self.assertLessEqual(float(np.max(np.abs(mix))), .85000001)
        clean = [e for e in plan['events'] if e['kind'] == 'clean_call']
        self.assertEqual(len(clean), 3)
        for event in clean:
            start = event['start_frame']
            np.testing.assert_allclose(stems['voice'][start:start+len(source)],
                faded(source, .01)*event['gain']*plan['master_gain'], atol=1e-14)
        self.assertEqual(plan['half_time_bpm'], 79)
        self.assertNotIn('piano', stems)
        self.assertEqual([s['name'] for s in plan['sections']],
                         ['call','rise','first_drop','break_and_call','second_drop','ending'])

    def test_long_or_silent_input_is_not_composed(self):
        for pcm in (np.zeros((RATE, 2)), np.tile(voice(), (5, 1))):
            with self.assertRaises(ValueError):
                compose(pcm)

    def test_five_second_input_preserves_complete_calls_without_fragment_overlap(self):
        source = np.tile(voice(), (5, 1))[:5*RATE]
        mix, stems, plan = compose(source)
        self.assertLess(len(mix)/RATE, 40)
        for event in [e for e in plan['events'] if e['kind'] == 'clean_call']:
            start = event['start_frame']
            np.testing.assert_allclose(stems['voice'][start:start+len(source)],
                faded(source, .01)*event['gain']*plan['master_gain'], atol=1e-14)
        self.assertTrue(np.all(mix[-RATE//10:] == 0))


if __name__ == '__main__':
    unittest.main()
