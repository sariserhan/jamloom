#!/usr/bin/env python3
"""Verify the two-user qualification and publish only audio to the local review server."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
from inspect_wav import inspect
from q0_audit import loudness, level_match

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--finish',action='store_true');parser.add_argument('--launch-fix',action='store_true');parser.add_argument('--beta',action='store_true');parser.add_argument('--hosted',action='store_true');args=parser.parse_args()
    if args.hosted and not args.beta:parser.error('--hosted requires --beta')
    if args.beta and (args.finish or args.launch_fix):parser.error('--beta is a separate campaign')
    count=20 if args.beta else 6
    if args.launch_fix and not args.finish:parser.error('--launch-fix requires --finish')
    source = ROOT / (('renders/ai-dj-finish-20261024/gpu-launch-fix' if args.launch_fix else 'renders/ai-dj-finish-20261024/gpu') if args.finish else 'renders/ai-dj-warm-20261024')
    if args.beta:source=ROOT/('renders/ai-dj-hosted-20261025' if args.hosted else 'renders/ai-dj-beta-20261025')
    result = json.loads((source / 'result.json').read_text())
    assert result['status'] == 'PASS technical' and len(result['tracks']) == count
    review = ROOT / (('renders/club-studies-20261024/completion-launch-fix/review' if args.launch_fix else 'renders/club-studies-20261024/completion/review') if args.finish else 'renders/club-studies-20261024/warm-sessions/review')
    if args.beta:review=ROOT/('renders/club-studies-20261024/hosted-sessions/review' if args.hosted else 'renders/club-studies-20261024/beta-sessions/review')
    review.mkdir(parents=True, exist_ok=False)
    tracks = sorted(result['tracks'], key=lambda t: (t['session'], t['sequence']))
    levels, files = [], []
    for track in tracks:
        assert re.fullmatch('[a-f0-9]{32}', track['session']) and type(track['sequence']) is int and 0 <= track['sequence'] < count//2
        file = source / f"{track['session']}-{track['sequence']}.wav"
        assert hashlib.sha256(file.read_bytes()).hexdigest() == track['sha256']
        measured = inspect(file)
        assert measured['duration_seconds'] == 60 and measured['full_scale_samples'] == 0
        levels.append(loudness(file))
        files.append(file)
    target = min(-24.58, *(float(v['input_i']) - max(0, float(v['input_tp']) + 2.5) for v in levels))
    measurements, cards = [], []
    for number, (track, file, level) in enumerate(zip(tracks, files, levels), 1):
        destination = review / f'clip-{number}.wav'
        gain, matched = level_match(file, destination, target, level)
        assert float(matched['input_tp']) <= -1.8 and abs(float(matched['input_i']) - target) <= .2
        measurements.append(dict(number=number, track=track, original=level, gain_db=gain, review=matched))
        cards.append(f'<article><h2>Clip {number}</h2><audio controls preload="none" aria-label="Clip {number}" src="{destination.name}"></audio></article>')
    mixes = []
    for visibility in ('public', 'private'):
        candidates = list(source.glob(visibility + '-mixed.*'))
        assert len(candidates) == 1 and candidates[0].suffix in ('.webm', '.m4a')
        file = candidates[0]
        shutil.copyfile(file, review / file.name)
        mixes.append(f'<article><h2>{visibility.title()} session</h2><audio controls preload="none" aria-label="{visibility} session" src="{file.name}"></audio><p>Ends on {"Stop" if visibility == "public" else "exhausted credits"}.</p></article>')
    vocal_note = (f"This batch contains {result['vocals']} brief vocal insertions. Listen for intelligibility and timing." if result['vocals'] else 'This batch has no inserted vocals: candidates must pass both timing and length checks.')
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Two fresh sets</title><style>body{font:18px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 20px;background:#111b20;color:#e9f0eb}h1{line-height:1.15}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:20px}article{padding:22px;background:#213039;border:1px solid #41545b;border-radius:12px;margin-bottom:20px}audio{width:100%}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style><h1>Two users. Two fresh sets.</h1><p>Listen for groove and transitions. ' + vocal_note + ' Individual clips are level-matched; complete sets retain their recorded levels. Nothing plays automatically.</p><h2>Complete experiences</h2><main>' + ''.join(mixes) + '</main>' + f'<h2>{count} new tracks</h2><p>Clips 1–{count//2} belong to one session, {count//2+1}–{count} to the other.</p><main>' + ''.join(cards) + '</main><script>document.addEventListener("play",e=>{if(e.target.tagName==="AUDIO")document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'
    (review / 'index.html').write_text(page)
    (ROOT / (('docs/evidence/ai-dj-hosted-20261025/measurements.json' if args.hosted else 'docs/evidence/ai-dj-beta-20261025/measurements.json') if args.beta else ('docs/evidence/ai-dj-finish-20261024/launch-fix-measurements.json' if args.launch_fix else 'docs/evidence/ai-dj-finish-20261024/measurements.json') if args.finish else 'docs/evidence/ai-dj-warm-20261024/measurements.json')).write_text(json.dumps(dict(target_lufs=target, clips=measurements, human_listening='NOT RUN'), indent=2) + '\n')
    print(f'PASS: {count} hash-verified listening copies and two full mixes; private worker files excluded')


if __name__ == '__main__':
    main()
