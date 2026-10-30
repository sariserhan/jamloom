"""Local recorded-instrument audition, with phrase-length calls and composed development.

Uses only hash-pinned, already-cached CC0 single notes. Not a trained model or a
replacement for the frozen study. Musical quality still requires owner listening.
"""
import json
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
from arrange_voice_research import RATE, digest
from source_led_response import faded
from source_phrase_response import features
from source_natural_phrase import select_phrase

ROOT = Path(__file__).resolve().parents[1]


class RecordedBank:
    def __init__(self, root=ROOT):
        self.entries, self.cache, self.used = [], {}, {}
        for manifest, folder in [('acoustic-v1', 'acoustic-source'), ('guitar-v1', 'guitar-source')]:
            data = json.loads((root/'assets/manifests'/f'{manifest}.json').read_text())
            if data['license'] != 'CC0-1.0':
                raise ValueError('Expected reviewed CC0 samples')
            for entry in data['samples']:
                if entry['instrument'] in ('bass', 'drums', 'guitar'):
                    self.entries.append(dict(entry, path=root/'renders'/folder/(entry['id']+'.wav')))

    def note(self, instrument, midi, seconds, take=0, muted=False, velocity=90):
        bank = [e for e in self.entries if e['instrument'] == instrument
                and (instrument != 'guitar' or e.get('muted', False) == muted)]
        root = min({e['root_midi'] for e in bank}, key=lambda n: abs(n-midi))
        if instrument == 'drums' and root != midi:
            raise ValueError('No recorded drum at this key')
        bank = [e for e in bank if e['root_midi'] == root]
        layer = min({e.get('velocity_max', 127) for e in bank}, key=lambda n: (n < velocity, abs(n-velocity)))
        bank = sorted([e for e in bank if e.get('velocity_max', 127) == layer], key=lambda e: e.get('take', 0))
        entry = bank[take % len(bank)]
        ident = entry['id']
        if ident not in self.cache:
            if digest(entry['path']) != entry['sha256']:
                raise ValueError('Sample hash changed: '+ident)
            rate, raw = wavfile.read(entry['path'])
            if raw.dtype.kind != 'i':
                raise ValueError('Expected integer PCM sample')
            audio = raw.astype(np.float64) / (2**(raw.dtype.itemsize*8-1))
            if audio.ndim == 2:
                audio = audio.mean(axis=1)
            if not np.isfinite(audio).all() or np.max(np.abs(audio)) < 1e-6:
                raise ValueError('Invalid recorded sample')
            # Use the audited onset, retaining full-resolution sample tails.
            audio = audio[entry['prepared']['source_trim_start_frame']:]
            audio = resample_poly(audio, RATE, rate)
            audio /= max(np.max(np.abs(audio)), 1e-9)
            self.cache[ident] = audio
            self.used[ident] = dict(sha256=entry['sha256'], instrument=instrument, license='CC0-1.0')
        audio = self.cache[ident]
        ratio = 2**((midi-root)/12)
        frames = min(round(seconds*RATE), int(len(audio)/ratio))
        shifted = np.interp(np.arange(frames)*ratio, np.arange(len(audio)), audio)
        # Recorded attacks, finite note releases; no tiny repeated sine plucks.
        edge = min(round(.04*RATE), frames//3)
        shifted[-edge:] *= np.linspace(1, 0, edge)**2
        shifted[:min(48,frames)] *= np.linspace(0, 1, min(48,frames))
        return shifted, ident


def compose(pcm, seed=4123, bank=None):
    selection = select_phrase(pcm)
    a, b = selection['start_frame'], selection['end_frame']
    phrase = pcm[a:b]
    signal = features(phrase)
    bank = bank or RecordedBank()
    rng = np.random.default_rng(seed)
    bpm, bars = 96, 16
    beat = 60/bpm
    frames = round((bars*4*beat+2)*RATE)
    stems = {name: np.zeros((frames, 2)) for name in ('drums','bass','guitar','answer','voice','room')}
    events = []
    tonic = signal['tonic'] % 12 + 36
    # Minor ninth, major seventh and suspended dominant voicings develop over
    # four-bar phrases, with a contrasting middle and a resolved final cadence.
    progression = [(0,(3,7,10,14)), (0,(3,7,10,14)), (8,(4,7,11,14)), (7,(0,5,10,14)),
                   (0,(3,7,10,14)), (8,(4,7,11,14)), (5,(3,7,10,14)), (7,(4,7,10,13)),
                   (5,(3,7,10,14)), (10,(4,7,10,14)), (3,(4,7,11,14)), (7,(4,7,10,13)),
                   (0,(3,7,10,14)), (8,(4,7,11,14)), (7,(0,5,10,14)), (0,(3,7,10,14))]
    call_beats = (0, 24, 48)
    voice_gain = min(.48/max(np.max(np.abs(phrase)),1e-9), .16/max(np.sqrt(np.mean(phrase**2)),1e-9))
    for at in call_beats:
        start = round(at*beat*RATE)
        stems['voice'][start:start+len(phrase)] += faded(phrase,.005)*voice_gain
        events.append(dict(stem='voice',start_frame=start,frames=len(phrase),kind='natural_phrase',
                           source_frames=[a,b],rate=1,gain=voice_gain))
    ranges = [(round(at*beat*RATE),round(at*beat*RATE)+len(phrase)) for at in call_beats]

    def put(stem, at, midi, duration, gain, pan=0, muted=False, take=0):
        instrument = 'guitar' if stem in ('guitar','answer') else stem
        # Shared rhythm is stable; tiny instrument-dependent timing/velocity
        # differences and recorded alternate takes provide articulation.
        timing = rng.uniform(-.006,.006) if stem!='bass' else 0
        start = max(0,round((at*beat+timing)*RATE))
        audio, ident = bank.note(instrument,midi,duration*beat,take,muted,round(gain*220))
        if start+len(audio)>frames:
            raise ValueError('Instrument extends past arrangement')
        stereo = audio[:,None]*np.array([np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4)])
        stems[stem][start:start+len(audio)] += stereo*gain*rng.uniform(.94,1.06)
        events.append(dict(stem=stem,start_frame=start,frames=len(audio),midi=midi,sample=ident))

    # Rhythm comes in under the opening, leaving the phrase intelligible and
    # avoiding an empty gap. The full band answers after the phrase, not over it.
    response = np.ceil(len(phrase)/(beat*RATE)*2)/2
    accents = sorted(set(round(r['stress_frame']/(RATE*beat)*4)/4 for r in signal['regions']))
    motif = [x for x in accents if x<2.5] or [0,.75,1.5]
    for bar,(degree,voicing) in enumerate(progression):
        at = bar*4
        root = tonic+degree
        while root>48:root-=12
        reduced = bar in (0,6,7,12,15)
        intensity = .65 if reduced else 1
        # A two-bar backbeat phrase with ghost notes and occasional turnarounds.
        kicks = (0,2.5) if bar%2==0 else (0,1.75,2.5)
        for off in kicks:
            put('drums',at+off,36,.7,.50*intensity,take=bar)
        for off in (1,3):
            put('drums',at+off+.018,38,.6,.29*intensity,take=bar)
        if not reduced:
            for off in (1.75,2.85):put('drums',at+off,38,.20,.055,take=bar+1)
        for h in range(8):
            off=h/2+(.055 if h%2 else 0)
            put('drums',at+off,46 if h==7 and bar%4==3 else 42,.24 if h<7 else .5,
                (.065 if h%2 else .10)*intensity,pan=.22,take=h+bar)
        if bar==0:continue
        bass_pattern = [(0,0,.85),(.75,0,.45),(1.5,7,.65),(2.5,0,.8),(3.5,-1,.4)]
        if bar%2: bass_pattern=[(0,0,1.4),(1.75,7,.5),(2.5,10,.45),(3.25,7,.65)]
        if reduced:bass_pattern=[(0,0,2.8),(3,7,.7)]
        for off,note,length in bass_pattern:
            target=root+note
            if note==-1:target=tonic+progression[(bar+1)%bars][0]-1
            while target>50:target-=12
            put('bass',at+off,target,length,.32*intensity,take=bar)
        # Voice-led, close guitar voicings; notes are strummed a few ms apart.
        chord=[root+12+n for n in voicing]
        chord=[n-12 if n>72 else n for n in chord]
        positions=(.5,2.75) if not reduced else (.5,)
        for off in positions:
            for i,n in enumerate(sorted(chord)):
                put('guitar',at+off+i*.018,n,1.5 if reduced else .65,.11*intensity,pan=-.35,muted=not reduced,take=bar+i)
        # A short answer takes the source's stress rhythm; it changes register
        # and resolution in the middle section instead of repeating every bar.
        if bar in (2,4,8,10,13,14):
            for i,off in enumerate(motif):
                start=round((at+off)*beat*RATE)
                if any(start<end+.10*RATE and start+RATE*.6>begin for begin,end in ranges):continue
                note=root+24+(3,7,10,7)[(i+(bar//4))%4]
                put('answer',at+off,note,.75 if i<len(motif)-1 else 1.6,.14,pan=.27,take=i+bar)
        if bar in (3,11,14):
            for i,off in enumerate((3.25,3.5,3.75)):
                put('drums',at+off,38,.20,.08+.035*i,pan=-.10+.10*i,take=i)
    # First reply enters within a half beat even for the short question input.
    for i,n in enumerate((tonic+15,tonic+19,tonic+22)):
        put('guitar',response+i*.018,n,1.5,.12,pan=-.30,take=i)
    # Soft room reflections glue recorded instruments together; retain the dry
    # vocal without chopped syllables, pitching, or delay crossing another call.
    dry=stems['guitar']+stems['answer']+stems['drums']*.20
    for seconds,gain in ((.029,.07),(.047,.06),(.083,.04),(.137,.025)):
        delay=round(seconds*RATE)
        stems['room'][delay:] += dry[:-delay,::-1]*gain
    # The band stays present under calls. Duck the occupied phrase, then recover
    # smoothly so there is no artificial silent response interval.
    envelope=np.ones(frames)
    for start,end in ranges:
        before=max(0,start-round(.04*RATE));after=min(frames,end+round(.15*RATE))
        envelope[before:start]=np.minimum(envelope[before:start],np.linspace(1,.50,start-before))
        envelope[start:end]=.50
        envelope[end:after]=np.minimum(envelope[end:after],np.linspace(.50,1,after-end))
    for name,audio in stems.items():
        if name!='voice':audio*=envelope[:,None]
        audio[-RATE:]*=np.linspace(1,0,RATE)[:,None]**2
        audio[-RATE//5:]=0
    mixed=sum(stems.values())
    gain=min(1,.88/max(np.max(np.abs(mixed)),1e-9))
    for audio in stems.values():audio*=gain
    return sum(stems.values()),stems,dict(policy='recorded_band_natural_phrase_v1',seed=seed,bpm=bpm,
        source_selection=selection,events=events,source_features=signal,master_gain=float(gain),
        response_beat=float(response),source_motif_beats=motif,progression=progression,
        sections=[dict(name=n,start_bar=a,bars=b) for n,a,b in
                  [('opening_call',0,2),('groove',2,4),('break_and_call',6,2),
                   ('harmonic_development',8,4),('return_and_cadence',12,4)]],
        samples=bank.used,piano=False,training=False,word_boundaries_verified=False,
        musical_acceptance='NOT RUN',limitation='Sustained quiet is a conservative acoustic boundary, not verified semantics; complete input is retained when no quiet boundary exists')
