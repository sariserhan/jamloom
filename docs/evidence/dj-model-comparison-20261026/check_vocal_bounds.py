"""Bounded offline separation and phrase screening; no voice-quality inference."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import numpy as np
import psutil

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from dj_vocal import short_phrase

evidence=Path(__file__).parent
source=ROOT/'renders/dj-model-comparison-20261026'
run=json.loads((source/'report.json').read_text())
assert run['status']=='PASS technical' and run['cleanup_confirmed']
assert psutil.virtual_memory().available>=4*1024**3, 'Hold: fewer than 4 GiB available'
report=dict(status='PARTIAL',paid_compute=False,quality='NOT RUN; stems can contain instrumental bleed',tracks=[])
process=None
started=time.monotonic()
try:
    for sequence in (2,5):
        row=run['tracks'][sequence];path=source/row['file'];out=source/f'stems-{sequence}'
        assert hashlib.sha256(path.read_bytes()).hexdigest()==row['receipt']['sha256']
        assert not out.exists(), 'Preserve earlier separation'
        record=dict(sequence=sequence,source_sha256=row['receipt']['sha256'],peak_rss_bytes=0,candidates=[])
        report['tracks'].append(record)
        with (evidence/f'separation-{sequence}.log').open('x') as log:
            process=subprocess.Popen([str(ROOT/'.venv-singer/bin/python'),str(ROOT/'scripts/separate_singer.py'),
                '--input',str(path),'--output',str(out)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True,
                env={**os.environ,'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1'})
            while process.poll() is None:
                rss=psutil.Process(process.pid).memory_info().rss
                record['peak_rss_bytes']=max(record['peak_rss_bytes'],rss)
                if psutil.virtual_memory().available<1024**3 or rss>3*1024**3:raise RuntimeError('Memory limit reached')
                if time.monotonic()-started>600:raise TimeoutError('Ten-minute analysis limit reached')
                time.sleep(1)
            assert process.returncode==0, 'Separator failed; preserve log'
        proof=json.loads((out/'complete.json').read_text());assert proof['source_sha256']==record['source_sha256']
        voice=np.load(out/'vocals.npy',allow_pickle=False)
        assert voice.shape==(2880000,2) and np.isfinite(voice).all()
        record['separation']=proof
        for offset in range(0,51,5):
            chunk=voice[offset*48000:(offset+10)*48000]
            if not .001<float(np.max(np.abs(chunk)))<1:continue
            _,bounds=short_phrase(chunk,48000,90000)
            if bounds and .5<=bounds['start'] and bounds['end']<=9.5:
                bounds={**bounds,'start':offset+bounds['start'],'end':offset+bounds['end']}
                if not any(abs(old['start']-bounds['start'])<.03 for old in record['candidates']):record['candidates'].append(bounds)
        record['short_hook_qualified']=False
    report['status']='PASS technical analysis only'
except Exception as error:
    report['error']=str(error)
    raise
finally:
    if process is not None and process.poll() is None:
        try:os.killpg(process.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        process.wait()
    report['seconds']=time.monotonic()-started
    (evidence/'vocal-bounds.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
