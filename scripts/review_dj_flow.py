"""Verify the completed fresh flow and prepare local listening using the existing encoder."""
import hashlib,json
from pathlib import Path
from review_dj_warm import listening_copy
root=Path(__file__).resolve().parents[1]
source=root/'renders/dj-continuity-flow-20261026';mix=root/'renders/dj-continuity-flow-mix-20261026'
run=json.loads((source/'report.json').read_text());capture=json.loads((mix/'report.json').read_text())
assert run['status']==run['playback_status']=='PASS technical' and run['cleanup_confirmed']
assert run['observed_debit_usd']<=3 and run['rental_seconds']<=2400 and len(run['tracks'])==12
assert run['playback_start']['available_tracks']==2 and capture['newGeneration'] and capture['status']=='PASS technical'
assert capture['sourceTracks']==[t['receipt']['sha256'] for t in run['tracks']]
review=root/'renders/club-studies-20261024/fresh-flow/review';review.mkdir(parents=True,exist_ok=False)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for i,row in enumerate(run['tracks']):
 audio=source/row['file'];assert digest(audio)==row['receipt']['sha256']
 assert digest(source/'remote-results'/row['raw_archive'])==row['receipt']['model_comparison']['raw_sha256']
 output=review/f'track-{i+1}.mp3';listening_copy(audio,output);rows.append({'number':i+1,'file':output.name,'sha256':digest(output),'source_sha256':digest(audio)})
assert digest(mix/'after.webm')==capture['results'][0]['sha256'];listening_copy(mix/'after.webm',review/'set.mp3')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fresh continuous set · Jamloom</title><style>body{font:18px/1.5 system-ui;background:#100e18;color:#eee;margin:0}main{max-width:900px;padding:24px;margin:auto}section,details{background:#211b30;padding:20px;border-radius:16px;margin:20px 0}audio{width:100%}p{color:#cbc4d6}</style><main><p>Jamloom · Fresh generation qualification</p><h1>Hear the fresh set</h1><p>Twelve tracks generated during playback, starting with only two ready. This is the actual mixer capture. Tracks 3 and 8 were requested with distinct short sung hooks; audible quality still needs listening.</p><section><h2>Complete set</h2><audio controls preload="metadata" aria-label="Fresh full set" src="set.mp3"></audio></section><details><summary>Individual tracks</summary>'''
for row in rows:page+=f'<section><h2>Track {row["number"]}</h2><audio controls preload="none" aria-label="Track {row["number"]}" src="{row["file"]}"></audio></section>'
page+='''</details><p>The GPU is deleted. No further generation or public activation is running.</p></main><script>for(const a of document.querySelectorAll('audio'))a.addEventListener('play',()=>{for(const b of document.querySelectorAll('audio'))if(b!==a)b.pause();});</script></html>'''
(review/'index.html').write_text(page)
evidence=root/'docs/evidence/dj-continuity-flow-20261026'
(evidence/'gpu-result.json').write_text(json.dumps(run,indent=2)+'\n')
(evidence/'playback.json').write_text(json.dumps(capture,indent=2)+'\n')
(evidence/'listening.json').write_text(json.dumps({'rows':rows,'set_sha256':digest(review/'set.mp3'),'human_listening':'NOT RUN'},indent=2)+'\n')
print('PASS: twelve fresh sources/raw archives verified and listening copies prepared')
