"""Compare the two owner-rejected handoffs without changing their music or gain."""
import hashlib, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
evidence=Path(__file__).parent
energy=sys.argv[1:]==['--energy'];overlap=sys.argv[1:]==['--overlap'];assert not sys.argv[1:] or energy or overlap
review=ROOT/('renders/club-studies-20261024/overlap/review' if overlap else 'renders/club-studies-20261024/energy-entry/review' if energy else 'renders/club-studies-20261024/handoff-revision/review')
review.mkdir(parents=True,exist_ok=False)
rows=[];cards=[];sources=[]
for name,folder in ([('Before','dj-overlap-20261026'),('After','dj-overlap-20261026')] if overlap else [('Before','dj-representative-mix-20261026'),('After','dj-representative-energy-20261026' if energy else 'dj-representative-revision-20261026')]):
 source=ROOT/'renders'/folder;report=json.loads((source/'report.json').read_text());row=next(r for r in report['results'] if r['name']==name.lower()) if overlap else report['results'][0]
 assert report['status']=='PASS technical' and row['muted'] and row['history']==(['0','1'] if overlap else ['0','1','2','3'])
 sources.append(report['sourceTracks'])
 audio=source/(name.lower()+'.webm' if overlap else 'after.webm');assert hashlib.sha256(audio.read_bytes()).hexdigest()==row['sha256']
 for number,tracks in ([(1,2)] if energy or overlap else [(1,2),(2,4)]):
  boundary=next(c['elapsed'] for c in row['changes'] if c['tracks']==tracks);start=boundary-10
  assert start>0 and start+26<row['seconds']
  target=review/f'{number}-{name.lower()}.mp3'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(audio),'-ss',str(start),'-t','26','-ac','2','-ar','48000','-c:a','libmp3lame','-b:a','192k',str(target)],check=True)
  rows.append(dict(number=number,name=name,source_sha256=row['sha256'],start_seconds=start,transition_complete_seconds=10,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
assert sources[0]==sources[1]
for number,title in ([(1,'Overlapping grooves')] if overlap else [(1,'First handoff · strong groove entry')] if energy else [(1,'First handoff · originally around 0:53'),(2,'Last handoff · originally around 2:26')]):
 cards.append(f'<section><h2>{title}</h2>'+''.join(f'<article><h3>{name}</h3><audio controls preload="metadata" aria-label="Handoff {number} {name}" src="{number}-{name.lower()}.mp3"></audio></article>' for name in ['Before','After'])+'</section>')
page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Revised handoffs</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:800px;margin:32px auto;padding:0 20px}article{padding:20px;border-radius:16px;background:#213039;margin:16px 0}audio{display:block;width:100%}h1{font-size:32px}</style><h1>Do these handoffs flow better?</h1><p>The same originals at unchanged mixer levels. Each excerpt finishes the handoff near 10 seconds. The first revision shortens an unaligned drum overlap; the last aligns measured beats while keeping the singing intact.</p>'+''.join(cards)+"<p>No new generation or training. These changes still need your listening review. Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>"
if energy: page=page.replace('The first revision shortens an unaligned drum overlap; the last aligns measured beats while keeping the singing intact.','After skips the long weak opening and brings in the measured bass groove. This checks one entry correction; it does not establish that every arrangement matches.')
if overlap: page=page.replace('The first revision shortens an unaligned drum overlap; the last aligns measured beats while keeping the singing intact.','After introduces the next track over a longer instrumental overlap. The outgoing bass stays until the incoming bass takes over. This is a measured-beat blend, not a human-reviewed musical phrase.')
(review/'index.html').write_text(page)
(evidence/('overlap-review.json' if overlap else 'energy-review.json' if energy else 'handoff-review.json')).write_text(json.dumps(dict(status='PASS technical; listening NOT RUN',scope='Unchanged common mixer levels; no per-clip normalization',tracks=sources[0],clips=rows),indent=2)+'\n')
if not overlap: (evidence/('energy-capture.json' if energy else 'handoff-revision.json')).write_bytes((ROOT/('renders/dj-representative-energy-20261026/report.json' if energy else 'renders/dj-representative-revision-20261026/report.json')).read_bytes())
print('http://localhost:8766/'+('overlap' if overlap else 'energy-entry' if energy else 'handoff-revision')+'/review/')
