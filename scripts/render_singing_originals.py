"""Bounded local Metal renders using the existing Music DNA singing pipeline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time
import psutil
from singing_response import load_plan

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT/'docs/evidence/singing-originals-20261027'


def resource_problem(available, disk, rss=0, elapsed=0, starting=False):
    if available < (4*1024**3 if starting else 512*1024**2): return 'Available memory floor reached'
    if disk < 5*1024**3: return 'Free disk floor reached'
    if rss > 9*1024**3: return 'Render process memory limit reached'
    if elapsed > 1200: return 'Twenty-minute render deadline reached'
    return None


def render(case_id):
    plan_path=EVIDENCE/'plan.json'
    plan=load_plan(plan_path)
    case=next(c for c in plan['cases'] if c['id']==case_id)
    output=ROOT/'renders/singing-originals-20261027'/case_id
    receipt_path=EVIDENCE/(case_id+'-execution.json')
    if output.exists() or receipt_path.exists(): raise FileExistsError('Preserve the previous attempt')
    problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,starting=True)
    if problem: raise RuntimeError(problem)
    command=[str(ROOT/'.venv-singer/bin/python'),str(ROOT/'scripts/singing_response.py'),'sing',
             '--runtime',str(ROOT/'build-style-training/upstream'),'--plan',str(plan_path),
             '--output',str(output),'--case',case_id,'--mac-small-decode']
    result=dict(status='FAIL',case=case_id,device_requested='mps',paid_compute=False,
                plan_sha256=hashlib.sha256(plan_path.read_bytes()).hexdigest(),
                initial_available_bytes=psutil.virtual_memory().available,
                peak_process_group_rss_bytes=0,timeout_seconds=1200,attempts=1,listening='NOT RUN')
    started=time.monotonic();process=None
    try:
        with (EVIDENCE/(case_id+'-execution.log')).open('x') as log:
            process=subprocess.Popen(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,
                env={**os.environ,'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1',
                     'HF_HUB_DISABLE_TELEMETRY':'1','JAMLOOM_INFERENCE_DEVICE':'mps',
                     'JAMLOOM_VOCAL_IDENTITY_ENABLED':'false'})
            while process.poll() is None:
                rows=subprocess.check_output(['ps','-axo','pgid=,rss='],text=True)
                rss=sum(int(r.split()[1])*1024 for r in rows.splitlines() if int(r.split()[0])==process.pid)
                result['peak_process_group_rss_bytes']=max(rss,result['peak_process_group_rss_bytes'])
                problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,rss,time.monotonic()-started)
                if problem: raise RuntimeError(problem)
                time.sleep(2)
            result['exit_code']=process.returncode
            if process.returncode: raise RuntimeError('Singer failed; see retained execution log')
        receipt=json.loads((output/'complete.json').read_text())
        assert receipt['case']==case and receipt['device']=='mps'
        assert receipt['mlx_vae'] is False and receipt['mac_small_decode'] is True
        assert receipt['vocal_reference'] is None and receipt['source_conditioning'] is None
        assert receipt['trained_adapter'] is False
        assert receipt['audio_sha256']==hashlib.sha256((output/'singer.wav').read_bytes()).hexdigest()
        assert result['plan_sha256']==hashlib.sha256(plan_path.read_bytes()).hexdigest()
        result.update(status='PASS local generation; listening NOT RUN',audio_sha256=receipt['audio_sha256'])
        (EVIDENCE/(case_id+'-complete.json')).write_bytes((output/'complete.json').read_bytes())
    except BaseException as error:
        result['error']=str(error)
        raise
    finally:
        if process is not None:
            try: os.killpg(process.pid,signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait()
        result['seconds']=time.monotonic()-started
        receipt_path.write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('case',choices=['deep-house-male','eurodance-female'])
    render(parser.parse_args().case)
