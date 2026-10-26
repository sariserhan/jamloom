"""Run from repository root using .venv-analysis/bin/python."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
out=Path(__file__).resolve().parent
r=json.loads((out/'full-file-analysis.json').read_text())
keys=['band_sub','band_bass','band_body','band_presence','band_brightness','side_fraction','pulse_periodicity']
labels=[];values=[];counts={}
for f in r['files']:
 style=f['style'];counts[style]=counts.get(style,0)+1
 labels.append((style.title()+' ref '+str(counts[style]))if f['kind']=='reference' else f['id'].replace('generated-','G')+' '+style+' '+('accepted' if f['owner_status']=='PASS' else 'rejected'))
 values.append([f['summary']['p10_p50_p90'][key][1]*100 for key in keys])
fig,ax=plt.subplots(figsize=(12,9));a=np.array(values);ax.imshow(a,cmap='YlGnBu',vmin=0,vmax=100,aspect='auto')
ax.set_xticks(range(len(keys)),['Sub\n20–80 Hz','Bass\n80–250 Hz','Body\n250–1k Hz','Presence\n1–4k Hz','Brightness\n4–12k Hz','Stereo side\nenergy','Pulse\nperiodicity']);ax.set_yticks(range(len(labels)),labels)
ax.xaxis.tick_top();ax.tick_params(length=0,pad=8)
for i in range(len(labels)):
 for j in range(len(keys)):ax.text(j,i,f'{a[i,j]:.1f}',ha='center',va='center',color='white' if a[i,j]>55 else '#132e40',fontsize=10)
ax.axhline(8.5,color='white',linewidth=5);ax.set_title('Reference performances and Jamloom originals\nMeasured sound characteristics — not a quality score',pad=58,fontsize=17)
fig.text(.02,.02,'Median 30-second windows; percentages except periodicity ×100. Independent band medians need not sum to 100.\nStereo analysis at 24 kHz. Source recordings vary in genre, mastering and duration. G1–G6 are the earlier rated clips.',fontsize=10)
fig.tight_layout(rect=(0,.07,1,1));fig.savefig(out/'sound-comparison.png',dpi=150);plt.close(fig)
