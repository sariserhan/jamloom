from pathlib import Path
import sys,json,subprocess,hashlib
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
from q0_audit import loudness,level_match
from inspect_wav import inspect
source=root/'renders/dj-local-genres-20261027-ready';out=root/'renders/club-studies-20261024/local-dj/review'
out.mkdir(parents=True,exist_ok=False)
files=[source/str(i)/'track.wav' for i in range(1,5)]
levels=[loudness(p) for p in files];target=min(-24.58,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels))
rows=[];cards=[]
for i,(file,level) in enumerate(zip(files,levels),1):
 receipt=json.loads((file.parent/'complete.json').read_text());sha=hashlib.sha256(file.read_bytes()).hexdigest();assert sha==receipt['audio_sha256']
 audit=inspect(file);assert audit['duration_seconds']==60 and audit['full_scale_samples']==0
 wav=out/f'clip-{i}.wav';gain,measured=level_match(file,wav,target,level)
 assert abs(float(measured['input_i'])-target)<=.2 and float(measured['input_tp'])<=-1.8
 mp3=out/f'clip-{i}.mp3';subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(wav),'-c:a','libmp3lame','-b:a','192k',str(mp3)],check=True,timeout=30)
 rows.append({'number':i,'source_sha256':sha,'original':level,'review':measured,'gain_db':gain,'review_sha256':hashlib.sha256(mp3.read_bytes()).hexdigest(),'duration':60,'style':receipt['case']['request']['style'],'vocal_requested':not receipt['case']['instrumental']})
 cards.append(f'<article><h2>Clip {i}</h2><audio controls preload="metadata" aria-label="Clip {i}" src="{mp3.name}"></audio></article>')
# This capture comes from the actual current Jamloom player, not a new offline mixer.
mix=root/'renders/dj-local-genres-mix-20261027';report=json.loads((mix/'report.json').read_text());assert report['status']=='PASS technical'
assert report['sourceTracks']==[r['source_sha256'] for r in rows] and len(report['results'])==1
result=report['results'][0];assert hashlib.sha256((mix/'after.webm').read_bytes()).hexdigest()==result['sha256']
subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(mix/'after.webm'),'-c:a','libmp3lame','-b:a','192k',str(out/'set.mp3')],check=True,timeout=30)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Four fresh local tracks · Jamloom</title><style>body{font:18px/1.5 system-ui;background:#101723;color:#f3f2ec;max-width:1000px;margin:32px auto;padding:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:20px}article,section{background:#202b39;padding:24px;border-radius:20px;margin:16px 0;min-width:0}audio{display:block;width:100%}:focus-visible{outline:3px solid #b8edc9}</style><h1>Four fresh tracks from this Mac</h1><p>Clips 1–3 explore house, tech-house and techno. Clip 4 requests a brief musical vocal. These are new sixty-second originals; listen for sound quality, groove, development and clear singing. Individual clips have matched loudness.</p><section><h2>Complete automatic set</h2><p>The same four tracks through Jamloom's current DJ player. Listen for connected energy across the styles. This finite local test does not demonstrate hosted nonstop generation.</p><audio controls preload="metadata" aria-label="Complete automatic set" src="set.mp3"></audio></section><main>'''+''.join(cards)+'''</main><script>const stop=()=>document.querySelectorAll('audio').forEach(a=>a.pause());document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()});},true);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);</script></html>''')
(root/'docs/evidence/dj-local-genres-20261027-ready/review.json').write_text(json.dumps({'status':'PASS technical; listening NOT RUN','target_lufs':target,'tracks':rows,'mix':{'seconds':result['seconds'],'sha256':result['sha256'],'changes':result['changes'],'actions':result['events'],'peak':result['peak'],'rms':result['rms']}},indent=2)+'\n')
print('PASS: four originals plus actual player capture; quality NOT RUN')
