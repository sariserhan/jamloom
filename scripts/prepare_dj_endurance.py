"""Prepare local private launchers and an unapproved, hash-bound endurance permit."""
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
from dj_endurance_trial import ROOT,WORK,FILES,LABEL,PERMIT

def prepare():
    if WORK.exists():raise ValueError('Preserve existing campaign state')
    prior=ROOT/'build-dj-release-check-20261026-retry';WORK.mkdir(mode=0o700)
    changes={
        'pipeline.py':[('timeout=2300','timeout=8400')],
        'boot.py':[('dj_bootstrap_command(int(state[\'deadline\']),24)',"dj_bootstrap_command(int(state['deadline']),180,endurance=True)")],
        'monitor.py':[("'-h','127.0.0.1','-d'","'-h','127.0.0.1','-p','55438','-d'")],
        'run-qualification.py':[("'--release-check','--release-retry'","'--release-check','--endurance'"),
            ('child.wait(timeout=1080)','child.wait(timeout=7500)'),
            ("env['JAMLOOM_QUALIFICATION_ORIGIN']", "env['JAMLOOM_TEST_DATABASE_URL']='postgresql://127.0.0.1:55438/postgres'\nenv['JAMLOOM_QUALIFICATION_ORIGIN']")],
        'qualify-when-ready.py':[("root/'docs/evidence/dj-release-check-20261026-retry/authorization.json'","root/'docs/evidence/nondeployment-completion-20261030/hosted-dj-plan.json'"),
            ("'budgetMicros':6000000","'budgetMicros':6000000,'maxLifetimeSeconds':9000"),
            ("state['deadline']-1100","state['deadline']-7500"),('min(1100,int(','min(7500,int('),
            ('PASS complete provider inventory confirms shutdown','Cleanup requested; independent provider inventory still required')]}
    for name,replacements in changes.items():
        text=(prior/name).read_text()
        for old,new in replacements:
            if old not in text:raise ValueError('Prior runner changed: '+name)
            text=text.replace(old,new)
        text=text.replace('dj-release-check-20261026-retry','dj-endurance-20261030')
        path=WORK/name;path.write_text(text);path.chmod(0o600)
    (WORK/'renderer-token').write_text(secrets.token_hex(32));(WORK/'renderer-token').chmod(0o600)
    subprocess.run(['ssh-keygen','-q','-t','ed25519','-N','','-f',str(WORK/'trial-key'),'-C',LABEL],check=True)
    private=tuple(str((WORK/name).relative_to(ROOT)) for name in changes)
    plan=dict(status='PREPARED_NOT_AUTHORIZED',campaign=LABEL,budget_usd=6,instances_max=1,max_elapsed_seconds=9000,
        actual_public_set_seconds=7200,model_requests_max=180,customer_tracks_max=150,
        public_activation=False,stop_on_failure=True,automatic_cleanup=True,replacement_rental_authorized=False,
        owner_statement=None,hourly_ceiling_usd=.50,offer_quote_ceiling_usd=4,observed_debit_shutdown_usd=4,
        code_sha256={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in (*FILES,*private)},
        preconditions=['Fresh explicit approval; no other provider jobs/rentals; complete earlier study cleanup',
            'Current local customer UI preflight and local PostgreSQL on 55438',
            '19 GiB free: 15 GiB reserve plus four GiB for peak artifact storage',
            'Existing proven RTX 3090 host only, immutable base image/model weights; no replacement'],
        checks=['Two hours of actual public-mode test-account playback, private test-account exhaustion, complete R2 recording and privacy',
            '150 unique tracks maximum, 180 model requests maximum including optional vocal candidates',
            'Standalone dispatcher killed after a completed response; recover same receipt/job/deadline',
            'Third listener refused without reserved or spent credits; memory/source-count bounds',
            'Final provider inventory empty, R2 test objects removed, isolated accounts/database purged'],
        limits='Public-mode means visibility inside an isolated test database, not website publication. Existing forty-minute defaults remain; this permit explicitly selects the bounded 150-minute worker profile. Startup, two-hour playback and shutdown share the total deadline. Provider/network outages can delay deletion; watchdog retries cleanup only, never generation.',
        excludes=['Website/app deployment','Live purchases','New music acquisition','Training','Replacement rental','Repeated model requests'],
        commands=['python3 scripts/dj_endurance_trial.py dry-run',
            'After approval and local UI preflight: python3 scripts/dj_endurance_trial.py rent',
            'python3 build-dj-endurance-20261030/pipeline.py',
            'Independent final inventory: python3 scripts/dj_endurance_trial.py status'])
    PERMIT.write_text(json.dumps(plan,indent=2)+'\n')
    print('PASS local preparation only; no provider access, rental, upload or model request')

if __name__=='__main__':prepare()
