import sys
from pathlib import Path
import unittest
import json
import tempfile
from unittest.mock import MagicMock, patch
from types import SimpleNamespace
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_track_worker import request, brief, canonical, ace
import dj_gpu_qualification as qualification

class WorkerContract(unittest.TestCase):
    def test_qualification_reuses_model_and_stops_on_deadline_failure(self):
        for slow in (False, True):
            with self.subTest(slow=slow), tempfile.TemporaryDirectory() as temp:
                output=Path(temp)/'qualification'
                times=[0,1,2,33] if slow else [0,1,2,3,4,5,6,7]
                with patch.object(qualification,'Path',return_value=output), patch.object(qualification,'load_ace',return_value=('dit','lm')) as load, patch.object(qualification,'ace',return_value=(None,48000)) as render, patch.object(qualification,'canonical',side_effect=[np.full((4,2),i,dtype='<i2') for i in (1,2,3)]), patch.object(qualification.time,'monotonic',side_effect=times):
                    qualification.main()
                report=json.loads((output/'report.json').read_text())
                self.assertEqual(render.call_count,1 if slow else 3)
                load.assert_called_once()
                self.assertTrue(all(c.args[2]==('dit','lm') for c in render.call_args_list))
                self.assertEqual(report['status'],'FAIL buffer deadline' if slow else 'PASS technical')
                self.assertEqual(report['human_listening'],'NOT RUN')

    def test_request_and_selected_house_brief(self):
        value=dict(version=1, session='a'*32, sequence=0, seed=2**32-1, style='house', energy=4)
        self.assertEqual(request(value), value)
        self.assertIn('Rolling bass groove', brief(value)[0])
        self.assertEqual(brief(value)[1], 128)
        for mood, phrase in [('warm','Warm rounded chords'),('bright','Bright uplifting chords'),('deep','Deep hypnotic bass')]:
            self.assertEqual(request({**value,'mood':mood})['mood'],mood)
            self.assertIn(phrase,brief({**value,'mood':mood})[0])
            self.assertIn('no ambient intro or fade-in',brief({**value,'mood':mood})[0])
        self.assertNotIn('no ambient intro or fade-in',brief(value)[0])
        self.assertNotIn('Start at full dancefloor energy',brief({**value,'mood':'deep','energy':2})[0])
        for change in [dict(mood='angry'), dict(mood=None), dict(seed=True), dict(seed=2**32), dict(sequence=-1), dict(energy=6), dict(style='ambient'), dict(session='../a'), dict(reference_audio='x')]:
            with self.assertRaises(ValueError): request({**value, **change})
    def test_ace_adapter_uses_one_fresh_instrumental_request(self):
        value=dict(version=1, session='a'*32, sequence=2, seed=123456, style='house', energy=4)
        dit=MagicMock(); dit.initialize_service.return_value=('ready', True)
        generate=MagicMock(return_value=SimpleNamespace(success=True, audios=[{'path':'track.wav'}]))
        modules={'torch':MagicMock(), 'soundfile':MagicMock(), 'acestep':MagicMock(),
                 'acestep.handler':SimpleNamespace(AceStepHandler=lambda:dit),
                 'acestep.llm_inference':SimpleNamespace(LLMHandler=MagicMock()),
                 'acestep.inference':SimpleNamespace(GenerationParams=SimpleNamespace, GenerationConfig=SimpleNamespace, generate_music=generate)}
        with patch.dict(sys.modules, modules): ace(value, Path('/tmp'))
        params, config=generate.call_args.args[2:]
        self.assertEqual((params.seed, params.duration, params.bpm), (123456,60,128))
        self.assertTrue(params.instrumental); self.assertFalse(params.thinking)
        self.assertEqual(config.seeds,[123456]); self.assertFalse(config.use_random_seed)
        self.assertEqual(config.batch_size,1)

    def test_audio_contract(self):
        t=np.arange(60*8000)/8000
        a=np.column_stack((np.sin(t*600)*.2,np.sin(t*900)*.2)).astype('float32')
        pcm=canonical(a,8000)
        self.assertEqual(pcm.shape, (2880000,2))
        self.assertLess(np.max(np.abs(pcm)),32767)
        for invalid in [a[:10], np.zeros_like(a), a[:,0], a*np.nan, np.ones_like(a)]:
            with self.assertRaises(ValueError): canonical(invalid,8000)

if __name__=='__main__': unittest.main()
