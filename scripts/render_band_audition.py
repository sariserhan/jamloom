"""Render two private recorded-band auditions without changing frozen evidence."""
import argparse
import html
import json
from pathlib import Path
import os
import shutil
import subprocess
import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from source_band_response import compose, RecordedBank
from source_led_response import faded
from source_natural_phrase import select_phrase


def render(output, public):
    if output.exists() or public.exists():
        raise FileExistsError('Preserve existing auditions')
    if shutil.disk_usage(output.parent).free < 15.5*1024**3:
        raise RuntimeError('Preserve 15 GiB reserve')
    rows=json.loads(Path('renders/owner-evaluation-20261030/freeze.json').read_text())['dataset']['clips']
    licensed=next(r for r in rows if r['id']=='ls-2277-149896-0026')
    assert licensed['consent']['local_processing'] and licensed['license']['id']=='CC-BY-4.0'
    assert digest(licensed['path'])==licensed['sha256']
    prepared=next(r for r in json.loads(Path('renders/three-strategy-study-20261030/report.json').read_text())['records'] if r['id']==licensed['id'])
    sources=[dict(id='question',title='Your question sample',path='renders/question-bass-response-20261030/source.wav',
                  sha256='4f37e2d3c35266f627589374812742680fe2d4ae8d7a07c8a9effeffab58588a',crop_accepted=True),
             dict(id=licensed['id'],title='The first listening-study input',path='renders/three-strategy-study-20261030/inputs/'+licensed['id']+'.wav',sha256=prepared['prepared_input_sha256'],crop_accepted=False)]
    output.mkdir();public.mkdir();(output/'.partial').touch()
    report=dict(technical='RUNNING',listening='NOT RUN',records=[],selection_coverage=[],
                source_uploaded=False,training=False,shipping_default_changed=False,
                frozen_study_changed=False,implementation={name:digest(Path(__file__).with_name(name)) for name in
                ('source_band_response.py','source_natural_phrase.py','render_band_audition.py')})
    bank=RecordedBank()
    for row in rows:
        if row['kind']=='silence':continue
        path=Path('renders/three-strategy-study-20261030/inputs')/(row['id']+'.wav')
        pcm=read_pcm(path,(.5,5));selected=select_phrase(pcm)
        for bound in (selected['start_frame'],selected['end_frame']):
            assert bound in (0,len(pcm)) or any(a<bound<b for a,b in selected['quiet_gaps'])
        report['selection_coverage'].append(dict(source=row['id'],**selected))
    page=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
          '<title>Jamloom · recorded band revision</title><link rel="stylesheet" href="../owner-review.css">',
          '<style>audio{display:block;width:100%;max-width:40rem;margin:1rem 0 2rem}section{border-top:1px solid #555;margin-top:2rem;padding-top:1rem}</style>',
          '<a href="../">Owner workspace</a><h1>Recorded band revision</h1>',
          '<p>A new arrangement with recorded drums, bass and electric guitar, changing harmony and a developed middle section. No piano.</p>',
          '<p>The phrase has room to finish. These two inputs are kept complete because the cut detector did not find a suitable shorter phrase. The music stays underneath and answers afterward.</p>',
          '<p>This is a new listening candidate. Your earlier ratings and accepted pilot remain separate.</p>']
    for source in sources:
        assert digest(source['path'])==source['sha256']
        pcm=read_pcm(source['path'],(.5,5))
        mixed,stems,plan=compose(pcm,bank=bank)
        assert np.isfinite(mixed).all() and np.max(np.abs(mixed))<=.880001
        assert np.max(np.abs(sum(stems.values())-mixed))<1e-12
        a,b=plan['source_selection']['start_frame'],plan['source_selection']['end_frame']
        calls=[e for e in plan['events'] if e['stem']=='voice']
        assert len(calls)==3
        for e in calls:
            start=e['start_frame'];assert e['source_frames']==[a,b]
            np.testing.assert_allclose(stems['voice'][start:start+b-a],faded(pcm[a:b],.005)*e['gain']*plan['master_gain'],atol=1e-12)
        folder=output/source['id'];folder.mkdir()
        write_pcm(folder/'performance.wav',mixed)
        for name,audio in stems.items():write_pcm(folder/(name+'.wav'),audio)
        shutil.copyfile(source['path'],folder/'original.wav')
        preview_gain=min(1,.95/max(np.max(np.abs(pcm[a:b])),1e-9))
        write_pcm(folder/'selected.wav',faded(pcm[a:b],.005)*preview_gain)
        (folder/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
        # Audition level is fixed independently of approval and never clipped.
        result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(folder/'performance.wav'),
            '-af','loudnorm=I=-20:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
        level,_=json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])
        gain=min(-20-float(level['input_i']),-2-float(level['input_tp']))
        subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(folder/'performance.wav'),'-af',f'volume={gain}dB',
            '-ar','48000','-c:a','pcm_s16le',str(folder/'audition.wav')],check=True)
        decoded=read_pcm(folder/'audition.wav',(40,45))
        assert len(decoded)==len(mixed) and np.max(np.abs(decoded))<.80
        served={}
        for kind in ('original','selected','audition'):
            name=source['id']+'-'+kind+'.wav';os.link(folder/(kind+'.wav'),public/name);served[name]=digest(public/name)
        report['records'].append(dict(id=source['id'],source_sha256=source['sha256'],source_selection=plan['source_selection'],
            source_crop_previously_accepted=source['crop_accepted'],natural_phrase_events=3,technical='PASS',listening='NOT RUN',
            seconds=len(mixed)/RATE,peak=float(np.max(np.abs(mixed))),audition_gain_db=gain,selected_preview_gain=preview_gain,served_hashes=served,
            sample_count=len(bank.used),plan_sha256=digest(folder/'plan.json')))
        title=html.escape(source['title']);ident=source['id']
        page.extend([f'<section><h2>{title}</h2>',f'<p>Original input · {len(pcm)/RATE:.2f} seconds</p><audio controls preload="metadata" aria-label="{title} original" src="{ident}-original.wav"></audio>',
            f'<p>Phrase used · {a/RATE:.2f}–{b/RATE:.2f} seconds</p><audio controls preload="metadata" aria-label="{title} selected phrase" src="{ident}-selected.wav"></audio>',
            f'<p>New arrangement · {len(mixed)/RATE:.0f} seconds</p><audio controls preload="metadata" aria-label="{title} arrangement" src="{ident}-audition.wav"></audio></section>'])
        assert digest(source['path'])==source['sha256']
    page.append('<p><a href="ATTRIBUTION.txt">Instrument and source credits</a></p><script>document.addEventListener("play",e=>{if(e.target.tagName==="AUDIO")document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>')
    (public/'index.html').write_text('\n'.join(page)+'\n')
    (public/'ATTRIBUTION.txt').write_text('Recorded instrument notes: Versilian Studios / VSCO 2 CE / VCSL contributors; Brian Wood / Karoryfer Lecolds. CC0-1.0. Resampled, pitched, enveloped and arranged into an original composition.\n'+licensed['license']['attribution']+'\nQuestion: owner-confirmed user sample and accepted crop. Local audition only; maker voice excluded.\n')
    report.update(technical='PASS',samples=bank.used,free_gib=shutil.disk_usage(output).free/1024**3,
                  limitation='Recorded instrument timbre and conservative phrase boundaries do not establish musical quality or word-level correctness. Owner listening required.')
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True);parser.add_argument('--public',type=Path,required=True)
    args=parser.parse_args();result=render(args.output,args.public)
    print(json.dumps({k:result[k] for k in ('technical','listening','free_gib')}))
