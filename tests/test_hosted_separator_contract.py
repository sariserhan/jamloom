"""The worker separator must accept both product duration contracts."""
import json
from pathlib import Path
import tempfile
import unittest
import wave
from unittest.mock import patch
import numpy as np
from services.runpod import separate_spleeter as separator


class HostedSeparatorContract(unittest.TestCase):
    def write_source(self,path,seconds,channels=2,rate=48000):
        with wave.open(str(path),'wb') as output:
            output.setparams((channels,2,rate,0,'NONE','not compressed'))
            chunk=np.full((rate,channels),321,dtype='<i2').tobytes()
            for _ in range(seconds): output.writeframesraw(chunk)

    def test_both_product_endpoints_preserve_all_frames_and_samples(self):
        limits=json.loads((separator.ROOT/'assets/manifests/song-durations.json').read_text())
        for product,bounds in limits.items():
            for seconds in {bounds['min'],bounds['max']}:
                with self.subTest(product=product,seconds=seconds), tempfile.TemporaryDirectory() as directory:
                    source=Path(directory)/'source.wav';self.write_source(source,seconds)
                    pcm=separator.read_source(source)
                    self.assertEqual(pcm.shape,(seconds*48000,2))
                    self.assertTrue(np.all(pcm==np.float32(321/32768)))

    def test_invalid_lengths_formats_and_truncation_fail_before_model_loading(self):
        for seconds,channels,rate,truncated in [(29,2,48000,False),(46,2,48000,False),
                (99,2,48000,False),(141,2,48000,False),(30,1,48000,False),
                (30,2,44100,False),(30,2,48000,True)]:
            with self.subTest(seconds=seconds,channels=channels,rate=rate,truncated=truncated), tempfile.TemporaryDirectory() as directory:
                source=Path(directory)/'source.wav';self.write_source(source,seconds,channels,rate)
                if truncated:
                    with source.open('r+b') as file:file.truncate(source.stat().st_size-4)
                with self.assertRaises(ValueError):separator.read_source(source)

    def test_maximum_length_overlap_add_keeps_last_frame(self):
        # Real product frame count, using a deterministic stub instead of a model.
        frames=140*44100
        audio=np.zeros((frames,2),np.float32);audio[0]=[.2,-.1];audio[-1]=[-.3,.4]
        def predict(chunk):return {name:chunk*.25 for name in ('vocals','drums','bass','other')}
        stems=separator.overlap_add(audio,predict)
        np.testing.assert_allclose(sum(stems.values()),audio,atol=1e-7)
        self.assertTrue(all(value.shape==audio.shape for value in stems.values()))

if __name__=='__main__':unittest.main()
