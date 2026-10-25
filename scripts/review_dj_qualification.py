#!/usr/bin/env python3
"""Verify the three qualification outputs and prepare quieter local listening copies."""
import hashlib
import json
from pathlib import Path
from inspect_wav import inspect
from q0_audit import loudness, level_match

ROOT=Path(__file__).resolve().parents[1]
FOLDER=ROOT/'renders/club-studies-20261024/dj-qualification'
EVIDENCE=ROOT/'docs/evidence/ai-dj-customer-flow-20261024/gpu-retry'


def main():
    report=json.loads((FOLDER/'report.json').read_text())
    assert report['status']=='PASS technical' and len(report['tracks'])==3
    review=FOLDER/'review';review.mkdir(exist_ok=True)
    levels={}
    for i,row in enumerate(report['tracks'],1):
        assert row['file']==f'track-{i}.wav'
        source=FOLDER/row['file']
        assert hashlib.sha256(source.read_bytes()).hexdigest()==row['sha256']
        measured=inspect(source)
        assert measured['duration_seconds']==60 and measured['full_scale_samples']==0
        levels[row['file']]=loudness(source)
    target=min(-24.58,min(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels.values()))
    measurements=[];cards=[]
    for i,row in enumerate(report['tracks'],1):
        destination=review/f'listen-{i:02}.wav'
        assert not destination.exists(),'Preserve earlier listening evidence'
        gain,matched=level_match(FOLDER/row['file'],destination,target,levels[row['file']])
        assert float(matched['input_tp'])<=-1.8 and abs(float(matched['input_i'])-target)<=.2
        measurements.append(dict(file=row['file'],sha256=row['sha256'],original=levels[row['file']],gain_db=gain,review=matched,listening_file=destination.name,listening_sha256=hashlib.sha256(destination.read_bytes()).hexdigest()))
        cards.append(f'<article><h2>Clip {i}</h2><audio controls preload="none" aria-label="Clip {i}" src="{destination.name}"></audio><a download href="../{row["file"]}">Download original</a></article>')
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · House qualification</title>
<style>body{font:18px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:0 20px;background:#111b20;color:#e9f0eb}h1{line-height:1.15}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:20px}article,section{padding:22px;background:#213039;border:1px solid #41545b;border-radius:12px;margin-bottom:20px}audio{width:100%}a{color:#98e8b4}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Three new house tracks.</h1><p>Fresh 60-second drafts from the rolling-house brief you preferred. Listen for groove, sound quality and whether the energy changes feel useful.</p><section><h2>The automatic mix</h2><p>All three tracks, mixed by the current Autopilot baseline. No manual deck actions. This is a playback qualification, not a claim of professional DJ quality.</p><audio controls preload="none" aria-label="Automatic mix" src="mixed.webm"></audio><a download href="mixed.webm">Download the mixed set</a></section><p>Individual clips are level-matched for comparison. Original downloads retain their generated level.</p><main>'''+''.join(cards)+'''</main><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    (review/'index.html').write_text(page)
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    (EVIDENCE/'measurements.json').write_text(json.dumps(dict(status='PASS technical',target_lufs=target,files=measurements,human_listening='NOT RUN'),indent=2)+'\n')
    print('PASS: three verified level-matched listening copies; mixed audio is provided by the playback check')


if __name__=='__main__':main()
