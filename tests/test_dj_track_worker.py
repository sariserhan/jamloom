import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_track_worker import request, brief, canonical, ace

class WorkerContract(unittest.TestCase):
    def test_request_and_selected_house_brief(self):
        value=dict(version=1, session='a'*32, sequence=0, seed=2**32-1, style='house', energy=4)
        self.assertEqual(request(value), value)
        self.assertIn('Rolling bass groove', brief(value)[0])
        self.assertEqual(brief(value)[1], 128)
        for change in [dict(seed=True), dict(seed=2**32), dict(sequence=-1), dict(energy=6), dict(style='ambient'), dict(session='../a'), dict(reference_audio='x')]:
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
