import sys
from pathlib import Path
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_vocal import add_hook, steady_grid


class VocalTests(unittest.TestCase):
    def test_brief_hook_is_bounded_and_grid_aligned_without_changing_instrumental_edges(self):
        rate=8000; t=np.arange(60*rate)/rate
        base=.2*np.sin(2*np.pi*80*t)*np.exp(-((t+.1)%(60/128))*40)
        samples=np.column_stack((base, base)); calls=[]
        def generate(value, path, engine, hook):
            calls.append((value, hook))
            voice=.2*np.sin(np.arange(10*rate)/rate*1000)
            return np.column_stack((voice, voice)), rate
        value=dict(version=1,session='a'*32,sequence=2,seed=17,style='house',energy=4)
        output,cue=add_hook(value,samples,rate,Path('/tmp'),None,generate)
        self.assertIsNotNone(cue); self.assertLessEqual(cue['seconds'],2); self.assertTrue(cue['repeat'])
        self.assertEqual(len(calls),1); self.assertEqual(len(calls[0][1].split()),2); self.assertNotEqual(calls[0][0]['seed'],value['seed'])
        np.testing.assert_array_equal(output[:20*rate],samples[:20*rate]); np.testing.assert_array_equal(output[40*rate:],samples[40*rate:])
        self.assertGreater(np.max(np.abs(output-samples)), .01); self.assertLess(np.max(np.abs(output)),1)
        phase=t*2+t*t*.005
        drift=.2*np.sin(2*np.pi*80*t)*np.exp(-(phase%1)*20)
        self.assertIsNone(steady_grid(np.column_stack((drift,drift)),rate,128))
        _,silent=add_hook(value,np.zeros_like(samples),rate,Path('/tmp'),None,generate)
        self.assertIsNone(silent); self.assertEqual(len(calls),1)


if __name__=='__main__': unittest.main()
