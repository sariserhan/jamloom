import sys
import json
import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from afro_house_trial import validate_permit


class AfroHouseTrial(unittest.TestCase):
    def test_pending_plan_cannot_start_paid_compute(self):
        permit = dict(status='PENDING_OWNER_CAP', campaign='jamloom-afro-house-quality-20261028')
        with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
            validate_permit(permit)

    def test_pending_replacement_stops_preflight_before_provider_access(self):
        import afro_house_trial as trial
        with tempfile.TemporaryDirectory() as folder:
            evidence = Path(folder)
            permit = json.loads((trial.EVIDENCE / 'replacement-plan.json').read_text())
            permit.update(status='PENDING_REPLACEMENT_APPROVAL', owner_statement=None)
            (evidence / 'replacement-plan.json').write_text(json.dumps(permit))
            with patch.object(trial, 'EVIDENCE', evidence), patch.object(trial.vast, 'api') as api, \
                    patch.object(trial.vast, 'instances') as instances:
                with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
                    trial.preflight(replacement=True)
                api.assert_not_called()
                instances.assert_not_called()

    def test_wrong_cap_cannot_start_paid_compute(self):
        permit = dict(status='AUTHORIZED', campaign='jamloom-afro-house-quality-20261028', budget_usd=1)
        with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
            validate_permit(permit)

    def test_consumed_initial_permit_cannot_be_reused(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/gpu-plan.json'
        permit = json.loads(path.read_text())
        with self.assertRaisesRegex(ValueError, 'exact Afro House compute authorization'):
            validate_permit(permit)

    def test_replacement_hashes_match_a_hypothetical_exact_permit(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/replacement-plan.json'
        permit = json.loads(path.read_text())
        permit.update(status='AUTHORIZED', owner_statement='Approve one replacement run within the remaining $5.99 cap')
        validate_permit(permit, replacement=True)

    def test_changed_source_cannot_reuse_prepared_permit(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/replacement-plan.json'
        permit = json.loads(path.read_text())
        permit.update(status='AUTHORIZED', owner_statement='Approve one replacement run within the remaining $5.99 cap')
        permit['code_sha256']['scripts/afro_house_trial.py'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'sources changed'):
            validate_permit(permit, replacement=True)

    def test_replacement_cannot_expand_the_original_aggregate_cap(self):
        path = Path(__file__).resolve().parents[1] / 'docs/evidence/afro-house-qualification-20261028/replacement-plan.json'
        permit = json.loads(path.read_text())
        permit.update(status='AUTHORIZED', owner_statement='Approve one replacement run within the remaining $5.99 cap')
        permit['aggregate_budget_cap_usd'] = 7
        with self.assertRaisesRegex(ValueError, 'original aggregate cap'):
            validate_permit(permit, replacement=True)

    def test_replacement_preflight_excludes_failed_machine_and_checks_aggregate_quote(self):
        import afro_house_trial as trial
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); work = root / 'work'; output = root / 'output'; evidence = root / 'evidence'
            work.mkdir(); output.mkdir(); evidence.mkdir()
            permit = json.loads((trial.EVIDENCE / 'replacement-plan.json').read_text())
            permit.update(status='AUTHORIZED', owner_statement='Approve one replacement run within the remaining $5.99 cap')
            (evidence / 'replacement-plan.json').write_text(json.dumps(permit))
            (work / 'trial-state.json').write_text(json.dumps(dict(label=trial.LABEL, offer=dict(host_id=1, machine_id=2), destroy_confirmed_at=1)))
            report_bytes = json.dumps(dict(status='FAIL', cleanup_confirmed=True, tracks=[], observed_debit_usd=permit['aggregate_budget_used_usd'])).encode()
            (output / 'report.json').write_bytes(report_bytes)
            attempt = json.loads((trial.EVIDENCE / 'gpu-attempt-001.json').read_text())
            attempt['provider_report_sha256'] = hashlib.sha256(report_bytes).hexdigest()
            (evidence / 'gpu-attempt-001.json').write_text(json.dumps(attempt))
            offers = [
                dict(id=1, host_id=1, machine_id=8, gpu_name='RTX 3090', geolocation='Oregon, US', reserved_lease_plus_transfer=.2),
                dict(id=2, host_id=9, machine_id=2, gpu_name='RTX 3090', geolocation='Oregon, US', reserved_lease_plus_transfer=.2),
                dict(id=3, host_id=3, machine_id=4, gpu_name='RTX 3090', geolocation='Oregon, US', reserved_lease_plus_transfer=.5),
            ]
            with patch.object(trial, 'WORK', work), patch.object(trial, 'OUTPUT', output), patch.object(trial, 'EVIDENCE', evidence), \
                    patch.object(trial, 'validate_permit'), patch.object(trial.vast, 'instances', return_value=[]), \
                    patch.object(trial.vast, 'api', return_value={'credit': 10}), patch.object(trial.vast, 'offers', return_value=offers), \
                    patch.object(trial.shutil, 'which', return_value='/usr/bin/tool'), \
                    patch.object(trial.vast, 'WORK', root / 'provider-work'), patch.object(trial.vast, 'STATE', root / 'provider-state'), \
                    patch.object(trial.vast, 'LABEL', 'provider-label'), patch.object(trial.vast, 'LEASE_SECONDS', 1), \
                    patch.object(trial.vast, 'HOURLY_CEILING', 1), patch.object(trial.vast, 'QUOTE_CEILING', 1):
                _, _, chosen = trial.preflight(replacement=True)
                self.assertEqual(chosen['id'], 3)

            offers[-1]['reserved_lease_plus_transfer'] = 5.995
            with patch.object(trial, 'WORK', work), patch.object(trial, 'OUTPUT', output), patch.object(trial, 'EVIDENCE', evidence), \
                    patch.object(trial, 'validate_permit'), patch.object(trial.vast, 'instances', return_value=[]), \
                    patch.object(trial.vast, 'api', return_value={'credit': 10}), patch.object(trial.vast, 'offers', return_value=[offers[-1]]), \
                    patch.object(trial.shutil, 'which', return_value='/usr/bin/tool'), \
                    patch.object(trial.vast, 'WORK', root / 'provider-work'), patch.object(trial.vast, 'STATE', root / 'provider-state'), \
                    patch.object(trial.vast, 'LABEL', 'provider-label'), patch.object(trial.vast, 'LEASE_SECONDS', 1), \
                    patch.object(trial.vast, 'HOURLY_CEILING', 1), patch.object(trial.vast, 'QUOTE_CEILING', 1):
                with self.assertRaisesRegex(RuntimeError, 'remaining aggregate cap'):
                    trial.preflight(replacement=True)


if __name__ == '__main__':
    unittest.main()
