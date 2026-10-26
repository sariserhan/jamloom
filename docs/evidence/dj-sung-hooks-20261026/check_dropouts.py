"""Recheck retained source/candidate pairs; no model calls or replacement audio."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import numpy as np
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root/'scripts'))
from dj_sung_hooks import splice

evidence=Path(__file__).parent
checks=json.loads((evidence/'audio-checks.json').read_text())
plan=json.loads((evidence/'gpu-plan.json').read_text())

def read(path,digest):
    assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
    data=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ar','48000','-ac','2','pipe:1'])
    return np.frombuffer(data,dtype='<f4').reshape(-1,2)

def db(samples):
    return float(20*np.log10(max(1e-12,float(np.sqrt(np.mean(samples**2))))))

rows=[]
for i,(case,check) in enumerate(zip(plan['cases'],checks['tracks'])):
    original=read(root/'renders/dj-planner-20261026'/case['source_file'].removeprefix('sung-'),check['source_sha256'])
    candidate=read(root/f'renders/dj-sung-hooks-20261026-replacement/sung-candidates/raw-{i}.wav',check['raw_sha256'])
    edited=read(root/f'renders/dj-sung-hooks-20261026-replacement/house-{i}.wav',check['sha256'])
    cue=case['cue'];start=round(cue['start']*48000);end=start+round(cue['seconds']*48000)
    frames=[dict(excerpt_start=4+(position-start)/48000,source_dbfs=db(original[position:position+4800]),edited_dbfs=db(edited[position:position+4800])) for position in range(start,end-4800+1,2400)]
    try:
        splice(original,candidate,48000,cue)
        guard='PASS continuity only; no vocal approval'
    except ValueError as error:
        guard=str(error)
    rows.append(dict(number=i+1,sha256=check['sha256'],raw_sha256=check['raw_sha256'],source_sha256=check['source_sha256'],source_window_dbfs=db(original[start:end]),edited_window_dbfs=db(edited[start:end]),frames=frames,guard=guard))
assert rows[0]['guard']=='Repaint drops accompaniment for at least 200 ms'
result=dict(status='PASS regression: rejected clip 1 dropout',tracks=rows,limits='Relative RMS continuity is not voice detection or musical acceptance; all four clips were rejected by the owner.')
(evidence/'dropout-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print('\n'.join(f"Clip {r['number']}: {r['guard']}" for r in rows))
