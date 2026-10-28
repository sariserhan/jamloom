import sys
import json
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from afro_house_trial import validate_permit


class AfroHouseTrial(unittest.TestCase):
    def test_pending_plan_cannot_start_paid_compute(self):
        permit = dict(status='PENDING_OWNER_CAP', campaign='jamloom-afro-house-quality-20261028')
        with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
            validate_permit(permit)

    def test_pending_plan_stops_preflight_before_provider_access(self):
        import afro_house_trial as trial
        with patch.object(trial.vast, 'api') as provider:
            with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
                trial.preflight()
            provider.assert_not_called()

    def test_wrong_cap_cannot_start_paid_compute(self):
        permit = dict(status='AUTHORIZED', campaign='jamloom-afro-house-quality-20261028', budget_usd=1)
        with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
            validate_permit(permit)

    def test_prepared_source_hashes_match_a_hypothetical_exact_permit(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/gpu-plan.json'
        permit = json.loads(path.read_text())
        permit['status'] = 'AUTHORIZED'
        permit['owner_statement'] = 'Approve the capped $6 Afro House qualification'
        validate_permit(permit)

    def test_changed_source_cannot_reuse_prepared_permit(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/gpu-plan.json'
        permit = json.loads(path.read_text())
        permit.update(status='AUTHORIZED', owner_statement='Approve the capped $6 Afro House qualification')
        permit['code_sha256']['scripts/afro_house_trial.py'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'sources changed'):
            validate_permit(permit)


if __name__ == '__main__':
    unittest.main()
