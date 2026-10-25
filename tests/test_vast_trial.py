"""Price-boundary regressions; no network requests or rentals."""
import importlib.util
import io
import contextlib
import tempfile
import json
import os, signal, subprocess
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("vast_trial", Path(__file__).resolve().parents[1] / "scripts/vast_trial.py")
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


class PriceBounds(unittest.TestCase):
    def test_remote_bootstrap_releases_ssh_pipes_before_worker_exits(self):
        for value in [True,0,'1234567890; unsafe']:
            with self.assertRaises(ValueError):trial.dj_bootstrap_command(value)
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'renderer-token').write_text('test-only')
            (root/'cloud_dj_warm.sh').write_text('sleep 5\n')
            command=trial.dj_bootstrap_command(1792904659).replace('/workspace/',folder+'/')
            process=subprocess.Popen(['bash','-c',command],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
            try:
                out,err=process.communicate(timeout=1)
                self.assertEqual(process.returncode,0);self.assertTrue(out.strip().isdigit());self.assertEqual(err,'')
                os.kill(int(out.strip()),0)
            finally:
                try:os.killpg(process.pid,signal.SIGTERM)
                except ProcessLookupError:pass
                process.wait(timeout=2)

    def test_proven_host_search_is_targeted_before_provider_result_limit(self):
        with patch.object(trial,'api',return_value={'offers':[]}) as api:
            self.assertEqual(trial.offers(24953),[])
            self.assertEqual(api.call_args.args[2]['host_id'],{'eq':24953})
            trial.offers()
            self.assertNotIn('host_id',api.call_args.args[2])

    def test_completion_resume_counts_both_prior_rentals(self):
        prefix='jamloom-dj-qualification-20261024-sessions-finish'
        first=dict(starting_credit=9.5,destroy_requested_at=1600,destroy_confirmed_at=1606.4,started_at=1000,label=prefix,budget_usd=6)
        second={**first,'label':prefix+'-retry','started_at':1700,'destroy_requested_at':1779,'destroy_confirmed_at':1780.1}
        self.assertEqual(trial.dj_completion_limits({'credit':9.49},[first,second],5000),(9.5,6713))
        third={**first,'label':prefix+'-resume','started_at':1800,'destroy_requested_at':1879,'destroy_confirmed_at':1881}
        self.assertEqual(trial.dj_completion_limits({'credit':9.48},[first,second,third],5000),(9.5,6632))
        for attempts in [[first],[second,first],[first,{**second,'started_at':1500}],[first,{**second,'starting_credit':9.49}],[first,{**second,'destroy_confirmed_at':2700}]]:
            with self.assertRaises(RuntimeError):trial.dj_completion_limits({'credit':9.49},attempts,5000)
        with self.assertRaises(RuntimeError):trial.dj_completion_limits({'credit':5.5},[first,second],5000)
        for args in [['--dj-resume'],['--dj-finish','--dj-resume','--dj-retry']]:
            with patch.object(trial.sys,'argv',['vast_trial.py','rent',*args]),patch.object(trial,'api') as api,contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):trial.main()
                api.assert_not_called()

    def test_completion_never_falls_back_to_an_unproven_host(self):
        names=('ROOT','WORK','STATE','LABEL','LEASE_SECONDS','HOURLY_CEILING','QUOTE_CEILING')
        prior={name:getattr(trial,name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as folder,patch.object(trial,'ROOT',Path(folder)),patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification','--dj-sessions','--dj-finish']),patch.object(trial,'instances',return_value=[]),patch.object(trial,'api',return_value={'credit':9}) as api,patch.object(trial.shutil,'which',return_value='/usr/bin/caffeinate'),patch.object(trial,'offers',return_value=[{'id':1,'host_id':300,'machine_id':30,'gpu_name':'RTX 3090','geolocation':'Oregon, US'}]):
                root=Path(folder);work=root/'build-dj-qualification-20261024-sessions-finish';work.mkdir();(work/'trial-key.pub').write_text('ssh-ed25519 synthetic-test')
                receipt=root/'docs/evidence/ai-dj-finish-20261024/authorization.json';receipt.parent.mkdir(parents=True);receipt.write_text(json.dumps(dict(campaign='jamloom-dj-qualification-20261024-sessions-finish',budget_usd=6,instances_max=1,max_elapsed_seconds=2400,model_requests_max=8,public_activation=False,owner_statement='Test only')))
                for directory,host in [('build-dj-qualification-20261024',100),('build-dj-qualification-20261024-sessions-retry',200)]:
                    p=root/directory;p.mkdir();(p/'trial-state.json').write_text(json.dumps({'offer':{'host_id':host,'machine_id':host}}))
                with self.assertRaisesRegex(RuntimeError,'Selected offer is unavailable'):trial.main()
                api.assert_called_once_with('v0/users/current');self.assertFalse((work/'trial-state.json').exists())
                api.reset_mock()
                with patch.object(trial.sys,'argv',[*trial.sys.argv,'--offer','1']):
                    with self.assertRaisesRegex(RuntimeError,'Selected offer is unavailable'):trial.main()
                api.assert_called_once_with('v0/users/current');self.assertFalse((work/'trial-state.json').exists())
        finally:
            for name,value in prior.items():setattr(trial,name,value)

    def test_completion_requires_its_own_receipt_and_isolated_state(self):
        names=('ROOT','WORK','STATE','LABEL','LEASE_SECONDS','HOURLY_CEILING','QUOTE_CEILING')
        prior={name:getattr(trial,name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as folder,patch.object(trial,'ROOT',Path(folder)),patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification','--dj-sessions','--dj-finish']),patch.object(trial,'api') as api:
                with self.assertRaises(FileNotFoundError):trial.main()
                api.assert_not_called()
                self.assertEqual(trial.LABEL,'jamloom-dj-qualification-20261024-sessions-finish')
                self.assertEqual(trial.STATE,Path(folder)/'build-dj-qualification-20261024-sessions-finish/trial-state.json')
                self.assertEqual((trial.LEASE_SECONDS,trial.HOURLY_CEILING,trial.QUOTE_CEILING),(2400,.5,4))
            with tempfile.TemporaryDirectory() as folder,patch.object(trial,'ROOT',Path(folder)),patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification','--dj-sessions','--dj-finish','--dj-retry']),patch.object(trial,'api') as api:
                with self.assertRaises(FileNotFoundError):trial.main()
                api.assert_not_called()
                self.assertEqual(trial.LABEL,'jamloom-dj-qualification-20261024-sessions-finish-retry')
            for args in [['--dj-finish'],['--dj-qualification','--dj-finish']]:
                with patch.object(trial.sys,'argv',['vast_trial.py','rent',*args]),patch.object(trial,'api') as api,contextlib.redirect_stderr(io.StringIO()):
                    with self.assertRaises(SystemExit):trial.main()
                    api.assert_not_called()
        finally:
            for name,value in prior.items():setattr(trial,name,value)

    def test_dj_retry_keeps_total_money_time_and_confirmed_cleanup(self):
        prior=dict(starting_credit=9.5,destroy_requested_at=1600,destroy_confirmed_at=1606,
                   started_at=1000,label='jamloom-dj-qualification-20261024',budget_usd=6)
        self.assertEqual(trial.dj_retry_limits({'credit':9.49},prior,5000),(9.5,6794))
        sessions={**prior,'label':prior['label']+'-sessions'}
        self.assertEqual(trial.dj_retry_limits({'credit':9.49},sessions,5000,sessions['label']),(9.5,6794))
        with self.assertRaises(RuntimeError):trial.dj_retry_limits({'credit':9.49},sessions,5000)
        for change in [dict(destroy_confirmed_at=0),dict(destroy_confirmed_at=999),dict(destroy_confirmed_at=5001),dict(destroy_confirmed_at=2600),dict(started_at=float('nan')),dict(label='other')]:
            with self.assertRaises(RuntimeError):trial.dj_retry_limits({'credit':9.49},{**prior,**change},5000)
        with self.assertRaises(RuntimeError):trial.dj_retry_limits({'credit':5.5},prior,5000)
        with patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-retry']),patch.object(trial,'api') as api,contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):trial.main()
            api.assert_not_called()

    def test_house_refinement_preserves_original_money_and_time_bounds(self):
        previous = dict(starting_credit=9.5, destroy_requested_at=400, label=trial.CLUB_CAMPAIGN,
                        budget_usd=6, started_at=0, deadline=2400)
        self.assertEqual(trial.club_revision_limits({'credit':9.4}, previous, 1000), (9.5,2400))
        for account, state, now in [({'credit':5.5}, previous, 1000),
                                    ({'credit':9.4}, {**previous,'deadline':3000}, 1000),
                                    ({'credit':9.4}, {**previous,'started_at':float('nan')}, 1000),
                                    ({'credit':9.4}, previous, float('nan')),
                                    ({'credit':9.4}, {**previous,'destroy_requested_at':None}, 1000),
                                    ({'credit':9.4}, previous, 1600)]:
            with self.assertRaises(RuntimeError): trial.club_revision_limits(account,state,now)

    def test_revision_flag_cannot_change_other_rental_profiles(self):
        with patch.object(trial.sys,'argv',['vast_trial.py','rent','--revision']), patch.object(trial,'api') as api, contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):trial.main()
            api.assert_not_called()

    def test_watch_uses_lower_campaign_debit_stop(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)/'state.json'
            state.write_text(json.dumps({'starting_credit': 9, 'deadline': 9999999999, 'observed_debit_stop_usd': 4}))
            with patch.object(trial, 'STATE', state), patch.object(trial, 'api', return_value={'credit': 5}), patch.object(trial, 'destroy') as destroy, patch.object(trial.time, 'sleep') as sleep, contextlib.redirect_stdout(io.StringIO()):
                trial.watch()
                destroy.assert_called_once()
                sleep.assert_not_called()

    def test_club_profile_cannot_rent_without_current_campaign_receipt(self):
        names = ('ROOT', 'WORK', 'STATE', 'LABEL', 'LEASE_SECONDS', 'HOURLY_CEILING', 'QUOTE_CEILING')
        previous = {name: getattr(trial, name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as directory, patch.object(trial, 'ROOT', Path(directory)), patch.object(
                    trial.sys, 'argv', ['vast_trial.py', 'rent', '--club-benchmark']), patch.object(trial, 'api') as api:
                with self.assertRaises(FileNotFoundError): trial.main()
                api.assert_not_called()
                self.assertEqual((trial.LEASE_SECONDS, trial.HOURLY_CEILING, trial.QUOTE_CEILING), (2400, .5, 4))
                self.assertEqual(trial.LABEL, 'jamloom-club-benchmark-20261024')
        finally:
            for name, value in previous.items(): setattr(trial, name, value)

    def test_dj_qualification_requires_separate_approval(self):
        names=('ROOT','WORK','STATE','LABEL','LEASE_SECONDS','HOURLY_CEILING','QUOTE_CEILING')
        prior={name:getattr(trial,name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as folder, patch.object(trial,'ROOT',Path(folder)), patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification']), patch.object(trial,'api') as api:
                with self.assertRaises(FileNotFoundError): trial.main()
                api.assert_not_called()
                self.assertEqual(trial.LABEL,'jamloom-dj-qualification-20261024')
                self.assertEqual((trial.LEASE_SECONDS,trial.HOURLY_CEILING,trial.QUOTE_CEILING),(2400,.5,4))
        finally:
            for name,value in prior.items():setattr(trial,name,value)

    def test_dj_retry_cannot_reuse_the_first_approval(self):
        names=('ROOT','WORK','STATE','LABEL','LEASE_SECONDS','HOURLY_CEILING','QUOTE_CEILING')
        prior={name:getattr(trial,name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as folder,patch.object(trial,'ROOT',Path(folder)),patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification','--dj-retry']),patch.object(trial,'api') as api:
                first=Path(folder)/'docs/evidence/ai-dj-customer-flow-20261024/gpu-authorization.json';first.parent.mkdir(parents=True);first.write_text('{}')
                with self.assertRaises(FileNotFoundError):trial.main()
                api.assert_not_called()
                self.assertEqual(trial.LABEL,'jamloom-dj-qualification-20261024-retry')
                self.assertEqual(trial.STATE,Path(folder)/'build-dj-qualification-20261024-retry/trial-state.json')
        finally:
            for name,value in prior.items():setattr(trial,name,value)

    def test_session_replacement_cannot_reuse_initial_approval(self):
        names=('ROOT','WORK','STATE','LABEL','LEASE_SECONDS','HOURLY_CEILING','QUOTE_CEILING')
        prior={name:getattr(trial,name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as folder,patch.object(trial,'ROOT',Path(folder)),patch.object(trial.sys,'argv',['vast_trial.py','rent','--dj-qualification','--dj-sessions','--dj-retry']),patch.object(trial,'api') as api:
                first=Path(folder)/'docs/evidence/ai-dj-warm-20261024/authorization.json';first.parent.mkdir(parents=True);first.write_text('{}')
                with self.assertRaises(FileNotFoundError):trial.main()
                api.assert_not_called()
                self.assertEqual(trial.LABEL,'jamloom-dj-qualification-20261024-sessions-retry')
        finally:
            for name,value in prior.items():setattr(trial,name,value)

    def test_inventory_cannot_hide_missing_instances(self):
        with patch.object(trial,'api',return_value=dict(success=True,instances=[],instances_found=0,total_instances=1,next_token=None)):
            with self.assertRaises(RuntimeError):trial.instances()

    def test_musician_profile_isolated_and_bounded(self):
        names = ('ROOT', 'WORK', 'STATE', 'LABEL', 'LEASE_SECONDS', 'HOURLY_CEILING')
        previous = {name: getattr(trial, name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as directory, patch.object(trial, 'ROOT', Path(directory)), patch.object(
                    trial.sys, 'argv', ['vast_trial.py', 'status', '--musician-training']), patch.object(
                    trial, 'api', return_value={'credit': 10}), patch.object(trial, 'instances', return_value=[]), contextlib.redirect_stdout(io.StringIO()):
                trial.main()
                self.assertEqual(trial.STATE, Path(directory) / 'build-musician-training-20261021/trial-state.json')
                self.assertEqual(trial.LABEL, 'jamloom-musician-training-20261021')
                self.assertEqual((trial.LEASE_SECONDS, trial.HOURLY_CEILING), (7200, .5))
        finally:
            for name, value in previous.items():
                setattr(trial, name, value)

    def test_blood_profile_has_isolated_state_and_two_hour_limit(self):
        names = ('ROOT', 'WORK', 'STATE', 'LABEL', 'LEASE_SECONDS', 'HOURLY_CEILING')
        previous = {name: getattr(trial, name) for name in names}
        try:
            with tempfile.TemporaryDirectory() as directory, patch.object(trial, 'ROOT', Path(directory)), patch.object(
                    trial.sys, 'argv', ['vast_trial.py', 'status', '--blood-training']), patch.object(
                    trial, 'api', return_value={'credit': 10}), patch.object(trial, 'instances', return_value=[]), contextlib.redirect_stdout(io.StringIO()):
                trial.main()
                self.assertEqual(trial.STATE, Path(directory) / 'build-blood-training-20261019/trial-state.json')
                self.assertEqual(trial.LABEL, 'djayvo-blood-training-20261019')
                self.assertEqual((trial.LEASE_SECONDS, trial.HOURLY_CEILING), (7200, .5))
        finally:
            for name, value in previous.items():
                setattr(trial, name, value)

    def setUp(self):
        self.offer = dict(dph_total=.2, storage_cost=.2, inet_down_cost=.01,
                          inet_up_cost=.01, num_gpus=1, gpu_ram=24576)

    def test_includes_storage_and_both_transfer_directions(self):
        quote = trial.quote(self.offer)
        self.assertAlmostEqual(quote["reserved_lease_plus_transfer"], .325 + 1.2)

    def test_account_key_list_response(self):
        with patch.dict(trial.os.environ, {"VASTAI_KEY": "test-only"}), patch.object(
                trial.urllib.request, "urlopen", return_value=io.StringIO('[{"id": 123}]')):
            self.assertEqual(trial.api('v0/ssh'), [{"id": 123}])

    def test_retry_keeps_original_budget_anchor_and_requires_cleanup(self):
        previous = {"starting_credit": 9.9, "destroy_requested_at": 123}
        self.assertEqual(trial.retry_credit({"credit": 9.8}, previous), 9.9)
        for credit in (2.8, float("nan")):
            with self.assertRaises(RuntimeError):
                trial.retry_credit({"credit": credit}, previous)
        with self.assertRaises(RuntimeError):
            trial.retry_credit({"credit": 9.8}, {"starting_credit": 9.9})

    def test_inherited_key_is_not_attached_twice(self):
        with patch.object(trial, "api", return_value={"ssh_keys": '[{"public_key":"ssh-ed25519 abc account-comment"}]'}) as api:
            trial.attach_key(42, 'ssh-ed25519 abc local-comment')
            api.assert_called_once_with('v0/instances/42/ssh')

    def test_missing_key_is_attached_and_invalid_response_rejected(self):
        with patch.object(trial, "api", return_value={"ssh_keys": []}) as api:
            trial.attach_key(42, 'ssh-ed25519 abc')
            self.assertEqual(api.call_count, 2)
            api.assert_called_with('v0/instances/42/ssh', 'POST', {'ssh_key': 'ssh-ed25519 abc'})
        with patch.object(trial, "api", return_value={"ssh_keys": {}}):
            with self.assertRaises(RuntimeError):
                trial.attach_key(42, 'ssh-ed25519 abc')

    def test_customer_session_qualification_requires_new_exact_bounds(self):
        label='jamloom-dj-qualification-20261024-sessions'
        approved=dict(campaign=label,budget_usd=6,instances_max=1,max_elapsed_seconds=2400,model_requests_max=8,public_activation=False,owner_statement='Approved test fixture')
        trial.dj_session_approval(approved,label)
        for change in [dict(campaign='old'),dict(budget_usd=10),dict(instances_max=2),dict(max_elapsed_seconds=3600),dict(model_requests_max=9),dict(public_activation=True),dict(owner_statement='')]:
            with self.assertRaises(RuntimeError): trial.dj_session_approval({**approved,**change},label)

    def test_training_lease_and_stricter_hourly_ceiling(self):
        with patch.object(trial, "LEASE_SECONDS", 7200), patch.object(trial, "HOURLY_CEILING", .5):
            self.assertAlmostEqual(trial.quote(self.offer)["reserved_lease_plus_transfer"], 2 * (.2 + 60 * .2 / 720) + 1.2)
            with self.assertRaises(ValueError):
                trial.quote({**self.offer, "dph_total": .49})

    def test_rejects_missing_nonfinite_and_negative_costs(self):
        for key in ("dph_total", "storage_cost", "inet_down_cost", "inet_up_cost"):
            for value in (float("nan"), float("inf"), -1):
                with self.assertRaises(ValueError):
                    trial.quote({**self.offer, key: value})
            missing = self.offer.copy()
            del missing[key]
            with self.assertRaises(ValueError):
                trial.quote(missing)

    def test_rejects_expensive_transfer_or_compute_and_multiple_gpus(self):
        for changes in ({"inet_down_cost": 1}, {"dph_total": 1}, {"storage_cost": 30},
                        {"num_gpus": 2}, {"gpu_ram": 16000}):
            with self.assertRaises(ValueError):
                trial.quote({**self.offer, **changes})

    def test_unknown_instance_response_fails_closed(self):
        with patch.object(trial, "api", return_value={"success": True}):
            with self.assertRaises(RuntimeError):
                trial.instances()

    def test_cleanup_refuses_other_label(self):
        with patch.object(trial, "instances", return_value=[{"id": 42, "label": "other"}]), patch.object(trial, "api") as api:
            with self.assertRaises(RuntimeError):
                trial.destroy({"id": 42})
            api.assert_not_called()

    def test_lost_create_response_reconciles_only_trial_label(self):
        with patch.object(trial, "instances", return_value=[{"id": 42, "label": trial.LABEL}, {"id": 99, "label": "other"}]), patch.object(trial, "api") as api, patch.object(trial, "write_state"):
            trial.destroy({})
            api.assert_called_once_with("v0/instances/42", "DELETE")


if __name__ == "__main__":
    unittest.main()
