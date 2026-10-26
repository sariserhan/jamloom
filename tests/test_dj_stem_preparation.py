"""Source binding and sample-aligned regions; no model or provider calls."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_dj_stem_performance import prepare, sha


class StemPreparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary=tempfile.TemporaryDirectory();cls.root=Path(cls.temporary.name)
        cls.source=cls.root/'source.wav';cls.source.write_bytes(b'synthetic source identity; not a musical fixture')
        cls.stems=cls.root/'stems';cls.stems.mkdir()
        samples=np.full((60*48000,2),.01,dtype=np.float32)
        hashes={}
        for part in ['drums','bass','other','vocals']:
            path=cls.stems/(part+'.npy');np.save(path,samples,allow_pickle=False);hashes[part]=sha(path)
        (cls.stems/'complete.json').write_text(json.dumps(dict(source_sha256=sha(cls.source),all_stems=True,
            sample_rate=48000,stems=hashes,model_sha256='a'*64,reconstruction_rms=0)))

    @classmethod
    def tearDownClass(cls):cls.temporary.cleanup()

    def test_fresh_regions_keep_exact_coverage_without_inventing_vocals(self):
        duration=round(16*60/140.1*48000)/48000
        with contextlib.redirect_stdout(io.StringIO()):
            p=prepare(self.source,self.stems,self.root/'review',140.1,
                      (('a',40,duration),('b',40+duration,duration)),voice=None)
        self.assertEqual(p['seconds'],28*duration);self.assertEqual(p['block_seconds'],4*duration)
        self.assertEqual(len(p['events']),84);self.assertEqual(len(p['clips']),6)
        self.assertFalse(any(e['part']=='vocals' for e in p['events']))
        self.assertFalse(p['new_generation'])
        for part in ['drums','bass','other']:
            events=[e for e in p['events'] if e['part']==part]
            self.assertAlmostEqual(events[-1]['at']+duration,p['seconds'])
        self.assertEqual(p['source_sha256'],sha(self.source))

    def test_bad_identity_and_regions_do_not_become_a_performance(self):
        wrong=self.root/'wrong.wav';wrong.write_bytes(b'changed source')
        with self.assertRaises(AssertionError):prepare(wrong,self.stems,self.root/'wrong-review')
        for regions in [(('a',40,7.5),('a',48,7.5)),(('a',-1,7.5),('b',48,7.5)),(('a',40,7.5),('b',48,8))]:
            with self.assertRaises(AssertionError):prepare(self.source,self.stems,self.root/'bad-review',regions=regions)


if __name__=='__main__':unittest.main()
