#!/usr/bin/env python3
"""Bounded original club studies, using Jamloom's existing procedural palette."""
import argparse
from functools import lru_cache
import hashlib
import json
import math
import os
from pathlib import Path
import random
import shutil
import subprocess
import wave

import numpy as np
from scipy import signal
from prepare_electronic_bank import synth, RATE
from q0_audit import loudness, level_match

ROOT = Path(__file__).resolve().parents[1]
STYLES = {'house': (124, 36), 'tech-house': (128, 38), 'techno': (136, 33)}
CONDITIONS = ('baseline', 'sound', 'groove', 'phrasing', 'combined')
BUSES = ('kick', 'drums', 'bass', 'harmony')
RECORDED = ROOT/'renders/q0-palette-research-20261020'
RECORDED_MANIFEST_SHA = 'ade2d108034c20c61b64c655a84ddc21daa2532deb146efa09f39a210611b89e'
used_recordings = {}


def events(style, seed, condition):
    if style not in STYLES or condition not in (*CONDITIONS, 'recorded') or not 0 <= seed <= 2**31-1:
        raise ValueError('Invalid experiment specification')
    bpm, root = STYLES[style]
    expressive = condition in ('groove', 'combined', 'recorded')
    arranged = condition in ('phrasing', 'combined', 'recorded')
    sections = [(0, 4, 'intro'), (4, 6, 'build'), (6, 10, 'drop'),
                (10, 12, 'break'), (12, 14, 'return'), (14, 16, 'outro')]
    result = []
    # Seed selects an original motif, not a referenced song or a random timing perturbation.
    motif = ((0, 0, 7, 3), (0, 3, 0, 10), (0, 7, 10, 7))[seed % 3]
    def add(bus, beat, note, duration, velocity, tag):
        result.append(dict(bus=bus, beat=beat, note=note, duration_beats=duration, velocity=velocity, role=tag))
    for bar in range(16):
        section = next(name for start, end, name in sections if start <= bar < end) if arranged else 'loop'
        if section != 'break':
            for beat in range(4):
                if section == 'build' and bar == 5 and beat == 3: continue
                add('kick', bar*4+beat, 36, .65, .88 if beat == 0 else .83, 'pulse')
                if beat in (1, 3): add('drums', bar*4+beat, 38, .4, .56 if beat == 1 else .64, 'backbeat')
                if not (section == 'intro' and bar < 2):
                    add('drums', bar*4+beat+.5+(.035 if expressive else 0), 46, .35, .42, 'offbeat')
                for sixteenth in (1, 3):
                    if section == 'outro' or section == 'intro' and bar < 2: continue
                    delay = (.035 if sixteenth == 1 else .065) if expressive else 0
                    velocity = (.22 if sixteenth == 1 else .34) if expressive else .3
                    add('drums', bar*4+beat+sixteenth/4+delay, 42, .12, velocity, 'hat-answer')
        if section == 'build':
            for step in range(8 if bar == 4 else 16):
                count = 8 if bar == 4 else 16
                add('drums', bar*4+step*4/count, 38, .15, .18+.22*step/count, 'build-roll')
        if section not in ('intro', 'break', 'outro') or section == 'intro' and bar >= 2:
            pattern = (0, .75, 1.5, 2.5, 3.25) if style != 'techno' else (.5, 1.25, 1.75, 2.5, 3.25)
            if not arranged: pattern = (.5, 1.5, 2.5, 3.5)
            for i, offset in enumerate(pattern):
                pitch = root + (motif[(bar//2+i)%4] if arranged else 0)
                duration = .32 if i < len(pattern)-1 else .52
                add('bass', bar*4+offset+(.015 if expressive else 0), pitch, duration,
                    [.72, .53, .64, .7, .48][i] if expressive else .65, 'bass-answer')
        if style != 'techno' or bar % 2 == 0:
            offsets = (.75, 2.5) if style != 'house' else (.5, 2.75)
            if section in ('intro', 'outro'): offsets = (0,)
            if arranged and bar % 4 == 3: offsets = (.75,)
            for offset in offsets:
                for interval in (0, 3, 7):
                    add('harmony', bar*4+offset, root+24+interval, .65 if section != 'break' else 1.2,
                        .32 if expressive and offset < 1 else .38, 'chord-stab')
    return {'schema': 'jamloom-club-events-1', 'style': style, 'seed': seed, 'condition': condition,
            'bpm': bpm, 'key': 'minor tonic MIDI '+str(root), 'bars': 16, 'time_signature': [4, 4],
            'origin': 'synthetic_project_authored', 'expert_verified': False,
            'sections': [dict(start_bar=a, end_bar=b, label=c) for a,b,c in sections] if arranged else [dict(start_bar=0,end_bar=16,label='repeated-loop')],
            'automation': [{'beat': e['beat'], 'bus': 'bass', 'kind': 'duck', 'minimum_gain': .35, 'release_seconds': .22} for e in result if e['bus']=='kick'] if condition in ('sound','combined','recorded') else [],
            'events': sorted(result, key=lambda e: (e['beat'], e['bus'], e['note']))}


@lru_cache(maxsize=64)
def sample(bus, note, improved):
    instrument = 'drums' if bus in ('kick', 'drums') else 'bass' if bus == 'bass' else 'piano'
    base = np.asarray(synth(instrument, note, 0), dtype=np.float32)/32768
    if not improved: return base
    t = np.arange(len(base), dtype=np.float32)/RATE
    if bus == 'kick':
        # Shorter sub tail leaves room for the bass response; no sampled transient.
        base = np.tanh(base*1.6)/1.6 * np.exp(-t/1.1)
    elif bus == 'bass':
        sub = np.sin(2*np.pi*440*2**((note-69)/12)*t)*np.minimum(1, t/.004)*np.exp(-t/.5)
        base = .68*base+.23*sub
    elif bus == 'drums':
        base = signal.sosfilt(signal.butter(2, 180 if note == 38 else 3500, btype='highpass', fs=RATE, output='sos'),base).astype(np.float32)
    else:
        base = signal.sosfilt(signal.butter(2, 220, btype='highpass', fs=RATE, output='sos'),base).astype(np.float32)
    return base.astype(np.float32)


@lru_cache(maxsize=64)
def recorded_sample(note, velocity, take):
    manifest = RECORDED/'recorded-palette.json'
    if hashlib.sha256(manifest.read_bytes()).hexdigest() != RECORDED_MANIFEST_SHA:
        raise ValueError('Recorded palette provenance changed')
    rows = [r for r in json.loads(manifest.read_text())['samples']
            if r['repo']=='virtuosity_drums' and r['instrument']=='drums' and r['root']==note and r['take'] in (-1,take)]
    row = min(rows,key=lambda r:abs(r['velocity_max']-velocity))
    path=RECORDED/'samples'/(row['id']+Path(row['path']).suffix)
    if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:
        raise ValueError('Recorded sample hash changed')
    raw=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(path),'-t','1','-f','f32le','-ac','1','-ar',str(RATE),'-'],timeout=20)
    pcm=np.frombuffer(raw,'<f4').copy()
    if not len(pcm) or not np.isfinite(pcm).all(): raise ValueError('Invalid recorded sample')
    # Preserve recorded timbre/velocity layers; control playback level consistently with the synthetic branch.
    pcm *= .88/max(float(np.max(np.abs(pcm))),1e-6)
    used_recordings[row['id']]={k:row[k] for k in ('repo','commit','path','url','sha256')}
    return pcm


def render(plan):
    beat_seconds = 60/plan['bpm']
    count = round(64*beat_seconds*RATE)
    buses = {name: np.zeros(count, dtype=np.float32) for name in BUSES}
    improved = plan['condition'] in ('sound', 'combined', 'recorded')
    for index,event in enumerate(plan['events']):
        bus = event['bus']; at = round(event['beat']*beat_seconds*RATE)
        length = min(round(event['duration_beats']*beat_seconds*RATE),count-at)
        source = recorded_sample(event['note'],round(event['velocity']*127),index%2) if plan['condition']=='recorded' and bus in ('kick','drums') else sample(bus,event['note'],improved)
        data = source[:length].copy()
        fade = min(len(data)//2, round(.012*RATE))
        data[:fade] *= np.linspace(0,1,fade)
        data[-fade:] *= np.linspace(1,0,fade)
        buses[bus][at:at+len(data)] += data*event['velocity']
    gains = dict(kick=.48, drums=.23, bass=.3, harmony=.1)
    if improved:
        duck = np.ones(count,dtype=np.float32)
        for event in plan['events']:
            if event['bus'] != 'kick': continue
            start = round(event['beat']*beat_seconds*RATE); length = min(round(.22*RATE),count-start)
            duck[start:start+length] = np.minimum(duck[start:start+length],.35+.65*np.linspace(0,1,length))
        buses['bass'] *= duck
    for name in BUSES: buses[name] *= gains[name]
    fade = round(.03*RATE)
    for x in buses.values(): x[:fade] *= np.linspace(0,1,fade); x[-fade:] *= np.linspace(1,0,fade)
    mix = sum(buses.values())
    if not np.isfinite(mix).all(): raise ValueError('Nonfinite render')
    peak = float(np.max(np.abs(mix))); gain = min(1,.85/max(peak,1e-9))
    return {name:x*gain for name,x in buses.items()}


def write(path, samples):
    if path.exists(): raise ValueError('Preserve existing audio')
    if not np.isfinite(samples).all() or np.max(np.abs(samples)) >= 1: raise ValueError('Unsafe PCM')
    with wave.open(str(path),'wb') as output:
        output.setparams((1,2,RATE,0,'NONE','not compressed'))
        output.writeframes(np.rint(samples*32767).astype('<i2').tobytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--seed',type=int,default=51024)
    parser.add_argument('--recorded-comparison',action='store_true',help='Compare identical combined arrangements with CC0 recorded drums')
    args = parser.parse_args()
    if args.output.exists(): raise ValueError('Use a fresh output directory')
    if shutil.disk_usage(args.output.parent).free < 2*1024**3: raise ValueError('Keep at least 2 GB free')
    palette=json.loads((ROOT/'assets/manifests/electronic-v2.json').read_text())
    if palette['reference_audio_used'] or palette['third_party_sound_assets'] or palette['generator_sha256'] != hashlib.sha256((ROOT/'scripts/prepare_electronic_bank.py').read_bytes()).hexdigest():
        raise ValueError('Approved original palette provenance changed')
    args.output.mkdir(); records=[]
    for style in STYLES:
        for condition in (('combined','recorded') if args.recorded_comparison else CONDITIONS):
            plan=events(style,args.seed,condition); buses=render(plan); folder=args.output/(style+'-'+condition);folder.mkdir()
            (folder/'events.json').write_text(json.dumps(plan,indent=2)+'\n')
            write(folder/'raw.wav',sum(buses.values()))
            records.append(dict(style=style,condition=condition,folder=folder,levels=loudness(folder/'raw.wav')))
    target=min(-20,min(float(r['levels']['input_i'])-max(0,float(r['levels']['input_tp'])+2.5) for r in records))
    for index, record in enumerate(records):
        folder=record.pop('folder');gain_db, measured = level_match(folder/'raw.wav',folder/'mix.wav',target,record['levels'])
        buses=render(events(record['style'],args.seed,record['condition']))
        for name,x in buses.items(): write(folder/(name+'.wav'),x*10**(gain_db/20))
        # Raw mixes are intermediate outputs created by this run; preserve only matched comparisons.
        (folder/'raw.wav').unlink()
        record.update(path=str(folder),matched=measured,gain_db=gain_db,
                      hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.iterdir())})
    manifest=dict(schema='jamloom-club-studies-1',seed=args.seed,reference_audio_used=False,
                  rights='Original project equations/events; optional pinned CC0 Virtuosity drum samples; no voices or model adapters',
                  recorded_samples=used_recordings,
                  sample_credit='Virtuosity Drums: Versilian Studios and Karoryfer Samples; performed by Austin McMahon; CC0-1.0' if used_recordings else None,
                  expert_demonstrations=False,quality='NOT RUN: blind human listening required',
                  limitations=['Short 16-bar studies, not full professional tracks','Mono sound comparison; realism requires listening',
                               'A is the existing electronic palette on a straight repeated pattern, not the full hosted generator'],
                  target_lufs=target,records=records,
                  generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  palette_sha256=hashlib.sha256((ROOT/'scripts/prepare_electronic_bank.py').read_bytes()).hexdigest())
    (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    order=list(range(len(records)));random.Random(args.seed+77).shuffle(order)
    mapping={};html=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Jamloom club studies</title><main><h1>Jamloom club studies</h1><p>Equal-loudness experimental sketches. Press Play to listen. Rate groove, sound, phrasing and enjoyment from 1–5; these are not qualified professional tracks.</p>']
    for code,index in enumerate(order,1):
        record=records[index];name=f'listen-{code:02}.wav'
        os.link(Path(record['path'])/'mix.wav',args.output/name)
        mapping[name]={'style':record['style'],'condition':record['condition']}
        html.append(f'<section><h2>Clip {code:02} · {record["style"]}</h2><audio controls preload="none" src="{name}"></audio></section>')
    html.append('</main></html>')
    (args.output/'index.html').write_text('\n'.join(html))
    (args.output/'blind-key.json').write_text(json.dumps(mapping,indent=2)+'\n')
    (args.output/'ratings.csv').write_text('clip,groove,sound,phrasing,enjoyment,repeat_preference,notes\n'+''.join(f'listen-{i:02}.wav,,,,,,\n' for i in range(1,len(records)+1)))
    print(json.dumps({'status':'PASS','renders':len(records),'output':str(args.output),'target_lufs':target}))


if __name__ == '__main__': main()
