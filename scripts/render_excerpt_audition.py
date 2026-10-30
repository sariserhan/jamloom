"""Render a small local excerpt audition, preserving the existing full-input study."""
import argparse
import html
import json
from pathlib import Path
import shutil

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from source_excerpt_response import compose, select_excerpt, TEMPOS
from source_led_response import faded


def render(output, public):
    if output.exists() or public.exists():raise FileExistsError('Preserve existing auditions')
    if shutil.disk_usage(output.parent).free<16*1024**3:raise RuntimeError('Need 1 GiB plus 15 GiB reserve')
    ledger=Path('renders/owner-evaluation-20261030/freeze.json')
    rows=json.loads(ledger.read_text())['dataset']['clips']
    licensed=next(r for r in rows if r['id']=='ls-2277-149896-0026')
    assert licensed['consent']['local_processing'] and licensed['license']['id']=='CC-BY-4.0'
    assert digest(licensed['path'])==licensed['sha256']
    sources=[dict(id='question',title='Your question sample',path='renders/question-bass-response-20261030/source.wav',
                  sha256='4f37e2d3c35266f627589374812742680fe2d4ae8d7a07c8a9effeffab58588a'),
             dict(id=licensed['id'],title='Longer spoken input',path='renders/three-strategy-study-20261030/inputs/'+licensed['id']+'.wav',
                  sha256=next(r['prepared_input_sha256'] for r in json.loads(Path('renders/three-strategy-study-20261030/report.json').read_text())['records'] if r['id']==licensed['id']))]
    for source in sources:assert digest(source['path'])==source['sha256']
    output.mkdir();public.mkdir();(output/'.partial').touch()
    report=dict(technical='RUNNING',listening='NOT RUN',seed=4123,records=[],selection_coverage=[],
                implementation={name:digest(Path(__file__).with_name(name)) for name in
                ('source_excerpt_response.py','source_strategy_response.py','source_bass_response.py','source_phrase_response.py','render_excerpt_audition.py')})
    # Exercise the selector across the existing 23 licensed inputs without rerendering the frozen study.
    for row in rows:
        if row['kind']=='silence':continue
        pcm=read_pcm(Path('renders/three-strategy-study-20261030/inputs')/(row['id']+'.wav'),(.5,5))
        for strategy,bpm in TEMPOS.items():
            selection=select_excerpt(pcm,bpm)
            assert 0<=selection['start_frame']<selection['end_frame']<=len(pcm)
            report['selection_coverage'].append(dict(source=row['id'],strategy=strategy,**selection))
    page=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
          '<title>Jamloom · use the part that fits</title><link rel="stylesheet" href="../owner-review.css">',
          '<style>audio{display:block;width:100%;max-width:36rem;margin:.7rem 0 1.3rem}article{border-top:1px solid #555;margin-top:1.5rem;padding-top:1rem}</style>',
          '<a href="../">Owner workspace</a><h1>Use the part that fits</h1>',
          '<p>Six new sketches built around a short piece of the input. Listen to the selected sound, then how the music answers it. The complete recording is here for comparison.</p>',
          '<p>These are new auditions. Your accepted bass pilot remains unchanged. Tell me which examples feel musical and which cuts feel awkward.</p>']
    for source in sources:
        pcm=read_pcm(source['path'],(.5,5));shutil.copyfile(source['path'],output/(source['id']+'-original.wav'))
        shutil.copyfile(source['path'],public/(source['id']+'-original.wav'))
        page.append(f'<section><h2>{html.escape(source["title"])}</h2><p>Complete input · {len(pcm)/RATE:.2f} seconds</p><audio controls preload="metadata" aria-label="{html.escape(source["title"])} complete input" src="{source["id"]}-original.wav"></audio>')
        for i,strategy in enumerate(TEMPOS):
            if shutil.disk_usage(output).free<15*1024**3:raise RuntimeError('Disk reserve reached')
            mix,stems,plan=compose(pcm,4123,strategy);selection=plan['source_selection'];a,b=selection['start_frame'],selection['end_frame']
            assert np.isfinite(mix).all() and np.max(np.abs(mix))<=.85000001
            assert np.all(mix[-RATE//10:]==0) and np.max(np.abs(sum(stems.values())-mix))<1e-12
            clean=[e for e in plan['events'] if e['kind']=='clean_selected_hook'];assert len(clean)==3
            for event in clean:
                at=event['start_frame'];assert event['source_frames']==[a,b]
                assert np.max(np.abs(stems['voice'][at:at+b-a]-faded(pcm[a:b],.01)*event['gain']*plan['master_gain']))<1e-12
            name=source['id']+'-'+strategy;folder=output/name;folder.mkdir()
            write_pcm(folder/'performance.wav',mix);write_pcm(folder/'selected.wav',faded(pcm[a:b],.01))
            for stem,audio in stems.items():write_pcm(folder/(stem+'.wav'),audio)
            (folder/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
            for kind in ('performance','selected'):shutil.copyfile(folder/(kind+'.wav'),public/(name+'-'+kind+'.wav'))
            recorded=read_pcm(folder/'performance.wav',(20,40));assert len(recorded)==len(mix) and np.max(np.abs(recorded))<=.851 and np.all(recorded[-RATE//10:]==0)
            report['records'].append(dict(source=source['id'],strategy=strategy,source_sha256=source['sha256'],selection=selection,
                seconds=len(mix)/RATE,peak=float(np.max(np.abs(mix))),clean_selected_hooks=3,technical='PASS',listening='NOT RUN',
                artifacts={p.name:digest(p) for p in folder.glob('*.wav')}))
            label=('A','B','C')[i]
            page.append(f'<article><h3>{label} · {strategy.replace("_"," ").title()}</h3><p>Selected sound · {a/RATE:.2f}–{b/RATE:.2f} seconds of the original</p><audio controls preload="metadata" aria-label="{source["id"]} {label} selected sound" src="{name}-selected.wav"></audio><p>Arrangement</p><audio controls preload="metadata" aria-label="{source["id"]} {label} arrangement" src="{name}-performance.wav"></audio></article>')
        assert digest(source['path'])==source['sha256'];page.append('</section>')
    page.append('<p><a href="ATTRIBUTION.txt">Source attribution</a></p><script>document.addEventListener("play",event=>{if(event.target.tagName==="AUDIO")document.querySelectorAll("audio").forEach(audio=>{if(audio!==event.target)audio.pause()})},true)</script></html>')
    (public/'index.html').write_text('\n'.join(page)+'\n')
    (public/'ATTRIBUTION.txt').write_text(licensed['license']['attribution']+'\nQuestion: owner-confirmed user sample, crop 1.78–3.0 seconds; local audition only. Maker voice excluded.\n')
    report.update(technical='PASS',served_hashes={p.name:digest(p) for p in public.glob('*.wav')},
                  limitation='Signal-based selection does not verify word boundaries or musical acceptance; two-beat selection is this pilot policy, not a product restriction',
                  free_gib=shutil.disk_usage(output).free/1024**3)
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--public',type=Path,required=True)
    args=parser.parse_args();print(json.dumps(render(args.output,args.public),indent=2))
