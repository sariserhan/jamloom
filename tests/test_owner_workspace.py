import copy
import hashlib
from pathlib import Path
import sys
import json
import tempfile
from unittest.mock import patch
from types import SimpleNamespace
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluate_owner_workspace import reference_groups,novice_result,music_summary,evaluate
from owner_review_server import validate_music


class OwnerWorkspace(unittest.TestCase):
    def test_recorded_quiet_control_uses_the_frozen_composition_policy(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'results').mkdir();(root/'review').mkdir()
            study=dict(freeze='current',source_report_sha256='report',blocks=[])
            (root/'review/study.json').write_text(json.dumps(study));(root/'organizer-key.json').write_text(json.dumps(dict(freeze='current',blocks=[])))
            policy=dict(freeze='current',source_report_sha256='report',composition_policy='selected_excerpt_prompt_response')
            (root/'evaluation-policy.json').write_text(json.dumps(policy))
            audio=root/'results/quiet.wav';audio.write_bytes(b'isolated QA fixture')
            payload=dict(file=audio.name,sha256=hashlib.sha256(audio.read_bytes()).hexdigest())
            (root/'results/quiet.json').write_text(json.dumps(dict(status='OWNER_SUBMITTED_REQUIRES_EVALUATION',kind='silence',payload=payload)))
            with patch('arrange_voice_research.read_pcm',return_value=None),patch('source_excerpt_response.compose',side_effect=ValueError('silence')) as revised,patch('source_strategy_response.compose') as old:
                result=evaluate(root,root)
                self.assertEqual(result['recorded_silence'][0]['status'],'PASS');self.assertEqual(revised.call_count,3);old.assert_not_called()
            policy['freeze']='other';(root/'evaluation-policy.json').write_text(json.dumps(policy))
            with self.assertRaisesRegex(ValueError,'policy identity'):evaluate(root,root)

    def test_prior_study_receipts_are_preserved_but_do_not_rate_current_audio(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'results').mkdir();(root/'review').mkdir()
            study=dict(freeze='current',blocks=[])
            (root/'review/study.json').write_text(json.dumps(study));(root/'organizer-key.json').write_text(json.dumps(dict(freeze='current',blocks=[])))
            receipt=dict(status='OWNER_SUBMITTED_REQUIRES_EVALUATION',kind='music',payload=dict(freeze='previous'))
            path=root/'results/old.json';path.write_text(json.dumps(receipt));before=path.read_bytes()
            (root/'results/draft.json').write_text(json.dumps(dict(status='OWNER_SUBMITTED_REQUIRES_EVALUATION',kind='music-draft',payload=dict(freeze='current',ratings={'b':{'A':{'enjoyment':'5'}}}))))
            result=evaluate(root,root)
            self.assertEqual(result['music']['status'],'NOT RUN')
            self.assertEqual(result['music']['other_study_receipts_preserved'],1)
            self.assertEqual(result['music']['draft_receipts'],1);self.assertFalse(result['music']['drafts_count_as_completed_judgments'])
            self.assertEqual(path.read_bytes(),before)

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
