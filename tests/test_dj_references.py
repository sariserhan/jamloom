import sys, unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from analyze_dj_references import features, changes, RATE

class ReferenceAnalysisTests(unittest.TestCase):
    def test_rhythmic_estimates_and_silence_are_not_action_labels(self):
        t=np.arange(30*RATE)/RATE;pcm=(.2*np.sin(2*np.pi*90*t)*np.exp(-(t%.5)*35)).astype('float32')
        tempos,seconds=features(pcm)
        self.assertTrue(any(abs(v['bpm']-120)<3 for v in tempos));self.assertEqual(len(seconds),30)
        self.assertEqual(features(np.zeros(30*RATE,dtype='float32'))[0],[])
        with self.assertRaises(ValueError): features(np.full(RATE,np.nan))
    def test_candidate_change_is_explicitly_unreviewed(self):
        seconds=[{'rms_db':-25 if i<25 else -10,'bands':[.5,.3,.2]} for i in range(60)]
        rows=changes(seconds);self.assertTrue(rows);self.assertTrue(all(not r['reviewed'] and r['dj_action']=='unknown' for r in rows))
        self.assertTrue(all(b['seconds']-a['seconds']>=20 for a,b in zip(rows,rows[1:])))

if __name__=='__main__':unittest.main()
