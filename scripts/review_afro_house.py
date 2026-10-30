#!/usr/bin/env python3
"""Prepare hash-checked local listening copies and blank owner review notes."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import tempfile

from q0_audit import loudness, level_match
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]


def checked(root, name, digest):
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError('Audio path must be a file inside its source directory')
    with path.open('rb') as source:
        actual = hashlib.file_digest(source, 'sha256').hexdigest()
    if actual != digest:
        raise ValueError('Audio source hash mismatch: ' + name)
    return path


def prepare(source, output, evidence):
    report_path = source / 'report.json'
    report = json.loads(report_path.read_text())
    complete = [r for r in report['tracks'] if r.get('mix') and r.get('receipt')]
    if not complete:
        raise ValueError('No completed mixes are available to review')
    if output.exists() or evidence.exists():
        raise ValueError('Preserving existing listening copies and evidence')
    rows = []
    baseline = report['previous_jamloom_baseline']
    rows.append(dict(id='previous-house', label='Previous Jamloom house · 1 minute',
        path=checked(ROOT, baseline['path'], baseline['sha256']), sha256=baseline['sha256'], stems=[], changes=[]))
    for track in complete:
        receipt = track['receipt']
        rows.append(dict(id=track['id'], label=track['id'].replace('-', ' ').capitalize() + ' · 5 minutes',
            path=checked(source, track['mix'], receipt['mix_sha256']),
            sha256=receipt['mix_sha256'], stems=track.get('stems', []),
            changes=receipt.get('musical', {}).get('section_change_candidates', [])))
        for stem in track.get('stems', []):
            checked(source, stem['file'], stem['sha256'])
    levels = [loudness(row['path']) for row in rows]
    target = min(-18, *(float(v['input_i']) - max(0, float(v['input_tp']) + 2.5) for v in levels))
    output.mkdir(parents=True)
    cards, copies = [], []
    for row, level in zip(rows, levels):
        name = f'clip-{len(copies)}.mp3'
        with tempfile.TemporaryDirectory(prefix='jamloom-afro-review-') as temp:
            matched = Path(temp) / 'matched.wav'
            gain, measured = level_match(row['path'], matched, target, level)
            if abs(float(measured['input_i']) - target) > .2 or float(measured['input_tp']) > -1.9:
                raise ValueError('Listening level check failed')
            listening_copy(matched, output / name)
        copy = dict(id=row['id'], file=name, source_sha256=row['sha256'],
            sha256=hashlib.sha256((output / name).read_bytes()).hexdigest(),
            gain_db=gain, level=measured, section_change_candidates=row['changes'], stems=[])
        stem_players = []
        for n, stem in enumerate(row['stems']):
            filename = f'stem-{len(copies)}-{n}.mp3'
            listening_copy(source / stem['file'], output / filename)
            copy['stems'].append(dict(name=stem['name'], file=filename,
                source_sha256=stem['sha256'], sha256=hashlib.sha256((output / filename).read_bytes()).hexdigest()))
            stem_players.append(f'<p>{html.escape(stem["name"])}</p><audio aria-label="{html.escape(stem["name"], quote=True)} stem" controls preload="none" src="{filename}"></audio>')
        copies.append(copy)
        stems = '<details><summary>Listen to individual stems</summary><p>Stems retain their original relative levels.</p>' + ''.join(stem_players) + '</details>' if stem_players else ''
        markers = []
        for change in row['changes']:
            seconds = float(change['seconds'])
            if not 0 <= seconds <= 300:
                raise ValueError('Invalid phrase-change timestamp')
            markers.append(f'<button type="button" data-seek="{seconds}">{int(seconds)//60}:{int(seconds)%60:02d}</button>')
        timeline = '<p>Measured phrase-change candidates: ' + ' '.join(markers) + '. Use these to seek, then describe the sections you actually hear in your notes.</p>' if markers else ''
        cards.append(f'<article><h2>{html.escape(row["label"])}</h2><audio aria-label="{html.escape(row["label"], quote=True)}" controls preload="metadata" src="{name}"></audio>{timeline}{stems}<label>Listening notes<textarea data-clip="{len(copies)-1}" placeholder="Groove, kick/bass, hook, section changes, clarity, dance appeal. Add timestamps and accept / revise / reject."></textarea></label></article>')
    metadata = dict(listener_id='owner', report_sha256=hashlib.sha256(report_path.read_bytes()).hexdigest(),
        source_status=report['status'], target_lufs=target, tracks=copies)
    encoded = json.dumps(metadata).replace('<', '\\u003c')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamloom · Your Afro House review</title><style>body{font:17px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:900px;margin:32px auto;padding:0 18px}article{padding:20px;margin:20px 0;border-radius:14px;background:#213039}audio,textarea{width:100%;box-sizing:border-box}textarea{min-height:120px;font:inherit;margin-top:8px}label{display:block;margin-top:16px}button,input{font:inherit;padding:10px}h2{font-size:22px}a{color:#9ee5dc}</style>
<h1>Your Organic Afro House review</h1><p>Listen to each full mix. Compare its opening minute with the previous house track, then judge the complete progression. Mixes have matched loudness. Only your listening judgments are required.</p>
<p>These are labeled comparisons. Available completed mixes are shown even if the technical run stopped before completing every stem.</p>
<p><a href="review-guide.txt">Full review questions and section timeline guide</a></p>
<label>Headphones / speakers and listening location<input id="context" style="width:100%;box-sizing:border-box"></label>
''' + ''.join(cards) + '''<button id="download">Download my review notes</button><p id="message">Notes stay on this page until you download them. Download before closing or reloading.</p>
<script>const metadata=''' + encoded + ''';
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);
document.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>{b.closest('article').querySelector('audio').currentTime=Number(b.dataset.seek)});
document.querySelector('#download').onclick=()=>{const notes=[...document.querySelectorAll('textarea')].map(t=>({id:metadata.tracks[Number(t.dataset.clip)].id,notes:t.value.trim()}));if(!notes.some(n=>n.notes)){document.querySelector('#message').textContent='Add your listening notes first.';return}const data={...metadata,recorded_at:new Date().toISOString(),playback_context:document.querySelector('#context').value,judgments:notes};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='jamloom-owner-afro-house-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#message').textContent='Review notes downloaded. Share the file to record your judgments.'};</script></html>'''
    (output / 'index.html').write_text(page)
    (output / 'review-guide.txt').write_text((ROOT / 'docs/evidence/afro-house-qualification-20261028/listening-review-template.md').read_text())
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(dict(status='PASS technical', human_listening='NOT RUN', **metadata), indent=2) + '\n')
    print(json.dumps(dict(review=str(output), mixes=len(copies), stems=sum(len(c['stems']) for c in copies), human_listening='NOT RUN')))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--evidence', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source.resolve(), args.output.resolve(), args.evidence.resolve())
