"""Run the real DJ customer test against a separately supervised local Metal worker."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]


def run(folder):
    FOLDER=folder.resolve()
    if FOLDER.parent!=ROOT/'renders' or not FOLDER.name.startswith('dj-metal-endurance-'):
        raise ValueError('Expected an isolated local endurance folder')
    child=None
    watch={}
    try:
        startup=time.monotonic()+600
        while not (FOLDER/'engine/ready.json').exists():
            watch=json.loads((FOLDER/'engine/watchdog.json').read_text())
            if watch['status']!='RUNNING':raise RuntimeError('Local renderer stopped during startup')
            if time.monotonic()>=startup:raise RuntimeError('Local renderer readiness deadline reached')
            time.sleep(1)
        ready=json.loads((FOLDER/'engine/ready.json').read_text())
        watch=json.loads((FOLDER/'engine/watchdog.json').read_text())
        provider=json.loads((FOLDER/'provider.json').read_text())
        assert ready['device']=='mps' and ready['max_requests']==180 and ready['per_request_seconds']==30
        assert watch['status']=='RUNNING' and ready['deadline']-time.time()>7400
        deadline=round(ready['deadline']*1000)
        permit={'account':1,'instance':1,'label':provider['label'],'permitSha256':os.urandom(32).hex(),
                'hourlyMicros':600000,'budgetMicros':6000000,'maxLifetimeSeconds':9000,
                'startedAt':deadline-9000000,'deadline':deadline,'billingLive':False}
        descriptor=os.open(FOLDER/'permit.json',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(descriptor,'w') as f:json.dump(permit,f)
        env={**os.environ,'JAMLOOM_LOCAL_DJ_QUALIFICATION':'true',
             'JAMLOOM_LOCAL_DJ_PROVIDER':str(FOLDER/'provider.json'),
             'JAMLOOM_LOCAL_DJ_FOLDER':str(FOLDER),'VASTAI_KEY':'local-test-provider-only',
             'JAMLOOM_DJ_WARM_PERMIT':str(FOLDER/'permit.json'),
             'JAMLOOM_DJ_RENDER_TOKEN_FILE':str(FOLDER/'engine/token'),
             'JAMLOOM_TEST_DATABASE_URL':'postgresql://127.0.0.1:55438/postgres',
             'DATABASE_URL':'postgresql://127.0.0.1:55438/postgres',
             'CREDIT_BILLING_MODE':'test','JAMLOOM_AI_DJ_BILLING_MODE':'test',
             'JAMLOOM_QUALIFICATION_ORIGIN':'http://localhost:3000',
             'NODE_OPTIONS':'--max-old-space-size=1024 --import='+str(ROOT/'apps/site/tests/dj-local-provider.mjs')}
        node=Path.home()/'.nvm/versions/node/v22.23.1/bin/node'
        child=subprocess.Popen([str(node),'--import','tsx','tests/dj-warm-qualification.mjs',
            '--apply','--local-metal','--endurance','--release-check','--reliability','--integrated','--beta'],
            cwd=ROOT/'apps/site',env=env,start_new_session=True)
        code=child.wait(timeout=ready['deadline']-time.time())
        if code:raise RuntimeError('Local qualification failed; preserve its failure and cleanup receipts')
    finally:
        if child and child.poll() is None:
            os.killpg(child.pid,signal.SIGTERM)
            try:child.wait(timeout=30)
            except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
        # The model is a distinct supervised process, not a simulated rental.
        import psutil
        try:
            supervisor=psutil.Process(watch['supervisor_pid'])
            args=supervisor.cmdline()
            if (any(s.endswith('dj_metal_server.py') for s in args) and '--output' in args
                    and (ROOT/args[args.index('--output')+1]).resolve()==FOLDER/'engine'):
                supervisor.terminate()
        except (psutil.NoSuchProcess,KeyError):pass


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--folder',type=Path,required=True)
    run(parser.parse_args().folder)
