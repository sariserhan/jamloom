#!/usr/bin/env python3
"""Level-matched original tracks and real mixer captures; no source recordings."""
import hashlib
import html
import json
from pathlib import Path
import tempfile
from q0_audit import loudness, level_match
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT/'docs/evidence/dj-quality-20261025'


def main():
    mixes = ROOT/'renders/dj-quality-mix-20261025'
    mixed = json.loads((mixes/'report.json').read_text())
    assert mixed['status'] == 'PASS technical'
    rows = [(mixes/(row['name']+'.webm'), row['sha256'], row['name'],
             'Previous handoffs' if row['name']=='before' else 'Revised handoffs') for row in mixed['results']]
    generated = ROOT/'renders/dj-quality-20261025'
    fresh = (generated/'report.json').exists()
    if fresh:
        result = json.loads((generated/'report.json').read_text())
        assert result['status']=='PASS technical' and result['cleanup_confirmed'] and len(result['tracks'])==4
        baseline = ROOT/'renders/dj-style-samples-20261025-replacement'
        previous = json.loads((baseline/'report.json').read_text())
        for row in previous['tracks']:
            name=Path(row['file']).stem
            rows.append((baseline/row['file'],row['receipt']['sha256'],'baseline-'+name,name.title()+' · previous direction'))
        for row in result['tracks']:
            request=row['receipt']['request'];name=Path(row['file']).stem
            label=request['style'].title()+' · '+('matched-seed candidate' if request['seed']==251025 else 'second-seed candidate')
            if row['receipt']['vocal']: label+=' · brief vocal'
            rows.append((generated/row['file'],row['receipt']['sha256'],name,label))
    review = ROOT/'renders/club-studies-20261024'/('quality-originals' if fresh else 'quality-comparison')/'review'
    assert len(rows)==(8 if fresh else 2)
    for file,digest,_,_ in rows: assert hashlib.sha256(file.read_bytes()).hexdigest()==digest
    levels=[loudness(row[0]) for row in rows]
    target=min(-18,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels))
    # Never replace earlier listening copies: each run is a complete evidence snapshot.
    review.mkdir(parents=True,exist_ok=False)
    cards=[];measured=[]
    for (source,digest,name,label),level in zip(rows,levels):
        with tempfile.TemporaryDirectory(prefix='jamloom-quality-') as temp:
            matched=Path(temp)/'matched.wav'
            gain,after=level_match(source,matched,target,level)
            assert abs(float(after['input_i'])-target)<.2 and float(after['input_tp'])<=-1.9
            listening_copy(matched,review/(name+'.mp3'))
        measured.append(dict(file=name+'.mp3',source_sha256=digest,source_level=level,gain_db=gain,matched_level=after,sha256=hashlib.sha256((review/(name+'.mp3')).read_bytes()).hexdigest()))
        cards.append(f'<article><h2>{html.escape(label)}</h2><audio controls preload="metadata" aria-label="{html.escape(label)}" src="{name}.mp3"></audio><a href="{name}.mp3" download>Download</a></article>')
    note=('The first pair compares the same retained originals through two mixers. The other clips compare the previous and candidate generation directions; the matched-seed pairs use the same model and seed. Vocal candidates appear only when timing and duration checks pass.' if fresh else 'These are new captures of the same retained Jamloom originals. This set uses the same handoff timings in both engines: it is a regression check, not evidence of an audible improvement. Fresh generation is awaiting a separately approved GPU trial; these mixes do not demonstrate new compositions.')
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Quality comparison</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1000px;margin:40px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}article{padding:20px;border-radius:16px;background:#213039}h2{font-size:22px}audio{width:100%}a{color:#d7ff80}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}@media(max-width:650px){main{grid-template-columns:1fr}}</style><h1>Listen to the next step.</h1><p>'''+note+'''</p><p>Listen for a steady groove, a clear bass return, and continuity at track changes. All copies use matched loudness. Nothing plays automatically.</p><main>'''+''.join(cards)+'''</main><p>This is a listening test, not public activation or music-model fine-tuning.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    (review/'index.html').write_text(page)
    (EVIDENCE/('listening-originals.json' if fresh else 'listening.json')).write_text(json.dumps(dict(status='PASS technical',fresh_generation=fresh,target_lufs=target,tracks=measured,human_listening='NOT RUN'),indent=2)+'\n')
    print('http://localhost:8766/'+('quality-originals' if fresh else 'quality-comparison')+'/review/')


if __name__=='__main__':main()
