"""Expose the same two originals through old/current real mixers; never regenerate audio."""
import hashlib
import json
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[3]
source=ROOT/'renders/dj-vocal-boundary-20261026'
evidence=Path(__file__).parent
report=json.loads((source/'report.json').read_text())
assert report['status']=='PASS technical' and len(report['results'])==2
review=ROOT/'renders/club-studies-20261024/transition-boundary/review'
review.mkdir(parents=True,exist_ok=False)
rows=[]
for name in ('before','after'):
 row=next(r for r in report['results'] if r['name']==name)
 assert row['muted'] and row['history']==['0','1'] and not row['events']
 audio=source/(name+'.webm');assert hashlib.sha256(audio.read_bytes()).hexdigest()==row['sha256']
 boundary=next(c['elapsed'] for c in row['changes'] if c['tracks']==2)
 start=boundary-10;assert start>0 and start+26<row['seconds']
 target=review/(name+'.mp3')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(audio),'-ss',str(start),'-t','26','-ac','2','-ar','48000','-c:a','libmp3lame','-b:a','192k',str(target)],check=True)
 rows.append(dict(name=name,source_sha256=row['sha256'],start_seconds=start,transition_complete_seconds=10,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Transition correction</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:800px;margin:32px auto;padding:0 20px}article{padding:20px;border-radius:16px;background:#213039;margin:20px 0}audio{display:block;width:100%}a{color:#d7ff80}</style><h1>The clip 4 → 5 handoff</h1><p>The same tracks behind the rejected 3:10 moment, replayed through the real mixer before and after the vocal-edge guard. Each excerpt finishes the handoff at about 10 seconds.</p><article><h2>Before · one-bar bass exchange</h2><audio controls preload="metadata" aria-label="Before correction" src="before.mp3"></audio></article><article><h2>After · conservative vocal fade</h2><audio controls preload="metadata" aria-label="After correction" src="after.mp3"></audio></article><p>No new generation, vocal removal or extra looping. The repeated words remain in these originals. This checks one transition change, not a finished DJ performance.</p><p>Does the handoff still feel like the music is ending? Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
(review/'index.html').write_text(page)
(evidence/'boundary-review.json').write_text(json.dumps(dict(status='PASS technical capture; human listening NOT RUN',scope='26-second excerpts with unchanged common mixer levels; no per-clip normalization',tracks=report['sourceTracks'],clips=rows),indent=2)+'\n')
(evidence/'boundary-capture.json').write_bytes((source/'report.json').read_bytes())
print('http://localhost:8766/transition-boundary/review/')
