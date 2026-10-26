"""Check retained source/proof/budget receipts; does not score music quality."""
import hashlib,json,wave
from pathlib import Path
import numpy as np
root=Path.cwd();e=root/'docs/evidence/dj-planner-20261026';source=root/'renders/dj-planner-20261026'
plan=json.loads((e/'gpu-plan.json').read_text());run=json.loads((source/'report.json').read_text())
assert plan['status']=='AUTHORIZED' and run['status']=='PASS technical' and run['cleanup_confirmed']
assert run['rental_seconds']<=1200 and run['observed_debit_usd']<=3 and len(run['tracks'])==6
rows=[]
for actual,expected in zip(run['tracks'],plan['tracks']):
 r=actual['receipt'];path=source/actual['file'];assert r['request']==expected['request']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256']
 assert not r.get('composition');proof=r.get('planning',{}).get('track')
 assert bool(proof)==bool(r['request']['sequence']%2)
 if proof:assert proof['model']=='acestep-5Hz-lm-1.7B' and proof['code_tokens']>0 and len(proof['audio_codes_sha256'])==64
 assert r['vocal_check']['status'] in ['disabled','ineligible','request_limit','unsupported_tempo','no_supported_grid','phrase_too_long','no_supported_placement','placed']
 assert (r['vocal'] is not None)==(r['vocal_check']['status']=='placed')
 if r['vocal_check']['generated']:assert r.get('planning',{}).get('vocal',{}).get('code_tokens',0)>0
 with wave.open(str(path))as w:
  assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(2,2,48000,2880000)
  pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
 peak=float(np.max(np.abs(pcm)));rms=float(np.sqrt(np.mean(pcm*pcm)));assert .001<peak<1 and rms>.001
 assert 0<r['compute_ms']<=30000
 rows.append(dict(file=actual['file'],sha256=r['sha256'],seconds=60,peak=peak,rms=rms,compute_ms=r['compute_ms'],planning=proof,vocal=r['vocal'],vocal_check=r['vocal_check']))
assert len({r['sha256']for r in rows})==6
calls=6+sum(r['vocal_check']['generated']for r in rows);assert calls<=8
executed={Path(name).name:digest for digest,name in (line.split(maxsplit=1)for line in (source/'executed-scripts.sha256').read_text().splitlines())}
assert all(executed[name]==digest for name,digest in plan['worker_sha256'].items())
assert executed['dj-styles.json']==plan['manifest_sha256']
report=dict(status='PASS technical',tracks=rows,audio_renders=calls,semantic_planning_passes=sum(bool(r['planning'])for r in rows)+calls-6,fresh_vocals=sum(r['vocal']is not None for r in rows),human_listening='NOT RUN',limits=['Semantic-code receipts prove the requested stage ran, not musical quality.','No training, reference audio, publication or qualified production image.'])
(e/'audio-checks.json').write_text(json.dumps(report,indent=2)+'\n');(e/'fresh-samples.json').write_text(json.dumps(run,indent=2)+'\n');(e/'executed-scripts.sha256').write_bytes((source/'executed-scripts.sha256').read_bytes())
print(json.dumps({k:report[k]for k in ['status','audio_renders','semantic_planning_passes','fresh_vocals']}))
