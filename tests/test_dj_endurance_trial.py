import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import dj_endurance_trial as trial

class EnduranceAuthorization(unittest.TestCase):
    def test_existing_balance_funds_full_cap_without_unrelated_top_up(self):
        for credit in (6,6.7920588159,7):
            self.assertEqual(trial.funded_credit({'credit':credit}),credit)
        for credit in (5.999,-1,float('nan'),float('inf')):
            with self.assertRaisesRegex(RuntimeError,'balance'):trial.funded_credit({'credit':credit})

    def test_unapproved_run_has_no_provider_or_preflight_side_effects(self):
        with tempfile.TemporaryDirectory() as folder:
            permit=Path(folder)/'permit.json';permit.write_text(json.dumps({'status':'PREPARED_NOT_AUTHORIZED'}))
            with patch.object(trial,'PERMIT',permit),patch.object(trial.v,'api') as api,patch.object(trial.v,'dj_ui_preflight') as preflight:
                with self.assertRaisesRegex(RuntimeError,'authorization'):trial.rent()
                api.assert_not_called();preflight.assert_not_called()

    def test_exact_caps_and_all_launchers_are_bound(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);private=tuple('build-dj-endurance-20261030/'+n for n in ('pipeline.py','boot.py','monitor.py','run-qualification.py','qualify-when-ready.py'))
            files=(*trial.FILES,*private);hashes={}
            for file in files:
                p=root/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(file);hashes[file]=hashlib.sha256(p.read_bytes()).hexdigest()
            value=dict(status='AUTHORIZED',campaign=trial.LABEL,budget_usd=6,instances_max=1,max_elapsed_seconds=9000,model_requests_max=180,customer_tracks_max=150,public_activation=False,stop_on_failure=True,automatic_cleanup=True,replacement_rental_authorized=False,owner_statement='Synthetic test permit only',code_sha256=hashes)
            with patch.object(trial,'ROOT',root):
                trial.approved(value)
                for field,bad in [('budget_usd',7),('instances_max',2),('max_elapsed_seconds',9001),('model_requests_max',181),('replacement_rental_authorized',True)]:
                    changed=copy.deepcopy(value);changed[field]=bad
                    with self.assertRaisesRegex(RuntimeError,'authorization'):trial.approved(changed)
                (root/private[0]).write_text('changed')
                with self.assertRaisesRegex(RuntimeError,'source changed'):trial.approved(value)

    def test_bootstrap_requires_explicit_endurance_and_rejects_combined_recipes(self):
        with self.assertRaises(ValueError):trial.v.dj_bootstrap_command(1792904659,180)
        self.assertIn('180 --endurance',trial.v.dj_bootstrap_command(1792904659,180,endurance=True))
        with self.assertRaises(ValueError):trial.v.dj_bootstrap_command(1792904659,181,endurance=True)
        with self.assertRaises(ValueError):trial.v.dj_bootstrap_command(1792904659,180,endurance=True,house_study=True)

if __name__=='__main__':unittest.main()
