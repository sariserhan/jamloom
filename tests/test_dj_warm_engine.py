import json
import contextlib
import io
import hashlib
from pathlib import Path
import sys
import threading
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import uuid
from unittest.mock import patch
from http.server import HTTPServer
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_warm_engine import Renderer, handler


class WarmEngineTests(unittest.TestCase):
    def test_raw_archive_uses_authenticated_renderer_and_exact_latest_receipt(self):
        from dj_sample_trial import retain_model_raw
        data=b'raw-model-output'*100
        digest=hashlib.sha256(data).hexdigest()
        renderer=Renderer(time.time()+100,1)
        renderer.requests=1  # Archiving the last allowed output must still work.
        renderer.cached=('fingerprint',{'request':{'sequence':0},'model_comparison':{'raw_sha256':digest}},b'master')
        server=HTTPServer(('127.0.0.1',0),handler(renderer,'a'*64))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def get(path,timeout=5,token='a'*64):
            return urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{server.server_port}'+path,headers={'Authorization':'Bearer '+token}),timeout=timeout)
        try:
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);(root/'results').mkdir();local=root/'local';local.mkdir()
                raw=root/'results/model-raw-0.wav';raw.write_bytes(data)
                with patch('dj_warm_engine.Path.cwd',return_value=root/'ace-step'),patch('dj_sample_trial.OUTPUT',local):
                    for path,token in [(f'/model-raw/0/{digest}','b'*64),(f'/model-raw/1/{digest}','a'*64),('/model-raw/0/'+'0'*64,'a'*64),('/model-raw/../../secret','a'*64)]:
                        with self.assertRaises(urllib.error.HTTPError) as denied:get(path,token=token)
                        self.assertEqual(denied.exception.code,403);denied.exception.close()
                    renderer.deadline=time.time()+10  # No rendering budget remains; permit final archive only.
                    self.assertEqual(retain_model_raw(get,0,digest,5),'model-raw-0.wav')
                    self.assertEqual((local/'remote-results/model-raw-0.wav').read_bytes(),data)
                    self.assertEqual(renderer.requests,1)
                    raw.write_bytes(b'corrupt')
                    with self.assertRaises(urllib.error.HTTPError) as corrupt:get(f'/model-raw/0/{digest}')
                    self.assertEqual(corrupt.exception.code,503);corrupt.exception.close()
                    raw.unlink()
                    with self.assertRaises(urllib.error.HTTPError) as missing:get(f'/model-raw/0/{digest}')
                    self.assertEqual(missing.exception.code,503);missing.exception.close()
                    renderer.deadline=time.time()-1
                    with self.assertRaises(urllib.error.HTTPError) as expired:get(f'/model-raw/0/{digest}')
                    self.assertEqual(expired.exception.code,403);expired.exception.close()
        finally:
            server.shutdown();server.server_close();thread.join()

    def test_render_failure_is_diagnosable_without_exposing_details_over_http(self):
        def rejected(*args):raise ValueError('Repaint drops accompaniment for at least 200 ms')
        renderer=Renderer(time.time()+100,1,generate=rejected)
        server=HTTPServer(('127.0.0.1',0),handler(renderer,'a'*64))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        value=dict(job=str(uuid.uuid4()),vocals=False,request=dict(version=1,session='b'*32,sequence=0,seed=1,style='house',energy=4))
        log=io.StringIO()
        try:
            req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/render',data=json.dumps(value).encode(),headers={'Authorization':'Bearer '+'a'*64})
            with contextlib.redirect_stderr(log):
                with self.assertRaises(urllib.error.HTTPError) as failed:urllib.request.urlopen(req,timeout=5)
                with failed.exception as response:
                    self.assertEqual(response.code,422)
                    self.assertNotIn(b'drops accompaniment',response.read())
            self.assertIn('drops accompaniment',log.getvalue());self.assertNotIn('a'*64,log.getvalue())
        finally:
            server.shutdown();server.server_close();thread.join()

    def test_last_request_keeps_instrumental_instead_of_exceeding_vocal_budget(self):
        calls = []
        def generate(value, directory, engine):
            calls.append(value)
            signal = .1*np.sin(np.arange(480000)*2*np.pi*220/8000)
            return np.column_stack((signal, signal)), 8000
        renderer = Renderer(time.time()+100, 1, generate=generate)
        value = dict(job=str(uuid.uuid4()), vocals=True, request=dict(version=1, session='b'*32, sequence=2, seed=1, style='house', energy=4))
        receipt, audio = renderer.render(value)
        self.assertEqual(len(calls), 1)
        self.assertIsNone(receipt['vocal'])
        self.assertEqual(receipt['vocal_check'],{'status':'request_limit','generated':False})
        self.assertEqual(renderer.render(value), (receipt, audio))

    def test_composition_receipt_survives_the_temporary_guide(self):
        def generate(value,directory,engine):
            guide=directory/'guide';guide.mkdir();(guide/'receipt.json').write_text(json.dumps({'request':value,'guide_sha256':'a'*64}))
            signal=.1*np.sin(np.arange(480000)*2*np.pi*220/8000)
            return np.column_stack((signal,signal)),8000
        renderer=Renderer(time.time()+100,1,generate=generate)
        value=dict(job=str(uuid.uuid4()),vocals=False,request=dict(version=1,session='b'*32,sequence=1,seed=1,style='house',energy=4))
        receipt,audio=renderer.render(value)
        self.assertEqual(receipt['composition']['request'],value['request']);self.assertEqual(receipt['composition']['guide_sha256'],'a'*64)
        self.assertEqual(renderer.render(value),(receipt,audio));self.assertEqual(renderer.requests,1)

    def test_guided_vocal_receipt_budget_and_replay(self):
        from unittest.mock import patch
        from dj_track_worker import composition_set
        calls=[];rate=8000
        def generate(value,directory,engine,hook=None,**kwargs):
            calls.append((hook,kwargs['guided']))
            signal=.1*np.sin(np.arange((10 if hook else 60)*rate)*2*np.pi*220/rate)
            if hook:signal[:rate//10]=0;signal[rate:]=0
            else:
                guide=directory/'guide';guide.mkdir();(guide/'receipt.json').write_text(json.dumps({'request':value,'guide_sha256':'a'*64}))
            return np.column_stack((signal,signal)),rate
        renderer=Renderer(time.time()+100,2,generate=composition_set)
        value=dict(job=str(uuid.uuid4()),vocals=True,request=dict(version=1,session='b'*32,sequence=12,seed=1,style='bass',energy=4))
        with patch('dj_track_worker.ace',side_effect=generate),patch('dj_vocal.steady_grid',return_value=(140.,0.,[(10.,46.)])):
            receipt,audio=renderer.render(value)
            self.assertEqual(renderer.render(value),(receipt,audio));self.assertEqual(renderer.requests,2)
        self.assertEqual(calls[0],(None,True));self.assertFalse(calls[1][1]);self.assertIsNotNone(calls[1][0])
        self.assertTrue(receipt['vocal']['repeat']);self.assertTrue(receipt['vocal']['echo'])
        self.assertEqual(receipt['vocal_check']['status'],'placed');self.assertTrue(receipt['vocal_check']['generated'])
        self.assertEqual(receipt['vocal_check']['source_phrase']['end'],1)
        self.assertEqual(receipt['composition']['request'],value['request'])

    def test_bounded_authenticated_idempotent_renderer(self):
        calls = []
        def generate(value, directory, engine):
            calls.append(value)
            signal = .1*np.sin(np.arange(480000)*2*np.pi*220/8000)
            return np.column_stack((signal, signal)), 8000
        renderer = Renderer(time.time()+100, 1, generate=generate)
        server = HTTPServer(('127.0.0.1', 0), handler(renderer, 'a'*64))
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        value = dict(job=str(uuid.uuid4()), vocals=True, request=dict(version=1, session='b'*32, sequence=0, seed=1, style='house', energy=4))
        def post(data=value, token='a'*64):
            req = urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/render', data=json.dumps(data).encode(), headers={'Authorization': 'Bearer '+token})
            with urllib.request.urlopen(req, timeout=5) as response:
                return json.loads(response.headers['X-Jamloom-Receipt']), response.read()
        def health(token='a'*64):
            req = urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/health', headers={'Authorization': 'Bearer '+token})
            with urllib.request.urlopen(req, timeout=5) as response:
                return json.load(response)
        try:
            with self.assertRaises(urllib.error.HTTPError) as denied: health(token='b'*64)
            self.assertEqual(denied.exception.code, 403)
            self.assertTrue(health()['ready']); self.assertEqual(calls, [])
            deadline = renderer.deadline
            renderer.deadline = time.time()+80
            with self.assertRaises(urllib.error.HTTPError) as expired: health()
            self.assertEqual(expired.exception.code, 503)
            renderer.deadline = deadline
            with self.assertRaises(urllib.error.HTTPError) as denied: post(token='b'*64)
            self.assertEqual(denied.exception.code, 403); self.assertEqual(calls, [])
            receipt, audio = post(); self.assertEqual(len(audio), 11520044)
            self.assertEqual(receipt['request'], value['request']); self.assertEqual(post(), (receipt, audio)); self.assertEqual(len(calls), 1)
            with self.assertRaises(urllib.error.HTTPError) as exhausted: health()
            self.assertEqual(exhausted.exception.code, 503)
            with self.assertRaises(urllib.error.HTTPError): post({**value, 'request': {**value['request'], 'seed': 2}})
            with self.assertRaises(urllib.error.HTTPError): post({**value, 'job': str(uuid.uuid4())})
            renderer.deadline = time.time()
            with self.assertRaises(urllib.error.HTTPError): post()
            self.assertEqual(len(calls), 1)
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == '__main__': unittest.main()
