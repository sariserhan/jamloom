#!/usr/bin/env python3
"""Private, CPU-only phrase-to-instrument auditions. No model training or upload."""
import argparse
import copy
import json
import hashlib
from pathlib import Path
import shutil
import random
import subprocess
import wave

import numpy as np

from arrange_voice_research import RATE, digest, read_pcm
from source_first_improvise import pitch_anchor
from source_led_response import save
from verify_export import verify_export

Q = 960
BAR = Q * 4
STYLES = {'reggae': (84, 10), 'hiphop': (88, 10), 'funk': (108, 12)}


def features(pcm):
    """Signal-derived regions, not word boundaries or expert annotations."""
    if pcm.ndim != 2 or pcm.shape[1] != 2 or not .5*RATE <= len(pcm) <= 5*RATE:
        raise ValueError('Expected a 0.5–5 second stereo phrase')
    if not np.isfinite(pcm).all() or np.std(pcm) < .001:
        raise ValueError('No finite audible phrase')
    mono = pcm.mean(axis=1)
    if np.std(mono) < .001:
        raise ValueError('Phrase cancels to silence in the native mono input')
    hop = RATE // 100
    padded = np.pad(mono, (0, (-len(mono)) % hop))
    energy = np.sqrt(np.mean(padded.reshape(-1, hop)**2, axis=1))
    peaks = [i for i in range(1, len(energy)-1)
             if energy[i] > energy.max()*.30 and energy[i] >= energy[i-1]
             and energy[i] > energy[i+1]]
    selected = []
    for i in sorted(peaks, key=lambda i: -energy[i]):
        if all(abs(i-j)*hop >= .22*RATE for j in selected):
            selected.append(i)
        if len(selected) == 4:
            break
    selected = sorted(selected) or [int(np.argmax(energy))]
    anchor = pitch_anchor(pcm)
    tonic = (anchor['midi'] if anchor['midi'] is not None else 57) % 12 + 48
    regions = []
    for i in selected:
        a = max(0, i*hop-round(.12*RATE))
        b = min(len(pcm), a+round(.36*RATE))
        a = max(0, b-round(.36*RATE))
        measured = pitch_anchor(pcm[a:b])
        midi = measured['midi']
        if midi is None:
            midi = anchor['midi']
        if midi is None:
            midi = tonic
        # Keep the nearest minor-scale pitch, within the native ±4-semitone limit.
        target = min((n for n in range(midi-4, midi+5)
                      if (n-tonic) % 12 in (0, 2, 3, 5, 7, 8, 10)), key=lambda n: abs(n-midi))
        regions.append({'start_frame': a, 'end_frame': b, 'stress_frame': i*hop,
                        'estimated_midi': measured['midi'], 'target_midi': target,
                        'shift': target-midi if measured['midi'] is not None else 0,
                        'strength': float(energy[i]/energy.max())})
    return {'tonic': tonic, 'anchor': anchor, 'regions': regions,
            'source_frames': len(pcm), 'word_boundaries_verified': False}


