import hashlib
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_sung_hooks import caption, splice, validate_case, sung_study
from singing_response import vocal_description


class SungHooksTests(unittest.TestCase):
    def setUp(self):
        self.value=dict(version=1,session='a'*32,sequence=0,seed=501026,style='house',energy=4,mood='deep')
        self.case=dict(request=self.value,source_file='sung-house-1.wav',source_sha256=hashlib.sha256(b'original').hexdigest(),
                       phrase='We rise',vocal_profile='female-mezzo',cue=dict(start=20,seconds=1.875,bpm=128))

    def test_music_dna_casting_and_short_melodic_lyrics_without_speech(self):
        for profile,voice in [('female-mezzo','female'),('male-tenor','male')]:
            case={**self.case,'vocal_profile':profile}
            self.assertIn(vocal_description(dict(voice=voice,vocal_profile=profile)),caption(case))
            self.assertIn('lead singing',caption(case));self.assertLessEqual(len(caption(case)),511)

    def test_splice_changes_only_supported_window_and_rejects_bad_audio(self):
        original=np.ones((480000,2),dtype=np.float32)*.1
        candidate=np.ones_like(original)*.2
        cue=self.case['cue'];output=splice(original,candidate,8000,cue)
        start=20*8000;end=start+15000
        np.testing.assert_array_equal(output[:start],original[:start]);np.testing.assert_array_equal(output[end:],original[end:])
        self.assertAlmostEqual(output[start,0],original[start,0]);self.assertAlmostEqual(output[end-1,0],original[end-1,0])
        for bad in [original,np.ones_like(original),np.full_like(original,np.nan),candidate[:-1]]:
            with self.assertRaises(ValueError):splice(original,bad,8000,cue)

    def test_rejects_nonzero_dropout_even_with_loud_audio_elsewhere(self):
        original=np.full((480000,2),.1,dtype=np.float32)
        candidate=original*2
        candidate[162000:166000]=.001
        with self.assertRaisesRegex(ValueError,'drops accompaniment'):
            splice(original,candidate,8000,self.case['cue'])
        # A source rest is not a newly introduced dropout.
        original[162000:166000]=.001
        splice(original,candidate,8000,self.case['cue'])

    def test_no_generation_without_hash_verified_supported_source(self):
        samples=np.ones((2880000,2),dtype=np.float32)*.1
        with patch('dj_sung_hooks.steady_grid',return_value=None):
            with self.assertRaisesRegex(ValueError,'supported source grid'):validate_case(self.case,self.value,samples,48000)
        for cue in [dict(start=20,seconds=5,bpm=128),dict(start=float('nan'),seconds=1.875,bpm=128)]:
            with self.assertRaises(ValueError):validate_case({**self.case,'cue':cue},self.value,samples,48000)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'sung-fixtures.json').write_text(json.dumps({'cases':[self.case]}));(root/'sung-house-1.wav').write_bytes(b'changed')
            modules={'torch':MagicMock(),'soundfile':MagicMock(),'acestep':MagicMock(),'acestep.inference':MagicMock()}
            with patch.dict(sys.modules,modules),self.assertRaisesRegex(ValueError,'Source original changed'):
                sung_study(self.value,root,engine=('dit','lm'),fixture_file=root/'sung-fixtures.json')

    def test_model_receives_musical_context_and_retains_raw_candidate(self):
        self.case['repaint_mode']='aggressive'
        samples=np.ones((2880000,2),dtype=np.float32)*.1
        candidate=np.ones_like(samples)*.2
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'sung-fixtures.json').write_text(json.dumps({'cases':[self.case]}));(root/'sung-house-1.wav').write_bytes(b'original');(root/'raw.wav').write_bytes(b'new musical candidate')
            sf=MagicMock();sf.read.side_effect=[(samples,48000),(candidate,48000)]
            generate=MagicMock(return_value=SimpleNamespace(success=True,audios=[{'path':str(root/'raw.wav')}]))
            modules={'torch':MagicMock(),'soundfile':sf,'acestep':MagicMock(),'acestep.inference':SimpleNamespace(GenerationParams=SimpleNamespace,GenerationConfig=SimpleNamespace,generate_music=generate)}
            with patch.dict(sys.modules,modules),patch('dj_sung_hooks.steady_grid',return_value=(128,.3125,[(12,44)])):
                output,rate=sung_study(self.value,root,engine=('dit','lm'),fixture_file=root/'sung-fixtures.json')
            params=generate.call_args.args[2]
            self.assertEqual(params.task_type,'repaint');self.assertEqual(params.chunk_mask_mode,'explicit');self.assertEqual(params.src_audio,str(root/'sung-house-1.wav'))
            self.assertEqual(params.repaint_mode,'aggressive')
            self.assertFalse(params.thinking);self.assertFalse(params.instrumental);self.assertFalse(params.enable_normalization)
            self.assertEqual(params.lyrics,'[Chorus]\nWe rise\n[Instrumental]');self.assertEqual((params.repainting_start,params.repainting_end),(20,21.875))
            self.assertTrue((root/'sung-candidates/raw-0.wav').exists());self.assertEqual(rate,48000)
            receipt=json.loads((root/'musical-hook.json').read_text());self.assertFalse(receipt['text_to_speech']);self.assertIn('require listening',receipt['status'])
            np.testing.assert_array_equal(output[:20*rate],samples[:20*rate])

    def test_isolated_singing_never_sends_instrumental_to_model_or_forces_long_phrase(self):
        self.case['method']='isolated'
        samples=np.ones((2880000,2),dtype=np.float32)*.1
        for separated in (True,False):
            candidate=np.full((480000,2),.2,dtype=np.float32)
            if separated:
                candidate[:]=0
                candidate[48000:96000]=.2;candidate[240000:288000]=.2
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);(root/'sung-fixtures.json').write_text(json.dumps({'cases':[self.case]}))
                (root/'sung-house-1.wav').write_bytes(b'original');(root/'raw.wav').write_bytes(b'isolated singing candidate')
                sf=MagicMock();sf.read.side_effect=[(samples,48000),(candidate,48000)]
                generate=MagicMock(return_value=SimpleNamespace(success=True,audios=[{'path':str(root/'raw.wav')}]))
                modules={'torch':MagicMock(),'soundfile':sf,'acestep':MagicMock(),'acestep.inference':SimpleNamespace(GenerationParams=SimpleNamespace,GenerationConfig=SimpleNamespace,generate_music=generate)}
                with patch.dict(sys.modules,modules),patch('dj_sung_hooks.steady_grid',return_value=(128,.3125,[(12,44)])):
                    output,rate=sung_study(self.value,root,engine=('dit','lm'),fixture_file=root/'sung-fixtures.json')
                params=generate.call_args.args[2]
                self.assertEqual(generate.call_count,1);self.assertEqual(params.duration,10)
                self.assertFalse(hasattr(params,'src_audio'));self.assertFalse(hasattr(params,'repainting_start'))
                self.assertFalse(params.instrumental);self.assertEqual(params.lyrics,'[Chorus]\nWe rise')
                self.assertTrue(params.enable_normalization);self.assertEqual(params.normalization_db,-1)
                self.assertEqual(generate.call_args.args[3].audio_format,'wav32')
                self.assertIn(vocal_description(dict(voice='female',vocal_profile='female-mezzo')),params.caption)
                self.assertLessEqual(len(params.caption),511)
                proof=json.loads((root/'musical-hook.json').read_text())
                self.assertFalse(proof['model_source_audio_used']);self.assertEqual(proof['task_type'],'isolated')
                self.assertEqual(proof['placement'],'placed' if separated else 'no_short_phrase')
                self.assertEqual((root/'sung-candidates/raw-0.wav').read_bytes(),b'isolated singing candidate')
                np.testing.assert_array_equal(output[:20*rate],samples[:20*rate])
                np.testing.assert_array_equal(output[21*rate+42000:],samples[21*rate+42000:])
                if not separated:np.testing.assert_array_equal(output,samples)


if __name__=='__main__':unittest.main()
