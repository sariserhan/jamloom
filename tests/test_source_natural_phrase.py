import sys
from pathlib import Path
import unittest
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from arrange_voice_research import RATE
from source_natural_phrase import select_phrase


class NaturalPhraseTests(unittest.TestCase):
    def tone(self,seconds):
        t=np.arange(round(seconds*RATE))/RATE
        return np.repeat((.1*np.sin(2*np.pi*196*t))[:,None],2,axis=1)

    def test_no_pause_keeps_long_input_instead_of_forcing_rhythmic_cut(self):
        pcm=self.tone(4.9);copy=pcm.copy();selection=select_phrase(pcm)
        self.assertEqual((selection['start_frame'],selection['end_frame']),(0,len(pcm)))
        np.testing.assert_array_equal(pcm,copy)

    def test_short_internal_gaps_are_not_boundaries(self):
        pcm=self.tone(4.9);pcm[RATE:RATE+round(.10*RATE)]=0
        self.assertTrue(select_phrase(pcm)['full_input_used'])

    def test_quiet_consonant_is_not_treated_as_silence(self):
        pcm=self.tone(4.9);pcm[RATE:2*RATE]*=.06
        self.assertTrue(select_phrase(pcm)['full_input_used'])

    def test_long_pause_retains_margins_on_both_sides(self):
        pcm=self.tone(4.9);pcm[2*RATE:round(2.4*RATE)]=0
        chosen=select_phrase(pcm)
        self.assertFalse(chosen['full_input_used'])
        bounds=[chosen['start_frame'],chosen['end_frame']]
        self.assertTrue(any(2.05*RATE<=b<=2.35*RATE for b in bounds))
        self.assertFalse(chosen['word_boundaries_verified'])

    def test_compact_phrase_is_preserved_even_with_a_pause(self):
        pcm=self.tone(2);pcm[RATE:round(1.25*RATE)]=0
        self.assertTrue(select_phrase(pcm)['full_input_used'])

    def test_invalid_sources_fail(self):
        for pcm in (np.zeros((RATE,2)),np.full((RATE,2),np.nan),self.tone(5.1)):
            with self.assertRaises(ValueError):select_phrase(pcm)


if __name__=='__main__':unittest.main()
