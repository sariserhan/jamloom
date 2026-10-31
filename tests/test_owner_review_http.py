import base64
import http.client
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import review_serve
from owner_review_server import Handler


class LocalSaveBoundary(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();root=Path(self.temp.name);self.public=root/'public';self.public.mkdir();(self.public/'index.html').write_text('Owner review')
        self.results=root/'private';self.results.mkdir();self.previous=review_serve.ROOT;review_serve.ROOT=self.public
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);self.server.review_token='private-test-token';self.server.results=self.results
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start();self.origin='http://127.0.0.1:'+str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join();review_serve.ROOT=self.previous;self.temp.cleanup()

    def post(self,body,**extra):
        headers={'Origin':self.origin,'Content-Type':'application/json','X-Review-Token':'private-test-token',**extra}
        conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port);conn.request('POST','/api/save',json.dumps(body),headers);r=conn.getresponse();data=r.read();conn.close();return r.status,data

    def observation(self):return {'kind':'novice','payload':dict(schema='jamloom-dj-novice-1',beginner=True,attested=True,before=['0']*6,after=['1']*6,beforeAt='1',lessonAt='2',afterAt='3',reflection='Synthetic boundary fixture only')}

    def test_cross_origin_missing_token_and_incomplete_forms_never_write(self):
        self.assertEqual(self.post(self.observation(),Origin='https://unrelated.example')[0],403)
        self.assertEqual(self.post(self.observation(),**{'X-Review-Token':''})[0],403)
        value=self.observation();value['payload']['attested']=False;self.assertEqual(self.post(value)[0],400)
        self.assertEqual(list(self.results.iterdir()),[])

    def test_valid_observations_are_append_only_and_private(self):
        self.assertEqual(self.post(self.observation())[0],200);self.assertEqual(self.post(self.observation())[0],200)
        files=list(self.results.glob('*.json'));self.assertEqual(len(files),2)
        for path in files:
            self.assertEqual(json.loads(path.read_text())['status'],'OWNER_SUBMITTED_REQUIRES_EVALUATION')
            conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port);conn.request('GET','/../private/'+path.name);r=conn.getresponse();r.read();conn.close();self.assertEqual(r.status,404)

    def test_registered_studies_preserve_old_saves_and_reject_unknown_freezes(self):
        registry={'old':'music','new':'music-excerpts'}
        (self.public/'music-studies.json').write_text(json.dumps(registry))
        row={'attested':True,'pairs':{p:'tie' for p in ('AB','AC','AD','BC','BD','CD')},'distinct_pairs':{p:'yes' for p in ('AB','AC','AD','BC','BD','CD')}}
        for code in 'ABCD':row[code]=dict(recognizable='yes',share='no',technical_failure='no',groove='3',coherence='3',originality='3',enjoyment='3')
        for freeze,folder in registry.items():
            path=self.public/folder;path.mkdir();study=dict(freeze=freeze,blocks=[{'id':'b'}]);(path/'study.json').write_text(json.dumps(study))
            payload=dict(version=2,listener='owner',freeze=freeze,audio=study['blocks'],ratings={'b':row})
            self.assertEqual(self.post(dict(kind='music',payload=payload))[0],200)
        payload['freeze']='unknown'
        self.assertEqual(self.post(dict(kind='music',payload=payload))[0],400)
        registry['unknown']='../private';(self.public/'music-studies.json').write_text(json.dumps(registry))
        self.assertEqual(self.post(dict(kind='music',payload=payload))[0],400)
        self.assertEqual(len(list(self.results.glob('*.json'))),2)

    def test_hands_on_failed_attempt_is_preserved_and_reversed_order_rejected(self):
        payload=dict(schema='jamloom-dj-hands-on-1',attested=True,
            before=dict(recordedAt='1',outcome='incomplete',attempts='2',notes='QA fixture'),
            lessonAt='2',after=dict(recordedAt='3',outcome='assisted',attempts='3',notes='QA fixture'),
            environment='QA fixture',clarity='2',enjoyment='3',problems='QA fixture')
        self.assertEqual(self.post(dict(kind='practice',payload=payload))[0],200)
        saved=json.loads(next(self.results.glob('*.json')).read_text())
        self.assertEqual(saved['payload']['before']['outcome'],'incomplete')
        self.assertEqual(saved['payload']['after']['outcome'],'assisted')
        self.assertEqual(saved['status'],'OWNER_SUBMITTED_REQUIRES_EVALUATION')
        payload['lessonAt']='0'
        self.assertEqual(self.post(dict(kind='practice',payload=payload))[0],400)
        self.assertEqual(len(list(self.results.glob('*.json'))),1)

    def test_incomplete_music_is_saved_only_as_a_draft_never_as_a_completed_judgment(self):
        folder=self.public/'music';folder.mkdir();study=dict(freeze='draft-fixture',blocks=[{'id':'b'}]);(folder/'study.json').write_text(json.dumps(study))
        payload=dict(version=2,listener='owner',freeze=study['freeze'],audio=study['blocks'],ratings={'b':{'A':{'enjoyment':'2'}}})
        self.assertEqual(self.post(dict(kind='music-draft',payload=payload))[0],200)
        self.assertEqual(self.post(dict(kind='music',payload=payload))[0],400)
        receipt=json.loads(next(self.results.glob('*.json')).read_text());self.assertEqual(receipt['kind'],'music-draft');self.assertNotIn('attested',receipt['payload']['ratings']['b'])
        payload['ratings']['b']['A']['enjoyment']='99'
        self.assertEqual(self.post(dict(kind='music-draft',payload=payload))[0],400)
        self.assertEqual(len(list(self.results.glob('*.json'))),1)

    def test_five_candidate_study_saves_partial_then_complete_with_exact_freeze(self):
        from neural_review_policy import SCHEMA,review_fields
        folder=self.public/'music';folder.mkdir();study=dict(review_schema=SCHEMA,freeze='five-fixture',blocks=[{'id':'b'}]);(folder/'study.json').write_text(json.dumps(study))
        codes,numeric,binary,pairs=review_fields(study)
        row={c:{**{f:'3' for f in numeric},**{f:'no' for f in binary}} for c in codes}
        payload=dict(version=2,listener='owner',freeze=study['freeze'],audio=study['blocks'],ratings={'b':row})
        self.assertEqual(self.post(dict(kind='music-draft',payload=payload))[0],200)
        self.assertEqual(self.post(dict(kind='music',payload=payload))[0],400)
        row.update(attested=True,pairs={p:'tie' for p in pairs},distinct_pairs={p:'no' for p in pairs})
        self.assertEqual(self.post(dict(kind='music',payload=payload))[0],200)
        self.assertEqual(len(list(self.results.glob('*.json'))),2)


if __name__=='__main__':unittest.main()
