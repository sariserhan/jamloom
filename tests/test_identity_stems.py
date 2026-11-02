import copy
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import vocal_identity as identity
import singer_studio as studio
from singing_response import digest
from source_led_response import stem


class IdentityStemTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);source=self.root/'identity-stems';source.mkdir()
        t=np.arange(30*48000,dtype=np.float64)/48000
        self.voice=np.repeat((.08*np.sin(2*np.pi*220*t))[:,None],2,axis=1).astype(np.float32)
        self.drums=np.repeat((.05*np.sin(2*np.pi*61*t))[:,None],2,axis=1).astype(np.float32)
        original=self.voice+self.drums
        sf.write(self.root/'base.wav',original,48000,subtype='PCM_16')
        original=identity._identity_pcm(self.root/'base.wav')
        converted=.07*np.sin(2*np.pi*330*np.arange(30*44100)/44100)
        mix,self.balance=identity.mix_identity(original,self.voice,converted)
        sf.write(self.root/'singer.wav',mix,48000,subtype='PCM_16')
        self.case={'voice':'male','vocal_identity':'am_michael','duration':30}
        self.base={'technical':'PASS','case':self.case,'audio_sha256':digest(self.root/'base.wav')}
        (self.root/'base.complete.json').write_text(json.dumps(self.base))
        hashes={}
        for name,pcm in [('vocals',self.voice),('drums',self.drums)]:
            np.save(source/(name+'.npy'),pcm,allow_pickle=False);hashes[name]=digest(source/(name+'.npy'))
        self.separation={'technical':'PASS','source_sha256':self.base['audio_sha256'],'stems':hashes}
        (source/'complete.json').write_text(json.dumps(self.separation))

    def publish(self,gain=None):
        if gain is None:gain=self.balance['master_gain']
        sha=identity.publish_identity_stems(self.root,gain)
        receipt={'technical':'PASS','case':self.case,'audio_sha256':digest(self.root/'singer.wav'),
                 'identity_stems_sha256':sha,'vocal_identity':{'id':'am_michael',
                 'base_audio_sha256':self.base['audio_sha256'],'master_gain':gain}}
        (self.root/'complete.json').write_text(json.dumps(receipt));return receipt

    def test_converted_components_preserve_export_and_reconstruct_backing(self):
        before=digest(self.root/'singer.wav');receipt=self.publish()
        self.assertEqual(before,digest(self.root/'singer.wav'))
        self.assertTrue(identity.identity_stems_ready(self.root))
        final=identity._identity_pcm(self.root/'singer.wav')
        original=identity._identity_pcm(self.root/'base.wav')
        vocal=stem(self.root,'vocals',receipt,final.shape)
        drums=stem(self.root,'drums',receipt,final.shape)
        np.testing.assert_allclose(final.astype(np.float64)-vocal,
            (original-self.voice).astype(np.float64)*self.balance['master_gain'],atol=1e-8,rtol=0)
        np.testing.assert_array_equal(drums,self.drums*self.balance['master_gain'])
        self.assertGreater(np.max(np.abs(vocal-self.voice)),.05,'Must not reuse unconverted vocals')

    def test_master_trim_is_applied_to_both_components(self):
        gain=.37
        final=identity._identity_pcm(self.root/'singer.wav')
        sf.write(self.root/'singer.wav',final*gain,48000,subtype='PCM_16')
        receipt=self.publish(gain)
        final=identity._identity_pcm(self.root/'singer.wav');original=identity._identity_pcm(self.root/'base.wav')
        np.testing.assert_allclose(final.astype(np.float64)-stem(self.root,'vocals',receipt,final.shape),
            (original-self.voice).astype(np.float64)*gain,atol=1e-8,rtol=0)
        np.testing.assert_allclose(stem(self.root,'drums',receipt,final.shape),self.drums.astype(np.float64)*gain,atol=2e-9,rtol=0)

    def test_arrangement_uses_verified_components_without_another_separator(self):
        self.publish()
        with patch.object(studio.subprocess,'run',side_effect=AssertionError('Duplicate separation')):
            studio.separate_for_arrangement(self.root,{},io.StringIO())

    def test_real_call_edit_uses_converted_gap_and_preserves_surrounding_audio(self):
        from local_call_edit import edit
        original=identity._identity_pcm(self.root/'base.wav')
        final=identity._identity_pcm(self.root/'singer.wav')
        # Only the converted singer stops here; the old singer did not stop.
        final[4*48000:7*48000]=(original-self.voice)[4*48000:7*48000]*self.balance['master_gain']
        sf.write(self.root/'singer.wav',final,48000,subtype='PCM_16');self.publish()
        source=self.root/'call.wav';frames=round(1.22*48000)
        call=np.repeat((.08*np.sin(2*np.pi*440*np.arange(frames)/48000))[:,None],2,axis=1)
        sf.write(source,call,48000,subtype='PCM_16');before=digest(source)
        output=self.root/'exchange';edit(self.root,source,output,4.5,consent=True)
        receipt=json.loads((output/'complete.json').read_text())
        self.assertEqual(receipt['outside_region_max_pcm_error'],0)
        self.assertEqual(receipt['events'][0]['end_frame']-receipt['events'][0]['start_frame'],frames)
        self.assertEqual(digest(source),before)
        self.assertLess(receipt['peak'],.98)

    def test_legacy_and_unconverted_output_still_use_original_separator(self):
        (self.root/'complete.json').write_text(json.dumps({'technical':'PASS','case':{'voice':'female'}}))
        with patch.dict(os.environ,{'JAMLOOM_SEPARATOR_PYTHON':'/isolated/python'}),patch.object(studio.subprocess,'run') as run:
            studio.separate_for_arrangement(self.root,{'LOCAL':'1'},io.StringIO())
        self.assertEqual(run.call_count,1);self.assertEqual(run.call_args.args[0][0],'/isolated/python')
        self.assertTrue(run.call_args.args[0][1].endswith('separate_spleeter.py'))
        self.assertEqual(run.call_args.kwargs['timeout'],600)

    def test_mismatched_source_receipt_and_partial_files_fail_without_fallback(self):
        receipt=self.publish();path=self.root/'complete.json'
        mutations=[lambda r:r.update(audio_sha256='0'*64),lambda r:r.update(identity_stems_sha256='0'*64),
                   lambda r:r['vocal_identity'].update(master_gain=.5),lambda r:r['vocal_identity'].update(id='am_fenrir')]
        for change in mutations:
            changed=copy.deepcopy(receipt);change(changed);path.write_text(json.dumps(changed))
            with self.subTest(receipt=changed),patch.object(studio.subprocess,'run') as run:
                with self.assertRaises(ValueError):studio.separate_for_arrangement(self.root,{},io.StringIO())
                run.assert_not_called()
        path.write_text(json.dumps(receipt))
        for folder in [self.root,self.root/'stems',self.root/'identity-stems']:
            marker=folder/'.partial';marker.touch()
            with self.assertRaises(ValueError):identity.identity_stems_ready(self.root)
            marker.unlink()
        with (self.root/'singer.wav').open('ab') as f:f.write(b'changed')
        with self.assertRaises(ValueError):identity.identity_stems_ready(self.root)

    def test_corrupt_and_symlinked_stems_are_not_accepted(self):
        self.publish();path=self.root/'stems/vocals.npy';original=path.read_bytes()
        path.write_bytes(b'corrupt')
        with self.assertRaises(ValueError):identity.identity_stems_ready(self.root)
        path.unlink();path.symlink_to(self.root/'identity-stems/vocals.npy')
        with self.assertRaises(ValueError):identity.identity_stems_ready(self.root)
        path.unlink();path.write_bytes(original)
        self.assertTrue(identity.identity_stems_ready(self.root))

    def test_invalid_source_drums_are_rejected_before_publishing(self):
        path=self.root/'identity-stems/drums.npy';np.save(path,np.zeros((10,2),dtype=np.float32),allow_pickle=False)
        with self.assertRaises(ValueError):identity.publish_identity_stems(self.root,1.)
        self.assertFalse((self.root/'stems').exists())
        self.separation['stems']['drums']=digest(path)
        (self.root/'identity-stems/complete.json').write_text(json.dumps(self.separation))
        with self.assertRaises(ValueError):identity.publish_identity_stems(self.root,1.)
        self.assertFalse((self.root/'stems').exists())

    def test_nonfinite_stems_with_matching_hash_are_rejected(self):
        path=self.root/'identity-stems/drums.npy';data=self.drums.copy();data[100,0]=np.nan
        np.save(path,data,allow_pickle=False);self.separation['stems']['drums']=digest(path)
        (self.root/'identity-stems/complete.json').write_text(json.dumps(self.separation))
        with self.assertRaises(ValueError):identity.publish_identity_stems(self.root,1.)

    def test_completed_components_cannot_be_overwritten(self):
        self.publish()
        with self.assertRaises(FileExistsError):identity.publish_identity_stems(self.root,1.)


if __name__=='__main__':unittest.main()
