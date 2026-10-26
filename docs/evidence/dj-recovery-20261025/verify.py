"""Verify retained replacement outputs and the seed-isolation contract, not music quality."""
import hashlib,json,wave
from pathlib import Path
import numpy as np
root=Path.cwd();e=root/'docs/evidence/dj-recovery-20261025';source=root/'renders/dj-recovery-20261025-replacement'
run=json.loads((source/'report.json').read_text());plan=json.loads((e/'gpu-plan.json').read_text())
assert run['status']=='PASS technical' and run['cleanup_confirmed'] and len(run['tracks'])==6
rows=[]
for item,wanted in zip(run['tracks'],plan['tracks']):
 r=item['receipt'];path=source/item['file'];assert r['request']==wanted['request']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256']
 assert r['composition']['request']==wanted['guide_request']
 assert r['composition']['score_sha256']==wanted['guide_score_sha256']
 with wave.open(str(path))as w:
  assert (w.getnchannels(),w.getsampwidth(),w.getframerate(),w.getnframes())==(2,2,48000,2880000)
  pcm=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
 peak=float(np.max(np.abs(pcm)));rms=float(np.sqrt(np.mean(pcm*pcm)));assert .001<peak<1 and rms>.001
 rows.append(dict(file=item['file'],sha256=r['sha256'],sequence=r['request']['sequence'],peak=peak,rms=rms,seconds=60,vocal=r.get('vocal'),compute_ms=r['compute_ms'],guide_sha256=r['composition']['guide_sha256']))
assert len({r['sha256']for r in rows})==6
assert rows[0]['guide_sha256']==rows[1]['guide_sha256']==rows[4]['guide_sha256']==rows[5]['guide_sha256']
assert rows[2]['guide_sha256']==rows[3]['guide_sha256']!=rows[0]['guide_sha256']
executed={Path(name).name:digest for digest,name in (line.split(maxsplit=1)for line in (source/'executed-scripts.sha256').read_text().splitlines())}
assert all(executed[name]==digest for name,digest in plan['worker_sha256'].items())
assert executed['dj-styles.json']==plan['manifest_sha256']
report=dict(status='PASS technical',tracks=rows,guide_seed_isolation='PASS byte-identical remote guides within each group; different guides across groups',human_listening='NOT RUN',fresh_vocals=sum(r['vocal']is not None for r in rows),limits=['No musical quality score inferred.','The first four tracks are factorial controls, not four independent fresh composition seeds.','Fixed guide reuse is diagnostic only and is not a production diversity policy.'])
(e/'audio-checks.json').write_text(json.dumps(report,indent=2)+'\n');(e/'fresh-samples.json').write_text(json.dumps(run,indent=2)+'\n')
(e/'executed-scripts.sha256').write_bytes((source/'executed-scripts.sha256').read_bytes())
print(json.dumps(dict(status=report['status'],fresh_vocals=report['fresh_vocals'],tracks=len(rows))))
