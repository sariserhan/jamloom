"""Supervised local Metal renderer for the owner's bounded two-hour qualification."""
import argparse
from http.server import HTTPServer
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import time

import psutil
from dj_metal_probe import ROOT, GIB, resource_problem, save


def serve(output, deadline):
    from singing_response import runtime, load_singer_engine
    from dj_warm_engine import Renderer, handler
    root=runtime(ROOT/'build-style-training/upstream');os.chdir(root)
    engine=load_singer_engine(root,mac_small_decode=True)
    if str(engine[0].device)!='mps' or engine[0].use_mlx_vae:
        raise RuntimeError('Expected the qualified Metal engine')

    class ObservedRenderer(Renderer):
        def render(self, value):
            save(output/'render-state.json',{'phase':'rendering','started':time.time(),'requests':self.requests})
            try:
                receipt,audio=super().render(value)
                save(output/'render-state.json',{'phase':'ready','requests':self.requests,'last_compute_ms':receipt['compute_ms']})
                return receipt,audio
            except BaseException:
                save(output/'render-state.json',{'phase':'failed','requests':self.requests})
                raise

    renderer=ObservedRenderer(deadline,180,engine=engine,endurance=True)
    with HTTPServer(('127.0.0.1',8768),handler(renderer,(output/'token').read_text())) as server:
        save(output/'ready.json',{'device':'mps','deadline':deadline,'max_requests':180,'per_request_seconds':30})
        server.timeout=1
        while time.time()<deadline-30 and renderer.requests<180:
            server.handle_request()


def supervise(output):
    output=output.resolve()
    if not output.is_relative_to(ROOT/'renders'):
        raise ValueError('Local evidence must stay under renders')
    output.mkdir(mode=0o700)
    token=os.open(output/'token',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(token,'w') as f:f.write(secrets.token_hex(32))
    start=time.time();deadline=start+9000;swap=psutil.swap_memory().used
    state={'status':'RUNNING','supervisor_pid':os.getpid(),'deadline':deadline,'paid_compute':False,
           'max_requests':180,'peak_rss_bytes':0,'peak_swap_growth_bytes':0,'minimum_available_bytes':psutil.virtual_memory().available}
    child=None;stopping=False
    def stop(*_):
        nonlocal stopping
        stopping=True
    signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
    try:
        problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,starting=True)
        if problem:raise RuntimeError(problem)
        env={**os.environ,'JAMLOOM_INFERENCE_DEVICE':'mps','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1',
             'HF_HUB_DISABLE_TELEMETRY':'1','JAMLOOM_VOCAL_IDENTITY_ENABLED':'false'}
        with (output/'private.log').open('x') as log:
            child=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--child','--output',str(output),
                '--deadline',str(deadline)],env=env,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            while not stopping and child.poll() is None:
                now=time.time();available=psutil.virtual_memory().available;growth=max(0,psutil.swap_memory().used-swap)
                rows=subprocess.check_output(['ps','-axo','pgid=,rss='],text=True)
                rss=sum(int(r.split()[1])*1024 for r in rows.splitlines() if int(r.split()[0])==child.pid)
                state.update(peak_rss_bytes=max(state['peak_rss_bytes'],rss),
                    peak_swap_growth_bytes=max(state['peak_swap_growth_bytes'],growth),
                    minimum_available_bytes=min(state['minimum_available_bytes'],available),seconds=now-start)
                problem=resource_problem(available,shutil.disk_usage(ROOT).free,rss=rss,swap_growth=growth)
                if now>=deadline:problem='150-minute local qualification deadline reached'
                if not (output/'ready.json').exists() and now-start>600:problem='Model startup deadline reached'
                if (output/'render-state.json').exists():
                    phase=json.loads((output/'render-state.json').read_text());state['requests']=phase['requests']
                    if phase['phase']=='failed':problem='A render failed; stop the entire qualification'
                    if phase['phase']=='rendering' and now-phase['started']>35:problem='Per-track deadline exceeded'
                if problem:raise RuntimeError(problem)
                save(output/'watchdog.json',state);time.sleep(1)
            if not stopping:raise RuntimeError('Local renderer exited before operator shutdown')
            state['status']='STOPPED'
    except BaseException as error:
        state.update(status='FAIL',error=str(error));raise
    finally:
        if child:
            try:os.killpg(child.pid,signal.SIGKILL)
            except ProcessLookupError:pass
            child.wait()
        state.update(seconds=time.time()-start,child_stopped=True)
        save(output/'watchdog.json',state)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--child',action='store_true',help=argparse.SUPPRESS)
    parser.add_argument('--deadline',type=float,help=argparse.SUPPRESS);args=parser.parse_args()
    if args.child:
        if args.deadline is None or not time.time()<args.deadline<=time.time()+9000:raise ValueError('Invalid local deadline')
        serve(args.output.resolve(),args.deadline)
    else:supervise(args.output)
