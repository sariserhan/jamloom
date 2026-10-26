import hashlib
import json
from pathlib import Path
import subprocess
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
            def transfer(args,**kwargs):
                self.assertNotIn('-r',args);self.assertEqual(kwargs['timeout'],4)
                self.assertIn('/workspace/results/model-raw-2.wav',args[-2]);Path(args[-1]).write_bytes(data)
            with patch.object(trial.subprocess,'run',side_effect=transfer):
                self.assertEqual(trial.retain_model_raw(['scp'],'host.example',2,digest,4),'model-raw-2.wav')
            self.assertEqual((Path(directory)/'remote-results/model-raw-2.wav').read_bytes(),data)
            self.assertFalse(list(Path(directory).rglob('*.part')))
            with self.assertRaisesRegex(RuntimeError,'overwrite'):trial.retain_model_raw(['scp'],'host.example',2,digest,4)

    def test_corrupt_or_timed_out_next_raw_cannot_destroy_prior_verified_audio(self):
        for timeout in [False,True]:
            with self.subTest(timeout=timeout),tempfile.TemporaryDirectory() as directory,patch.object(trial,'OUTPUT',Path(directory)):
                folder=Path(directory)/'remote-results';folder.mkdir();prior=folder/'model-raw-0.wav';prior.write_bytes(b'verified earlier raw')
                master=Path(directory)/'house-1.wav';master.write_bytes(b'verified playable master')
                def transfer(args,**kwargs):
                    Path(args[-1]).write_bytes(b'incomplete'*20)
                    if timeout:raise subprocess.TimeoutExpired(args,kwargs['timeout'])
                with patch.object(trial.subprocess,'run',side_effect=transfer):
                    with self.assertRaises((RuntimeError,subprocess.TimeoutExpired)):trial.retain_model_raw(['scp'],'host.example',1,'a'*64,2)
                self.assertEqual(prior.read_bytes(),b'verified earlier raw');self.assertEqual(master.read_bytes(),b'verified playable master')
                self.assertFalse((folder/'model-raw-1.wav').exists());self.assertFalse(list(folder.glob('*.part')))

    def test_invalid_references_and_expired_budget_never_transfer(self):
        with patch.object(trial.subprocess,'run') as transfer:
            for sequence,digest,host,seconds in [(-1,'a'*64,'host',2),(12,'a'*64,'host',2),(True,'a'*64,'host',2),(0,'../file','host',2),(0,'a'*64,'host;command',2),(0,'a'*64,'host',0),(0,'a'*64,'host',float('nan')),(0,'a'*64,'host',float('inf'))]:
                with self.assertRaises((ValueError,RuntimeError)):trial.retain_model_raw(['scp'],host,sequence,digest,seconds)
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

if __name__=='__main__':unittest.main()
