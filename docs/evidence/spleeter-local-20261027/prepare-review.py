from pathlib import Path
import json,hashlib,html,sys,subprocess
import numpy as np,soundfile as sf
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
from singing_response import digest
out=root/'renders/club-studies-20261024/separator/review';out.mkdir(parents=True,exist_ok=False)
rows=[];cards=[]
for case,title in [('deep-house-male','Long Way Home'),('eurodance-female','Leave It All Outside')]:
 source=root/f'renders/singing-originals-20261027/{case}/singer.wav';audio,rate=sf.read(source,dtype='float32',always_2d=True)
 old=np.load(root/f'renders/singing-originals-20261027/{case}/stems/vocals.npy',allow_pickle=False);new=np.load(root/f'renders/spleeter-local-20261027/{case}/vocals.npy',allow_pickle=False)
 assert old.shape==new.shape==audio.shape==(5760000,2) and np.isfinite(new).all()
 signals={'song':audio,'before':audio-old,'candidate':audio-new,'voice':new};gain=.84/max(float(np.max(np.abs(a))) for a in signals.values())
 files={}
 for name,a in signals.items():
  target=out/f'{case}-{name}.mp3';result=subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar',str(rate),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','192k',str(target)],input=(a*gain).astype('<f4').tobytes(),capture_output=True,check=True,timeout=30)
  files[name]={'file':target.name,'sha256':digest(target),'peak':float(np.max(np.abs(a*gain))),'rms':float(np.sqrt(np.mean((a*gain)**2)))}
 rows.append({'case':case,'source_sha256':digest(source),'shared_gain':gain,'duration':120,'files':files,'quality':'NOT RUN: no clean reference vocals'})
 cards.append('<article><h2>'+title+'</h2>'+''.join('<label>'+label+'<audio controls preload="metadata" src="'+files[name]['file']+'"></audio></label>' for name,label in [('song','Original song'),('before','Current karaoke'),('candidate','New karaoke candidate'),('voice','New isolated voice · diagnostic')])+'</article>')
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Karaoke comparison · Jamloom</title><style>body{font:18px/1.5 system-ui;color:#f7f5ed;background:#101723;max-width:1100px;margin:32px auto;padding:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:24px}article{padding:24px;background:#202b39;border-radius:20px;min-width:0}label{display:block;margin:20px 0}audio{display:block;width:100%}:focus-visible{outline:3px solid #9de1cb}</style><h1>The same songs. A new karaoke backing.</h1><p>Compare Current karaoke with New karaoke candidate. Does the new backing remove the lead voice cleanly while keeping the instruments full? These use the same originals and a shared gain, without regeneration.</p><main>'''+''.join(cards)+'''</main><p>The voice player is a diagnostic: isolated parts may contain bleed. The course still uses the accepted backings.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio').forEach(a=>a.pause())});window.addEventListener('pagehide',()=>document.querySelectorAll('audio').forEach(a=>a.pause()));</script></html>''')
(root/'docs/evidence/spleeter-local-20261027/review.json').write_text(json.dumps({'status':'PASS files/finite/sample alignment; listening NOT RUN','rows':rows},indent=2)+'\n')
