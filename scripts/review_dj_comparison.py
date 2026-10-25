#!/usr/bin/env python3
"""Make a local, hash-verified listening comparison without copying source recordings."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
from q0_audit import loudness, level_match
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT/'docs/evidence/dj-audible-comparison-20261025'
REVIEW = ROOT/'renders/club-studies-20261024/audible-comparison/review'


def main():
    samples = ROOT/'renders/dj-style-samples-20261025'
    replacement = ROOT/'renders/dj-style-samples-20261025-replacement'
    if (replacement/'report.json').exists(): samples = replacement
    generated = json.loads((samples/'report.json').read_text())
    mixes = ROOT/'renders/dj-audible-comparison-20261025'
    mixed = json.loads((mixes/'report.json').read_text())
    assert generated['status'] == mixed['status'] == 'PASS technical'
    assert generated['cleanup_confirmed'] and len(generated['tracks']) == 2 and len(mixed['results']) == 2
    REVIEW.mkdir(parents=True, exist_ok=False)
    levels = {row['file']: loudness(samples/row['file']) for row in generated['tracks']}
    target = min(-18, *(float(v['input_i'])-max(0, float(v['input_tp'])+2.5) for v in levels.values()))
    measurements = []
    for row in generated['tracks']:
        source = samples/row['file']; assert hashlib.sha256(source.read_bytes()).hexdigest() == row['receipt']['sha256']
        with tempfile.TemporaryDirectory(prefix='jamloom-style-listen-') as temp:
            matched = Path(temp)/'matched.wav'
            gain, level = level_match(source, matched, target, levels[row['file']])
            assert abs(float(level['input_i'])-target) < .2 and float(level['input_tp']) <= -1.9
            listening_copy(matched, REVIEW/(source.stem+'.mp3'))
        measurements.append(dict(file=source.name, original=levels[row['file']], gain_db=gain, matched=level))
    for row in mixed['results']:
        source = mixes/(row['name']+'.webm'); assert hashlib.sha256(source.read_bytes()).hexdigest() == row['sha256']
        listening_copy(source, REVIEW/(row['name']+'.mp3'))
    cards = []
    for name, title, description in [
        ('house', '1 · House baseline', 'Fresh track using the previous house direction. 128 BPM requested.'),
        ('bass', '2 · Bass Playground', 'Fresh track using the new bass-focused direction. 140 BPM requested.'),
        ('before', '3 · Previous DJ engine', 'The earlier engine, replaying three existing Jamloom tracks.'),
        ('after', '4 · Current DJ engine', 'The same tracks in the same order, with revised handoffs and automatic performance moves.')]:
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-n', '-i', str(REVIEW/(name+'.mp3')), '-filter_complex', 'showwavespic=s=700x100:colors=0xb9f885', '-frames:v', '1', str(REVIEW/(name+'.png'))], check=True, timeout=30)
        cards.append(f'<article><h3>{title}</h3><p>{description}</p><img src="{name}.png" alt="" width="700" height="100"><audio controls preload="metadata" aria-label="{title}" src="{name}.mp3"></audio><a href="{name}.mp3" download>Download audio</a></article>')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Hear the difference</title>
<style>body{font:18px/1.55 system-ui;max-width:1080px;margin:40px auto;padding:0 20px;background:#111b20;color:#edf3ec}h1{font-size:clamp(32px,5vw,54px);line-height:1.1}h2{margin-top:40px}h3{margin:0;font-size:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}article{padding:24px;background:#213039;border:1px solid #41545b;border-radius:16px}article p{font-size:16px;color:#d1dcd6;min-height:52px}audio,img{width:100%}img{height:auto;margin:10px 0}a{color:#d7ff80;display:inline-block;margin-top:12px}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}.note{color:#c4d1cf;font-size:16px}@media(max-width:650px){main{grid-template-columns:1fr}article p{min-height:0}}</style>
<h1>Hear the difference.</h1><h2>Two freshly generated tracks</h2><p>Same model, seed and energy setting. Different musical direction. Both clips are 60 seconds and matched in loudness.</p><main>'''+''.join(cards[:2])+'''</main><p class="note">These compare generation presets. The experimental model trained on reference measurements is not used here, and the music generator has not been fine-tuned on those recordings. Tempo labels are requests, not verified measurements.</p>
<h2>What changed in the DJ performance?</h2><p>Identical music through the actual previous and current engines. Listen for the handoffs between tracks and the short performance moves. Trimming and overlap make the lengths different; these are new mixes of existing songs.</p><main>'''+''.join(cards[2:])+'''</main><p class="note">Live generation on the setup page remains offline. This listening test does not start a session or use your credits. Nothing plays automatically.</p><a href="http://localhost:3000/ai-dj">Open the local DJ deck →</a>
<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    (REVIEW/'index.html').write_text(page)
    (EVIDENCE/'listening.json').write_text(json.dumps(dict(status='PASS technical',target_lufs=target,tracks=measurements,
        files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in REVIEW.glob('*.mp3')},human_listening='NOT RUN'), indent=2)+'\n')
    print('Four verified listening clips ready at http://localhost:8766/audible-comparison/review/')


if __name__ == '__main__': main()
