"""One local Improvise audition with hard memory and time bounds."""
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

import psutil
from dj_metal_probe import resource_problem,save

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'renders/question-bass-response-20261030/source.wav'
SOURCE_SHA='4f37e2d3c35266f627589374812742680fe2d4ae8d7a07c8a9effeffab58588a'


def fixture_source(label):
    manifest=json.loads((ROOT/'renders/neural-qualification-20261030/manifest.json').read_text())
    fixture=next((f for f in manifest['fixtures'] if f['label']==label),None)
    if fixture is None:raise ValueError('Unknown licensed qualification fixture')
    source=next(s for s in manifest['sources'] if s['id']==fixture['source_id'])
    path=(ROOT/source['path']).resolve()
    if not path.is_relative_to(ROOT/'renders') or hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
        raise ValueError('Qualification source changed')
    return fixture,source,path


def child(output,fixture_label=None):
    if fixture_label:
        fixture,source,path=fixture_source(fixture_label)
        import singer_studio
        singer_studio.OUTPUT=output/'studio'
        save(output/'phase.json',{'phase':'full-studio-pipeline','started_at':time.time()})
        _,audio,_,_,_=singer_studio.make_reply(str(path),'',fixture['voice'],fixture['genre'],True,45,fixture['energy'],mac_small_decode=True)
        audio=Path(audio);os.link(audio,output/'performance.wav')
        report=json.loads(audio.with_name('complete.json').read_text())
        save(output/'arrangement.json',report)
        save(output/'result.json',{'status':'PASS technical','audio':'performance.wav','sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),
            'fixture':fixture,'source_sha256':source['sha256'],'human_listening':'NOT RUN','hosted_separator_parity':'NOT RUN'})
        return
    from singing_response import draft,load_plan
    from singer_studio import prepare_source,sample_candidate
    from improvise_vocals import choose_instrumental
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA
    seed=next(n for n in range(20301030,20301130) if choose_instrumental('dj','surprise',n))
    source=prepare_source(SOURCE,output)
    candidate=sample_candidate(output,{'transcript':'Bro, I have a question'},'dj',source['original_seconds'],seed)
    assert candidate and json.loads(candidate[1].read_text())['original_seconds']==[0,1.22]
    plan=output/'reply.json'
    draft(ROOT/'build-style-training/upstream','Bro, I have a question',seed,plan,'male','dj',45,'high',True)
    case=load_plan(plan)['cases'][0]
    commands=[
        ('neural-generation',[sys.executable,str(ROOT/'scripts/singing_response.py'),'sing','--runtime',str(ROOT/'build-style-training/upstream'),'--plan',str(plan),'--case',case['id'],'--output',str(output/'singer'),'--mac-small-decode']),
        ('separation',[sys.executable,str(ROOT/'scripts/separate_singer.py'),'--input',str(output/'singer/singer.wav'),'--output',str(output/'singer/stems')]),
    ]
    for stage,command in commands:
        save(output/'phase.json',{'phase':stage,'started_at':time.time()})
        subprocess.run(command,cwd=ROOT,check=True,timeout=600)
    save(output/'phase.json',{'phase':'arrangement','started_at':time.time()})
    from local_call_edit import arrange
    report=arrange(candidate[0],output/'singer',output/'exchange',output/'history.json',seed,True,source_score=candidate[1])
    assert report['sample_used'] and report['events']
    report.update(source_excerpt=json.loads(candidate[1].read_text()),original_recording_sha256=source['original_sha256'],generated_vocals=False,
                  musical_direction={'genre':'dj','energy':'high','seed':seed},human_listening='NOT RUN',
                  scope='Local Metal generation and local Demucs separator; hosted separator parity NOT RUN')
    save(output/'exchange/complete.json',report)
    save(output/'result.json',{'status':'PASS technical','audio':'exchange/performance.wav','sha256':hashlib.sha256((output/'exchange/performance.wav').read_bytes()).hexdigest(),'human_listening':'NOT RUN'})


def run(output,fixture_label=None):
    output=output.resolve()
    if output.parent!=ROOT/'renders' or not output.name.startswith('improvise-local-audition-'):
        raise ValueError('Use a fresh renders/improvise-local-audition-* directory')
    bound_source=fixture_source(fixture_label)[1]['sha256'] if fixture_label else SOURCE_SHA
    output.mkdir(mode=0o700)
    state={'status':'RUNNING','scope':('One full vocal Improvise pipeline' if fixture_label else 'One instrumental Improvise audition')+'; not the closed DJ endurance test',
           'paid_compute':False,'model_requests_max':1,'retries':0,'max_seconds':600,'source_sha256':bound_source,'fixture':fixture_label,
           'peak_rss_bytes':0,'peak_swap_growth_bytes':0,'minimum_available_bytes':psutil.virtual_memory().available}
    started=time.monotonic();swap=psutil.swap_memory().used;process=None
    def interrupted(*_):raise InterruptedError('Audition interrupted')
    previous={s:signal.signal(s,interrupted) for s in (signal.SIGINT,signal.SIGTERM)}
    try:
        problem=resource_problem(psutil.virtual_memory().available,shutil.disk_usage(ROOT).free,starting=True)
        if problem:raise RuntimeError(problem)
        env={**os.environ,'JAMLOOM_INFERENCE_DEVICE':'mps','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1','JAMLOOM_VOCAL_IDENTITY_ENABLED':'false'}
        with (output/'execution.log').open('x') as log:
            process=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--child','--output',str(output),*(['--fixture',fixture_label] if fixture_label else [])],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            while process.poll() is None:
                rows=subprocess.check_output(['ps','-axo','pgid=,rss='],text=True)
                rss=sum(int(r.split()[1])*1024 for r in rows.splitlines() if int(r.split()[0])==process.pid)
                available=psutil.virtual_memory().available;growth=max(0,psutil.swap_memory().used-swap)
                state.update(seconds=time.monotonic()-started,peak_rss_bytes=max(state['peak_rss_bytes'],rss),peak_swap_growth_bytes=max(state['peak_swap_growth_bytes'],growth),minimum_available_bytes=min(state['minimum_available_bytes'],available))
                problem=resource_problem(available,shutil.disk_usage(ROOT).free,rss,state['seconds'],growth)
                if problem:raise RuntimeError(problem)
                save(output/'execution.json',state);time.sleep(1)
            if process.returncode:raise RuntimeError('Audition failed; preserve execution.log')
        assert json.loads((output/'result.json').read_text())['status']=='PASS technical'
        state['status']='PASS technical'
    except BaseException as error:
        state.update(status='FAIL',reason=str(error));raise
    finally:
        if process:
            try:os.killpg(process.pid,signal.SIGKILL)
            except ProcessLookupError:pass
            process.wait()
        state.update(child_stopped=True,seconds=time.monotonic()-started)
        save(output/'execution.json',state)
        for s,handler in previous.items():signal.signal(s,handler)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--fixture',help='One exact licensed fixture label; omitted for the confirmed question instrumental')
    parser.add_argument('--child',action='store_true',help=argparse.SUPPRESS);args=parser.parse_args()
    if args.child:child(args.output.resolve(),args.fixture)
    else:run(args.output,args.fixture)
