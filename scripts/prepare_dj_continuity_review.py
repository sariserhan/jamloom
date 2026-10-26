"""Retained originals, actual mixer captures; no loudness remastering or new generation."""
import hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'renders/dj-continuity-mix-20261026';report=json.loads((source/'report.json').read_text())
folder=root/'renders/club-studies-20261024/continuity/review';folder.mkdir(parents=True,exist_ok=True)
assert report['status']=='PASS technical' and not report['newGeneration']
rows=[]
for name in ['before','after']:
 result=next(r for r in report['results'] if r['name']==name);audio=source/(name+'.webm');assert hashlib.sha256(audio.read_bytes()).hexdigest()==result['sha256']
 for incoming in [3,7,10,12,None]:
  change=next((r for r in result['changes'] if r['tracks']==incoming),None)
  output=folder/(name+('-'+str(incoming) if incoming else '-full')+'.mp3');args=['ffmpeg','-v','error','-y','-i',str(audio)]
  if change:args+=['-ss',str(change['elapsed']-20),'-t','32']
  subprocess.run([*args,'-c:a','libmp3lame','-b:a','128k',str(output)],check=True)
  rows.append({'name':name,'incoming_track':incoming,'file':output.name,'source_sha256':result['sha256'],'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'handoff_at_seconds':20 if change else None})
parts=[]
for incoming in [3,7,10,12,None]:
 title='Full twelve-track set' if incoming is None else 'Tracks '+str(incoming-1)+' → '+str(incoming)
 parts.append('<section><h2>'+title+'</h2>')
 for name in ['before','after']:
  row=next(r for r in rows if r['name']==name and r['incoming_track']==incoming)
  parts.append(f'<label>{name.title()}<audio controls preload="metadata" aria-label="{title} {name}" src="{row["file"]}"></audio></label>')
 parts.append('</section>')
(folder/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connected grooves · Jamloom</title><style>body{background:#100e18;color:#eee;font:17px system-ui;margin:0}main{max-width:900px;margin:auto;padding:24px}h1{font-size:clamp(30px,6vw,48px)}section{background:#211b30;border-radius:16px;padding:20px;margin:24px 0}label{display:block;margin:14px 0}audio{display:block;width:100%;margin-top:8px}p{line-height:1.6;color:#cbc4d6}</style><main><p>Jamloom · Local listening comparison</p><h1>Connected grooves</h1><p>The same twelve originals, before and after the mixer changes. Each short excerpt completes its handoff around 20 seconds. Listen for a continuous groove and comfortable energy, not just absence of silence.</p><p>After avoids late instrumental energy collapses when the next track is ready, and balances tracks using sustained body level. No new music or vocal effects were added. Short rhythmic dips still need listening review.</p>'''+''.join(parts)+'</main><script>for(const a of document.querySelectorAll("audio"))a.addEventListener("play",()=>{for(const b of document.querySelectorAll("audio"))if(b!==a)b.pause();});</script></html>')
(root/'docs/evidence/continuity-followthrough-20261026/listening-copies.json').write_text(json.dumps({'source_report_sha256':hashlib.sha256((source/'report.json').read_bytes()).hexdigest(),'retained_originals':True,'new_generation':False,'rows':rows},indent=2)+'\n')
print('PASS: eight paired excerpts and two full mixes prepared')
