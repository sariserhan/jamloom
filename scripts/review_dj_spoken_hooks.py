#!/usr/bin/env python3
"""Publish the retained spoken-hook audition locally, preserving source hashes."""
import hashlib
import html
import json
from pathlib import Path
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]


def main():
    evidence = ROOT/'docs/evidence/dj-spoken-hooks-20261026'
    source = ROOT/'renders/dj-spoken-hooks-20261026'
    hooks = json.loads((evidence/'hooks.json').read_text())
    assert hooks['status'] == 'PASS technical' and len(hooks['tracks']) == 4
    target = ROOT/'renders/club-studies-20261024/spoken-hooks/review'
    target.mkdir(parents=True, exist_ok=False)
    cards, rows = [], []
    for hook in hooks['tracks']:
        number = hook['number']
        effects = json.loads((evidence/f'effects-{number}.json').read_text())
        assert effects['status'] == 'PASS technical' and effects['source_sha256'] == hook['sha256']
        files = [('Voice alone', source/hook['voice_file'], hook['voice_sha256'])]
        for mode, label in [('dry', 'In the music'), ('loop', 'Repeat'), ('echo', 'Echo'), ('both', 'Repeat + echo')]:
            row = next(r for r in effects['results'] if r['engine'] == 'chromium' and r['mode'] == mode)
            files.append((label, source/f'effects-{number}'/row['file'], row['sha256']))
        players = []
        for index, (label, path, expected) in enumerate(files):
            assert hashlib.sha256(path.read_bytes()).hexdigest() == expected
            name = f'{number}-{index}.mp3'
            listening_copy(path, target/name)
            players.append(f'<label>{label}<audio controls preload="metadata" aria-label="Hook {number}: {label}" src="{name}"></audio></label>')
            rows.append(dict(file=name, source_sha256=expected, sha256=hashlib.sha256((target/name).read_bytes()).hexdigest()))
        cards.append(f'<article><h2>{number} · {html.escape(hook["phrase"])}</h2><p>{hook["seconds"]:.2f} seconds · {"House" if hook["source_file"].startswith("house") else "Bass"}</p>'+''.join(players)+'</article>')
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · New short voices</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1050px;margin:40px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:20px}article{min-width:0;padding:20px;border-radius:16px;background:#213039}h2{font-size:24px}label{display:block;margin:18px 0}audio{display:block;width:100%;margin-top:6px}p{color:#cbd8d3}</style><h1>New short voices</h1><p>Four original phrases spoken by stock synthetic voices. Listen alone, then with the music. These are spoken hooks, not sung performances. In each music clip the phrase starts at 4 seconds; repeat and echo use the real DJ deck. Echo affects the whole deck mix.</p><main>'''+''.join(cards)+'''</main><p>Nothing plays automatically. These are local auditions; public generation is unchanged.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    (target/'index.html').write_text(page)
    (evidence/'listening.json').write_text(json.dumps(dict(status='PASS technical',tracks=rows,human_listening='NOT RUN'),indent=2)+'\n')
    print('http://localhost:8766/spoken-hooks/review/')


if __name__ == '__main__':
    main()
