"""Retained originals plus a synthetic voice probe; no model calls or published audio."""
import hashlib,json,sys,tempfile,wave
from pathlib import Path
import numpy as np
sys.path.insert(0,'scripts')
from dj_vocal import add_hook
source=Path('renders/dj-guided-set-20261025');run=json.loads((source/'report.json').read_text());rows=[]
for row in run['tracks']:
    value=row['receipt']['request']
    if value['sequence']not in (2,7,12):continue
    file=source/row['file'];assert hashlib.sha256(file.read_bytes()).hexdigest()==row['receipt']['sha256']
    with wave.open(str(file),'rb')as w:
        rate=w.getframerate();samples=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768
    calls=[]
    def probe(*args,**kwargs):
        calls.append(kwargs['hook']);t=np.arange(80000)/8000;voice=.1*np.sin(t*2*np.pi*800);voice[t>=1.2]=0
        return np.column_stack((voice,voice)),8000
    with tempfile.TemporaryDirectory()as d:output,cue=add_hook(value,samples,rate,Path(d),None,probe)
    assert cue and 12<=cue['start']<=44 and cue['seconds']<=2 and len(calls)==1
    start=round(cue['start']*rate);end=start+round(cue['seconds']*rate)
    assert np.array_equal(samples[:start],output[:start]) and np.array_equal(samples[end:],output[end:]) and np.max(abs(output))<1
    rows.append(dict(sequence=value['sequence'],source_sha256=row['receipt']['sha256'],synthetic_probe_calls=len(calls),cue=cue))
report=dict(status='PASS measured placement; musical qualification pending',tracks=rows,worker_sha256=hashlib.sha256(Path('scripts/dj_vocal.py').read_bytes()).hexdigest(),new_model_calls=0,human_listening='NOT RUN',limits=['The GPU run used the previous placement code.','Synthetic voice probe only; no listening copy published.','No downbeat or phrase labels inferred.'])
Path('docs/evidence/dj-guided-set-20261025/relocated-vocal-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: three relocated cues, bounded insertion, unchanged instrumental outside the cue.')
