"""Freeze existing robotic and original stock-loop controls before neural judging."""
import argparse
import json
from pathlib import Path
import shutil
import numpy as np
from arrange_voice_research import RATE,digest,read_pcm,write_pcm
from source_bass_response import compose
from source_led_response import faded

ROOT=Path(__file__).resolve().parents[1]

def prepare(manifest,output):
    output=output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'renders'):raise ValueError('Use a new renders directory')
    if shutil.disk_usage(ROOT).free<16*1024**3:raise RuntimeError('Keep the 15 GiB reserve plus working space')
    study=json.loads(manifest.read_text());old=ROOT/'renders/three-strategy-study-20261030'
    report=json.loads((old/'report.json').read_text());assert report['technical']=='PASS'
    controls=[]
    for source in study['sources']:
        rows=[r for r in report['records'] if r['id']==source['id'] and r['seed']==4123 and r['strategy']=='half_time']
        assert len(rows)==1;row=rows[0]
        audio=old/row['folder']/'performance.wav';original=old/'inputs'/(source['id']+'.wav')
        assert row['source_sha256']==source['original_sha256']
        assert digest(audio)==row['audio_sha256'] and digest(original)==row['prepared_input_sha256']
        controls.append(dict(id=source['id'],source=str(original.relative_to(ROOT)),source_sha256=digest(original),
            old_baseline=str(audio.relative_to(ROOT)),old_baseline_sha256=digest(audio),old_baseline_seconds=row['seconds']))
    output.mkdir()
    t=np.arange(round(1.2*RATE))/RATE
    tone=np.repeat((.08*np.sin(2*np.pi*220*t)*(1+.3*np.cos(2*np.pi*3*t)))[:,None],2,axis=1)
    _,stems,_=compose(tone);bed=sum(stems[n] for n in ('drums','sub','bass','air'))
    for row in controls:
        source=read_pcm(ROOT/row['source'],(.5,5));length=round(31.5*RATE)
        # One deliberately fixed backing for all sources. Repeat its loop if
        # needed; never add an artificial long silent ending to a comparator.
        audio=np.tile(bed,(int(np.ceil(length/len(bed))),1))[:length].copy()
        gain=min(.38/max(np.max(np.abs(source)),1e-9),.13/max(np.sqrt(np.mean(source**2)),1e-9))
        for seconds in (0,14,26):
            a=seconds*RATE;assert a+len(source)<length-RATE//2
            audio[a:a+len(source)]+=faded(source,.01)*gain
        audio*=min(1,.85/max(np.max(np.abs(audio)),1e-9));audio=faded(audio,.01)
        path=output/(row['id']+'-stock.wav');write_pcm(path,audio)
        row.update(stock_baseline=str(path.relative_to(ROOT)),stock_baseline_sha256=digest(path),stock_baseline_seconds=31.5)
    result=dict(schema='jamloom-neural-controls-1',manifest_sha256=digest(manifest),old_report_sha256=digest(old/'report.json'),
        controls=controls,technical='PASS',listening='NOT RUN',old_outputs_modified=False)
    (output/'controls.json').write_text(json.dumps(result,indent=2)+'\n')
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    r=prepare(a.manifest,a.output);print(json.dumps(dict(technical=r['technical'],controls=len(r['controls'])*2,old_outputs_modified=False,human_listening='NOT RUN')))