def compose(base, signal, style):
    if style not in STYLES:
        raise ValueError('Unknown arrangement')
    bpm, bars = STYLES[style]
    p = copy.deepcopy(base)
    p.update(schema_version='1.6-remix', strategy=style, tempo_milli_bpm=bpm*1000,
             target_bars=bars, tail_ms=2500)
    p.pop('tempo_changes', None)
    tonic = signal['tonic']
    p['key'] = {'tonic_midi': tonic, 'mode': 'minor'}
    p['mix'] = {'master_target_peak_dbfs': -2, 'clean_hook_instrument_duck_db': -16.4781748189,
                'instrument_room_mix': .08, 'instrument_reverb_mix': .07, 'kick_duck_db': -2}
    p['sections'] = [{'name': name, 'start_bar': start, 'bars': count} for name, start, count in
                     [('call', 0, 1), ('groove', 1, 3), ('breath_and_call', 4, 2),
                      ('development', 6, bars-7), ('resolve', bars-1, 1)]]
    p['voice_clips'] = [{'id': 0, 'start_frame': 0, 'end_frame': signal['source_frames'], 'confidence': 1}]
    for i, r in enumerate(signal['regions'], 1):
        p['voice_clips'].append({'id': i, 'start_frame': r['start_frame'],
                                'end_frame': r['end_frame'], 'confidence': .5})
    p['voice_events'] = []

    def voice(tick, clip, clean=False, shift=0):
        e = {'start_tick': tick, 'clip_id': clip, 'gain_db': -4 if clean else -9,
             'rate': 1, 'reverse': False, 'pan': 0, 'clean': clean}
        if shift:
            e.update(pitch_semitones=shift, time_stretch=1)
        p['voice_events'].append(e)

    voice(0, 0, True)
    voice(5*BAR, 0, True)
    tracks = {name: {'instrument': name, 'gain_db': gain, 'pan': pan, 'events': []}
              for name, gain, pan in [('piano', -12, -.12), ('guitar', -15, .22),
                                     ('bass', -10, 0), ('drums', -12, 0)]}

    def note(instrument, beat, length, midi, velocity):
        tracks[instrument]['events'].append({'start_tick': round(beat*Q),
            'duration_ticks': max(60, round(length*Q)), 'note': int(midi), 'velocity': int(velocity)})

    # Constrain the syllabic motif to two beats, leaving a genuine instrumental answer.
    raw = [r['stress_frame']*bpm/(60*RATE) for r in signal['regions']]
    scale = min(1., 1.75/max(raw[-1], .01))
    # Keep the region identity when two stresses quantize to the same grid point.
    by_stress = {}
    for index, value in enumerate(raw):
        stress = round(value*scale*4)/4
        prior = by_stress.get(stress)
        if prior is None or signal['regions'][index]['strength'] > signal['regions'][prior]['strength']:
            by_stress[stress] = index
    stresses = sorted(by_stress.items())
    motif = []
    for bar in range(bars):
        at = bar*4
        ending = bar == bars-1
        quiet = bar in (0, 4, 5)
        if ending:
            note('bass', at, .8, tonic-12, 78)
            note('piano', at, 1.5, tonic, 68)
            note('piano', at+.02, 1.5, tonic+7, 60)
            note('drums', at, .1, 36, 78)
            continue
        if quiet:
            note('guitar', at, 1.7, tonic, 50)
            note('guitar', at+.03, 1.7, tonic+7, 45)
            if bar == 4:
                for offset in (2, 3.5):
                    note('drums', at+offset, .1, 42, 36)
            continue
        kicks = {'reggae': [2], 'hiphop': [0, 1.75, 2.5], 'funk': [0, 1.5, 2.75]}[style]
        snares = [2] if style == 'reggae' else [1, 3]
        for k in kicks:
            note('drums', at+k, .12, 36, 94)
        for s in snares:
            note('drums', at+s, .12, 38, 77 if style == 'reggae' else 90)
        for h in range(8):
            swing = .07 if style == 'hiphop' and h % 2 else 0
            note('drums', at+h/2+swing, .09, 42, 51 if h % 2 == 0 else 34)
        bass_pattern = {'reggae': [(0, 0, 1.2), (1.5, 7, .4), (2.5, 0, .8), (3.5, 10, .3)],
                        'hiphop': [(0, 0, 1.1), (1.75, 0, .35), (2.5, 7, .8)],
                        'funk': [(0, 0, .45), (1.5, 12, .3), (2.75, 7, .3), (3.5, 10, .25)]}[style]
        for offset, degree, length in bass_pattern:
            note('bass', at+offset, length, tonic-12+degree, 84 if offset == 0 else 72)
        chord_offsets = [.5, 1.5, 2.5, 3.5] if style == 'reggae' else ([0, 2.5] if style == 'hiphop' else [.75, 2.5])
        for offset in chord_offsets:
            for i, degree in enumerate((3, 7, 10)):
                note('guitar' if style != 'hiphop' else 'piano', at+offset+i*.012,
                     .19 if style != 'hiphop' else .7, tonic+degree, 61-i*5)
        if bar in (2, 6, 8):
            last_end = -1
            for stress, i in stresses:
                region = signal['regions'][i]
                tick = round((at+stress)*Q)
                length = (region['end_frame']-region['start_frame'])*bpm*Q/(60*RATE)
                if tick < last_end + .08*bpm*Q/60:
                    continue
                voice(tick, i+1, shift=region['shift'])
                last_end = tick+length
        # The instrument inherits both timing and register contour from the phrase.
        if bar in (1, 3, 6, 7, 8, 9, 10):
            for stress, i in stresses:
                region = signal['regions'][i]
                midi = region['target_midi']
                while midi < tonic:
                    midi += 12
                while midi > tonic+19:
                    midi -= 12
                at_beat = at+2+stress
                note('piano', at_beat, .27 if style == 'funk' else .4, midi, 60+round(18*region['strength']))
                motif.append({'beat': at_beat, 'midi': midi, 'source_region': i})
    for track in tracks.values():
        track['events'].sort(key=lambda n: (n['start_tick'], n['note']))
    p['tracks'] = list(tracks.values())
    p['voice_events'].sort(key=lambda e: e['start_tick'])
    return p, motif


