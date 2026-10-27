import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from separate_spleeter import overlap_add


class OverlapTests(unittest.TestCase):
    def test_identity_preserves_stereo_and_partial_final_windows(self):
        for frames in [32,384,385,700,705,1001]:
            audio=np.random.default_rng(1).normal(0,.1,(frames,2)).astype(np.float32)
            np.testing.assert_allclose(overlap_add(audio,lambda x:x,32),audio,atol=1e-7)

    def test_invalid_audio_and_model_output_fail_before_acceptance(self):
        audio=np.ones((64,2),dtype=np.float32)
        for bad in [audio[:,0],audio[:1],np.full_like(audio,np.nan)]:
            with self.assertRaises(ValueError):overlap_add(bad,lambda x:x,32)
        for predict in [lambda x:x[:-1],lambda x:np.full_like(x,np.inf)]:
            with self.assertRaises(ValueError):overlap_add(audio,predict,32)


if __name__=='__main__':unittest.main()
