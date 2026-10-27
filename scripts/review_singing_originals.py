"""Local song/karaoke audition from original, receipt-bound Music DNA renders."""
import html
import json
from pathlib import Path
import subprocess
import tempfile
import numpy as np
import soundfile as sf
from singing_response import load_plan, digest

ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'docs/evidence/singing-originals-20261027'
SOURCE=ROOT/'renders/singing-originals-20261027'
REVIEW=ROOT/'renders/club-studies-20261024/singing-originals/review'


def karaoke_mix(original, vocals):
    if original.ndim!=2 or original.shape[1]!=2 or original.shape!=vocals.shape:
        raise ValueError('Aligned stereo source and vocal stem required')
    if not np.isfinite(original).all() or not np.isfinite(vocals).all():
        raise ValueError('Nonfinite audio')
    backing=original-vocals
    peak=max(float(np.max(np.abs(original))),float(np.max(np.abs(backing))))
    if not .001<peak<4: raise ValueError('Invalid source or residual level')
    gain=min(1,.84/peak)
    return original*gain,backing*gain,gain


def prepare():
    plan_path=EVIDENCE/'plan.json';plan=load_plan(plan_path)
    if REVIEW.exists(): raise FileExistsError('Preserve the previous review')
    # Validate both completed originals before doing any further processing.
    for case in plan['cases']:
        folder=SOURCE/case['id'];receipt=json.loads((folder/'complete.json').read_text())
        assert receipt['case']==case and receipt['plan_sha256']==digest(plan_path)
        assert receipt['device']=='mps' and receipt['audio_sha256']==digest(folder/'singer.wav')
        assert receipt['source_conditioning'] is None and receipt['vocal_reference'] is None
    REVIEW.mkdir(parents=True)
    cards=[];rows=[]
    for case in plan['cases']:
        folder=SOURCE/case['id'];source=folder/'singer.wav';stems=folder/'stems'
        if not stems.exists():
            subprocess.run([str(ROOT/'.venv-singer/bin/python'),str(ROOT/'scripts/separate_singer.py'),
                            '--input',str(source),'--output',str(stems)],check=True,timeout=300)
        separation=json.loads((stems/'complete.json').read_text())
        assert separation['source_sha256']==digest(source)
        assert separation['stems']['vocals']==digest(stems/'vocals.npy')
        original,rate=sf.read(source,dtype='float32',always_2d=True)
        assert rate==48000 and original.shape==(case['duration']*rate,2)
        full,backing,gain=karaoke_mix(original,np.load(stems/'vocals.npy',allow_pickle=False))
        media=[];audio_checks=[]
        for name,pcm in [('song',full),('karaoke',backing)]:
            destination=REVIEW/(case['id']+'-'+name+'.mp3')
            with tempfile.TemporaryDirectory(prefix='jamloom-song-preview-') as temporary:
                wav=Path(temporary)/'audio.wav';sf.write(wav,pcm,rate,subtype='PCM_16')
                subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(wav),'-c:a','libmp3lame','-b:a','192k',str(destination)],check=True,timeout=60)
                decoded=Path(temporary)/'decoded.wav'
                subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(destination),str(decoded)],check=True,timeout=60)
                audio,decoded_rate=sf.read(decoded,dtype='float32',always_2d=True)
                assert audio.shape==original.shape and decoded_rate==rate and np.isfinite(audio).all()
                assert .001<float(np.max(np.abs(audio)))<1
            label='Hear the song' if name=='song' else 'Sing with the backing'
            media.append(f'<label>{label}<audio controls preload="metadata" aria-label="{html.escape(case["title"]+" · "+label)}" src="{destination.name}"></audio></label>')
            audio_checks.append(dict(kind=name,sha256=digest(destination),frames=len(audio),peak=float(np.max(np.abs(audio)))))
        lyrics='\n'.join(case['lyrics'].splitlines())
        cards.append(f'<article><p class="style">{html.escape(case["genre"].replace("-"," ").title())} · 2 minutes</p><h2>{html.escape(case["title"])}</h2>'+''.join(media)+f'<details><summary>Original lyrics</summary><p class="note">Written lyrics; sung-word fidelity and timing still need review.</p><pre>{html.escape(lyrics)}</pre></details></article>')
        rows.append(dict(id=case['id'],source_sha256=digest(source),vocal_sha256=digest(stems/'vocals.npy'),
                         separator_sha256=separation['model_sha256'],shared_gain=gain,outputs=audio_checks))
    (REVIEW/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Original songs · Jamloom</title><style>body{font:18px/1.5 system-ui;background:#101723;color:#f6f2ea;max-width:1000px;margin:40px auto;padding:0 22px}h1{font-size:clamp(32px,6vw,52px);line-height:1.1}h2{margin-top:0}.style{color:#b7e6c7}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:22px}article{background:#202b39;border:1px solid #405363;border-radius:22px;padding:24px;min-width:0}label{display:block;margin:22px 0}audio{display:block;width:100%;margin-top:8px}summary{cursor:pointer;padding:12px 0}pre{white-space:pre-wrap;font:inherit}.note{font-size:15px;color:#becbd5}:focus-visible{outline:3px solid #b7e6c7;outline-offset:4px}</style><header><p class="style">JAMLOOM · ORIGINAL SONG PREVIEW</p><h1>Hear it. Then make it yours.</h1><p>Two original songs with full production and a singer. Try the matching backing to sing them yourself.</p></header><main>'''+''.join(cards)+'''</main><footer><p class="note">Generated locally on this Mac. These are original songs, not covers of the references. The karaoke backing is separated from the same performance and may retain some voice or affect instruments. This is a listening preview, not a scored lesson. Nothing plays automatically; no microphone is opened.</p></footer><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio').forEach(a=>a.pause())});window.addEventListener('pagehide',()=>document.querySelectorAll('audio').forEach(a=>a.pause()));</script></html>''')
    report=dict(status='PASS technical preview only',paid_compute=False,lyrics_alignment='NOT RUN',
                quality='NOT RUN: original song and karaoke need listening',clips=rows,
                separator_scope='Existing local research checkpoint; no new production clearance claimed')
    (EVIDENCE/'review.json').write_text(json.dumps(report,indent=2)+'\n')
    print('http://localhost:8766/singing-originals/review/')


if __name__=='__main__':prepare()
