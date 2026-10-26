#!/usr/bin/env python3
"""Prepare local guide/stem audition, or blinded fresh comparison after an approved run."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from q0_audit import loudness,level_match
from review_dj_warm import listening_copy
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'docs/evidence/dj-composition-20261025'


def main(generated=False,guided=False):
    global EVIDENCE
    if guided:EVIDENCE=ROOT/'docs/evidence/dj-guided-set-20261025';generated=True
    plan=json.loads((EVIDENCE/'gpu-plan.json').read_text());rows=[]
    if generated:
        source=ROOT/('renders/dj-guided-set-20261025' if guided else 'renders/dj-composition-20261025');report=json.loads((source/'report.json').read_text());key=json.loads((EVIDENCE/'blind-key.json').read_text())['clips']
        assert plan['status']=='AUTHORIZED' and report['status']=='PASS technical' and report['cleanup_confirmed'] and len(report['tracks'])==(6 if guided else 4)
        assert sorted(k['clip']for k in key)==list(range(1,(7 if guided else 5))) and sorted(k['sequence']for k in key)==sorted(r['request']['sequence']for r in plan['tracks'])
        for k in key:
            row=next(r for r in report['tracks']if r['receipt']['request']['sequence']==k['sequence']);prepared=next(r for r in plan['tracks']if r['request']['sequence']==k['sequence']);assert row['receipt']['request']==prepared['request'] and (prepared['vocals'] or row['receipt']['vocal'] is None)
            rows.append((source/row['file'],row['receipt']['sha256'],f"clip-{k['clip']}",f"Clip {k['clip']}",None))
        title='Six fresh guided originals' if guided else 'Four fresh originals';intro='Fresh bass originals with composition guides, including groove, mood and energy changes. Listen for sound, hook, groove and development.' if guided else 'Same model and paired seeds. Conditions are hidden and loudness is matched. Compare the whole musical result: hook, sound, groove and development.'
        if guided and all(t['receipt']['vocal'] is None for t in report['tracks']):intro+=' This batch stayed instrumental because the timing checks skipped the vocal candidates.'
    else:
        for style,label in [('house','House sketch'),('bass','Bass sketch')]:
            folder=ROOT/'renders/dj-composition-guides-20261025'/style;r=json.loads((folder/'receipt.json').read_text());score=json.loads((folder/'score.json').read_text())
            assert hashlib.sha256((folder/'score.json').read_bytes()).hexdigest()==r['score_sha256']
            rows.append((folder/'guide.wav',r['guide_sha256'],style,label,score))
        title='Original composition sketches';intro='Synthetic guides for the next generation experiment. Hear the musical layers and section changes. These are not finished AI tracks or a claim of professional sound quality.'
    slug='guided-originals' if guided else 'composition-originals' if generated else 'composition-guides';review=ROOT/'renders/club-studies-20261024'/slug/'review'
    for source,digest,*_ in rows:assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
    levels=[loudness(r[0])for r in rows];target=min(-18,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5)for v in levels))
    review.mkdir(parents=True,exist_ok=False);cards=[];receipts=[]
    for (source,digest,name,label,score),level in zip(rows,levels):
        with tempfile.TemporaryDirectory()as temp:
            matched=Path(temp)/'matched.wav';gain,measured=level_match(source,matched,target,level);assert abs(float(measured['input_i'])-target)<.2 and float(measured['input_tp'])<=-1.9
            listening_copy(matched,review/(name+'.mp3'))
        controls=''
        if score:
            options='<option value="'+name+'.mp3">Full mix</option>'
            for bus in ('kick','drums','bass','chords','hook'):
                dest=review/(name+'-'+bus+'.mp3');subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(source.parent/(bus+'.wav')),'-af',f'volume={gain}dB','-c:a','libmp3lame','-b:a','192k',str(dest)],check=True)
                options+=f'<option value="{dest.name}">{bus.title()}</option>'
            controls=f'<label>Hear a layer <select aria-label="{label} layer">{options}</select></label><nav aria-label="{label} sections">'+''.join(f'<button type="button" data-at="{s["start_bar"]*240/score["bpm"]}">{s["name"].title()}</button>'for s in score['sections'])+'</nav>'
        cards.append(f'<article><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="{name}.mp3"></audio>{controls}</article>')
        receipts.append(dict(file=name+'.mp3',source_sha256=digest,sha256=hashlib.sha256((review/(name+'.mp3')).read_bytes()).hexdigest(),gain_db=gain,level=measured))
    html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Composition study</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1000px;margin:40px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:20px}article{padding:20px;border-radius:16px;background:#213039}h2{font-size:22px}audio,select{width:100%}label{display:block;margin-top:20px}button,select{font:inherit;color:inherit;background:#344c56;border:1px solid #67838f;border-radius:8px;padding:9px}nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}button{cursor:pointer}button:focus-visible,select:focus-visible{outline:3px solid #b6ebac}</style>'''+f'<h1>{title}</h1><p>{intro}</p><main>'+''.join(cards)+'''</main><p>Playback starts only when you press Play. No public generation is enabled.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);document.querySelectorAll('select').forEach(s=>s.onchange=()=>{const a=s.closest('article').querySelector('audio'),t=a.currentTime;a.pause();a.src=s.value;a.addEventListener('loadedmetadata',()=>{a.currentTime=Math.min(t,a.duration)}, {once:true});a.load()});document.querySelectorAll('[data-at]').forEach(b=>b.onclick=()=>{const a=b.closest('article').querySelector('audio');if(Number.isFinite(a.duration))a.currentTime=Math.min(Number(b.dataset.at),a.duration)});</script></html>'''
    (review/'index.html').write_text(html);assert not list(review.glob('*.json'))
    (EVIDENCE/('generated-listening.json' if generated else 'guide-listening.json')).write_text(json.dumps(dict(status='PASS technical',target_lufs=target,tracks=receipts,human_listening='NOT RUN'),indent=2)+'\n');print('http://localhost:8766/'+slug+'/review/')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--generated',action='store_true');p.add_argument('--guided-set',action='store_true');a=p.parse_args();main(a.generated,a.guided_set)
