#!/usr/bin/env python3
"""Audition real deck effects on an existing original; no generation or reference audio."""
import hashlib,json
from pathlib import Path
from review_dj_warm import listening_copy
ROOT=Path(__file__).resolve().parents[1]

def main():
    evidence=ROOT/'docs/evidence/dj-guided-set-20261025'
    report=json.loads((evidence/'vocal-effects.json').read_text());assert report['status']=='PASS technical'
    review=ROOT/'renders/club-studies-20261024/vocal-effects/review';review.mkdir(parents=True)
    if (review/'index.html').exists():raise FileExistsError('Preserve previous listening evidence')
    cards=[];rows=[]
    for mode,label in [('dry','Original phrase'),('loop','Short repeat'),('echo','Brief echo'),('both','Repeat + echo')]:
        row=next(r for r in report['results']if r['engine']=='chromium' and r['mode']==mode)
        source=ROOT/'renders/dj-vocal-effects-20261025'/row['file'];assert hashlib.sha256(source.read_bytes()).hexdigest()==row['sha256']
        target=review/(mode+'.mp3');listening_copy(source,target)
        cards.append(f'<article><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="{mode}.mp3"></audio></article>')
        rows.append(dict(mode=mode,source_sha256=row['sha256'],sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Vocal moments</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1000px;margin:40px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:20px}article{padding:20px;border-radius:16px;background:#213039}h2{font-size:22px}audio{width:100%}</style><h1>Short vocal moments</h1><p>The same existing Jamloom house phrase in four treatments. The phrase starts at 4 seconds. These demonstrate the actual deck effects; they are not new tracks or a preview of a newly generated voice. Echo affects the deck mix.</p><main>'''+''.join(cards)+'''</main><p>Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    (review/'index.html').write_text(page)
    (evidence/'vocal-listening.json').write_text(json.dumps(dict(status='PASS technical',tracks=rows,human_listening='NOT RUN'),indent=2)+'\n')
    print('http://localhost:8766/vocal-effects/review/')

if __name__=='__main__':main()
