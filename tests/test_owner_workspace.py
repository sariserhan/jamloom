import copy
from pathlib import Path
import sys
import json
import tempfile
from unittest.mock import patch
from types import SimpleNamespace
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluate_owner_workspace import reference_groups,novice_result,music_summary
from owner_review_server import validate_music


class OwnerWorkspace(unittest.TestCase):
    def test_low_disk_stops_review_before_creating_output(self):
        from prepare_strategy_review import prepare
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);batch=root/'batch';batch.mkdir()
            (batch/'report.json').write_text(json.dumps(dict(technical='PASS',records=[dict(id='source',seed=1,seconds=30)])))
            with patch('prepare_strategy_review.shutil.disk_usage',return_value=SimpleNamespace(free=15*1024**3)):
                with self.assertRaisesRegex(RuntimeError,'15 GiB reserve'):prepare(batch,root/'review')
            self.assertFalse((root/'review').exists())

    def test_performer_and_transitive_shared_origins_cannot_leak(self):
        rows=[dict(session_id=str(i),speaker_id=str(i),phrase_id=str(i),sha256=str(i),performer_group='same-maker') for i in range(3)]
        self.assertEqual(reference_groups(rows),[[0,1,2]])
        for i,row in enumerate(rows):row['performer_group']=str(i)
        rows[1]['speaker_id']='0';rows[2]['phrase_id']='1'
        self.assertEqual(reference_groups(rows),[[0,1,2]])
        rows[0]['session_id']='unknown'
        with self.assertRaises(ValueError):reference_groups(rows)

    def test_real_observation_is_required_and_no_gain_is_not_called_improvement(self):
        row=dict(schema='jamloom-dj-novice-1',attested=True,beginner=True,beforeAt='1',lessonAt='2',afterAt='3',before=['0','1','2','0','1','1'],after=['1','0','2','0','1','1'])
        result=novice_result(row);self.assertEqual(result['change'],0);self.assertFalse(result['observed_improvement'])
        row['attested']=False
        with self.assertRaises(ValueError):novice_result(row)

    def test_changed_audio_incomplete_ratings_and_empty_results_cannot_pass(self):
        study={'freeze':'f','blocks':[{'id':'b','source_id':'s','kind':'speech','audio_sha256':{'A':'a'}}]}
        key={'freeze':'f','blocks':[{'id':'b','mapping':dict(A='baseline',B='half_time',C='broken_pulse',D='offbeat_dub')}]}
        result=music_summary(study,key,[]);self.assertEqual(result['status'],'NOT RUN');self.assertFalse(result['all_blocks_complete'])
        payload={'version':2,'listener':'owner','freeze':'f','audio':study['blocks'],'ratings':{'b':{'attested':True,'distinct':'yes'}}}
        with self.assertRaises(ValueError):validate_music(payload,study)
        for c in 'ABCD':payload['ratings']['b'][c]=dict(recognizable='yes',share='yes',technical_failure='no',groove='4',coherence='4',originality='4',enjoyment='4')
        payload['ratings']['b']['pairs']={p:'tie' for p in ('AB','AC','AD','BC','BD','CD')}
        with self.assertRaises(ValueError):validate_music(payload,study)
        payload['ratings']['b']['distinct_pairs']={p:'yes' for p in ('AB','AC','AD','BC','BD','CD')};validate_music(payload,study)
        payload['ratings']['b']['distinct_pairs']['BC']='no'
        result=music_summary(study,key,[payload]);self.assertEqual(result['owner_reports_three_generated_compositions_distinct'],0)
        changed=copy.deepcopy(payload);changed['audio'][0]['audio_sha256']['A']='changed'
        with self.assertRaises(ValueError):validate_music(changed,study)


if __name__=='__main__':unittest.main()
