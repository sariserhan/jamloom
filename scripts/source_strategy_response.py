"""Three original source-responsive arrangements; no training or external audio."""
import numpy as np
from scipy.signal import butter, sosfilt

from arrange_voice_research import RATE
from source_bass_response import compose as accepted_compose, percussion, source_spectrum
from source_phrase_response import features
from source_led_response import faded

STRATEGIES = ('half_time', 'broken_pulse', 'offbeat_dub')


def compose(pcm, seed=4123, strategy='half_time'):
    if strategy not in STRATEGIES:
        raise ValueError('Unknown strategy')
    if strategy == 'half_time':
        mix, stems, plan = accepted_compose(pcm, seed)
        return mix, stems, dict(plan, strategy=strategy, seed=seed)
    signal = features(pcm)
    colour = source_spectrum(pcm)
    broken = strategy == 'broken_pulse'
    bpm, bars = (128, 16) if broken else (112, 14)
    beat = 60/bpm
    calls = (0, 28, 52 if broken else 48)
    ranges = [(round(at*beat*RATE), round(at*beat*RATE)+len(pcm)) for at in calls]
    frames = max(round((bars*4*beat+1)*RATE), ranges[-1][1]+RATE)
    stems = {name: np.zeros((frames, 2)) for name in ('drums', 'sub', 'bass', 'voice', 'air')}
    events = []
    drums = percussion(seed)
    root = signal['tonic']-24
    rng = np.random.default_rng(seed)
    voice_gain = min(.38/max(np.max(np.abs(pcm)), 1e-9), .13/max(np.sqrt(np.mean(pcm**2)), 1e-9))

    def put(stem, at, audio, gain, kind, **extra):
        start = round(at*beat*RATE)
        if start < 0 or start+len(audio) > frames:
            raise ValueError('Event outside arrangement')
        if stem == 'voice' and kind != 'clean_call' and any(start < b and start+len(audio) > a for a,b in ranges):
            return
        stems[stem][start:start+len(audio)] += audio*gain
        events.append(dict(stem=stem, beat=at, start_frame=start, frames=len(audio), gain=gain, kind=kind, **extra))

    def tone(midi, seconds, pluck=True):
        t = np.arange(round(seconds*RATE))/RATE
        hz = 440*2**((midi-69)/12)
        harmonics = np.arange(1, 17)
        weights = np.interp(harmonics*hz*2, *colour)+.04/harmonics
        y = sum(w*np.sin(2*np.pi*hz*h*t) for h,w in zip(harmonics,weights))/max(sum(weights),1e-9)
        y = sosfilt(butter(2, 2400 if broken else 1000, fs=RATE, output='sos'), y)
        y *= np.exp(-t*(9 if pluck else 3))
        y /= max(np.max(np.abs(y)), 1e-9)
        return faded(np.repeat(y[:,None], 2, axis=1), .008)

    for at in calls:
        put('voice', at, faded(pcm,.01), voice_gain, 'clean_call', source_frames=[0,len(pcm)], rate=1)
    stresses = [r['stress_frame']/RATE/beat for r in signal['regions']]
    motif = sorted(set(round(x*min(1,2.5/max(stresses[-1],.01))*4)/4 for x in stresses))
    for bar in range(bars):
        at = bar*4
        # Intact solo opening, a breathing break, then a different second phrase.
        if bar < 2 or bar in (7, bars-1):
            continue
        second = bar >= 8
        kicks = (0,.75,2.5) if broken else (0,2)
        for off in kicks:
            put('drums',at+off,drums['kick'],.42 if off==0 else .29,'broken_kick' if broken else 'dub_kick')
        for off in (1,3):
            put('drums',at+off,drums['snare'],.28 if broken else .20,'backbeat')
        for h in range(8):
            swing = .06 if not broken and h%2 else 0
            put('drums',at+h/2+swing,drums['hat'],(.045 if h%2 else .025)*(1+rng.uniform(-.12,.12)),'hat')
        offsets = motif if broken else sorted(set((round(x*2)/2+.5)%4 for x in motif))
        if second:
            offsets = sorted(set((x+(.5 if broken else 1))%3.5 for x in offsets))
        for i,off in enumerate(offsets):
            degree = (0,7,3,10)[(i+(bar%2 if second else 0))%4]
            note = root+degree
            duration = (.27 if broken else .52)*beat
            put('bass',at+off,tone(note+12,duration),.22,'plucked_response' if broken else 'rounded_response',midi=note+12)
            t = np.arange(round(duration*RATE))/RATE
            sub = faded(np.repeat(np.sin(2*np.pi*440*2**((note-69)/12)*t)[:,None],2,axis=1),.012)
            put('sub',at+off,sub,.19,'sub',midi=note)
        # Offbeat chord stabs and sparse delayed calls distinguish dub from the broken beat.
        if not broken:
            for off in (1.5,3.5):
                chord = sum(tone(root+24+d,.24*beat,False) for d in (0,3,7))/3
                put('air',at+off,chord,.095,'offbeat_chord',midi=[root+24+d for d in (0,3,7)])
        if bar in (3,5,9,11):
            region = signal['regions'][(bar+seed)%len(signal['regions'])]
            fragment = faded(pcm[region['start_frame']:region['end_frame']],.015)
            positions = (2.75,3.25) if broken else (2.5,3.25,4)
            for n,off in enumerate(positions):
                put('voice',at+off,fragment,voice_gain*.60*(.5**n),'rhythmic_fragment' if broken else 'dub_echo',source_frames=[region['start_frame'],region['end_frame']],rate=1)
    mixed = sum(stems.values())
    master_gain = min(1,.85/max(float(np.max(np.abs(mixed))),1e-9))
    for name in stems:
        stems[name] *= master_gain
    mixed *= master_gain
    return mixed,stems,dict(strategy=strategy,seed=seed,bpm=bpm,bars=bars,source_features=signal,
        bass_motif_beats=motif,master_gain=master_gain,events=events,
        sections=[dict(name=name,start_seconds=a*4*beat,end_seconds=b*4*beat) for name,a,b in
                  [('call',0,2),('first_response',2,7),('break_and_call',7,8),('changed_response',8,bars-1),('ending',bars-1,bars)]],
        palette=['original percussion','sub bass','source-coloured plucked bass' if broken else 'source-coloured rounded bass','intact source and fragments','offbeat original chord stabs' if not broken else 'rests'])
