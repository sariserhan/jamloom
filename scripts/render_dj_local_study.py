"""Four original Mac-only studies through the existing pinned singer engine."""
import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import wave
import psutil
from dj_model_study import cases, parameters
from dj_track_worker import canonical
from render_singing_originals import resource_problem
from singing_response import runtime, load_singer_engine, digest

ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'docs/evidence/dj-local-genres-20261027-ready'
OUTPUT=ROOT/'renders/dj-local-genres-20261027-ready'


def study_cases():
    rows=cases(genres=True)[:3]+[cases()[2]]
    for i,row in enumerate(rows):
        row['request'].update(session='27102788888888888888888888888888',sequence=i,seed=281127+i)
    rows[3]['lyrics']='[Instrumental]\n[Chorus]\nCatch the light\nLet it move\n[Instrumental]'
    rows[3]['caption']=rows[3]['caption'].replace('a resolved ending','a steady drum-and-bass exit for mixing, without a fade-out')
    return rows


def generate(index):
    import numpy as np
    import torch
    os.environ['JAMLOOM_INFERENCE_DEVICE']='mps'
    root=runtime(ROOT/'build-style-training/upstream')
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    import soundfile as sf
    case=study_cases()[index];settings={**parameters(case),'thinking':False}
    output=OUTPUT/str(index+1);output.mkdir(parents=True,exist_ok=False)
    (output/'.partial').write_text('Unfinished local generation')
    torch.set_num_threads(4);torch.manual_seed(settings['seed']);np.random.seed(settings['seed'])
    started=time.monotonic();dit,lm=load_singer_engine(root,mac_small_decode=True)
    result=generate_music(dit,lm,GenerationParams(**settings),GenerationConfig(batch_size=1,audio_format='wav',use_random_seed=False,seeds=[settings['seed']]),save_dir=str(output/'raw'))
    if not result.success or len(result.audios)!=1: raise RuntimeError('Expected one complete local original')
    raw=Path(result.audios[0]['path']);samples,rate=sf.read(raw,always_2d=True,dtype='float32');pcm=canonical(samples,rate)
    with wave.open(str(output/'track.wav'),'wb') as f:
        f.setparams((2,2,48000,0,'NONE','not compressed'));f.writeframes(pcm.tobytes())
    receipt={'status':'PASS technical; listening NOT RUN','case':case,'parameters':settings,
             'raw_sha256':digest(raw),'audio_sha256':digest(output/'track.wav'),'seconds':time.monotonic()-started,
             'device':str(dit.device),'dtype':str(dit.dtype),'mlx_vae':dit.use_mlx_vae,
             'source_audio_used':False,'trained_adapter':False,'semantic_planner':False,
             'comparison_limit':'Local turbo-only generation; not the base/turbo hosted study or customer latency qualification'}
    (output/'complete.json').write_text(json.dumps(receipt,indent=2)+'\n');(output/'.partial').unlink()


def run():
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    plan=EVIDENCE/'plan.json'
    if plan.exists() or OUTPUT.exists():raise FileExistsError('Preserve previous study; no silent retries')
    problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,starting=True)
    if problem:raise RuntimeError(problem)
    plan.write_text(json.dumps({'cases':study_cases(),'device':'mps','paid_compute':False,'semantic_planner':False},indent=2)+'\n')
    for index in range(4):
        report={'status':'FAIL','index':index,'peak_rss_bytes':0};started=time.monotonic();process=None
        try:
            problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,starting=True)
            if problem:raise RuntimeError(problem)
            with (EVIDENCE/f'{index+1}.log').open('x') as log:
                process=subprocess.Popen([sys.executable,__file__,'--case',str(index)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
                while process.poll() is None:
                    rss=sum(int(r.split()[1])*1024 for r in subprocess.check_output(['ps','-axo','pgid=,rss='],text=True).splitlines() if int(r.split()[0])==process.pid)
                    report['peak_rss_bytes']=max(rss,report['peak_rss_bytes'])
                    problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,rss,time.monotonic()-started)
                    if problem:raise RuntimeError(problem)
                    time.sleep(2)
                report['exit_code']=process.returncode
                if process.returncode:raise RuntimeError('Local generation failed; no automatic retry')
            report['status']='PASS technical; listening NOT RUN'
            shutil.copyfile(OUTPUT/str(index+1)/'complete.json',EVIDENCE/f'{index+1}-complete.json')
        except BaseException as error:
            report['error']=str(error);raise
        finally:
            if process is not None:
                try:os.killpg(process.pid,signal.SIGKILL)
                except ProcessLookupError:pass
                process.wait()
            report['seconds']=time.monotonic()-started
            (EVIDENCE/f'{index+1}-execution.json').write_text(json.dumps(report,indent=2)+'\n')
            print(json.dumps(report),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--case',type=int,choices=range(4));a=p.parse_args()
    run() if a.case is None else generate(a.case)
