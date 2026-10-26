#!/usr/bin/env python3
"""Publish audio-only listening copies; keep study condition keys outside the server."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
from q0_audit import loudness, level_match
from review_dj_warm import listening_copy

ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'docs/evidence/dj-house-consistency-20261025'


def main(blind=False,guided=False,timing=False):
    if timing and not guided:raise ValueError('Timing revision requires guided set')
    global EVIDENCE
    if guided:EVIDENCE=ROOT/'docs/evidence/dj-guided-set-20261025'
    if blind:
        source=ROOT/'renders/dj-house-consistency-20261025'
        result=json.loads((source/'report.json').read_text())
        plan=json.loads((EVIDENCE/'gpu-plan.json').read_text())
        key=json.loads((EVIDENCE/'blind-key.json').read_text())['clips']
        assert plan['status']=='AUTHORIZED' and result['status']=='PASS technical' and result['cleanup_confirmed'] and len(result['tracks'])==6
        assert sorted(row['clip'] for row in key)==list(range(1,7)) and sorted(row['sequence'] for row in key)==list(range(6))
        rows=[]
        for item in key:
            row=next(row for row in result['tracks'] if row['receipt']['request']['sequence']==item['sequence'])
            assert row['receipt']['request']==plan['tracks'][item['sequence']]['request'] and row['receipt']['vocal'] is None
            assert row['file']==f"house-{item['sequence']}.wav"
            rows.append((source/row['file'],row['receipt']['sha256'],f"clip-{item['clip']}",f"Clip {item['clip']}"))
        title='Which house tracks belong at a party?'
        intro='Six one-minute clips, with their generation conditions hidden and loudness matched. For each number, tell us: party-ready or boring? What works or fails in the groove, sound and musical development? Judge each clip before comparing favorites.'
    else:
        source=ROOT/('renders/dj-guided-mix-timing-20261025' if timing else 'renders/dj-guided-mix-20261025' if guided else 'renders/dj-house-mix-20261025')
        result=json.loads((source/'report.json').read_text());assert result['status']=='PASS technical' and len(result['results'])==1
        row=result['results'][0];rows=[(source/'after.webm',row['sha256'],'guided-mix' if guided else 'accepted-house-mix','Guided bass set' if guided else 'Accepted house set')]
        title='Hear the fresh guided set.' if guided else 'Hear the accepted tracks as a set.'
        intro='Six fresh guided originals through the real DJ mixer. The final track requests a calmer groove. This batch is instrumental; its vocal candidates were skipped by the generation timing checks. Listen for continuity, musical development and appropriately placed effects.' if guided else 'House clips 1 and 2 from the last review, followed by a previously accepted house track with a brief original vocal. This is a new recording of the real DJ engine playing existing music. Listen for smooth handoffs and the short vocal repeat. It does not test new generation consistency.'
    review=ROOT/'renders/club-studies-20261024'/('guided-performance' if timing else 'guided-mix' if guided else 'house-blind' if blind else 'house-mix')/'review'
    for source,digest,_,_ in rows:assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
    levels=[loudness(row[0]) for row in rows]
    target=min(-18,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels))
    review.mkdir(parents=True,exist_ok=False);cards=[];receipts=[]
    for (source,digest,name,label),level in zip(rows,levels):
        with tempfile.TemporaryDirectory(prefix='jamloom-house-') as temp:
            matched=Path(temp)/'matched.wav';gain,measured=level_match(source,matched,target,level)
            assert abs(float(measured['input_i'])-target)<.2 and float(measured['input_tp'])<=-1.9
            listening_copy(matched,review/(name+'.mp3'))
        receipts.append(dict(file=name+'.mp3',source_sha256=digest,sha256=hashlib.sha256((review/(name+'.mp3')).read_bytes()).hexdigest(),gain_db=gain,level=measured))
        cards.append(f'<article><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="{name}.mp3"></audio></article>')
    page=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · House listening</title><style>body{{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1000px;margin:40px auto;padding:0 20px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:20px}}article{{padding:20px;border-radius:16px;background:#213039}}h2{{font-size:22px}}audio{{width:100%}}</style><h1>{title}</h1><p>{intro}</p><main>{''.join(cards)}</main><p>Nothing plays automatically. This listening test does not enable public generation.</p><script>document.addEventListener('play',e=>{{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{{if(a!==e.target)a.pause()}})}},true)</script></html>'''
    (review/'index.html').write_text(page)
    assert not list(review.glob('*.json'))
    if blind:assert all('house-'+str(i) not in page for i in range(6)) and all(str(seed) not in page for seed in [261025,271025,281025])
    (EVIDENCE/('timing-mix-listening.json' if timing else 'blind-listening.json' if blind else 'mix-listening.json')).write_text(json.dumps(dict(status='PASS technical',target_lufs=target,tracks=receipts,human_listening='NOT RUN'),indent=2)+'\n')
    print('http://localhost:8766/'+('guided-performance' if timing else 'guided-mix' if guided else 'house-blind' if blind else 'house-mix')+'/review/')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--blind',action='store_true');p.add_argument('--guided-set',action='store_true');p.add_argument('--timing-revision',action='store_true');a=p.parse_args();main(a.blind,a.guided_set,a.timing_revision)
