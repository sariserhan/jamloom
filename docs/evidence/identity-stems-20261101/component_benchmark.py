"""CPU-only synthetic component benchmark; never loads a music model."""
import datetime
import importlib.util
import json
from pathlib import Path
import time
import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/test_identity_stems.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
rows=[]
for seconds in (30,39,45):
    fixture=m.IdentityStemTests();fixture.setUp()
    try:
        for name in ['base.wav','singer.wav']:
            pcm=m.identity._identity_pcm(fixture.root/name)
            sf.write(fixture.root/name,np.tile(pcm,(2,1))[:seconds*48000],48000,subtype='PCM_16')
        fixture.case['duration']=seconds;fixture.base['case']=fixture.case
        fixture.base['audio_sha256']=m.digest(fixture.root/'base.wav')
        (fixture.root/'base.complete.json').write_text(json.dumps(fixture.base))
        fixture.separation['source_sha256']=fixture.base['audio_sha256']
        for name in ['vocals','drums']:
            path=fixture.root/'identity-stems'/f'{name}.npy'
            pcm=np.load(path,allow_pickle=False)
            np.save(path,np.tile(pcm,(2,1))[:seconds*48000],allow_pickle=False)
            fixture.separation['stems'][name]=m.digest(path)
        (fixture.root/'identity-stems/complete.json').write_text(json.dumps(fixture.separation))
        before=m.digest(fixture.root/'singer.wav');start=time.perf_counter();fixture.publish()
        publish=time.perf_counter()-start;start=time.perf_counter()
        assert m.identity.identity_stems_ready(fixture.root)
        verify=time.perf_counter()-start;assert before==m.digest(fixture.root/'singer.wav')
        rows.append({'seconds':seconds,'publishSeconds':publish,'verifySeconds':verify,'generatedWAVUnchanged':True})
    finally:
        fixture.doCleanups()
report={'status':'PASS_LOCAL_SYNTHETIC_ONLY','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'modelInference':False,'GPUUsed':False,'hostedSpeedup':'NOT RUN','cases':rows}
Path(__file__).with_name('component-benchmark.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
