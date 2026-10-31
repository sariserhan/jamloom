import copy
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from render_singing_originals import resource_problem, render, EVIDENCE
from singing_response import load_plan, validate_plan, sing, load_singer_engine
from review_singing_originals import karaoke_mix
import numpy as np


class SingingOriginalTests(unittest.TestCase):
    def test_single_use_memory_policy_does_not_change_reusable_engine(self):
        class Handler:
            def initialize_service(self,**kwargs):return 'ready',True
            def tiled_encode(self,*args):return args
            def _decode_generate_music_pred_latents(self,**kwargs):return kwargs
        modules={'acestep.handler':SimpleNamespace(AceStepHandler=Handler),
                 'acestep.llm_inference':SimpleNamespace(LLMHandler=lambda:None)}
        with patch.dict(sys.modules,modules),patch('singing_response.inference_device',return_value='mps'),patch('metal_singer_loader.release_generation_models') as release:
            reusable,_=load_singer_engine(Path('.'),mac_small_decode=True)
            once,_=load_singer_engine(Path('.'),mac_small_decode=True,single_use=True)
            self.assertEqual(reusable.tiled_encode('audio'),('audio',None,None,True))
            self.assertEqual(once.tiled_encode('audio'),('audio',48000*6,None,True))
            self.assertEqual(once.tiled_encode('audio',48000*5,48000),('audio',48000*5,48000,True))
            self.assertEqual(reusable._decode_generate_music_pred_latents(pred_latents='kept'),{'pred_latents':'kept'})
            release.assert_not_called()
            self.assertEqual(once._decode_generate_music_pred_latents(pred_latents='kept'),{'pred_latents':'kept'})
            release.assert_called_once_with(once)

    def test_karaoke_preserves_alignment_and_common_gain(self):
        t=np.arange(4800)/48000
        backing=np.repeat((.3*np.sin(2*np.pi*110*t))[:,None],2,axis=1)
        voice=np.repeat((.7*np.sin(2*np.pi*330*t))[:,None],2,axis=1)
        full,karaoke,gain=karaoke_mix(backing+voice,voice)
        np.testing.assert_allclose(karaoke,backing*gain,atol=1e-12)
        np.testing.assert_allclose(full-karaoke,voice*gain,atol=1e-12)
        self.assertLessEqual(np.max(np.abs(full)),.840001)
        for bad in [voice[:-1],np.full_like(voice,np.nan)]:
            with self.assertRaises(ValueError):karaoke_mix(full,bad)

    def test_complete_original_plans_use_existing_contract(self):
        plan=load_plan(EVIDENCE/'plan.json')
        self.assertEqual([c['bpm'] for c in plan['cases']],[120,132])
        self.assertEqual([c['duration'] for c in plan['cases']],[120,120])
        self.assertEqual(len({c['lyrics'] for c in plan['cases']}),2)
        self.assertTrue(all(not c.get('singer_reference') and not c.get('vocal_identity') for c in plan['cases']))
        broken=copy.deepcopy(plan);broken['cases'][0]['lyrics']='[Chorus]\nToo short'
        with self.assertRaises(ValueError):validate_plan(broken)

    def test_resource_bounds_and_refusal_before_launch(self):
        gb=1024**3
        self.assertIsNone(resource_problem(5*gb,8*gb,7*gb,1100,True))
        for args in [(3*gb,8*gb,0,0,True),(.4*gb,8*gb),(5*gb,4*gb),(5*gb,8*gb,10*gb),(5*gb,8*gb,0,1201)]:
            self.assertIsNotNone(resource_problem(*args))
        with patch('render_singing_originals.psutil.virtual_memory') as memory,patch('render_singing_originals.subprocess.Popen') as launch,patch('render_singing_originals.Path.exists',return_value=False):
            memory.return_value.available=gb
            with self.assertRaisesRegex(RuntimeError,'memory'):render('deep-house-male')
            launch.assert_not_called()

    def test_small_decode_cannot_change_cloud_or_invalid_requests(self):
        with patch('singing_response.inference_device',return_value='cuda'):
            with self.assertRaisesRegex(ValueError,'Metal'):sing(None,None,None,None,mac_small_decode=True)
            with self.assertRaisesRegex(ValueError,'Metal'):load_singer_engine(None,mac_small_decode=True)
        with self.assertRaises(ValueError):sing(None,None,None,None,mac_small_decode='true')
        with self.assertRaises(ValueError):load_singer_engine(None,mac_small_decode='true')
        with self.assertRaises(ValueError):load_singer_engine(None,single_use=True)
        with self.assertRaises(ValueError):load_singer_engine(None,single_use=1)


if __name__=='__main__':unittest.main()
