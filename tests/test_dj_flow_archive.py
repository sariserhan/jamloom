import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock, patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import dj_sample_trial as trial

class FlowArchiveTests(unittest.TestCase):
    def test_each_raw_output_is_verified_before_atomic_publication(self):
        data=b'raw-wave-fixture'*100;digest=hashlib.sha256(data).hexdigest()
        with tempfile.TemporaryDirectory() as directory,patch.object(trial,'OUTPUT',Path(directory)):
            def transfer(path,**kwargs):
                self.assertEqual(kwargs['timeout'],4)
                self.assertEqual(path,f'/model-raw/2/{digest}');return io.BytesIO(data)
            self.assertEqual(trial.retain_model_raw(transfer,2,digest,4),'model-raw-2.wav')
            self.assertEqual((Path(directory)/'remote-results/model-raw-2.wav').read_bytes(),data)
            self.assertFalse(list(Path(directory).rglob('*.part')))
            with self.assertRaisesRegex(RuntimeError,'overwrite'):trial.retain_model_raw(transfer,2,digest,4)

    def test_corrupt_or_timed_out_next_raw_cannot_destroy_prior_verified_audio(self):
        for timeout in [False,True]:
            with self.subTest(timeout=timeout),tempfile.TemporaryDirectory() as directory,patch.object(trial,'OUTPUT',Path(directory)):
                folder=Path(directory)/'remote-results';folder.mkdir();prior=folder/'model-raw-0.wav';prior.write_bytes(b'verified earlier raw')
                master=Path(directory)/'house-1.wav';master.write_bytes(b'verified playable master')
                def transfer(path,**kwargs):
                    if timeout:raise TimeoutError('Raw response timed out')
                    return io.BytesIO(b'incomplete'*20)
                with self.assertRaises((RuntimeError,TimeoutError)):trial.retain_model_raw(transfer,1,'a'*64,2)
                self.assertEqual(prior.read_bytes(),b'verified earlier raw');self.assertEqual(master.read_bytes(),b'verified playable master')
                self.assertFalse((folder/'model-raw-1.wav').exists());self.assertFalse(list(folder.glob('*.part')))

    def test_invalid_references_and_expired_budget_never_transfer(self):
        transfer=Mock()
        for sequence,digest,seconds in [(-1,'a'*64,2),(12,'a'*64,2),(True,'a'*64,2),(0,'../file',2),(0,'a'*64,0),(0,'a'*64,float('nan')),(0,'a'*64,float('inf'))]:
            with self.assertRaises((ValueError,RuntimeError)):trial.retain_model_raw(transfer,sequence,digest,seconds)
        transfer.assert_not_called()

    def test_playback_must_acknowledge_exactly_two_matching_tracks(self):
        rows=[{'receipt':{'sha256':str(i)*64,'request':{'session':'test-session'}}} for i in range(2)]
        proof={'available_tracks':2,'history':['0'],'source_hashes':['0'*64,'1'*64],'session':'test-session'}
        process=Mock();process.poll.return_value=None
        with tempfile.TemporaryDirectory() as directory,patch.object(trial,'OUTPUT',Path(directory)):
            path=Path(directory)/'playback-started.json';path.write_text(json.dumps(proof))
            self.assertEqual(trial.wait_for_playback(process,rows,time.monotonic()+1),proof)
            for change in [{'available_tracks':6},{'history':[]},{'source_hashes':['9'*64,'1'*64]},{'session':'old-run'}]:
                path.write_text(json.dumps({**proof,**change}))
                with self.assertRaisesRegex(RuntimeError,'exactly two'):trial.wait_for_playback(process,rows,time.monotonic()+1)
            path.unlink();process.poll.return_value=1
            with self.assertRaisesRegex(RuntimeError,'exited'):trial.wait_for_playback(process,rows,time.monotonic()+1)
            process.poll.return_value=None
            with self.assertRaisesRegex(RuntimeError,'timed out'):trial.wait_for_playback(process,rows,time.monotonic()-1)

    def test_new_http_qualification_requires_its_own_exact_capped_permit(self):
        root=Path(__file__).resolve().parents[1]
        plan=json.loads((root/'docs/evidence/dj-flow-http-20261026/gpu-plan.json').read_text())
        with self.assertRaises(ValueError):trial.validate_model_study({**plan,'status':'PREPARED'},flow=True,http_flow=True)
        allowed={**plan,'status':'AUTHORIZED','controller_sha256':hashlib.sha256(Path(trial.__file__).read_bytes()).hexdigest(),'playback_sha256':hashlib.sha256((root/'apps/site/tests/dj-mix-comparison.mjs').read_bytes()).hexdigest(),'mixer_sha256':{name:hashlib.sha256((root/'apps/site/lib'/name).read_bytes()).hexdigest() for name in plan['mixer_sha256']}}
        trial.validate_model_study(allowed,flow=True,http_flow=True)
        with self.assertRaises(ValueError):trial.validate_model_study(allowed,flow=True)
        for key,value in [('owner_statement','finish everything'),('budget_usd',4),('max_workers',2),('max_minutes',41),('max_requests',13),('replacements',True),('public_activation',True),('controller_sha256','0'*64)]:
            with self.subTest(key=key),self.assertRaises(ValueError):trial.validate_model_study({**allowed,key:value},flow=True,http_flow=True)

    def test_continuity_flow_cannot_reuse_a_consumed_or_previous_permit(self):
        root=Path(__file__).resolve().parents[1]
        plan=json.loads((root/'docs/evidence/dj-continuity-flow-20261026/gpu-plan.json').read_text())
        with self.assertRaises(ValueError):trial.validate_model_study({**plan,'status':'PREPARED'},flow=True,http_flow=True,continuity=True)
        allowed={**plan,'status':'AUTHORIZED','owner_statement':'Approve the capped $3 continuity-flow qualification','controller_sha256':hashlib.sha256(Path(trial.__file__).read_bytes()).hexdigest(),'playback_sha256':hashlib.sha256((root/'apps/site/tests/dj-mix-comparison.mjs').read_bytes()).hexdigest(),'mixer_sha256':{name:hashlib.sha256((root/'apps/site/lib'/name).read_bytes()).hexdigest() for name in plan['mixer_sha256']}}
        trial.validate_model_study(allowed,flow=True,http_flow=True,continuity=True)
        for change in [{'status':'CONSUMED'},{'budget_usd':4},{'max_requests':13},{'owner_statement':'do all'},{'campaign':'jamloom-dj-flow-http-20261026'}]:
            with self.assertRaises(ValueError):trial.validate_model_study({**allowed,**change},flow=True,http_flow=True,continuity=True)

if __name__=='__main__':unittest.main()
