#!/usr/bin/env python3
"""Private source-first audition: derive timing/harmony before generating the band."""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from source_led_response import faded, save
from singing_response import CODE_REVISION, WEIGHT_REVISION, source_conditioning, validate_plan


def pitch_anchor(hook):
    # A robust speech-register suggestion, never a claim that speech has a musical key.
    mono = hook.mean(axis=1)[::6].astype(np.float64)
    rate = RATE//6
    notes = []
    for start in range(0, len(mono)-800, 400):
        part = mono[start:start+800]
        part = (part-part.mean())*np.hanning(len(part))
        if np.sqrt(np.mean(part**2)) < .003:
            continue
        spectrum = np.fft.rfft(part, n=2048)
        ac = np.fft.irfft(spectrum*np.conj(spectrum), n=2048)[:800]
        lo, hi = round(rate/400), round(rate/90)
        lag = lo+int(np.argmax(ac[lo:hi+1]))
        confidence = float(ac[lag]/max(ac[0], 1e-12))
        if confidence >= .65:
            notes.append(69+12*np.log2((rate/lag)/440))
    if len(notes) < 3:
        return {'midi': None, 'reliable_windows': len(notes), 'basis': 'No stable pitch anchor; rhythmic response only'}
    return {'midi': int(round(float(np.median(notes)))), 'reliable_windows': len(notes),
            'spread_semitones': float(np.percentile(notes, 75)-np.percentile(notes, 25)),
            'basis': 'Median voiced-register estimate; speech intonation is preserved'}


def prepare(source, output, consent=False):
    if not consent:
        raise ValueError('Explicit user-input consent required; performer reference is not an input')
    if output.exists():
        raise FileExistsError('Preserving previous audition')
    hook = read_pcm(source, (.5, 5))
    if np.std(hook) < .001:
        raise ValueError('No audible user input')
    anchor = pitch_anchor(hook)
    # Fit a whole phrase to a beat span; short speech can leave a rest at its tail.
    # Never stretch an intelligible call just to satisfy a genre's tempo range.
    phrase_seconds = len(hook)/RATE
    choices = [(beats, 60*beats/phrase_seconds) for beats in range(1, 9)]
    choices = [(b, bpm) for b, bpm in choices if 72 <= bpm <= 96]
    beats, bpm = (min(choices, key=lambda v: abs(v[1]-84)) if choices else
                  (math.ceil(phrase_seconds*84/60), 84))
    beat = RATE*60/bpm
    frames = 30*RATE
    guide = np.zeros((frames, 2), dtype=np.float64)
    source_gain = min(.14/max(float(np.sqrt(np.mean(hook**2))), 1e-9),
                      .45/max(float(np.max(np.abs(hook))), 1e-9))
    calls = [round(b*beat) for b in (4, 20)]
    for start in calls:
        guide[start:start+len(hook)] += faded(hook)*source_gain
    # Same rhythmic identity moves from voice to instrument; preserve rests between stresses.
    block = 480
    mono = hook.mean(axis=1)
    envelope = np.sqrt(np.mean(np.pad(mono, (0, (-len(mono)) % block)).reshape(-1, block)**2, axis=1))
    peaks = [i for i in range(1, len(envelope)-1)
             if envelope[i] > max(envelope.max()*.45, .003)
             and envelope[i] >= envelope[i-1] and envelope[i] > envelope[i+1]]
    selected = []
    for i in sorted(peaks, key=lambda i: -envelope[i]):
        if all(abs(i-j)*block >= .20*RATE for j in selected):
            selected.append(i)
        if len(selected) == 4:
            break
    stresses = sorted({round((i*block/beat)*2)/2 for i in selected}) or [0, 1.5]
    root = (anchor['midi'] or 57) % 12 + 48
    motif = []
    def note(at, midi, length, gain):
        start, count = round(at*beat), round(length*beat)
        if start+count > frames:
            return
        t = np.arange(count)/RATE
        wave = np.sin(2*np.pi*440*2**((midi-69)/12)*t)*np.exp(-t/1.5)
        pcm = faded(np.repeat(wave[:, None], 2, axis=1), .025)*gain
        guide[start:start+count] += pcm
    for bar in range(int(frames/(beat*4))):
        note(bar*4, root-12, 3.6, .065)
        for interval in (0, 7):
            note(bar*4, root+interval, 3.6, .025)
        if bar in (2, 3, 6, 7, 8, 9):
            for i, stress in enumerate(stresses):
                at = bar*4+stress
                midi = root+(0, 7, 12, 7)[i % 4]
                note(at, midi, .4, .075)
                motif.append({'beat': at, 'midi': midi, 'source_stress_beat': stress})
    for at in range(int(frames/beat)):
        start = round(at*beat)
        t = np.arange(round(.12*RATE))/RATE
        pulse = .1*np.sin(2*np.pi*(55*t+1.8*(1-np.exp(-30*t))))*np.exp(-32*t)
        guide[start:start+len(pulse)] += pulse[:min(len(pulse), frames-start), None]
    guide *= min(1., .8/max(float(np.max(np.abs(guide))), 1e-9))
    output.mkdir(parents=True)
    write_pcm(output/'guide.wav', guide)
    key = ['C','C sharp','D','E flat','E','F','F sharp','G','A flat','A','B flat','B'][root % 12]
    save(output/'direction.json', {'schema': 'jamloom-source-first-audition-1',
        'source_sha256': digest(source), 'input_role': 'user', 'performer_reference_used': False,
        'pitch_anchor': anchor, 'bpm': bpm, 'phrase_beats': beats, 'calls_frames': calls,
        'source_frames': len(hook), 'source_gain': source_gain,
        'phrase_seconds': phrase_seconds, 'tail_rest_seconds': max(0, beats*60/bpm-phrase_seconds),
        'source_stress_beats': stresses, 'instrument_response_notes': motif,
        'composition_order': ['select user hook', 'derive pulse and harmonic anchor',
                              'plan voice and instrumental answers', 'generate band', 'verify source integration'],
        'training': 'NOT RUN; new authored director, existing generator weights',
        'listening': 'NOT RUN'})
    save(output/'conditioning.json', {'audio': str((output/'guide.wav').resolve()),
        'sha256': digest(output/'guide.wav'), 'bpm': bpm, 'strength': .5, 'instrumental': True,
        'direction': f'Warm live reggae band centered on {key}, root and fifth harmony under the spoken calls. '
        'Follow the source phrase rhythm and the answering instrumental motif. Keep bass and drums moving '
        'under every call. Leave space for the original voice at the two guide entrances. '
        'Natural electric bass, rimshot drums, offbeat guitar and warm electric piano. '
        'Develop the motif with a change in density, a short break and a resolved ending. No new voice.'})
    source_conditioning(output/'conditioning.json')
    plan = validate_plan({'schema': 'jamloom-sung-response-1', 'model_code': CODE_REVISION,
        'weights': WEIGHT_REVISION, 'phrase': 'I have a question',
        'lyric_origin': 'Original local audition; instrumental generation uses source conditioning',
        'cases': [{'id': 'reggae-male', 'genre': 'reggae', 'voice': 'male', 'seed': 103030,
                   'bpm': 84, 'duration': 30, 'source_repetitions': 2,
                   'lyrics': 'Go on, I am listening\nTake your time and tell me'}]})
    save(output/'plan.json', plan)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--user-input-consent', action='store_true')
    args = parser.parse_args()
    prepare(args.source, args.output, args.user_input_consent)