def render(source, output, renderer, consent=False):
    if not consent:
        raise ValueError('User-input consent is required')
    if output.exists():
        raise FileExistsError('Preserve existing auditions')
    if shutil.disk_usage(output.parent).free < 15*1024**3:
        raise RuntimeError('Keep 15 GiB free disk reserve')
    source_hash = digest(source)
    renderer_hash = hashlib.sha256(renderer.read_bytes()).hexdigest()
    pcm = read_pcm(source, (.5, 5))
    signal = features(pcm)
    output.mkdir()
    (output/'.partial').touch()
    # Preserve source PCM exactly; tail padding adapts the native 2-second minimum.
    with wave.open(str(source)) as wav:
        params, raw = wav.getparams(), wav.readframes(wav.getnframes())
    if digest(source) != source_hash:
        raise ValueError('Source changed during preparation')
    padded_frames = max(params.nframes, 2*RATE)
    padded = output/'input.wav'
    with wave.open(str(padded), 'wb') as wav:
        wav.setparams(params)
        wav.writeframes(raw+b'\0'*((padded_frames-params.nframes)*params.nchannels*params.sampwidth))
    base_prefix = output/'baseline'
    def execute(prefix, style, plan=None):
        command = [str(renderer.resolve()), '--input', str(padded), '--consent', '--output', str(prefix),
                   '--style', style, '--sample-rate', str(RATE), '--seed', '103030', '--stems']
        if plan:
            command += ['--plan', str(plan)]
        result = subprocess.run(command, timeout=120, capture_output=True, text=True)
        (output/(prefix.name+'-render.log')).write_text(result.stdout+result.stderr)
        if result.returncode:
            raise RuntimeError('Renderer failed: '+result.stderr[-2000:])
        return verify_export(prefix, [style])
    baseline = execute(base_prefix, 'baseline')
    base = json.loads((output/'baseline.baseline.score.json').read_text())
    cases = []
    for style in STYLES:
        plan, motif = compose(base, signal, style)
        path = output/(style+'.json')
        save(path, plan)
        result = execute(output/style, style, path)
        exported = json.loads((output/f'{style}.{style}.score.json').read_text())
        if exported != plan:
            raise ValueError('Renderer changed the requested composition')
        cases.append({'style': style, 'plan_sha256': digest(path), 'response_notes': motif,
                      'export': result})
    if digest(source) != source_hash or hashlib.sha256(renderer.read_bytes()).hexdigest() != renderer_hash:
        raise ValueError('Source or renderer changed during rendering')
    save(output/'complete.json', {'technical': 'PASS', 'listening': 'NOT RUN', 'training': 'NOT RUN',
        'source_sha256': source_hash, 'native_input_sha256': digest(padded),
        'tail_padding_frames': padded_frames-params.nframes, 'features': signal,
        'renderer_sha256': renderer_hash,
        'source_audio_uploaded': False, 'maker_voice_intentionally_used': False,
        'exact_speaker_boundary_review': 'NOT RUN', 'baseline': baseline, 'cases': cases,
        'limits': 'Authored CPU audition, not a trained model or accepted replacement. Region pitches and boundaries are estimates.'})
    (output/'.partial').unlink()


