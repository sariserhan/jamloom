import sys
from pathlib import Path
import unittest
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from source_strategy_response import compose,STRATEGIES
from source_bass_response import compose as accepted
from source_led_response import faded
from arrange_voice_research import RATE


class ThreeStrategies(unittest.TestCase):
    def source(self,seconds=1.2):
        t=np.arange(round(seconds*RATE))/RATE
        return np.repeat((.1*np.sin(2*np.pi*196*t)*(.6+.4*np.cos(2*np.pi*3*t)))[:,None],2,axis=1)

    def test_accepted_branch_is_numerically_unchanged(self):
        source=self.source()
        np.testing.assert_array_equal(accepted(source,103031)[0],compose(source,103031,'half_time')[0])

    def test_complete_long_calls_stems_tails_and_distinct_compositions(self):
        source=self.source(5);signatures=[]
        for strategy in STRATEGIES:
            mix,stems,plan=compose(source,4123,strategy)
            self.assertTrue(np.isfinite(mix).all())
            self.assertLessEqual(float(np.max(np.abs(mix))),.85000001)
            self.assertTrue(20<len(mix)/RATE<40)
            self.assertTrue(np.all(mix[-RATE//10:]==0))
            np.testing.assert_allclose(sum(stems.values()),mix,atol=1e-14)
            calls=[e for e in plan['events'] if e['kind']=='clean_call']
            self.assertEqual(len(calls),3)
            for e in calls:
                start=e['start_frame']
                np.testing.assert_allclose(stems['voice'][start:start+len(source)],faded(source,.01)*e['gain']*plan['master_gain'],atol=1e-14)
            signatures.append((plan['bpm'],tuple((e['kind'],e['beat']) for e in plan['events'] if e['stem']=='drums')))
        self.assertEqual(len(set(signatures)),3)

    def test_bad_and_silent_inputs_rejected(self):
        for strategy in STRATEGIES:
            for source in (np.zeros((RATE,2)),self.source(5.1),np.full((RATE,2),np.nan)):
                with self.assertRaises(ValueError):compose(source,4123,strategy)
        with self.assertRaises(ValueError):compose(self.source(),4123,'unknown')

    def test_repeatable_output_and_source_dependent_motif(self):
        source=self.source()
        for strategy in STRATEGIES:
            a=compose(source,4123,strategy);b=compose(source,4123,strategy)
            np.testing.assert_array_equal(a[0],b[0])
            altered=np.tile(source,(3,1))
            c=compose(altered,4123,strategy)
            self.assertNotEqual(a[2]['bass_motif_beats'],c[2]['bass_motif_beats'])


if __name__=='__main__':unittest.main()
