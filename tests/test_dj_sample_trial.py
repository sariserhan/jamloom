import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_sample_trial import validate, validate_quality, validate_sung, EVIDENCE, ROOT


class SamplePermitTests(unittest.TestCase):
    def test_sung_replacement_cannot_extend_original_total_allowance(self):
        import dj_sample_trial as trial
        plan=json.loads((ROOT/'docs/evidence/dj-sung-hooks-20261026/replacement-plan.json').read_text())
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve one replacement within the original cap'
        with patch.object(trial.vast,'LEASE_SECONDS',plan['remaining_rental_seconds']):
            validate_sung(plan,replacement=True)
            for key,value in [('budget_usd_total',4),('remaining_rental_seconds',1200),('original_permit_sha256','0'*64),('owner_statement','Approve the capped $3 musical-vocal comparison')]:
                changed=copy.deepcopy(plan);changed[key]=value
                with self.assertRaises(ValueError):validate_sung(changed,replacement=True)

    def test_sung_study_requires_fresh_four_edit_approval_and_original_sources(self):
        plan=json.loads((ROOT/'docs/evidence/dj-sung-hooks-20261026/gpu-plan.json').read_text())
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        plan['dna_manifest_sha256']={name:hashlib.sha256((ROOT/'assets/manifests'/name).read_bytes()).hexdigest()for name in ['song-durations.json','dna-languages.json']}
        pending=copy.deepcopy(plan);pending['status']='PREPARED'
        with self.assertRaises(ValueError):validate_sung(pending)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 musical-vocal comparison'
        validate_sung(plan)
        for key,value in [('budget_usd',4),('max_minutes',21),('max_workers',2),('max_requests',5),('source_audio_origin','downloaded'),('reference_audio_used',True),('public_activation',True),('owner_statement','do all')]:
            changed=copy.deepcopy(plan);changed[key]=value
            with self.assertRaises(ValueError):validate_sung(changed)
        for key in ['fixture_sha256','manifest_sha256']:
            changed=copy.deepcopy(plan);changed[key]='0'*64
            with self.assertRaises(ValueError):validate_sung(changed)
        changed=copy.deepcopy(plan);changed['tracks'][0]['vocals']=True
        with self.assertRaises(ValueError):validate_sung(changed)
        changed=copy.deepcopy(plan);changed['source_sha256']['sung-house-1.wav']='0'*64
        with self.assertRaises(ValueError):validate_sung(changed)
        changed=copy.deepcopy(plan);changed['dna_manifest_sha256']={}
        with self.assertRaises(ValueError):validate_sung(changed)

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
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        pending=copy.deepcopy(plan);pending['status']='PREPARED'
        with self.assertRaises(ValueError):validate_quality(pending,composition=True)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 composition comparison'
        validate_quality(plan,composition=True)
        for key,value in [('max_requests',5),('source_audio_used',False),('reference_audio_used',True),('guide_strength',.8),('source_audio_origin','downloaded'),('max_workers',2),('max_minutes',30),('budget_usd',6)]:
            changed=copy.deepcopy(plan);changed[key]=value
            with self.assertRaises(ValueError):validate_quality(changed,composition=True)
        changed=copy.deepcopy(plan);changed['tracks'][1]['guide_score_sha256']='0'*64
        with self.assertRaises(ValueError):validate_quality(changed,composition=True)
        changed=copy.deepcopy(plan);changed['worker_sha256']['dj_composition.py']='0'*64
        with self.assertRaises(ValueError):validate_quality(changed,composition=True)

    def test_guided_set_requires_new_approval_and_exact_direction_matrix(self):
        plan=json.loads((ROOT/'docs/evidence/dj-guided-set-20261025/gpu-plan.json').read_text())
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        pending=copy.deepcopy(plan);pending['status']='PREPARED'
        with self.assertRaises(ValueError):validate_quality(pending,composition=True,guided_set=True)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 guided set'
        validate_quality(plan,composition=True,guided_set=True)
        for field,value in [('max_requests',10),('budget_usd',6),('max_minutes',40),('source_audio_origin','reference'),('owner_statement','do all those')]:
            changed=copy.deepcopy(plan);changed[field]=value
            with self.assertRaises(ValueError):validate_quality(changed,composition=True,guided_set=True)
        for field,value in [('energy',4),('beat',{'bpm':140,'groove':'syncopated'}),('seed',1)]:
            changed=copy.deepcopy(plan);changed['tracks'][3]['request'][field]=value
            with self.assertRaises(ValueError):validate_quality(changed,composition=True,guided_set=True)
        with self.assertRaises(ValueError):validate_quality(plan,guided_set=True)
        from vast_trial import dj_bootstrap_command
        self.assertIn('--guided-set',dj_bootstrap_command(1999999999,9,guided_set=True))
        with self.assertRaises(ValueError):dj_bootstrap_command(1999999999,9,guided_set=True,composition_study=True)

    def test_recovery_requires_separate_approval_and_exact_guide_seeds(self):
        plan=json.loads((ROOT/'docs/evidence/dj-recovery-20261025/gpu-plan.json').read_text());plan['status']='PREPARED'
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        with self.assertRaises(ValueError):validate_quality(plan,composition=True,recovery=True)
        plan['status']='AUTHORIZED';plan['owner_statement']='Approve the capped $3 recovery study'
        validate_quality(plan,composition=True,recovery=True)
        for field,value in [('max_requests',9),('budget_usd',6),('max_minutes',40),('owner_statement','do all in one go')]:
            altered=copy.deepcopy(plan);altered[field]=value
            with self.assertRaises(ValueError):validate_quality(altered,composition=True,recovery=True)
        altered=copy.deepcopy(plan);altered['tracks'][1]['guide_request']['seed']=311025
        with self.assertRaises(ValueError):validate_quality(altered,composition=True,recovery=True)
        with self.assertRaises(ValueError):validate_quality(plan,composition=True,recovery=True,guided_set=True)
        from vast_trial import dj_bootstrap_command
        self.assertIn('--recovery-study',dj_bootstrap_command(1999999999,8,recovery_study=True))

    def test_planner_comparison_is_paired_bounded_and_requires_new_authorization(self):
        plan=json.loads((ROOT/'docs/evidence/dj-planner-20261026/gpu-plan.json').read_text())
        plan['worker_sha256']={name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in plan['worker_sha256']}
        with self.assertRaises(ValueError):validate_quality({**plan,'status':'PREPARED'},planner=True)
        plan.update(status='AUTHORIZED',owner_statement='Approve the capped $3 music-planner comparison')
        validate_quality(plan,planner=True)
        for field,value in [('max_requests',9),('budget_usd',6),('max_minutes',40),('source_audio_used',True),('owner_statement','finish everything')]:
            altered=copy.deepcopy(plan);altered[field]=value
            with self.assertRaises(ValueError):validate_quality(altered,planner=True)
        altered=copy.deepcopy(plan);altered['tracks'][1]['request']['seed']+=1
        with self.assertRaises(ValueError):validate_quality(altered,planner=True)
        altered=copy.deepcopy(plan);altered['planner']['model']='other'
        with self.assertRaises(ValueError):validate_quality(altered,planner=True)
        with self.assertRaises(ValueError):validate_quality(plan,planner=True,composition=True)
        from vast_trial import dj_bootstrap_command
        self.assertIn('--planner-study',dj_bootstrap_command(1999999999,8,planner_study=True))
        with self.assertRaises(ValueError):dj_bootstrap_command(1999999999,8,planner_study=True,arranged=True)

    def test_startup_probe_separates_transport_from_renderer_exit(self):
        from dj_sample_trial import startup_probe
        self.assertEqual(startup_probe(0,b''),'pending')
        self.assertEqual(startup_probe(255,b''),'transport_unavailable')
        for code in [b'0',b'1',b'124']:
            self.assertEqual(startup_probe(0,code),'renderer_exited')
        with self.assertRaises(RuntimeError):startup_probe(1,b'')
        with self.assertRaises(RuntimeError):startup_probe(0,b'not-an-exit-code')

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
