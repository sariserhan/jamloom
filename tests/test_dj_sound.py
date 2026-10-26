import sys
from pathlib import Path
import unittest
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from compare_dj_sound import measure, summarize, RATE

class SoundTests(unittest.TestCase):
    def test_gain_stereo_and_band_measurements(self):
        t=np.arange(RATE*10)/RATE;x=(.3*np.sin(2*np.pi*100*t)).astype('float32');pcm=np.column_stack((x,x))
        a=measure(pcm);b=measure(pcm*.5)
        self.assertAlmostEqual(a['rms_db']-b['rms_db'],6.0206,places=3)
        self.assertAlmostEqual(a['crest_db'],b['crest_db'],places=4)
        self.assertGreater(a['band_fraction']['bass'],.99);self.assertAlmostEqual(sum(a['band_fraction'].values()),1)
        self.assertEqual(a['side_fraction'],0);self.assertAlmostEqual(a['lr_correlation'],1)
        anti=measure(np.column_stack((x,-x)));self.assertEqual(anti['side_fraction'],1);self.assertAlmostEqual(anti['lr_correlation'],-1)
        self.assertGreater(anti['band_fraction']['bass'],.99)
        self.assertEqual(summarize([a,b])['active_windows'],2)
    def test_invalid_silence_and_pulse(self):
        with self.assertRaises(ValueError):measure(np.zeros(RATE))
        with self.assertRaises(ValueError):measure(np.full((RATE,2),np.nan))
        self.assertTrue(measure(np.zeros((RATE,2)))['silent'])
        t=np.arange(RATE*10)/RATE;beat=np.exp(-(t%.5)*50)*np.sin(2*np.pi*100*t)
        result=measure(np.column_stack((beat,beat)))
        self.assertTrue(any(abs(c['bpm']-120)<3 and c['periodicity']>.7 for c in result['pulse_candidates']))


class PassageTests(unittest.TestCase):
    def test_tail_uses_decoded_duration_and_fixed_original_bounds(self):
        import json,tempfile
        from unittest.mock import patch
        import research_dj_passages as research
        with tempfile.TemporaryDirectory() as d:
            base=Path(d)/'renders/dj-reference-analysis-20261025';base.mkdir(parents=True)
            (base/'test.json').write_text(json.dumps({'candidate_changes':[{'seconds':55,'energy_delta_db':4,'texture_delta':.2}]}))
            with patch.object(research,'ROOT',Path(d)):
                rows=research.passages({'id':'test','kind':'reference','duration_seconds':400.1,'decoded_seconds':400})
            self.assertTrue(all(0<=r['start'] and r['start']+10<=399.75 for r in rows))
            self.assertTrue(any(r['selection']=='unreviewed_energy_texture_change' for r in rows))
        with self.assertRaises(ValueError):research.passages({'kind':'generated','duration_seconds':30})
        self.assertEqual(len(research.passages({'kind':'generated','duration_seconds':60})),5)

if __name__=='__main__':unittest.main()
