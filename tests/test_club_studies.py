import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from club_studies import events, STYLES, CONDITIONS


class ClubStudiesTests(unittest.TestCase):
    def test_ablation_and_phrase_boundaries(self):
        for style in STYLES:
            base=events(style,51024,'baseline')
            self.assertEqual(base['events'],events(style,51024,'sound')['events'])
            self.assertNotEqual(base['events'],events(style,51024,'groove')['events'])
            for condition in CONDITIONS:
                plan=events(style,51024,condition)
                self.assertEqual(plan,events(style,51024,condition))
                self.assertFalse(plan['expert_verified'])
                self.assertTrue(all(0<=e['beat']<64 and 0<e['velocity']<=1 for e in plan['events']))
            arranged=events(style,51024,'combined')
            self.assertEqual(arranged['events'],events(style,51024,'recorded')['events'])
            self.assertFalse(any(e['bus']=='kick' and 40<=e['beat']<48 for e in arranged['events']))
            self.assertTrue(any(e['bus']=='kick' and 48<=e['beat']<56 for e in arranged['events']))
        with self.assertRaises(ValueError):events('artist-copy',1,'combined')


if __name__=='__main__':unittest.main()
