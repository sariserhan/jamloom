#!/usr/bin/env python3
"""Hash-verified musical-vocal excerpts plus uncut candidates for word-boundary review."""
import hashlib
import html
import json
from pathlib import Path
import tempfile
import sys
import wave
import numpy as np
from dj_track_worker import canonical
from review_dj_warm import listening_copy

ROOT=Path(__file__).resolve().parents[1]


def read(path):
    with wave.open(str(path)) as audio:
        assert (audio.getnchannels(),audio.getsampwidth(),audio.getframerate(),audio.getnframes())==(2,2,48000,2880000)
        return np.frombuffer(audio.readframes(2880000),dtype='<i2').reshape(-1,2)


def main():
    flags=set(sys.argv[1:]);assert len(flags)==len(sys.argv[1:]) and flags<={'--aggressive','--replacement','--isolated'}
    aggressive='--aggressive' in flags;replacement='--replacement' in flags;isolated='--isolated' in flags
    assert not isolated or not (aggressive or replacement)
    campaign='dj-isolated-hooks-20261026' if isolated else 'dj-sung-aggressive-20261026' if aggressive else 'dj-sung-hooks-20261026'
    evidence=ROOT/'docs/evidence'/campaign
    source=ROOT/'renders'/(campaign+('-replacement' if replacement else ''))
    run=json.loads((source/'report.json').read_text());plan=json.loads((evidence/('replacement-plan.json' if replacement else 'gpu-plan.json')).read_text())
    assert run['status']=='PASS technical' and run['cleanup_confirmed'] and len(run['tracks'])==4
    assert run['rental_seconds']<=plan.get('remaining_rental_seconds',1200) and run['observed_debit_usd']<=3
    if replacement:assert run['rental_seconds']+json.loads((evidence/'first-failure.json').read_text())['rental_seconds']<=1200
    executed={Path(name).name:digest for digest,name in (line.split(maxsplit=1)for line in (source/'executed-scripts.sha256').read_text().splitlines())}
    assert all(executed[name]==digest for name,digest in plan['worker_sha256'].items())
    assert all(executed[name]==digest for name,digest in plan['source_sha256'].items())
    assert executed['sung-fixtures.json']==plan['fixture_sha256']
    assert all(executed[name]==digest for name,digest in plan['dna_manifest_sha256'].items())
    review=ROOT/'renders/club-studies-20261024'/('isolated-hooks' if isolated else 'vocal-mode' if aggressive else 'sung-hooks')/'review';review.mkdir(parents=True,exist_ok=False)
    cards=[];rows=[]
    for i,(row,case) in enumerate(zip(run['tracks'],plan['cases']),1):
        receipt=row['receipt'];proof=receipt['musical_hook'];assert receipt['request']==case['request']
        edited=source/row['file'];raw=source/'sung-candidates'/f'raw-{i-1}.wav'
        original=ROOT/'renders/dj-planner-20261026'/case['source_file'].removeprefix('sung-')
        for file,digest in [(edited,receipt['sha256']),(raw,proof['raw_sha256']),(original,case['source_sha256'])]:
            assert hashlib.sha256(file.read_bytes()).hexdigest()==digest
        assert receipt['vocal'] is None and 0<receipt['compute_ms']<=30000
        pcm=read(edited);baseline=canonical(read(original).astype(np.float32)/32768,48000)
        cue=proof['cue'];start=round(cue['start']*48000);end=start+round(cue['seconds']*48000)
        assert np.array_equal(pcm[:start],baseline[:start]) and np.array_equal(pcm[end:],baseline[end:])
        placed=not isolated or proof['placement']=='placed'
        assert placed != np.array_equal(pcm[start:end],baseline[start:end])
        assert np.max(np.abs(pcm.astype(np.int32)))<32767
        if isolated:
            assert proof['task_type']=='isolated' and proof['model_source_audio_used'] is False
            from dj_vocal import short_phrase, mix_phrase
            import soundfile as sf
            candidate,rate=sf.read(raw,always_2d=True,dtype='float32')
            assert rate==48000
            clip,bounds=short_phrase(candidate,rate,round(cue['seconds']*rate))
            assert bounds==proof['source_phrase'] and placed==(clip is not None)
            original_samples=read(original).astype(np.float32)/32768
            expected=original_samples if clip is None else mix_phrase(original_samples,clip,rate,cue['start'])
            assert np.array_equal(canonical(expected,rate),pcm)
        players=[];copies=[]
        for name,label,path,uncut in [('base','Original groove',original,False),('sung','Sung mix' if placed else 'Unchanged: no short phrase',edited,False),('raw','Uncut model candidate',raw,True)]:
            target=review/f'{i}-{name}.mp3'
            if uncut:listening_copy(path,target)
            else:
                data=read(path)[start-4*48000:start+8*48000]
                assert data.shape==(12*48000,2)
                with tempfile.TemporaryDirectory(prefix='jamloom-sung-review-') as directory:
                    excerpt=Path(directory)/'excerpt.wav'
                    with wave.open(str(excerpt),'wb') as audio:
                        audio.setparams((2,2,48000,0,'NONE','not compressed'));audio.writeframes(data.astype('<i2').tobytes())
                    listening_copy(excerpt,target)
            player=f'<label>{label}<audio controls preload="metadata" aria-label="Hook {i}: {label}" src="{target.name}"></audio></label>'
            if uncut:
                timing=(f'Selected source phrase: {proof["source_phrase"]["start"]:.2f}–{proof["source_phrase"]["end"]:.2f} seconds.' if placed else 'No safe short phrase was found; the backing track is unchanged.') if isolated else f'The edit is at {cue["start"]:.2f}–{cue["start"]+cue["seconds"]:.2f} seconds.'
                player=f'<details><summary>Check complete words in the uncut output</summary><p>{timing}</p>{player}</details>'
            players.append(player);copies.append(dict(file=target.name,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
        cards.append(f'<article><h2>{i} · {html.escape(case["phrase"])}</h2>'+''.join(players)+'</article>')
        rows.append(dict(number=i,source_sha256=case['source_sha256'],sha256=receipt['sha256'],raw_sha256=proof['raw_sha256'],cue=cue,placement='placed' if placed else 'no_short_phrase',source_phrase=proof.get('source_phrase'),compute_ms=receipt['compute_ms'],unchanged_outside_window_relative_to_finalized_source=True,listening=copies))
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Musical vocal hooks</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:1050px;margin:40px auto;padding:0 20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:20px}article{min-width:0;padding:20px;border-radius:16px;background:#213039}h2{font-size:24px}label{display:block;margin:18px 0}audio{display:block;width:100%;margin-top:6px}summary{cursor:pointer}p{color:#cbd8d3}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style><h1>Musical vocal hooks</h1><p role="status"><strong>Rejected experiment.</strong> No audible singing in any candidate; clip 1 loses accompaniment during the edit at 4–6 seconds. These files are retained for diagnosis and are not approved product audio.</p><p>Compare each original groove with its short sung edit. The edit begins at 4 seconds. Listen for natural singing, a fitting melody and complete words. These candidates use Music DNA’s singer descriptions and the original accompaniment, with no speech synthesis.</p><main>'''+''.join(cards)+'''</main><p>Four vocal edits of two existing Jamloom originals. No new songs or public activation. Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    if aggressive or isolated:
        begin=page.index('<p role="status">');end=page.index('</p>',begin)+4
        page=page[:begin]+'<p role="status">New mode comparison: vocal presence and quality are not yet verified. Compare with the original groove; silence or no singing means this candidate failed.</p>'+page[end:]
    if isolated:
        page=page.replace('New mode comparison:', 'New isolated-singing comparison:')
        page=page.replace('These candidates use Music DNA’s singer descriptions and the original accompaniment, with no speech synthesis.', 'These candidates use Music DNA’s singer descriptions to generate separate voices. A quiet-bounded phrase is mixed over the retained groove; the music is not repainted. No speech synthesis.')
        page=page.replace('Four vocal edits of two existing Jamloom originals.', 'Four ten-second vocal candidates on two existing Jamloom originals. A mix marked unchanged failed to supply a safe short phrase.')
    (review/'index.html').write_text(page)
    (evidence/'audio-checks.json').write_text(json.dumps(dict(status='PASS technical',tracks=rows,human_listening='NOT RUN',vocal_presence='NOT VERIFIED by waveform checks'),indent=2)+'\n')
    (evidence/'fresh-samples.json').write_text(json.dumps(run,indent=2)+'\n')
    (evidence/'executed-scripts.sha256').write_bytes((source/'executed-scripts.sha256').read_bytes())
    print('http://localhost:8766/'+('isolated-hooks' if isolated else 'vocal-mode' if aggressive else 'sung-hooks')+'/review/')


if __name__=='__main__':main()
