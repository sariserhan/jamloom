import sys
from pathlib import Path
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from question_reference_structure import similarity


class SpectralMatching(unittest.TestCase):
    def test_recovers_time_and_frequency_shift_under_background_noise(self):
        rng = np.random.default_rng(42)
        template = rng.normal(size=(20, 60)).astype(np.float32)
        search = rng.normal(size=(200, 60)).astype(np.float32)*.03
        search[80:100, 2:] += template[:, :-2]
        scores = similarity(search, template)
        row, column = np.unravel_index(np.argmax(scores), scores.shape)
        self.assertEqual(row, 80)
        self.assertEqual(column-5, 2)
        self.assertGreater(scores[row, column], .95)

    def test_shuffling_order_lowers_a_known_temporal_match(self):
        rng = np.random.default_rng(5)
        template = rng.normal(size=(30, 60)).astype(np.float32)
        search = np.vstack((np.zeros((40, 60)), template, np.zeros((40, 60)))).astype(np.float32)
        self.assertGreater(similarity(search, template).max(), .99)
        self.assertLess(similarity(search, template[rng.permutation(30)]).max(), .3)

    def test_invalid_shapes_and_nonfinite_values_fail(self):
        for search, template in ((np.zeros((10, 60)), np.zeros((20, 60))),
                                 (np.zeros((50, 60)), np.full((20, 60), np.nan))):
            with self.assertRaises(ValueError):
                similarity(search, template)


if __name__ == '__main__':
    unittest.main()
