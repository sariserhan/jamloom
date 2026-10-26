import json
from pathlib import Path
import sys
import threading
import time
import unittest
import urllib.error
import urllib.request
import uuid
from http.server import HTTPServer
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_warm_engine import Renderer, handler


class WarmEngineTests(unittest.TestCase):
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
