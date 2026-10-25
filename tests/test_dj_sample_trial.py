import copy
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_sample_trial import validate, validate_quality, EVIDENCE, ROOT


class SamplePermitTests(unittest.TestCase):
    def test_quality_requires_fresh_approval_and_exact_request_and_worker_bounds(self):
        plan=json.loads((ROOT/'docs/evidence/dj-quality-20261025/gpu-plan.json').read_text())
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
