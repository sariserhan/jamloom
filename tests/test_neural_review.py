import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from neural_review_policy import review_fields,SCHEMA
from owner_review_server import validate_music,validate_music_draft
from evaluate_neural_review import summarize

class NeuralReview(unittest.TestCase):
    def fixture(self):
        study=dict(review_schema=SCHEMA,freeze='qa-only',blocks=[dict(id=f'b{i}',source_id=f's{i}',kind='speech') for i in range(20)])
        codes,numeric,binary,pairs=review_fields(study)
        key=dict(freeze=study['freeze'],blocks=[dict(id=b['id'],mapping=dict(zip(codes,['jazz','funk','drumandbass','old_baseline','stock_baseline']))) for b in study['blocks']])
        row=dict(attested=True,pairs={p:p[0] for p in pairs},distinct_pairs={p:'yes' for p in pairs})
        for c in codes:row[c]={**{f:'5' for f in numeric},**{f:'yes' for f in binary},'technical_failure':'no'}
        payload=dict(version=2,listener='owner',freeze=study['freeze'],audio=study['blocks'],ratings={b['id']:copy.deepcopy(row) for b in study['blocks']})
        return study,key,payload

    def test_fifth_candidate_and_extended_fields_cannot_be_skipped(self):
        study,key,payload=self.fixture();validate_music(payload,study)
        del payload['ratings']['b0']['E']['phrasing']
        validate_music_draft(payload,study)
        with self.assertRaises(ValueError):validate_music(payload,study)
        study.pop('review_schema')
        with self.assertRaises(ValueError):validate_music_draft(payload,study)

    def test_missing_stale_and_failed_judgments_cannot_qualify(self):
        study,key,payload=self.fixture()
        self.assertEqual(summarize(study,key,[])['status'],'NOT RUN')
        stale=copy.deepcopy(payload);stale['freeze']='old'
        self.assertEqual(summarize(study,key,[stale])['status'],'NOT RUN')
        self.assertEqual(summarize(study,key,[payload])['status'],'PASS owner listening thresholds')
        payload['ratings']['b0']['A']['technical_failure']='yes'
        self.assertEqual(summarize(study,key,[payload])['status'],'FAIL owner listening thresholds')
        del payload['ratings']['b19']
        self.assertEqual(summarize(study,key,[payload])['status'],'PARTIAL')

if __name__=='__main__':unittest.main()
