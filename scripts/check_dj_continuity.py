"""Inspect captured retained-audio rehearsal; energy dips are findings, not listening acceptance."""
import hashlib,json,subprocess
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
folder=root/'renders/dj-flow-stress-mix-v2-20261026';report=json.loads((folder/'report.json').read_text());r=report['results'][0]
path=folder/'after.webm';raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar','8000','-f','f32le','pipe:1']);a=np.frombuffer(raw,dtype='<f4');assert np.isfinite(a).all()
rate=8000
rms=lambda lo,hi:float(np.sqrt(np.mean(a[max(0,int(lo*rate)):min(len(a),int(hi*rate))]**2)))
rows=[]
for c in r['changes']:
 if c['tracks']<2:continue
 t=c['elapsed'];window=[rms(x,x+.25) for x in np.arange(t-4,t+4,.25)];before=rms(t-8,t-4);after=rms(t+4,t+8)
 rows.append({'incoming_track':c['tracks'],'handoff_complete_seconds':t,'before_rms':before,'after_rms':after,'after_vs_before_db':20*np.log10(max(after,1e-9)/max(before,1e-9)),'lowest_quarter_second_rms':min(window),'lowest_vs_surroundings_db':20*np.log10(max(min(window),1e-9)/max((before+after)/2,1e-9))})
# Exclude the intentional beginning/ending, but retain internal instrumental rests.
steps=np.array([rms(x,x+.01) for x in np.arange(5,len(a)/rate-5,.01)])
longest=run=0
for quiet in steps<.001:run=run+1 if quiet else 0;longest=max(longest,run)
runs=[];start=None
for i,quiet in enumerate(steps<.001):
 if quiet and start is None:start=i
 if not quiet and start is not None:
  if i-start>=25:runs.append({'at':5+start*.01,'seconds':(i-start)*.01})
  start=None
if start is not None and len(steps)-start>=25:runs.append({'at':5+start*.01,'seconds':(len(steps)-start)*.01})
out={'status':'PARTIAL: internal quiet sections require attribution' if runs else 'PASS technical continuity; musical energy findings remain subject to listening','quiet_sections':runs,'seconds':r['seconds'],'peak':r['peak'],'max_delivery_wait_seconds':max(d['waitSeconds'] for d in report['deliveries']),'longest_internal_below_minus60db_seconds':longest*.01,'capture_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'handoffs':rows,'energy_flags':[x['incoming_track'] for x in rows if abs(x['after_vs_before_db'])>6 or x['lowest_vs_surroundings_db']< -12],'limitations':['RMS is not perceived party energy or arrangement quality','Uses twelve retained originals, not fresh generation','Capture can contain authored rests; no human listening acceptance inferred']}
(root/'docs/evidence/local-audio-followthrough-20261026/dj-continuity.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
