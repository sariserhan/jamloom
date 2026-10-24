import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluate_dj_cues import candidates, evaluate, score


class CueTests(unittest.TestCase):
    def test_one_to_one_and_invalid(self):
        self.assertEqual(score([1, 1.01], [1]), (1, 2, 1))
        row = {'duration': 64, 'beat_grid': {'bpm': 120, 'start_pos': 0, 'init_beat': 1, 'time_sig': '4/4'}, 'cue_pts': [16, 32]}
        self.assertEqual(candidates(row), [0, 16, 32, 48])
        result = evaluate([row], [row])
        self.assertEqual(result['metrics']['learned_position_prior']['hits'], 2)
        with self.assertRaises(ValueError): candidates({**row, 'duration': float('nan')})


if __name__ == '__main__': unittest.main()
