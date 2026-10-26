import json,sys,subprocess,tempfile
from pathlib import Path
import numpy as np
sys.path.insert(0,'scripts')
from research_dj_passages import CAPTIONS
from check_dna_audio import load_auditor
import torch
processor,model=load_auditor();torch.set_num_threads(2)
t=np.arange(480000)/48000;rng=np.random.default_rng(7)
tone=(.3*np.sin(2*np.pi*80*t)).astype('float32')
beat=(.4*np.sin(2*np.pi*90*t)*np.exp(-(t%.5)*35)+rng.normal(0,.05,t.size)*np.exp(-(t%.25)*100)).astype('float32')
labels=[(g,l,text)for g,v in CAPTIONS.items()for l,text in v.items()];results=[]
with torch.inference_mode():
 for name,pcm in [('known_instrumental_sine',tone),('known_instrumental_synthetic_beat',beat)]:
  inputs=processor(text=[r[2]for r in labels],audio=[pcm],return_tensors='pt',padding=True,sampling_rate=48000)
  r=model(**inputs);scores=(r.audio_embeds@r.text_embeds.T)[0].tolist()
  groups={g:sorted([dict(label=l,cosine=s)for (group,l,_),s in zip(labels,scores)if group==g],key=lambda x:-x['cosine'])for g in CAPTIONS}
  results.append(dict(source=name,known_voice=False,rankings=groups));print(name,{g:v[0]for g,v in groups.items()})
Path('docs/evidence/dj-sound-research-20261025/auditor-sanity.json').write_text(json.dumps(dict(status='DIAGNOSTIC',results=results,limits='Synthetic controls test obvious false voice tags only; they are not a musical calibration set.'),indent=2)+'\n')
