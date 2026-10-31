"""Separate single-use authorization for one bounded two-hour customer DJ test."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import time
import vast_trial as v

ROOT=Path(__file__).resolve().parents[1]
LABEL='jamloom-dj-endurance-20261030'
WORK=ROOT/'build-dj-endurance-20261030'
PERMIT=ROOT/'docs/evidence/nondeployment-completion-20261030/hosted-dj-plan.json'
FILES=(*v.DJ_INTEGRATED_FILES,'scripts/dj_endurance_trial.py','scripts/dj_renderer_readiness.py',
       'apps/site/lib/dj-warm-worker.ts','apps/site/tests/silent-audio.mjs','apps/site/tests/dj-ui-preflight.mjs')

def approved(permit):
    expected=dict(status='AUTHORIZED',campaign=LABEL,budget_usd=6,instances_max=1,max_elapsed_seconds=9000,
        model_requests_max=180,customer_tracks_max=150,public_activation=False,stop_on_failure=True,
        automatic_cleanup=True,replacement_rental_authorized=False)
    if any(permit.get(k)!=value for k,value in expected.items()) or not isinstance(permit.get('owner_statement'),str) or not permit['owner_statement'].strip():
        raise RuntimeError('Fresh explicit $6 two-hour DJ authorization required')
    hashes=permit.get('code_sha256',{})
    private=tuple('build-dj-endurance-20261030/'+name for name in ('pipeline.py','boot.py','monitor.py','run-qualification.py','qualify-when-ready.py'))
    if set(hashes)!=set((*FILES,*private)) or any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=sha for p,sha in hashes.items()):
        raise RuntimeError('Reviewed endurance source changed')

def configure():
    v.WORK=WORK;v.STATE=WORK/'trial-state.json';v.LABEL=LABEL
    v.LEASE_SECONDS=9000;v.HOURLY_CEILING=.50;v.QUOTE_CEILING=4

def funded_credit(account):
    credit=float(account['credit'])
    # Fund the entire authorized cap; the $4 quote/debit stops already retain
    # a $2 shutdown margin inside it. No unrelated extra dollar is needed.
    if not math.isfinite(credit) or credit<6:raise RuntimeError('Insufficient provider balance for the $6 cap')
    return credit

def rent():
    permit=json.loads(PERMIT.read_text());approved(permit)
    if shutil.disk_usage(ROOT).free<19*1024**3:raise RuntimeError('Keep 15 GiB reserve plus four GiB endurance artifacts')
    v.dj_ui_preflight()
    public_key=(WORK/'trial-key.pub').read_text().strip()
    if not public_key.startswith('ssh-ed25519 ') or not shutil.which('caffeinate'):raise RuntimeError('Prepared SSH key and sleep inhibitor required')
    if v.STATE.exists() or (WORK/'claimed.json').exists():raise RuntimeError('This attempt is already consumed; no replacement authorized')
    if v.instances():raise RuntimeError('Existing rental prevents isolated accounting')
    credit=funded_credit(v.api('v0/users/current'))
    proven=json.loads((ROOT/'build-dj-release-check-20261026-retry/trial-state.json').read_text())['offer']['host_id']
    offers=v.offers(proven);offer=next((o for o in offers if o['host_id']==proven and o['gpu_name']=='RTX 3090'),None)
    if offer is None:raise RuntimeError('Verified host has no offer within the price ceiling')
    started=time.time();state=dict(label=LABEL,offer=offer,starting_credit=credit,credit_before_this_attempt=credit,
        started_at=started,deadline=started+9000,confirm_absence=True,budget_usd=6,disk_gb=60,observed_debit_stop_usd=4)
    with (WORK/'claimed.json').open('x') as f:json.dump(dict(permit_sha256=hashlib.sha256(PERMIT.read_bytes()).hexdigest(),claimed_at=started,replacements=0),f)
    v.write_state(state)
    with (WORK/'watchdog.log').open('x') as log:
        subprocess.Popen(['caffeinate','-i',sys.executable,str(Path(__file__).resolve()),'watch'],stdout=log,stderr=log,stdin=subprocess.DEVNULL,start_new_session=True)
    try:
        result=v.api('v0/asks/'+str(offer['id']),'PUT',dict(image='pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca',disk=60,label=LABEL,runtype='ssh_direct',target_state='running',cancel_unavail=True))
        state['id']=result['new_contract'];v.write_state(state);v.attach_key(state['id'],public_key)
    except BaseException:
        v.destroy(state);raise
    print(json.dumps(dict(status='CREATED',id=state['id'],label=LABEL,deadline=state['deadline'],hourly_ceiling_usd=.50,total_cap_usd=6)))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('action',choices=['dry-run','rent','status','destroy','watch']);a=p.parse_args();configure()
    if a.action=='dry-run':
        print(json.dumps(dict(status='PREPARED_NOT_AUTHORIZED',campaign=LABEL,instances=1,max_seconds=9000,playback_seconds=7200,max_model_requests=180,max_tracks=150,budget_usd=6,no_replacement=True,paid_operations=0)))
    elif a.action=='rent':rent()
    elif a.action=='watch':v.watch()
    elif a.action=='destroy':v.destroy(json.loads(v.STATE.read_text()))
    else:print(json.dumps(dict(instances=[{k:i.get(k) for k in ('id','label','actual_status')} for i in v.instances()])))
