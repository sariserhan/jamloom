"""Reproduce descriptive full-track measurements; these are not musical ratings."""
import json,sys,hashlib
from pathlib import Path
sys.path.insert(0,'scripts')
from compare_dj_sound import analyze
root=Path.cwd();e=root/'docs/evidence/dj-guided-set-20261025';out=root/'renders/dj-guided-sound-20261025';out.mkdir()
run=json.loads((e/'fresh-samples.json').read_text());preference=json.loads((root/'docs/evidence/dj-composition-20261025/owner-feedback.json').read_text());rows=[]
for t in run['tracks']:
 rows.append(dict(id='fresh-'+str(t['receipt']['request']['sequence']),path=str(root/'renders/dj-guided-set-20261025'/t['file']),sha256=t['receipt']['sha256'],style='bass',duration_seconds=60))
rows.append(dict(id='preferred-previous-clip-2',path=str(root/'renders/dj-composition-20261025'/preference['file']),sha256=preference['source_sha256'],style='bass',duration_seconds=60))
results=[]
for row in rows:
 result=analyze(row,out);results.append({k:v for k,v in result.items()if k not in ('path','windows')})
report=dict(status='PASS descriptive analysis',files=results,script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),limits=['Two 30-second windows per track at 24 kHz; no content above 12 kHz.','No verified vocal, instrument, beat, phrase or action labels.','Signal measures do not establish preference, musical quality or reference parity.'])
(e/'sound-comparison.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: six fresh tracks and preferred anchor measured completely.')
