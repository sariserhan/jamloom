"""Level-match and blind every source/seed block without exposing its answer key."""
import argparse
import hashlib
import json
from pathlib import Path
import secrets
import shutil
import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm
from source_bass_response import compose
from source_led_response import faded
from q0_audit import loudness,level_match

ROOT=Path(__file__).resolve().parents[1]


def prepare(batch,output):
    if output.exists() or output.resolve().is_relative_to(batch.resolve()):raise ValueError('Use a fresh review outside the render batch')
    report=json.loads((batch/'report.json').read_text());assert report['technical']=='PASS'
    # Four padded working WAVs and four listening WAVs per block; keep the Mac reserve.
    lengths={}
    for row in report['records']:
        group=(row['id'],row['seed']);lengths[group]=max(lengths.get(group,0),row['seconds'],31.5)
    required=sum(lengths.values())*RATE*2*2*8+len(lengths)*5*RATE*2*2
    if shutil.disk_usage(output.parent).free<required+15*1024**3:raise RuntimeError('Review needs its estimated WAV space plus 15 GiB reserve')
    output.mkdir();review=output/'review';review.mkdir();raw=output/'working';raw.mkdir()
    t=np.arange(round(1.2*RATE))/RATE
    control=np.repeat((.08*np.sin(2*np.pi*220*t)*(1+.3*np.cos(2*np.pi*3*t)))[:,None],2,axis=1)
    _,stems,_=compose(control);bed=sum(stems[n] for n in ('drums','sub','bass','air'))
    groups={}
    for row in report['records']:groups.setdefault((row['id'],row['seed']),[]).append(row)
    blocks=[];keys=[]
    for (source_id,seed),rows in groups.items():
        if shutil.disk_usage(output).free<15*1024**3:raise RuntimeError('Disk reserve reached; preserve this partial review')
        assert len(rows)==3 and len({r['strategy'] for r in rows})==3
        source=batch/'inputs'/(source_id+'.wav');original=read_pcm(source,(.5,5))
        # Preserve the complete-input baseline's final call at 26 s, including
        # its tail. Shorter excerpt arrangements receive identical end padding.
        choices=[];length=max(max(round(r['seconds']*RATE) for r in rows),round(26.5*RATE)+len(original))
        folder=review/f'block-{len(blocks)+1:03d}';folder.mkdir();shutil.copyfile(source,folder/'source.wav')
        for row in rows:
            path=batch/row['folder']/'performance.wav';assert digest(path)==row['audio_sha256']
            audio=read_pcm(path,(20,40));padded=np.zeros((length,2));padded[:len(audio)]=audio
            path=raw/(row['folder']+'.wav');write_pcm(path,padded);choices.append((row['strategy'],path))
        fixed=np.zeros((length,2));fixed[:min(length,len(bed))]=bed[:min(length,len(bed))]
        gain=min(.38/max(np.max(np.abs(original)),1e-9),.13/max(np.sqrt(np.mean(original**2)),1e-9))
        for seconds in (0,14,26):
            start=round(seconds*RATE)
            if start+len(original)>length-RATE//2:raise ValueError('Control call outside audio')
            fixed[start:start+len(original)]+=faded(original,.01)*gain
        fixed*=min(1,.85/max(np.max(np.abs(fixed)),1e-9))
        baseline=raw/f'{source_id}-{seed}-baseline.wav';write_pcm(baseline,fixed);choices.append(('baseline',baseline))
        secrets.SystemRandom().shuffle(choices);mapping={};hashes={};levels={}
        for label,(strategy,path) in zip('ABCD',choices):
            gain_db,measurement=level_match(path,folder/(label+'.wav'),-23,loudness(path))
            mapping[label]=strategy;hashes[label]=digest(folder/(label+'.wav'));levels[label]=dict(gain_db=gain_db,**measurement)
        # All six pairs conceal which of the four candidates is the control.
        block=dict(id=f'{source_id}-{seed}',source_id=source_id,seed=seed,kind=rows[0]['kind'],folder=folder.name,
                   source_sha256=digest(folder/'source.wav'),audio_sha256=hashes)
        blocks.append(block);keys.append(dict(id=block['id'],mapping=mapping,levels=levels))
        print(block['id'],'four anonymous candidates ready',flush=True)
    freeze=hashlib.sha256(json.dumps(blocks,sort_keys=True).encode()).hexdigest()
    data=dict(version=2,freeze=freeze,blocks=blocks,listener='owner',ratings='NOT RUN',
              rubric='recognizable,groove,coherence,originality,enjoyment,share,technical_failure; all six pairwise preferences; distinct arrangements',
              source_report_sha256=digest(batch/'report.json'))
    (review/'study.json').write_text(json.dumps(data,indent=2)+'\n')
    (output/'organizer-key.json').write_text(json.dumps(dict(freeze=freeze,blocks=keys),indent=2)+'\n')
    (output/'evaluation-policy.json').write_text(json.dumps(dict(freeze=freeze,source_report_sha256=data['source_report_sha256'],composition_policy=report.get('composition_policy','complete_input')),indent=2)+'\n')
    for name in ('strategy-review.html','strategy-review.js','owner-review.css'):
        shutil.copyfile(ROOT/'apps/listening'/name,review/('index.html' if name.endswith('.html') else name))
    shutil.copyfile(batch/'ATTRIBUTION.txt',review/'ATTRIBUTION.txt')
    (output/'preparation.json').write_text(json.dumps(dict(technical='PASS',human_listening='NOT RUN',blocks=len(blocks),candidates=len(blocks)*4,freeze=freeze,source_report_sha256=data['source_report_sha256']),indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--batch',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();prepare(a.batch,a.output)
