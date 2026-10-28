import sys
from pathlib import Path
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from afro_house_qualification import CASES, audio_metrics, musical_analysis, plan, validate_plan


class AfroHouseQualification(unittest.TestCase):
    def test_plan_has_three_original_targets_and_matched_baseline(self):
        value = plan()
        self.assertEqual(len(value['cases']), 4)
        self.assertEqual(sum(len(row['stems']) for row in value['cases']), 20)
        self.assertEqual([row['id'] for row in value['cases']], [row['id'] for row in CASES])
        self.assertEqual([row['bpm'] for row in CASES], [122, 122, 121, 124])
        self.assertFalse(value['reference_audio_used'])
        self.assertFalse(value['trained_adapter'])
        self.assertEqual(value['previous_jamloom_baseline']['path'], 'renders/dj-quality-20261025/house-0.wav')
        self.assertEqual(len(value['previous_jamloom_baseline']['sha256']), 64)

    def test_plan_rejects_changed_or_reference_conditioned_inputs(self):
        value = plan()
        validate_plan(value)
        value['cases'][1]['caption'] += ' match the supplied recording'
        with self.assertRaisesRegex(ValueError, 'plan changed'):
            validate_plan(value)

    def test_instrumentals_use_role_tags_without_fixed_timestamps(self):
        for case in plan()['cases']:
            if case['instrumental']:
                for section in ('[Intro]', '[Verse]', '[Chorus]', '[Bridge]', '[Instrumental Break]', '[Outro]'):
                    self.assertIn(section, case['lyrics'])
                self.assertNotRegex(case['lyrics'], r'\b\d+:\d+\b')

    def test_audio_metrics_accept_finite_stereo_and_return_technical_only(self):
        channel = (0.1 * np.sin(np.arange(48000) * 2 * np.pi * 440 / 48000)).astype(np.float32)
        pcm = np.column_stack((channel, channel))
        result = audio_metrics(pcm, 48000, 1)
        self.assertEqual(result['status'], 'PASS technical')
        self.assertEqual(result['channels'], 2)
        self.assertEqual(result['clipped_samples'], 0)
        self.assertEqual(result['stereo_correlation'], 1.0)
        self.assertEqual(result['mono_fold_down_rms_loss_db'], 0.0)

    def test_audio_metrics_reports_mono_cancellation_risk(self):
        left = (0.1 * np.sin(np.arange(48000) * 2 * np.pi * 440 / 48000)).astype(np.float32)
        result = audio_metrics(np.column_stack((left, -left)), 48000, 1)
        self.assertEqual(result['stereo_correlation'], -1.0)
        self.assertLess(result['mono_fold_down_rms_loss_db'], -100)

    def test_audio_metrics_reject_malformed_silent_and_clipped_audio(self):
        with self.assertRaisesRegex(ValueError, 'Invalid duration'):
            audio_metrics(np.zeros((100, 1), dtype=np.float32), 48000, 1)
        with self.assertRaisesRegex(ValueError, 'Silent or clipped'):
            audio_metrics(np.zeros((48000, 2), dtype=np.float32), 48000, 1)
        bad = np.full((48000, 2), 1.0, dtype=np.float32)
        with self.assertRaisesRegex(ValueError, 'Silent or clipped'):
            audio_metrics(bad, 48000, 1)

    def test_musical_analysis_estimates_tempo_and_emits_data_driven_timeline(self):
        rate, seconds, bpm = 48000, 32, 122
        pcm = np.zeros((rate*seconds, 2), dtype=np.float32)
        beat = 60/bpm
        for index, start in enumerate(np.arange(0, seconds, beat)):
            at = round(start*rate)
            amplitude = .15 if start < seconds/2 else .35
            pcm[at:at+80] = amplitude
        result = musical_analysis(pcm, rate, bpm)
        self.assertLess(abs(result['bpm_estimate']-bpm), 4)
        self.assertTrue(result['section_change_candidates'])
        self.assertTrue(all(0 < row['seconds'] < seconds for row in result['section_change_candidates']))


if __name__ == '__main__':
    unittest.main()
