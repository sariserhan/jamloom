"""Audition the four retained lesson arrangements without generating or changing music."""
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'renders/singing-free-catalogue'
output = ROOT / 'renders/club-studies-20261024/singing-catalogue/review'
titles = {'paper-kites': 'Paper Kites', 'neon-tide': 'Neon Tide',
          'frere-jacques': 'Frère Jacques', 'ode-to-joy': 'Ode to Joy'}
receipt = json.loads((source / 'renders.json').read_text())
assert [r['id'] for r in receipt['results']] == list(titles)
for row in receipt['results']:
    assert row['status'] == 'PASS'
    assert hashlib.sha256((source / (row['id'] + '.mp3')).read_bytes()).hexdigest() == row['sha256']
output.mkdir(parents=True, exist_ok=False)
cards = []
for key, title in titles.items():
    shutil.copyfile(source / (key + '.mp3'), output / (key + '.mp3'))
    cards.append(f'<article><h2>{title}</h2><audio controls preload="metadata" aria-label="{title}" src="{key}.mp3"></audio></article>')
(output / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Singing practice arrangements · Jamloom</title><style>body{font:18px/1.5 system-ui;background:#11121c;color:#f5f1ff;max-width:850px;margin:32px auto;padding:0 20px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}article{padding:20px;background:#252232;border-radius:20px;min-width:0}audio{width:100%}h2{font-size:22px}:focus-visible{outline:3px solid #cba4ff;outline-offset:4px}</style><h1>Four songs to practice</h1><p>Listen for a clear melody and a backing you would enjoy singing with. These are the existing lesson arrangements with piano melody guides, not sung recordings. Nothing plays automatically.</p><section>''' + ''.join(cards) + '''</section><p>Local review only. The course remains $39 once; sales and publication are held.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>''')
print('http://localhost:8766/singing-catalogue/review/')
