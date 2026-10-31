import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_neural_review import collect_local,matched_audio


def write(path,value):path.write_text(json.dumps(value))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


class LocalNeuralReview(unittest.TestCase):
    def test_running_changed_source_and_out_of_bounds_cannot_enter_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();folder=root/'renders/trial';folder.mkdir(parents=True)
            manifest=root/'renders/neural-qualification-20261030/manifest.json';manifest.parent.mkdir();manifest.write_text('{}')
            audio=folder/'performance.wav';audio.write_bytes(b'isolated unit fixture')
            fixture=dict(label='one-funk',source_id='one',genre='funk',energy='medium')
            data=dict(fixtures=[fixture],sources=[dict(id='one',sha256='original',seconds=4)])
            result=dict(fixture=fixture,status='PASS technical',sha256=sha(audio),source_sha256='original')
            write(folder/'result.json',result);write(folder/'execution.json',dict(status='PASS technical',child_stopped=True))
            arrangement=dict(original_recording_sha256='original',sample_used=True,events=[{}],source_excerpt=dict(original_seconds=[0,4]),musical_direction=dict(genre='funk',energy='medium'))
            write(folder/'arrangement.json',arrangement)
            state=dict(status='RUNNING',manifest_sha256=sha(manifest),prior_local_pilot=str(folder),completed=[])
            campaign=root/'campaign.json';write(campaign,state)
            with self.assertRaisesRegex(ValueError,'stop'):collect_local(root,data,campaign,{})
            state['status']='PASS local technical coverage';write(campaign,state)
            archive=folder/'studio-preservation.tar.xz'
            with archive.open('wb') as stream:stream.truncate(19*1024**2)
            write(folder/'archive.json',dict(status='PASS byte-exact archive',archive_sha256=sha(archive)))
            with patch('prepare_neural_review.read_pcm',return_value=np.array([.1,-.1])):
                records={};collect_local(root,data,campaign,records);self.assertEqual(set(records),{'one-funk'})
                arrangement['source_excerpt']['original_seconds']=[0,5];write(folder/'arrangement.json',arrangement)
                with self.assertRaises(AssertionError):collect_local(root,data,campaign,{})
                arrangement['source_excerpt']['original_seconds']=[0,4];write(folder/'arrangement.json',arrangement)
                result['source_sha256']='wrong';write(folder/'result.json',result)
                with self.assertRaises(AssertionError):collect_local(root,data,campaign,{})
                result['source_sha256']='original';write(folder/'result.json',result)
                with archive.open('ab') as stream:stream.write(b'changed')
                with self.assertRaises(AssertionError):collect_local(root,data,campaign,{})

    def test_compact_listening_copy_is_lossless_after_level_matching(self):
        import soundfile as sf
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);source=root/'source.wav';target=root/'candidate.flac'
            t=np.arange(3*48000)/48000
            sf.write(source,np.repeat((.1*np.sin(2*np.pi*220*t))[:,None],2,axis=1),48000,subtype='PCM_16')
            gain,proof=matched_audio(source,target,compact=True)
            self.assertEqual(len(proof['lossless_pcm_sha256']),64)
            pcm,rate=sf.read(target);self.assertEqual(rate,48000);self.assertEqual(pcm.shape,(3*48000,2))
            self.assertLess(abs(float(proof['input_i'])+23),.15)
            with self.assertRaisesRegex(ValueError,'Preserve'):matched_audio(source,target,compact=True)

if __name__=='__main__':unittest.main()
