"""Candidate overlap orchestration and PCM parity, without GPU/model execution."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import vocal_identity as identity


class IdentityPreloadTests(unittest.TestCase):
    def command(self,code,folder):
        return [sys.executable,'-c',code,str(folder)]

    def test_real_processes_overlap_and_keep_the_same_source_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            prefix='from pathlib import Path; import sys,time; p=Path(sys.argv[1]); '
            # Each process needs the other to start; sequential execution times out.
            separator=prefix+"(p/'separate-start').touch()\nwhile not (p/'load-start').exists(): time.sleep(.01)\n(p/'stems').write_bytes(b'unchanged stems')"
            converter=prefix+"(p/'load-start').touch()\nwhile not (p/'stems').exists(): time.sleep(.01)\n(p/'result').write_bytes((p/'stems').read_bytes())"
            identity.run_preloaded_identity(self.command(converter,root),self.command(separator,root),os.environ.copy(),timeout=5)
            self.assertEqual((root/'result').read_bytes(),b'unchanged stems')

    def test_failures_timeout_and_launch_error_reap_every_started_process(self):
        real_popen=subprocess.Popen
        for mode in ('separator','converter','timeout','conversion-timeout','launch'):
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as folder:
                children=[]
                sleeper=self.command('import time;time.sleep(60)',folder)
                failure=self.command('raise SystemExit(3)',folder)
                def launch(command,**kwargs):
                    if mode=='launch' and children:raise OSError('fixture launch failure')
                    child=real_popen(command,**kwargs);children.append(child);return child
                with patch.object(identity.subprocess,'Popen',side_effect=launch):
                    with self.assertRaises((RuntimeError,TimeoutError,subprocess.TimeoutExpired,OSError)):
                        separator=failure if mode=='separator' else self.command('pass',folder) if mode=='conversion-timeout' else sleeper
                        identity.run_preloaded_identity(failure if mode=='converter' else sleeper,
                            separator,os.environ.copy(),timeout=.4)
                self.assertTrue(children)
                self.assertTrue(all(child.poll() is not None for child in children))

    def fixture(self,root):
        import numpy as np
        import soundfile as sf
        stem=np.tile(np.linspace(-.1,.1,48000,dtype=np.float32)[:,None],(1,2))
        sf.write(root/'base.wav',stem*2,48000,subtype='PCM_16')
        stems=root/'identity-stems';stems.mkdir()
        np.save(stems/'vocals.npy',stem,allow_pickle=False)
        digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
        receipt={'audio_sha256':digest(root/'base.wav'),'case':{'duration':1}}
        (stems/'complete.json').write_text(json.dumps({'technical':'PASS','source_sha256':receipt['audio_sha256'],
            'stems':{'vocals':digest(stems/'vocals.npy')}}))
        return receipt

    def test_sequential_and_preload_read_identical_pcm_without_advancing_random_state(self):
        import numpy as np
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);receipt=self.fixture(root)
            first=root/'sequential';first.mkdir();second=root/'preloaded';second.mkdir()
            np.random.seed(42);before=np.random.get_state()
            original,stem=identity.conversion_source(root,receipt,first)
            other_original,other_stem=identity.conversion_source(root,receipt,second,wait=True)
            after=np.random.get_state()
            np.testing.assert_array_equal(original,other_original);np.testing.assert_array_equal(stem,other_stem)
            self.assertEqual((first/'source.wav').read_bytes(),(second/'source.wav').read_bytes())
            for left,right in zip(before,after):np.testing.assert_equal(left,right)

    def test_partial_invalid_and_changed_stems_cannot_publish_conversion_input(self):
        for mode in ('partial','failed','tampered'):
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as folder:
                root=Path(folder);receipt=self.fixture(root);work=root/'work';work.mkdir()
                stems=root/'identity-stems'
                if mode=='partial':(stems/'.partial').touch()
                elif mode=='failed':
                    path=stems/'complete.json';data=json.loads(path.read_text());data['technical']='FAIL';path.write_text(json.dumps(data))
                else:(stems/'vocals.npy').write_bytes(b'changed')
                with self.assertRaises(ValueError):identity.conversion_source(root,receipt,work)
                self.assertFalse((work/'source.wav').exists())

    def test_conversion_recipe_and_export_match_with_fixture_models(self):
        import numpy as np
        import soundfile as sf
        # Exercise convert itself; fake models isolate scheduling from expensive inference.
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);upstream=root/'build-style-training/seed-vc';upstream.mkdir(parents=True)
            models=root/'build-style-training/vocal-identity/Plachta--Seed-VC';models.mkdir(parents=True)
            checkpoint=models/'DiT_seed_v2_uvit_whisper_base_f0_44k_bigvgan_pruned_ft_ema_v2.pth';checkpoint.write_bytes(b'fixture model')
            config=models/'config_dit_mel_seed_uvit_whisper_base_f0_44k.yml'
            config.write_text(json.dumps({'model_params':{'vocoder':{},'speech_tokenizer':{}}}))
            digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
            manifest=root/'models.json';manifest.write_text(json.dumps({'Plachta/Seed-VC':{'files':{
                p.name:{'sha256':digest(p)} for p in (checkpoint,config)}}}))
            target=root/'assets/singer-identities/am_michael.wav';target.parent.mkdir(parents=True)
            sf.write(target,np.linspace(-.1,.1,44100),44100,subtype='PCM_16')
            references=root/'references.json';references.write_text(json.dumps({'references':{'am_michael':{
                'source_sha256':identity.IDENTITIES['am_michael']['sha256'],'sha256':digest(target)}}}))
            seeds=[];recipes=[];outputs=[];cwd=Path.cwd()
            try:
                for preload in (False,True):
                    output=root/str(preload);output.mkdir();receipt=self.fixture(output)
                    receipt['case'].update(seed=42,voice='male',vocal_identity='am_michael')
                    (output/'base.complete.json').write_text(json.dumps(receipt));(output/'.partial').touch()
                    def load(args):
                        self.assertEqual(Path(args.source).exists(),not preload)
                        recipes.append({key:value for key,value in vars(args).items() if key not in ('source','target','output','config')})
                        np.random.random(10)
                        return (None,None,lambda:np.array([1.]),None)
                    def generate(args):
                        Path(args.output).mkdir()
                        sf.write(Path(args.output)/'fixture.wav',np.random.uniform(-.1,.1,44100),44100,subtype='FLOAT')
                    inference=SimpleNamespace(load_models=load,main=generate)
                    with patch.object(identity,'ROOT',root),patch.object(identity,'MODEL_MANIFEST',manifest),\
                            patch.object(identity,'REFERENCE_MANIFEST',references),\
                            patch.object(identity.subprocess,'check_output',side_effect=[identity.CODE,b'']),\
                            patch.dict(sys.modules,{'torch':SimpleNamespace(Tensor=type('FixtureTensor',(),{}),set_num_threads=lambda n:None,manual_seed=seeds.append),
                                                   'torchaudio':SimpleNamespace(),'inference':inference,
                                                   'yaml':SimpleNamespace(safe_load=json.loads,safe_dump=json.dumps)}),\
                            patch.dict(os.environ,{'JAMLOOM_IDENTITY_STEMS':'0'}):
                        identity.convert(output,'am_michael',preload)
                    self.assertFalse((output/'.partial').exists())
                    self.assertEqual(json.loads((output/'complete.json').read_text())['audio_sha256'],digest(output/'singer.wav'))
                    outputs.append((output/'singer.wav').read_bytes())
            finally:os.chdir(cwd)
            self.assertEqual(seeds,[42,42]);self.assertEqual(recipes[0],recipes[1]);self.assertEqual(outputs[0],outputs[1])

    def test_stem_wait_has_a_deadline(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(identity.time,'monotonic',side_effect=[0,601]):
                with self.assertRaises(TimeoutError):identity.conversion_source(Path(folder),{},Path(folder),wait=True)

    def test_preload_requires_explicit_hosted_opt_in_and_preserves_failed_base(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);runtime=root/'.venv-vocal-identity/bin/python';runtime.parent.mkdir(parents=True);runtime.touch()
            output=root/'song';output.mkdir();(output/'singer.wav').write_bytes(b'base')
            receipt={'case':{'voice':'male','vocal_identity':'am_michael'}}
            (output/'complete.json').write_text(json.dumps(receipt))
            with patch.object(identity,'ROOT',root),patch.dict(os.environ,{
                    'JAMLOOM_IDENTITY_PRELOAD':'1','JAMLOOM_SEPARATOR_PYTHON':'/cpu/python'}),\
                    patch.object(identity,'run_preloaded_identity',side_effect=RuntimeError('fixture failure')) as overlap:
                with self.assertRaisesRegex(RuntimeError,'fixture failure'):identity.finish_identity(output)
            conversion,separation,env=overlap.call_args.args
            self.assertIn('--preload',conversion);self.assertEqual(separation[0],'/cpu/python')
            self.assertEqual(env['HF_HUB_OFFLINE'],'1')
            self.assertFalse((output/'complete.json').exists());self.assertFalse((output/'singer.wav').exists())
            self.assertTrue((output/'.partial').exists());self.assertEqual((output/'base.wav').read_bytes(),b'base')


if __name__=='__main__':unittest.main()
