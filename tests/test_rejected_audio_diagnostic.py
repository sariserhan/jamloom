import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import wave

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('diagnostic_worker',ROOT/'services/runpod/handler.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)


class RejectedDiagnostic(unittest.TestCase):
    def test_only_explicit_valid_rejected_audio_is_staged_and_request_still_fails(self):
        for retained,accepted,changed in [(False,False,False),(True,False,False),(True,True,False),(True,False,True)]:
            with self.subTest(retained=retained,accepted=accepted,changed=changed):
                paths=[];uploads=[]
                def execute(work,timeout):
                    paths.append(work);(work/'singer').mkdir()
                    with wave.open(str(work/'singer/singer.wav'),'wb') as wav:
                        wav.setparams((2,2,48000,0,'NONE',''));wav.writeframes(b'\0'*(100*192000))
                    sha=hashlib.sha256((work/'singer/singer.wav').read_bytes()).hexdigest()
                    (work/'fit.json').write_text(json.dumps(dict(accepted=accepted,audio_sha256='changed' if changed else sha)))
                    raise worker.GenerationFailure('style-rejected:matched-1-of-4')
                class Response:
                    status=200
                    def __enter__(self):return self
                    def __exit__(self,*args):pass
                class Opener:
                    def open(self,request,**kwargs):uploads.append(request);return Response()
                job=dict(product='music-dna',timeout_seconds=900,payload={'duration_seconds':100},output_url='https://fixture.invalid/output',retain_rejected_audio=retained)
                with patch.object(worker,'validate',return_value=job),patch.object(worker,'execute',side_effect=execute),patch('urllib.request.build_opener',return_value=Opener()):
                    with self.assertRaisesRegex(RuntimeError,'no completed song was accepted'):worker.handler({'input':job})
                self.assertEqual(len(uploads),int(retained and not accepted and not changed))
                self.assertFalse(paths[0].exists())

    def test_retention_cannot_be_enabled_for_other_products_or_non_boolean_values(self):
        job=dict(id='a'*32,product='music-dna',timeout_seconds=900,output_url='fixture',payload={})
        for value,product in [('true','music-dna'),(1,'music-dna'),(True,'improvise')]:
            with patch.object(worker,'storage_url'),self.assertRaisesRegex(ValueError,'Invalid diagnostic retention'):
                worker.validate({**job,'product':product,'retain_rejected_audio':value})


if __name__=='__main__':unittest.main()
