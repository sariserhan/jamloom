"""Run remaining licensed Improvise fixtures serially on this Mac; stop on failure."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time

from archive_local_audition import archive,digest
from dj_metal_probe import save
from improvise_local_audition import ROOT,run,fixture_source


def retained_trials(campaign,manifest,fixtures,excluded):
    campaign=campaign.resolve()
    if not campaign.is_relative_to((ROOT/'renders').resolve()):raise ValueError('Expected a local campaign receipt')
    previous=json.loads(campaign.read_text())
    if previous['status'] not in ('FAIL stopped','PASS local technical coverage') or previous['manifest_sha256']!=digest(manifest):
        raise ValueError('Previous campaign must be stopped with the same manifest')
    seen=set(excluded);retained=[]
    for row in previous['completed']:
        folder=Path(row['directory']).resolve()
        if not folder.is_relative_to((ROOT/'renders').resolve()) or row['label'] in seen:raise ValueError('Invalid retained trial identity')
        result=json.loads((folder/'result.json').read_text());execution=json.loads((folder/'execution.json').read_text())
        expected=next(f for f in fixtures if f['label']==row['label'])
        if result['fixture']!=expected or result['status']!=execution['status'] or result['status']!='PASS technical' or execution['child_stopped'] is not True:
            raise ValueError('Retained trial did not pass and stop')
        if digest(folder/'performance.wav')!=row['sha256'] or row['sha256']!=result['sha256']:raise ValueError('Retained audio changed')
        seen.add(row['label']);retained.append(row)
    elapsed=previous['seconds']
    if not isinstance(elapsed,(float,int)) or not 0<=elapsed<=7800:raise ValueError('Invalid previous campaign budget')
    return retained,elapsed


def qualify(output,completed_campaign=None):
    output=output.resolve()
    if output.parent!=ROOT/'renders' or not output.name.startswith('local-neural-qualification-'):raise ValueError('Fresh local qualification directory required')
    manifest=ROOT/'renders/neural-qualification-20261030/manifest.json'
    data=json.loads(manifest.read_text())
    hosted=json.loads((ROOT/'docs/evidence/five-item-closure-20261030/neural-partial-source-report.json').read_text())
    pilot=ROOT/'renders/improvise-local-audition-funk-tiled-20261030'
    prior=json.loads((pilot/'result.json').read_text())
    if digest(manifest)!=hosted['manifest_sha256'] or prior['status']!='PASS technical' or digest(pilot/'performance.wav')!=prior['sha256']:
        raise ValueError('Prior evidence identity changed')
    for record in hosted['outputs'].values():
        if digest(Path(record['path']))!=record['sha256']:raise ValueError('Prior hosted audio changed')
    done=set(hosted['outputs'])|{prior['fixture']['label']}
    retained,elapsed=(retained_trials(completed_campaign,manifest,data['fixtures'],done) if completed_campaign else ([],0))
    done.update(row['label'] for row in retained)
    fixtures=[f for f in data['fixtures'] if f['label'] not in done]
    for fixture in fixtures:fixture_source(fixture['label'])
    output.mkdir(mode=0o700)
    state=dict(status='RUNNING',manifest_sha256=digest(manifest),scope='Local Metal and local separator qualification; hosted parity NOT RUN',
        paid_compute=False,one_gpu_at_a_time=True,automatic_retries=0,maximum_new_generations=len(fixtures),
        prior_hosted_labels=sorted(hosted['outputs']),prior_local_pilot=str(pilot),fixtures=fixtures,completed=retained.copy(),failures=[],
        inherited_completed=len(retained),prior_seconds=elapsed,
        previous_campaign=({'path':str(completed_campaign.resolve()),'sha256':digest(completed_campaign)} if completed_campaign else None))
    save(output/'campaign.json',state);started=time.monotonic()
    try:
        for index,fixture in enumerate(fixtures):
            if elapsed+time.monotonic()-started>7200:raise RuntimeError('Two-hour local campaign time budget reached')
            trial=ROOT/'renders'/('improvise-local-audition-'+output.name+'-'+str(index+1).zfill(3))
            state['current']=dict(label=fixture['label'],directory=str(trial));save(output/'campaign.json',state)
            print(f"START {index+1}/{len(fixtures)} {fixture['label']}",flush=True)
            run(trial,fixture['label'])
            result=json.loads((trial/'result.json').read_text())
            if result['fixture']!=fixture or digest(trial/'performance.wav')!=result['sha256']:raise ValueError('Completed fixture identity changed')
            generation=list((trial/'studio').glob('*/singer/complete.json'))
            if len(generation)!=1:raise ValueError('Expected one generation receipt')
            save(trial/'generation.json',json.loads(generation[0].read_text()))
            archive(trial)
            state['completed'].append(dict(label=fixture['label'],directory=str(trial),sha256=result['sha256']))
            save(output/'campaign.json',state);print(f"PASS {index+1}/{len(fixtures)} {fixture['label']}",flush=True)
        state['status']='PASS local technical coverage'
    except BaseException as error:
        state['status']='FAIL stopped';state['failures'].append(dict(current=state.get('current'),reason=str(error)));raise
    finally:
        state['seconds']=elapsed+time.monotonic()-started;state['human_listening']='NOT RUN for new outputs';save(output/'campaign.json',state)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--completed-campaign',type=Path,help='Explicit corrected follow-through; preserve stopped receipt and reuse only verified completed tracks')
    a=p.parse_args();qualify(a.output,a.completed_campaign)
