"""Freeze three strategies x three seeds for the owner's full listening study."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import time

import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm
from source_led_response import faded
from source_strategy_response import compose,STRATEGIES
from source_excerpt_response import compose as compose_excerpt

SEEDS=(4123,4124,4125)


def render(ledger,output,source_excerpts=False):
    if output.exists():raise FileExistsError('Preserve frozen studies')
    if shutil.disk_usage(output.parent).free<27*1024**3:raise RuntimeError('Need 12 GiB for this study plus 15 GiB reserve')
    rows=json.loads(ledger.read_text())['dataset']['clips']
    if not 20<=len(rows)<=50:raise ValueError('Expected 20–50 licensed inputs')
    for row in rows:
        if not row['consent']['local_processing'] or digest(Path(row['path']))!=row['sha256']:raise ValueError('Unpermitted or changed source')
        if row['source_kind']!='synthetic' and row['license']['id'] not in ('CC-BY-4.0','CC0-1.0','PD-author'):raise ValueError('Unreviewed license')
        if not row['id'] or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in row['id']):raise ValueError('Invalid source ID')
    if len({r['id'] for r in rows})!=len(rows):raise ValueError('Repeated source ID')
    output.mkdir();(output/'.partial').touch();(output/'inputs').mkdir()
    composer=compose_excerpt if source_excerpts else compose
    report=dict(technical='RUNNING',listening='NOT RUN',training='NOT RUN',seeds=SEEDS,strategies=STRATEGIES,
                composition_policy='selected_excerpt_prompt_response' if source_excerpts else 'complete_input',
                ledger_sha256=digest(ledger),source_hashes={name:digest(Path(__file__).with_name(name)) for name in
                ('source_excerpt_response.py','source_strategy_response.py','source_bass_response.py','source_phrase_response.py','render_strategy_study.py')},records=[],controls=[])
    started=time.monotonic()
    for row in rows:
        source=output/'inputs'/(row['id']+'.wav')
        subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',row['path'],'-ar',str(RATE),'-ac','2','-c:a','pcm_s16le',str(source)],check=True,timeout=30)
        if row['kind']=='silence':
            for strategy in STRATEGIES:
                try:composer(read_pcm(source,(.5,5)),SEEDS[0],strategy)
                except ValueError as error:
                    if 'audible' not in str(error).lower() and 'sil' not in str(error).lower():raise
                else:raise AssertionError('Silence accepted')
            report['controls'].append(dict(id=row['id'],status='PASS expected rejection',recorded=row['source_kind']=='recorded',source_sha256=row['sha256']))
            continue
        pcm=read_pcm(source,(.5,5))
        for seed in SEEDS:
            for strategy in STRATEGIES:
                if shutil.disk_usage(output).free<15*1024**3:raise RuntimeError('Disk reserve reached')
                mix,stems,plan=composer(pcm,seed,strategy)
                assert 20<=len(mix)/RATE<=40 and np.isfinite(mix).all() and np.max(np.abs(mix))<=.85000001
                assert np.max(np.abs(mix[-RATE//10:]))==0
                assert np.max(np.abs(sum(stems.values())-mix))<1e-12
                clean=[e for e in plan['events'] if e['kind']==('clean_selected_hook' if source_excerpts else 'clean_call')];assert len(clean)==3
                for e in clean:
                    lo,hi=e['source_frames'];assert 0<=lo<hi<=len(pcm)
                    a=e['start_frame'];expected=faded(pcm[lo:hi],.01)*e['gain']*plan['master_gain']
                    assert np.max(np.abs(stems['voice'][a:a+hi-lo]-expected))<1e-12
                if source_excerpts:
                    instruments=sum(audio for name,audio in stems.items() if name!='voice')
                    end=plan['opening_response']['hook_end_frame']
                    first=int(np.flatnonzero(np.max(np.abs(instruments),axis=1)>.001)[0])
                    assert end<=first and (first-end)/RATE<=30/plan['bpm']+.02
                name=f"{row['id']}-{seed}-{strategy}";folder=output/name;folder.mkdir()
                write_pcm(folder/'performance.wav',mix)
                for stem,audio in stems.items():write_pcm(folder/(stem+'.wav'),audio)
                (folder/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
                record=dict(id=row['id'],seed=seed,strategy=strategy,folder=name,kind=row['kind'],recorded=row['source_kind']=='recorded',
                    source_sha256=row['sha256'],prepared_input_sha256=digest(source),audio_sha256=digest(folder/'performance.wav'),
                    seconds=len(mix)/RATE,peak=float(np.max(np.abs(mix))),clean_calls_verified=3,technical='PASS',listening='NOT RUN',
                    artifacts={p.name:digest(p) for p in folder.glob('*.wav')},
                    source_selection=plan.get('source_selection'),opening_response=plan.get('opening_response'))
                (folder/'complete.json').write_text(json.dumps(record,indent=2)+'\n');report['records'].append(record)
        assert digest(Path(row['path']))==row['sha256']
        print(row['id'],'9 renders PASS',flush=True)
        (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    report.update(technical='PASS',seconds=time.monotonic()-started,eligible_sources=len({r['id'] for r in report['records']}),
        missing=['Owner blinded ratings','Recorded silence control'] if not any(r['recorded'] for r in report['controls']) else ['Owner blinded ratings'])
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (output/'ATTRIBUTION.txt').write_text('\n\n'.join(r.get('license',{}).get('attribution',r['consent']['evidence']) for r in rows)+'\n')
    (output/'.partial').unlink()


def finalize_partial(ledger,output):
    """Recover completed renders only; recheck every retained audio hash and source."""
    if not (output/'.partial').is_file():raise ValueError('Only an incomplete batch may be finalized')
    report=json.loads((output/'report.json').read_text());rows=json.loads(ledger.read_text())['dataset']['clips']
    composer=compose_excerpt if report.get('composition_policy')=='selected_excerpt_prompt_response' else compose
    assert report['technical']=='RUNNING' and report['ledger_sha256']==digest(ledger)
    for name,sha in report['source_hashes'].items():
        if name!='render_strategy_study.py':assert digest(Path(__file__).with_name(name))==sha
    expected={(r['id'],seed,strategy) for r in rows if r['kind']!='silence' for seed in SEEDS for strategy in STRATEGIES}
    assert {(r['id'],r['seed'],r['strategy']) for r in report['records']}==expected
    assert len(report['records'])==len(expected)
    for row in rows:assert digest(Path(row['path']))==row['sha256']
    for row in report['records']:
        folder=output/row['folder'];assert digest(output/'inputs'/(row['id']+'.wav'))==row['prepared_input_sha256']
        for name,sha in row['artifacts'].items():assert digest(folder/name)==sha
        mix=read_pcm(folder/'performance.wav',(20,40));assert np.isfinite(mix).all() and np.max(np.abs(mix))<=.851
        assert np.max(np.abs(mix[-RATE//10:]))==0
    report['controls']=[]
    for row in rows:
        if row['kind']!='silence':continue
        for strategy in STRATEGIES:
            try:composer(read_pcm(output/'inputs'/(row['id']+'.wav'),(.5,5)),SEEDS[0],strategy)
            except ValueError as error:assert 'sil' in str(error).lower() or 'audible' in str(error).lower()
            else:raise AssertionError('Silence accepted')
        report['controls'].append(dict(id=row['id'],status='PASS expected rejection',recorded=row['source_kind']=='recorded',source_sha256=row['sha256']))
    report.update(technical='PASS',eligible_sources=len({r['id'] for r in report['records']}),
        recovery='Expected silence rejection initially escaped the audit; corrected classifier, all retained hashes reverified, no audio rerendered',
        verification_script_sha256=digest(Path(__file__)),missing=['Owner blinded ratings','Recorded silence control'])
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (output/'ATTRIBUTION.txt').write_text('\n\n'.join(r.get('license',{}).get('attribution',r['consent']['evidence']) for r in rows)+'\n')
    (output/'.partial').unlink()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ledger',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--finalize-partial',action='store_true')
    p.add_argument('--source-excerpts',action='store_true',help='Evaluate selected hooks with a prompt instrumental response')
    a=p.parse_args()
    if a.finalize_partial:finalize_partial(a.ledger,a.output)
    else:render(a.ledger,a.output,a.source_excerpts)
