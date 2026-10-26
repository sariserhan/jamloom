#!/usr/bin/env python3
"""Original note/stem guides for a bounded house/bass generation experiment."""
import argparse
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import wave
import numpy as np
from scipy.signal import butter, sosfilt
from prepare_electronic_bank import synth, RATE

BUSES=('kick','drums','bass','chords','hook')


def score(value):
    from dj_track_worker import request
    request(value)
    if value['style'] not in ('house','bass'):raise ValueError('Composition study supports house and bass only')
    bpm=value.get('beat',{}).get('bpm',128 if value['style']=='house' else 140)
    if not 120<=bpm<=150:raise ValueError('Composition study supports 120–150 BPM')
    rng=np.random.default_rng(value['seed']);root=int(rng.choice([36,38,40,43]))
    scale=np.array([0,2 if value.get('mood')=='bright' else 3,5,7,10,12])
    motif=[0,*map(int,rng.choice(scale[1:5],size=3,replace=False)),7,3,0]
    if value.get('mood')=='bright':motif=[2 if n==3 else n for n in motif]
    # Seed changes the composition; phrase repeats retain identity rather than randomizing every bar.
    rhythm=([0,.75,1.5,2.5,3.25,4.5,6] if rng.integers(2)==0 else [0,.5,1.75,3,4,5.5,6.75])
    sections=[(0,8,'establish'),(8,16,'answer'),(16,20,'contrast'),(20,24,'build'),(24,28,'return'),(28,bpm/4,'handoff')]
    events=[];strength=.7+.06*value['energy']
    def add(bus,beat,note,duration,velocity,pan=0):
        if beat>=bpm:return
        events.append(dict(bus=bus,beat=round(beat,4),note=int(note),duration=round(min(duration,bpm-beat),4),velocity=round(velocity*strength,4),pan=pan))
    groove=value.get('beat',{}).get('groove','rolling' if value['style']=='house' else 'syncopated')
    for bar in range(int(np.ceil(bpm/4))):
        section=next(name for a,b,name in sections if a<=bar<b)
        base=bar*4;low=value['energy']<=2
        kicks=(0,1,2,3) if value['style']=='house' else (0,1.5,3.25) if groove=='syncopated' else (0,3) if groove=='steady' else (0,.75,3.5)
        if section=='contrast':kicks=(0,2) if value['style']=='house' else (0,)
        for b in kicks:add('kick',base+b,36,.7,.85)
        for b in ((1,3) if value['style']=='house' else (2,)):add('drums',base+b,38,.4,.55)
        for i in range(8):
            delay=.035 if groove=='rolling' and i%2 else 0
            add('drums',base+i*.5+delay,42,.12,.20 if i%2==0 else .29,(-.25 if i%2 else .25))
        if not low and section not in ('contrast','handoff'):
            for b in (1.5,3.5):add('drums',base+b,46,.25,.22,.3)
        degree=(0,8,5,7)[bar//4%4]
        if section not in ('contrast','build'):
            offsets=(.5,1.5,2.5,3.5) if value['style']=='house' and groove=='steady' else (0,.75,1.5,2.75,3.5)
            for i,b in enumerate(offsets):
                if low and i%2:continue
                add('bass',base+b,root+degree+(7 if i==3 and bar%4==3 else 0),.35 if i%2 else .6,.58 if i%2 else .73)
        else:add('bass',base+.5,root+degree,1.1,.35)
        if section!='handoff' or bar%2==0:
            intervals=(0,4,7) if degree==8 else (0,3,7)
            for b in ((.5,2.5) if section!='contrast' else (0,)):
                for n in intervals:add('chords',base+b,root+24+degree+n,1.3 if section=='contrast' else .45,.12,-.35)
        if section=='build' and not low and bar>=22:
            count=4 if bar==22 else 8
            for i in range(count):add('drums',base+i*4/count,38,.12,.10+.17*i/count)
        if bar%2==0 and section!='handoff':
            notes=motif if section not in ('answer','return') else motif[:3]+[motif[4],motif[3],5,0]
            if section=='contrast':notes=notes[:3]
            for i,(b,n) in enumerate(zip(rhythm,notes)):
                if section=='build' and i>3:continue
                add('hook',base+b,root+36+n,.35 if i<len(notes)-1 else .7,.30 if section!='contrast' else .20,.35)
    return dict(version=1,request=value,bpm=bpm,seconds=60,root_midi=root,motif=motif,rhythm=rhythm,
        sections=[dict(start_bar=a,end_bar=b,name=n)for a,b,n in sections],events=sorted(events,key=lambda e:(e['beat'],e['bus'],e['note'])),
        origin='original_authored_notes_and_synthesis',reference_audio_used=False,quality='NOT RUN')


@lru_cache(maxsize=4)
def drum(note):return np.asarray(synth('drums',note,0),dtype=np.float32)/32768


def tone(bus,note,length,bpm,style):
    t=np.arange(length,dtype=np.float32)/RATE;f=440*2**((note-69)/12);phase=2*np.pi*f*t
    if bus=='bass':
        cutoff=180+850*(.5+.5*np.sin(2*np.pi*bpm/60*t))**2 if style=='bass' else 550*np.exp(-t*7)+180
        upper=sum(np.sin(phase*k+.12*k)/(k*(1+(k*f/cutoff)**4))for k in range(2,13))
        sound=.7*np.sin(phase)+.23*np.tanh(upper*2)
        envelope=np.exp(-t*2.5)
    else:
        sound=sum(np.sin(phase*k+.015*k*k)/(k**1.6)for k in range(1,9)if k*f<RATE*.4)
        envelope=np.exp(-t*(8 if bus=='hook' else 6))
    fade=min(length//2,int(.008*RATE));envelope*=np.minimum(1,t/.005)
    if fade:envelope[-fade:]*=np.linspace(1,0,fade)
    return (sound*envelope).astype(np.float32)


def render(plan):
    count=60*RATE;beat=60/plan['bpm'];buses={bus:np.zeros((count,2),dtype=np.float32)for bus in BUSES}
    for e in plan['events']:
        start=round(e['beat']*beat*RATE);length=min(round(e['duration']*beat*RATE),count-start)
        if length<=0:continue
        if e['bus'] in ('kick','drums'):
            data=drum(e['note'])[:length].copy();fade=min(len(data)//2,int(.008*RATE))
            if fade:data[-fade:]*=np.linspace(1,0,fade)
        else:data=tone(e['bus'],e['note'],length,plan['bpm'],plan['request']['style'])
        pan=np.array([np.sqrt((1-e['pan'])/2),np.sqrt((1+e['pan'])/2)])
        buses[e['bus']][start:start+len(data)]+=data[:,None]*pan*e['velocity']
    duck=np.ones(count,dtype=np.float32)
    for e in plan['events']:
        if e['bus']!='kick':continue
        start=round(e['beat']*beat*RATE);length=min(int(.16*RATE),count-start)
        duck[start:start+length]=np.minimum(duck[start:start+length],.4+.6*np.linspace(0,1,length))
    buses['bass']*=duck[:,None]
    for bus in ('chords','hook'):
        dry=sosfilt(butter(2,250,btype='highpass',fs=RATE,output='sos'),buses[bus],axis=0).astype(np.float32)
        delay=round(beat*.75*RATE);buses[bus]=dry.copy();buses[bus][delay:]+=.18*dry[:-delay,::-1]
    gains=dict(kick=.5,drums=.3,bass=.3,chords=.22,hook=.32)
    for bus in BUSES:buses[bus]*=gains[bus]
    mix=sum(buses.values());gain=min(1,.85/max(1e-9,float(np.max(np.abs(mix)))))
    edge=int(.01*RATE)
    for pcm in buses.values():
        pcm*=gain;pcm[:edge]*=np.linspace(0,1,edge)[:,None];pcm[-edge:]*=np.linspace(1,0,edge)[:,None]
    if any(not np.isfinite(pcm).all()for pcm in buses.values()):raise ValueError('Invalid rendered audio')
    return buses


def write(path,pcm):
    if path.exists() or pcm.shape!=(60*RATE,2) or not np.isfinite(pcm).all() or np.max(np.abs(pcm))>=1:raise ValueError('Invalid/overwriting guide')
    with wave.open(str(path),'wb')as w:w.setparams((2,2,RATE,0,'NONE','not compressed'));w.writeframes(np.rint(pcm*32767).astype('<i2').tobytes())


def prepare(value,directory,stems=False):
    directory.mkdir();plan=score(value);buses=render(plan);write(directory/'guide.wav',sum(buses.values()))
    (directory/'score.json').write_text(json.dumps(plan,indent=2)+'\n')
    if stems:
        for bus,pcm in buses.items():write(directory/(bus+'.wav'),pcm)
    receipt=dict(request=value,bpm=plan['bpm'],seconds=60,origin=plan['origin'],reference_audio_used=False,
        guide_sha256=hashlib.sha256((directory/'guide.wav').read_bytes()).hexdigest(),score_sha256=hashlib.sha256((directory/'score.json').read_bytes()).hexdigest())
    (directory/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');return receipt


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--request',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    print(json.dumps(prepare(json.loads(a.request.read_text()),a.output,stems=True)))
