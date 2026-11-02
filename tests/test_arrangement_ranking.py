"""Compatibility with the accepted placement order, including repeated shapes."""
import copy
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from local_call_edit import rank_options


def accepted_order(options, history, seed):
    # Frozen pre-optimization algorithm: changing this oracle changes the music.
    rng = random.Random(seed)
    remaining = list(options)
    ranked = []
    while remaining:
        weights = [1 / (sum((other['mode'], other.get('treatment')) ==
                           (c['mode'], c.get('treatment')) for other in remaining) *
                        (1 + 3 * history.count(c['fingerprint']) +
                         sum(h.split(':')[0] == c['mode'] for h in history[-4:])))
                   for c in remaining]
        if history and any(c['fingerprint'] != history[-1] for c in remaining):
            weights = [0 if c['fingerprint'] == history[-1] else w
                       for c, w in zip(remaining, weights)]
        i = rng.choices(range(len(remaining)), weights=weights, k=1)[0]
        ranked.append(remaining.pop(i))
    return ranked


def candidates(count):
    return [dict(mode=('existing-gap', 'vocal-replacement')[i % 2],
                 fingerprint=f"{('existing-gap', 'vocal-replacement')[i % 2]}:{i % 11}",
                 call_at=i / 13, **({'treatment': ('original', 'beat-fitted', 'word-reply')[i % 3]}
                                   if i % 5 else {})) for i in range(count)]


class RankingCompatibility(unittest.TestCase):
    def test_seeded_order_and_inputs_are_identical(self):
        options = candidates(48)
        for history in ([], ['existing-gap:0'], ['vocal-replacement:1'] * 12,
                        ['existing-gap:0', 'missing:0', 'existing-gap:2', 'vocal-replacement:1']):
            original = copy.deepcopy((options, history))
            for seed in range(40):
                self.assertEqual(rank_options(options, history, seed),
                                 accepted_order(options, history, seed))
            self.assertEqual((options, history), original)

    def test_large_candidate_set_matches_complete_order(self):
        options = candidates(422)  # Count observed in the accepted runtime check.
        history = ['existing-gap:0', 'vocal-replacement:3', 'existing-gap:2']
        self.assertEqual(rank_options(options, history, 2**32 - 1),
                         accepted_order(options, history, 2**32 - 1))

    def test_empty_singleton_and_exhausted_last_fingerprint(self):
        for options in ([], candidates(1), [dict(mode='existing-gap', fingerprint='existing-gap:0',
                                               call_at=i) for i in range(8)]):
            for history in ([], ['existing-gap:0'], ['absent:0']):
                self.assertEqual(rank_options(options, history, 42), accepted_order(options, history, 42))


if __name__ == '__main__':
    unittest.main()
