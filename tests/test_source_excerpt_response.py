from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE
from source_excerpt_response import compose,select_excerpt,TEMPOS
from source_strategy_response import compose as legacy
from source_led_response import faded


class SourceExcerpts(unittest.TestCase):
    def source(self,seconds):
        t=np.arange(round(seconds*RATE))/RATE
        mono=.15*np.sin(2*np.pi*196*t)*(.1+.9*np.sin(2*np.pi*2*t)**8)
        return np.repeat(mono[:,None],2,axis=1)

    def test_a_fitting_short_source_is_not_needlessly_cut(self):
        source=self.source(.55)
        for strategy in TEMPOS:
            actual=compose(source,4123,strategy)
            np.testing.assert_array_equal(actual[1]['voice'],legacy(source,4123,strategy)[1]['voice'])
            self.assertTrue(actual[2]['source_selection']['full_input_used'])

    def test_instruments_answer_without_the_fixed_two_bar_gap(self):
        for seconds in (.55,1.22,5):
            for strategy,bpm in TEMPOS.items():
                source=self.source(seconds);mix,stems,plan=compose(source,4123,strategy)
                response=plan['opening_response'];end=response['hook_end_frame']
                instruments=sum(audio for name,audio in stems.items() if name!='voice')
                audible=np.flatnonzero(np.max(np.abs(instruments),axis=1)>.001)[0]
                self.assertGreaterEqual(audible,end)
                self.assertLessEqual((audible-end)/RATE,30/bpm+.02)
                self.assertGreater(np.sqrt(np.mean(instruments[audible:audible+RATE//4]**2)),.005)
                self.assertTrue(np.all(instruments[:end]==0))
                # The rest of the composition and its voice provenance stay intact.
                selected=plan['source_selection'];original=legacy(source[selected['start_frame']:selected['end_frame']],4123,strategy)
                limit=round(8*60/bpm*RATE)
                np.testing.assert_array_equal(mix[limit:],original[0][limit:])

    def test_long_inputs_use_only_bounded_selected_hooks_and_preserve_original(self):
        source=self.source(5);original=source.copy()
        for strategy,bpm in TEMPOS.items():
            mix,stems,plan=compose(source,4123,strategy);selection=plan['source_selection']
            start,end=selection['start_frame'],selection['end_frame']
            self.assertFalse(selection['full_input_used']);self.assertTrue(0<=start<end<=len(source))
            self.assertLessEqual((end-start)/RATE,2*60/bpm+1/RATE)
            hooks=[e for e in plan['events'] if e['kind']=='clean_selected_hook'];self.assertEqual(len(hooks),3)
            for event in hooks:
                self.assertEqual(event['source_frames'],[start,end]);at=event['start_frame']
                np.testing.assert_allclose(stems['voice'][at:at+end-start],faded(source[start:end],.01)*event['gain']*plan['master_gain'],atol=1e-14)
            for event in plan['events']:
                if 'source_frames' in event:self.assertTrue(start<=event['source_frames'][0]<event['source_frames'][1]<=end)
            self.assertTrue(np.isfinite(mix).all());self.assertLessEqual(np.max(np.abs(mix)),.85000001)
            self.assertTrue(np.all(mix[-RATE//10:]==0));np.testing.assert_allclose(sum(stems.values()),mix,atol=1e-14)
        np.testing.assert_array_equal(source,original)

    def test_deterministic_bounded_selection_and_invalid_inputs(self):
        source=self.source(3)
        self.assertEqual(select_excerpt(source,128),select_excerpt(source,128))
        for invalid in (np.zeros((RATE,2)),np.full((RATE,2),np.nan),self.source(5.1)):
            with self.assertRaises(ValueError):select_excerpt(invalid,128)
        with self.assertRaises(ValueError):select_excerpt(source,0)


if __name__=='__main__':unittest.main()
