import copy
import sys
from pathlib import Path
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from source_phrase_response import BAR, RATE, STYLES, compose, features


def signal(frequency=196, positions=(.2, .6, 1.05)):
    t = np.arange(round(1.4*RATE))/RATE
    envelope = sum(np.exp(-((t-at)/.06)**2) for at in positions)
    return np.repeat((.2*np.sin(2*np.pi*frequency*t)*envelope)[:, None], 2, axis=1)


class PhraseResponse(unittest.TestCase):
    def test_music_changes_when_input_pitch_or_rhythm_changes(self):
        original = features(signal())
        pitched = features(signal(247))
        rhythm = features(signal(196, (.3, .75, 1.15)))
        self.assertNotEqual(original['tonic'], pitched['tonic'])
        for alternative in (pitched, rhythm):
            _, a = compose({}, original, 'reggae')
            _, b = compose({}, alternative, 'reggae')
            self.assertNotEqual(a, b)

    def test_clean_hooks_and_fragment_bounds_are_preserved(self):
        data = features(signal())
        before = copy.deepcopy(data)
        for style in STYLES:
            plan, _ = compose({}, data, style)
            self.assertEqual(plan['voice_clips'][0]['end_frame'], data['source_frames'])
            self.assertEqual(len([e for e in plan['voice_events'] if e['clean']]), 2)
            for e in plan['voice_events']:
                clip = plan['voice_clips'][e['clip_id']]
                self.assertTrue(0 <= clip['start_frame'] < clip['end_frame'] <= data['source_frames'])
                if e['clean']:
                    self.assertEqual(e['rate'], 1)
                    self.assertNotIn('pitch_semitones', e)
                    self.assertFalse(e['reverse'])
                self.assertLess(abs(e.get('pitch_semitones', 0)), 5)
        self.assertEqual(data, before)

    def test_styles_have_different_grooves_and_covered_structure(self):
        data = features(signal())
        signatures = set()
        for style in STYLES:
            plan, motif = compose({}, data, style)
            end = 0
            for section in plan['sections']:
                self.assertEqual(section['start_bar'], end)
                end += section['bars']
            self.assertEqual(end, plan['target_bars'])
            self.assertTrue(motif)
            drums = next(t for t in plan['tracks'] if t['instrument'] == 'drums')
            signatures.add(tuple((e['start_tick'], e['note']) for e in drums['events']))
            for track in plan['tracks']:
                for e in track['events']:
                    self.assertLessEqual(e['start_tick']+e['duration_ticks'], end*BAR)
        self.assertEqual(len(signatures), 3)

    def test_silence_and_nonfinite_audio_are_rejected(self):
        antiphase = signal()
        antiphase[:, 1] *= -1
        for pcm in (np.zeros((RATE, 2)), np.full((RATE, 2), np.nan), np.zeros(RATE), antiphase):
            with self.assertRaises(ValueError):
                features(pcm)


if __name__ == '__main__':
    unittest.main()
