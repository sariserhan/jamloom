#!/usr/bin/env python3
"""One original bass-led research audition; source-coloured synthesis, no training."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from scipy.signal import butter, sosfilt

from arrange_voice_research import RATE, digest, read_pcm, write_pcm
from source_phrase_response import features
from source_led_response import faded, save

BPM = 158
BEAT = 60/BPM
BARS = 20


def source_spectrum(pcm):
    mono = pcm.mean(axis=1)
    spectra = []
    for start in range(0, len(mono)-2048, 1024):
        block = mono[start:start+2048]*np.hanning(2048)
        if np.sqrt(np.mean(block**2)) > .003:
            spectra.append(np.abs(np.fft.rfft(block)))
    if not spectra:
        raise ValueError('No voiced spectral material')
    spectrum = np.mean(spectra, axis=0)
    return np.fft.rfftfreq(2048, 1/RATE), spectrum/max(spectrum.max(), 1e-9)


def coloured_bass(seconds, midi, colour, variant):
    count = round(seconds*RATE)
    t = np.arange(count)/RATE
    hz = 440*2**((midi-69)/12)
    phase = 2*np.pi*hz*t
    frequencies, spectrum = colour
    harmonics = np.arange(1, 49)
    weights = np.interp(harmonics*hz*2, frequencies, spectrum)+.025/harmonics
    weights /= max(weights.sum(), 1e-9)
    carrier = np.zeros(count)
    fm = (.7 if variant == 0 else 1.4)*np.sin(phase*.5)
    for harmonic, weight in zip(harmonics, weights):
        carrier += weight*np.sin(harmonic*phase+fm)
    # Three moving bands turn the source's spectral colour into an instrumental gesture.
    result = np.zeros(count)
    wobble = (1-np.cos(2*np.pi*t/(BEAT*(1 if variant == 0 else .75))))/2
    for index, (low, high) in enumerate(((100, 400), (400, 1300), (1300, 4200))):
        band = sosfilt(butter(2, [low, high], 'bandpass', fs=RATE, output='sos'), carrier)
        gain = (.8-.55*wobble) if index == 0 else (.2+.8*wobble) if index == 1 else (.1+.35*wobble)
        result += band*gain
    result = np.tanh(result*6)
    peak = max(float(np.max(np.abs(result))), 1e-9)
    result = faded(np.repeat((result/peak)[:, None], 2, axis=1), .018)
    return result


def percussion(seed):
    rng = np.random.default_rng(seed)
    t = np.arange(round(.45*RATE))/RATE
    phase = 2*np.pi*(47*t+2.8*(1-np.exp(-38*t)))
    kick = np.sin(phase)*np.exp(-11*t)+.13*rng.normal(size=len(t))*np.exp(-300*t)
    noise = rng.normal(size=len(t))
    snap = sosfilt(butter(2, 1200, 'highpass', fs=RATE, output='sos'), noise)
    snare = .65*snap*np.exp(-18*t)+.34*np.sin(2*np.pi*185*t)*np.exp(-27*t)
    snare += .25*snap*np.exp(-((t-.025)/.01)**2)
    hat = sosfilt(butter(2, 6500, 'highpass', fs=RATE, output='sos'), noise)*np.exp(-65*t)
    return {name: faded(np.repeat((pcm/max(np.max(np.abs(pcm)), 1e-9))[:, None], 2, axis=1), .001)
            for name, pcm in [('kick', kick), ('snare', snare), ('hat', hat)]}


def compose(pcm, seed=103031):
    signal = features(pcm)
    if len(pcm) > 2.5*RATE:
        raise ValueError('This audition expects one short call, at most 2.5 seconds')
    colour = source_spectrum(pcm)
    frames = round((BARS*4*BEAT+1)*RATE)
    stems = {name: np.zeros((frames, 2), np.float64) for name in ('drums', 'sub', 'bass', 'voice', 'air')}
    events = []
    drums = percussion(seed)
    rng = np.random.default_rng(seed)
    root = signal['tonic']-24

    def put(stem, at, audio, gain, kind, **extra):
        start = round(at*BEAT*RATE)
        if start < 0 or start+len(audio) > frames:
            raise ValueError('Event outside arrangement')
        stems[stem][start:start+len(audio)] += audio*gain
        events.append({'stem': stem, 'beat': at, 'start_frame': start,
                       'frames': len(audio), 'gain': gain, 'kind': kind, **extra})

    # The complete source call is preserved. Later fragments are signal regions, not verified words.
    voice_gain = min(.38/max(np.max(np.abs(pcm)), 1e-9), .13/max(np.sqrt(np.mean(pcm**2)), 1e-9))
    for beat in (0, 40, 74):
        put('voice', beat, faded(pcm, .01), voice_gain, 'clean_call', source_frames=[0, len(pcm)], rate=1)
    stresses = [r['stress_frame']/RATE/BEAT for r in signal['regions']]
    scale = min(1., 2.5/max(stresses[-1], .01))
    motif = sorted(set(round(stress*scale*2)/2 for stress in stresses))
    regions = signal['regions']
    for bar in range(BARS):
        at = bar*4
        drop = 4 <= bar <= 9 or 12 <= bar <= 17
        if not drop:
            if bar in (2, 3, 11):
                for h in range(8):
                    put('drums', at+h/2, drums['hat'], .035+.025*h/8, 'build_hat')
            continue
        variant = int(bar >= 12)
        for offset, gain in ((0, .55), (2.75 if variant else 3, .38)):
            put('drums', at+offset, drums['kick'], gain, 'kick')
        put('drums', at+2, drums['snare'], .45, 'half_time_snare')
        for h in range(8):
            put('drums', at+h/2, drums['hat'], .06 if h % 2 else .09, 'hat')
        # Voice stresses drive bass attacks. The second drop alters the response, not the call.
        offsets = motif if not variant or bar % 2 == 0 else sorted(2.5-x for x in motif)
        for i, offset in enumerate(offsets):
            next_at = offsets[i+1] if i+1 < len(offsets) else 3.35
            length = min(.85, max(.25, next_at-offset-.10))
            degree = (0, 0, 7, 10)[(i+(1 if variant and bar % 2 else 0)) % 4]
            midi = root+degree
            seconds = length*BEAT
            bass = coloured_bass(seconds, midi+12, colour, variant)
            put('bass', at+offset, bass, .22 if variant else .20, 'source_coloured_bass', midi=midi+12)
            t = np.arange(len(bass))/RATE
            sub = faded(np.repeat(np.sin(2*np.pi*440*2**((midi-69)/12)*t)[:, None], 2, axis=1), .015)
            put('sub', at+offset, sub, .21, 'sub', midi=midi)
        if bar in (4, 8, 12, 16):
            region = regions[-1]
            fragment = faded(pcm[region['start_frame']:region['end_frame']], .015)
            put('voice', at+3.4, fragment, voice_gain*.8, 'source_fragment',
                source_frames=[region['start_frame'], region['end_frame']], rate=1)
        if bar in (7, 15):
            # Short stereo echo is separate from the clean calls.
            region = regions[0]
            fragment = faded(pcm[region['start_frame']:region['end_frame']], .015)
            for repeat in range(3):
                put('voice', at+3+repeat*.5, fragment, voice_gain*.45*(.5**repeat),
                    'fragment_echo', source_frames=[region['start_frame'], region['end_frame']], rate=1)
    # Original filtered noise gestures connect the sparse call, rise, drop and return.
    for start, length, rising in ((8, 7.5, True), (38, 2, False), (44, 3.5, True), (71, 2.5, False)):
        t = np.arange(round(length*BEAT*RATE))/RATE
        noise = sosfilt(butter(2, [1800, 7500], 'bandpass', fs=RATE, output='sos'), rng.normal(size=len(t)))
        envelope = np.linspace(.02, 1, len(t)) if rising else np.exp(-t*5)
        air = faded(np.repeat((noise*envelope)[:, None], 2, axis=1), .025)
        put('air', start, air, .035, 'rise' if rising else 'fall')
    mixed = sum(stems.values())
    master_gain = min(1., .85/max(float(np.max(np.abs(mixed))), 1e-9))
    for name in stems:
        stems[name] *= master_gain
    mixed *= master_gain
    return mixed, stems, {'bpm': BPM, 'half_time_bpm': BPM/2, 'bars': BARS,
        'source_features': signal, 'bass_motif_beats': motif, 'master_gain': master_gain,
        'events': events, 'sections': [{'name': name, 'start_seconds': start*4*BEAT, 'end_seconds': end*4*BEAT}
            for name, start, end in [('call', 0, 2), ('rise', 2, 4), ('first_drop', 4, 10),
                                    ('break_and_call', 10, 12), ('second_drop', 12, 18), ('ending', 18, 20)]],
        'palette': ['original electronic percussion', 'sub bass', 'source-coloured moving bass', 'source calls/fragments', 'filtered noise']}


def render(source, output, consent=False):
    if not consent:
        raise ValueError('Explicit user-input processing consent required')
    if output.exists():
        raise FileExistsError('Preserve existing auditions')
    if shutil.disk_usage(output.parent).free < 15*1024**3:
        raise RuntimeError('Free disk reserve reached')
    original_hash = digest(source)
    pcm = read_pcm(source, (.5, 2.5))
    mixed, stems, plan = compose(pcm)
    if digest(source) != original_hash:
        raise ValueError('Source changed during composition')
    output.mkdir()
    (output/'.partial').touch()
    write_pcm(output/'performance.wav', mixed)
    for name, audio in stems.items():
        write_pcm(output/(name+'.wav'), audio)
    shutil.copyfile(source, output/'source.wav')
    save(output/'plan.json', plan)
    save(output/'complete.json', {'technical': 'PASS', 'listening': 'NOT RUN', 'training': 'NOT RUN',
        'source_sha256': original_hash, 'source_audio_uploaded': False, 'reference_backing_sampled': False,
        'maker_voice_intentionally_used': False, 'source_boundary_review': 'NOT RUN',
        'source_synthesis': 'Magnitude spectrum from the permitted input colours an original harmonic bass carrier; not a trained voice model.',
        'seconds': len(mixed)/RATE, 'peak': float(np.max(np.abs(mixed))),
        'artifacts': {p.name: digest(p) for p in output.glob('*.wav')},
        'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'limitations': 'Authored bass-music hypothesis informed by reference tempo/category and owner feedback. No claim of reference-action reconstruction or musical acceptance.'})
    (output/'.partial').unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--user-input-consent', action='store_true')
    args = parser.parse_args()
    render(args.source, args.output, args.user_input_consent)
