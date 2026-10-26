import sys,json,subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path.cwd()/'scripts'))
from analyze_dj_references import features,digest
root=Path(__file__).resolve().parents[3];evidence=root/'docs/evidence/product-release-20261026';a=json.loads((evidence/'mix-analysis.json').read_text());rows=[]
for i,t in enumerate(a['tracks']):
 p=root/t['file'];assert digest(p)==t['analysis']['sha256']
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar','8000','-ac','1','-f','f32le','-']);pcm=np.frombuffer(raw,dtype='<f4');tempo,seconds=features(pcm)
 gain=min(1,.12/t['analysis']['rms'],.8/t['analysis']['peak']);gain_db=20*np.log10(gain)
 windows=[]
 for start in range(0,53,4):
  part=seconds[start:start+8]
  bands=np.mean([x['bands'] for x in part],axis=0)
  windows.append({'start':start,'end':start+8,'rms_db':round(float(np.mean([x['rms_db'] for x in part])+gain_db),2),'bands':bands.round(3).tolist(),'rms_range_db':round(float(np.ptp([x['rms_db'] for x in part])),2)})
 rows.append({'track':i+1,'source_sha256':digest(p),'gain_db':round(float(gain_db),2),'windows':windows})
print(json.dumps(rows,indent=2))
(evidence/'energy-windows.json').write_text(json.dumps({'scope':'Descriptive mono band and level measurements, not perceived-energy or musical-compatibility certification','tracks':rows},indent=2)+'\n')
