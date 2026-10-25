#!/usr/bin/env python3
"""Reproduce an owner-directed opening comparison without changing the source."""
import hashlib
import json
from pathlib import Path
import subprocess
from inspect_wav import inspect
from q0_audit import loudness, level_match

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'renders/ai-dj-warm-20261024/08c8bcc4808d40e8b1ab91cb1b929fc5-1.wav'
SHA = '0bbdd494c2743c625a6a206fa4ed5800c1f6065bc223ffd4d11005d7300cf404'


def main():
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
    folder = ROOT / 'renders/club-studies-20261024/opening-comparison'
    folder.mkdir(exist_ok=False)
    clips, levels = [], []
    for start in (0, 15, 35):
        file = folder / f'source-{start}.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(SOURCE),
                        '-t', '25', '-af', 'afade=t=in:d=0.02,afade=t=out:st=24.98:d=0.02',
                        '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact',
                        '-flags:a', '+bitexact', str(file)], check=True)
        assert inspect(file)['duration_seconds'] == 25
        clips.append(file)
        levels.append(loudness(file))
    target = min(-24.58, *(float(v['input_i']) - max(0, float(v['input_tp']) + 2.5) for v in levels))
    rows, cards = [], []
    for start, file, level in zip((0, 15, 35), clips, levels):
        output = folder / f'opening-{start}.wav'
        gain, measured = level_match(file, output, target, level)
        assert abs(float(measured['input_i']) - target) <= .2 and float(measured['input_tp']) <= -1.8
        rows.append(dict(source_start=start, seconds=25, sha256=hashlib.sha256(output.read_bytes()).hexdigest(), gain_db=gain, loudness=measured))
        cards.append(f'<article><h2>Starting at {start} seconds</h2><audio controls preload="none" aria-label="Starting at {start} seconds" src="{output.name}"></audio></article>')
        file.unlink()  # Own intermediate crop; source and listening evidence remain.
    (folder / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Opening energy</title><style>body{font:18px/1.6 system-ui;max-width:900px;margin:40px auto;padding:20px;background:#111b20;color:#e9f0eb}article{padding:20px;background:#213039;margin:20px 0;border-radius:12px}audio{width:100%}</style><h1>A stronger start</h1><p>Three 25-second sections of clip 2 at matched loudness. These are listening edits, not newly generated music. Your original recording is unchanged.</p>' + ''.join(cards) + '<script>document.addEventListener("play",e=>{if(e.target.tagName==="AUDIO")document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
    evidence = dict(source_sha256=SHA, owner_statement='weak energy, it gets good after 15 second and after 35 it is much better', interval_precision='Approximate owner observations; not beat or phrase annotations', target_lufs=target, clips=rows, acceptance='NOT RUN: editorial comparison', new_generation=False)
    (ROOT / 'docs/evidence/ai-dj-finish-20261024/opening-comparison.json').write_text(json.dumps(evidence, indent=2) + '\n')
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
    print('PASS: three level-matched opening excerpts; original preserved')


if __name__ == '__main__':
    main()
