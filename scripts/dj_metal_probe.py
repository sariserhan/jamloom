"""One bounded local GPU timing probe before attempting continuous AI DJ playback."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import uuid

import psutil

ROOT = Path(__file__).resolve().parents[1]
GIB = 1024**3


def resource_problem(available, disk, rss=0, elapsed=0, swap_growth=0, starting=False):
    # This is text-to-music, using the existing small-Metal singing loader.
    if available < (4*GIB if starting else GIB): return 'Available memory floor reached'
    if disk < 15*GIB: return 'Free disk reserve reached'
    if rss > 8*GIB: return 'Process-group memory limit reached'
    if swap_growth > 2*GIB: return 'Swap growth limit reached'
    if elapsed > 600: return 'Ten-minute probe deadline reached'
    return None


def save(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2)+'\n')
    temporary.replace(path)


def child(output):
    from singing_response import runtime, load_singer_engine
    from dj_track_worker import CODE_REVISION, WEIGHTS_REVISION
    from dj_warm_engine import Renderer
    import torch
    if not torch.backends.mps.is_available(): raise RuntimeError('Apple GPU is unavailable')
    root = runtime(ROOT/'build-style-training/upstream')  # Code and every weight hash.
    os.chdir(root)
    engine = load_singer_engine(root, mac_small_decode=True)
    if str(engine[0].device) != 'mps' or engine[0].use_mlx_vae:
        raise RuntimeError('Expected the verified small-tile Metal path')
    renderer = Renderer(time.time()+600, 1, engine=engine)
    value = dict(job=str(uuid.uuid4()), vocals=False, request=dict(
        version=1, session=uuid.uuid4().hex, sequence=0, seed=20301030,
        style='house', energy=4, mood='warm'))
    save(output/'phase.json', dict(phase='generation', started_at=time.time(), device='mps'))
    receipt, audio = renderer.render(value)
    (output/'track.wav').write_bytes(audio)
    save(output/'render.json', dict(receipt=receipt, device='mps',
        code_revision=CODE_REVISION, weights_revision=WEIGHTS_REVISION,
        small_metal_decode=True, bytes=len(audio), sha256=hashlib.sha256(audio).hexdigest(),
        per_track_deadline_ms=30000, audio_seconds=60, human_listening='NOT RUN'))


def run(output):
    output = output.resolve()
    if not output.is_relative_to(ROOT/'renders'):
        raise ValueError('Keep local probe evidence under renders')
    output.mkdir(mode=0o700)  # Never overwrite an attempt.
    state = dict(status='NOT RUN', paid_compute=False, device_requested='mps',
        model_requests_max=1, model_requests_started=0, timeout_seconds=600,
        per_track_deadline_ms=30000, disk_floor_bytes=15*GIB,
        initial_available_bytes=psutil.virtual_memory().available,
        peak_process_group_rss_bytes=0, human_listening='NOT RUN')
    started = time.monotonic()
    swap = psutil.swap_memory().used
    process = None
    def interrupted(number, frame): raise InterruptedError('Local probe interrupted')
    handlers = {n:signal.signal(n,interrupted) for n in (signal.SIGTERM,signal.SIGINT)}
    try:
        problem = resource_problem(state['initial_available_bytes'],shutil.disk_usage(ROOT).free,starting=True)
        if problem: raise RuntimeError(problem)
        env = {**os.environ, 'JAMLOOM_INFERENCE_DEVICE':'mps', 'HF_HUB_OFFLINE':'1',
               'TRANSFORMERS_OFFLINE':'1', 'HF_HUB_DISABLE_TELEMETRY':'1',
               'JAMLOOM_VOCAL_IDENTITY_ENABLED':'false'}
        with (output/'execution.log').open('x') as log:
            process = subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--child','--output',str(output)],
                cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            state['status']='RUNNING'
            while process.poll() is None:
                rows=subprocess.check_output(['ps','-axo','pgid=,rss='],text=True)
                rss=sum(int(row.split()[1])*1024 for row in rows.splitlines() if int(row.split()[0])==process.pid)
                state['peak_process_group_rss_bytes']=max(state['peak_process_group_rss_bytes'],rss)
                phase=output/'phase.json'
                if phase.exists():
                    state['model_requests_started']=1
                    if time.time()-json.loads(phase.read_text())['started_at']>35:
                        raise RuntimeError('30-second generation deadline exceeded; stopping the probe')
                problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,
                    rss,time.monotonic()-started,max(0,psutil.swap_memory().used-swap))
                if problem: raise RuntimeError(problem)
                state['seconds']=time.monotonic()-started
                save(output/'execution.json',state)
                time.sleep(1)
            state['exit_code']=process.returncode
            if process.returncode: raise RuntimeError('Metal probe failed; see execution.log')
        result=json.loads((output/'render.json').read_text())
        if result['receipt']['compute_ms']>30000: raise RuntimeError('Generation is too slow for continuous DJ playback')
        if result['sha256']!=hashlib.sha256((output/'track.wav').read_bytes()).hexdigest():
            raise RuntimeError('Generated track changed')
        state.update(status='PASS timing probe only',model_requests_started=1,compute_ms=result['receipt']['compute_ms'])
    except BaseException as error:
        if process is not None: state['status']='FAIL'
        state['error']=str(error)
        raise
    finally:
        if process is not None:
            try: os.killpg(process.pid,signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait()
        if (output/'phase.json').exists(): state['model_requests_started']=1
        state['seconds']=time.monotonic()-started
        save(output/'execution.json',state)
        for n,handler in handlers.items(): signal.signal(n,handler)
        print(json.dumps(state),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--child',action='store_true',help=argparse.SUPPRESS)
    args=parser.parse_args()
    if args.child: child(args.output.resolve())
    else: run(args.output)