def review(work):
    """A blinded exploratory audition; its key stays outside the served directory."""
    from q0_audit import loudness, level_match
    receipt = json.loads((work/'complete.json').read_text())
    if receipt['technical'] != 'PASS':
        raise ValueError('Complete the technical render first')
    if digest(work/'input.wav') != receipt['native_input_sha256']:
        raise ValueError('Audition source changed after rendering')
    sources = [(style, work/f'{style}.{style}.wav') for style in ['baseline', *STYLES]]
    for style, _ in sources:
        verify_export(work/style, [style])
    measured = {style: loudness(path) for style, path in sources}
    target = min(-23., *(float(m['input_i'])-float(m['input_tp'])-2.1 for m in measured.values()))
    folder = work/'review'
    folder.mkdir(exist_ok=False)
    random.SystemRandom().shuffle(sources)
    rows, key = [], {}
    for letter, (style, source) in zip('ABCD', sources):
        dest = folder/f'{letter}.wav'
        gain, final = level_match(source, dest, target, measured[style])
        key[letter] = {'style': style, 'source_sha256': digest(source), 'audio_sha256': digest(dest),
                       'gain_db': gain, 'measurement': final}
        rows.append(f'<section><h2>Candidate {letter}</h2><audio controls preload="metadata" '
                    f'aria-label="Candidate {letter}" src="{letter}.wav"></audio>'
                    f'<a href="{letter}.wav" download>Download candidate {letter}</a></section>')
    shutil.copyfile(work/'input.wav', folder/'source.wav')
    (folder/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · phrase response</title>
<style>body{font:18px/1.6 system-ui;background:#111b20;color:#e9f0eb;max-width:800px;margin:32px auto;padding:0 20px}
section{padding:20px;background:#213039;border-radius:12px;margin:20px 0}audio{width:100%}a{color:#b5efac}
:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style>
<h1>Your phrase, four arrangements</h1><p>Listen at a comfortable volume. Compare how naturally the voice belongs in the music,
how the instruments answer it, and whether you would want to hear it again. All four mixes have matched listening levels.</p>
<section><h2>Original phrase</h2><audio controls preload="metadata" aria-label="Original phrase" src="source.wav"></audio>
<p>The short phrase has silence added at its end. Its exact crop still needs your check.</p></section>'''+''.join(rows)+'''
<p>Tell me which candidates work, which do not, and any timestamps that sound wrong. These are new exploratory auditions;
no listening verdict has been recorded. The source and all music stay on this computer.</p>
<script>const stop=()=>document.querySelectorAll('audio').forEach(a=>a.pause());
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);</script></html>''')
    save(work/'review-key.json', {'technical': 'PASS', 'target_lufs': target, 'candidates': key,
                                 'listening': 'NOT RUN', 'formal_cohort_gate': False})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--renderer', type=Path, required=True)
    parser.add_argument('--user-input-consent', action='store_true')
    parser.add_argument('--review', action='store_true')
    args = parser.parse_args()
    render(args.source, args.output, args.renderer, args.user_input_consent)
    if args.review:
        review(args.output)
