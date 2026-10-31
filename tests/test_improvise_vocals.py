import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from improvise_vocals import INSTRUMENTAL_STYLES,choose_instrumental
from singing_response import draft,load_plan,validate_plan,caption,sing


class ImproviseVocals(unittest.TestCase):
    def test_style_choice_varies_but_explicit_singers_win(self):
        for genre in INSTRUMENTAL_STYLES:
            self.assertEqual({choose_instrumental(genre,'surprise',n) for n in range(30)},{True,False})
            for voice in ('male','female'):
                self.assertFalse(any(choose_instrumental(genre,voice,n) for n in range(30)))
        self.assertFalse(choose_instrumental('rap','surprise',42))
        for seed in (True,-1,2**32):
            with self.assertRaises(ValueError):choose_instrumental('house','surprise',seed)

    def test_instrumental_plan_uses_no_lyric_model_or_singer_reference(self):
        with tempfile.TemporaryDirectory() as folder,patch('singing_response.planner_functions',side_effect=AssertionError('No lyric model')),\
                patch('singing_response.cast_singer_reference',side_effect=AssertionError('No singer casting')):
            path=Path(folder)/'plan.json'
            draft(Path(folder),'A complete user thought',42,path,'female','house',45,'high',True)
            plan=load_plan(path);case=plan['cases'][0]
            self.assertEqual(case['lyrics'],'[Instrumental]')
            self.assertTrue(case['instrumental'])
            self.assertEqual(case['energy'],'high')
            self.assertIn('developing arrangement',caption(case))
            self.assertIn('no sung or spoken vocals',caption(case))
            self.assertLess(len(caption(case)),512)
            for change in ({'lyrics':'Invented song words'},{'vocal_identity':'af_bella'},
                           {'singer_reference':'voice-1'},{'instrumental':'yes'}):
                bad=copy.deepcopy(plan);bad['cases'][0].update(change)
                with self.assertRaises(ValueError):validate_plan(bad)
            bad=copy.deepcopy(plan);bad['schema']='jamloom-dna-song-1'
            bad['cases'][0]['duration']=100
            bad['cases'][0]['song_caption']='Original Music DNA direction'
            with self.assertRaisesRegex(ValueError,'Improvise-only'):validate_plan(bad)
            self.assertEqual(caption({'song_caption':'Music DNA direction'}),'Music DNA direction')

    def test_render_boundary_receives_instrumental_flag_and_no_singer_audio(self):
        import numpy as np
        import soundfile as sf
        captured=[]
        def parameters(**kwargs):
            captured.append(kwargs)
            return SimpleNamespace(**kwargs,shift=3)
        torch=SimpleNamespace(set_num_threads=lambda _:None,manual_seed=lambda _:None,__version__='test-only')
        engine=SimpleNamespace(device='test-only',dtype='test-only',use_mlx_vae=False)
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);plan=root/'plan.json';audio=root/'fixture.wav'
            draft(root,'The selected user phrase',42,plan,'male','dj',30,'high',True)
            sf.write(audio,np.repeat((.1*np.sin(np.arange(30*48000)*.1))[:,None],2,axis=1),48000)
            inference=SimpleNamespace(GenerationParams=parameters,GenerationConfig=lambda **kw:kw,
                generate_music=lambda *a,**kw:SimpleNamespace(success=True,audios=[{'path':str(audio)}]))
            with patch.dict(sys.modules,{'torch':torch,'acestep':SimpleNamespace(),'acestep.inference':inference}),\
                    patch('singing_response.load_singer_engine',return_value=(engine,None)),patch('builtins.print'):
                sing(root,plan,root/'output','dj-male')
            self.assertTrue(captured[0]['instrumental'])
            self.assertEqual(captured[0]['lyrics'],'[Instrumental]')
            self.assertNotIn('reference_audio',captured[0])
            self.assertNotIn('src_audio',captured[0])
            report=json.loads((root/'output/complete.json').read_text())
            self.assertEqual(report['task_type'],'text2music')
            self.assertTrue(report['case']['instrumental'])
            with self.assertRaisesRegex(ValueError,'does not accept singer'):
                sing(root,plan,root/'forbidden','dj-male',reference_singer=root)


if __name__=='__main__':unittest.main()
