"""Matched-loudness comparison of rejected originals and newly authored local drafts."""
import hashlib
import json
from pathlib import Path
import tempfile
from q0_audit import loudness, level_match
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]
before = ROOT/'renders/singing-free-catalogue'
after = ROOT/'renders/singing-arrangement-study-20261027'
output = ROOT/'renders/club-studies-20261024/singing-arrangements/review'
files = [folder/(name+'.mp3') for name in ('paper-kites','neon-tide') for folder in (before,after)]
for folder in (before,after):
    receipt=json.loads((folder/'renders.json').read_text())
    for row in receipt['results']:
        assert hashlib.sha256((folder/(row['id']+'.mp3')).read_bytes()).hexdigest()==row['sha256']
levels=[loudness(path) for path in files]
target=min(-24.58,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels))
output.mkdir(parents=True,exist_ok=False);rows=[];cards=[]
for i,(path,level) in enumerate(zip(files,levels)):
    with tempfile.TemporaryDirectory(prefix='jamloom-singing-review-') as folder:
        wav=Path(folder)/'matched.wav';gain,matched=level_match(path,wav,target,level)
        assert abs(float(matched['input_i'])-target)<=.2 and float(matched['input_tp'])<=-1.8
        result=output/f'clip-{i+1}.mp3';listening_copy(wav,result)
    label=('Paper Kites' if i<2 else 'Neon Tide')+(' · Before' if i%2==0 else ' · Revised')
    cards.append(f'<article><h2>{label}</h2><audio controls preload="metadata" aria-label="{label}" src="clip-{i+1}.mp3"></audio></article>')
    rows.append(dict(label=label,source_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),listening_sha256=hashlib.sha256(result.read_bytes()).hexdigest(),gain_db=gain,matched=matched))
(output/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revised practice songs · Jamloom</title><style>body{font:18px/1.5 system-ui;background:#11121c;color:#f5f1ff;max-width:850px;margin:32px auto;padding:0 20px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}article{padding:20px;background:#252232;border-radius:20px;min-width:0}audio{width:100%}h2{font-size:22px}:focus-visible{outline:3px solid #cba4ff;outline-offset:4px}</style><h1>Revised practice songs</h1><p>Compare each original with its revised melody, rhythm and backing at matched loudness. Piano marks the melody you would sing; these still have no recorded singer.</p><section>'''+''.join(cards)+'''</section><p>Original local drafts for review. The course has not been replaced or published. Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>''')
(after/'listening.json').write_text(json.dumps(dict(target_lufs=target,clips=rows,human_listening='NOT RUN'),indent=2)+'\n')
print('http://localhost:8766/singing-arrangements/review/')
