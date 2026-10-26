import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_sample_trial import validate, validate_quality, EVIDENCE, ROOT


class SamplePermitTests(unittest.TestCase):
    def test_house_preflight_checks_other_proven_hosts_before_general_offers(self):
        import dj_sample_trial as trial
        offer={'id':123}
        with patch.object(trial,'HOUSE',True),patch.object(trial,'validate'),patch.object(trial.vast,'instances',return_value=[]),patch.object(trial.vast,'api',return_value={'credit':3}),patch.object(trial.vast,'offers',side_effect=[[],[],[offer]]) as search:
            self.assertEqual(trial.preflight()[2],offer)
            self.assertEqual(search.call_count,3);self.assertTrue(all(call.args[0] is not None for call in search.call_args_list))
    def test_quality_requires_fresh_approval_and_exact_request_and_worker_bounds(self):
        plan=json.loads((ROOT/'docs/evidence/dj-quality-20261025/gpu-plan.json').read_text())
        # Historical approvals remain immutable; this contract fixture pins today's worker.
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        pending=copy.deepcopy(plan);pending['status']='PREPARED'
        with self.assertRaises(ValueError):validate_quality(pending)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 quality comparison'
        validate_quality(plan)
        for key,value in [('budget_usd',6),('max_requests',7),('max_minutes',40),('public_activation',True),('max_workers',2),('owner_statement','do all those')]:
            altered=copy.deepcopy(plan);altered[key]=value
            with self.assertRaises(ValueError):validate_quality(altered)
        altered=copy.deepcopy(plan);altered['tracks'][0]['vocals']=True
        with self.assertRaises(ValueError):validate_quality(altered)
        altered=copy.deepcopy(plan);altered['worker_sha256']['dj_vocal.py']='0'*64
        with self.assertRaises(ValueError):validate_quality(altered)

    def test_house_study_keeps_pairs_blind_to_the_model_and_bounds_six_calls(self):
        plan=json.loads((ROOT/'docs/evidence/dj-house-consistency-20261025/gpu-plan.json').read_text())
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        pending=copy.deepcopy(plan);pending['status']='PREPARED'
        with self.assertRaises(ValueError):validate_quality(pending,house=True)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 house study'
        validate_quality(plan,house=True)
        for field,value in [('max_requests',7),('budget_usd',6),('max_minutes',40),('owner_statement','do all')]:
            changed=copy.deepcopy(plan);changed[field]=value
            with self.assertRaises(ValueError):validate_quality(changed,house=True)
        for field,value in [('seed',251025),('style','bass'),('sequence',7)]:
            changed=copy.deepcopy(plan);changed['tracks'][1]['request'][field]=value
            with self.assertRaises(ValueError):validate_quality(changed,house=True)
        changed=copy.deepcopy(plan);changed['tracks'][2]['vocals']=True
        with self.assertRaises(ValueError):validate_quality(changed,house=True)
        altered=copy.deepcopy(plan);altered['worker_sha256']['dj_vocal.py']='0'*64
        with self.assertRaises(ValueError):validate_quality(altered,house=True)
    def test_composition_requires_approved_original_guides_and_four_requests(self):
        plan=json.loads((ROOT/'docs/evidence/dj-composition-20261025/gpu-plan.json').read_text())
        with self.assertRaises(ValueError):validate_quality(plan,composition=True)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 composition comparison'
        validate_quality(plan,composition=True)
        for key,value in [('max_requests',5),('source_audio_used',False),('reference_audio_used',True),('guide_strength',.8),('source_audio_origin','downloaded'),('max_workers',2),('max_minutes',30),('budget_usd',6)]:
            changed=copy.deepcopy(plan);changed[key]=value
            with self.assertRaises(ValueError):validate_quality(changed,composition=True)
        changed=copy.deepcopy(plan);changed['tracks'][1]['guide_score_sha256']='0'*64
        with self.assertRaises(ValueError):validate_quality(changed,composition=True)
        changed=copy.deepcopy(plan);changed['worker_sha256']['dj_composition.py']='0'*64
        with self.assertRaises(ValueError):validate_quality(changed,composition=True)

    def test_exact_pair_and_bounds(self):
        plan = json.loads((EVIDENCE/'gpu-plan.json').read_text()); validate(plan)
        for key, value in [('budget_usd', 6), ('max_minutes', 40), ('max_workers', 2),
                           ('status', 'PREPARED'), ('public_activation', True),
                           ('source_audio_used', True), ('learned_reference_weights_used', True)]:
            with self.subTest(key=key):
                changed = copy.deepcopy(plan); changed[key] = value
                with self.assertRaises(ValueError): validate(changed)
        extra = copy.deepcopy(plan); extra['tracks'].append(extra['tracks'][0])
        with self.assertRaises(ValueError): validate(extra)
        altered = copy.deepcopy(plan); altered['tracks'][1]['request']['seed'] += 1
        with self.assertRaises(ValueError): validate(altered)


if __name__ == '__main__': unittest.main()
