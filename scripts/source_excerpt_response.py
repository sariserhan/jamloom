"""Choose a bounded rhythmic source hook; complete-input replay is optional."""
import numpy as np

from arrange_voice_research import RATE
from source_phrase_response import features
from source_strategy_response import compose as arrange, STRATEGIES

TEMPOS={'half_time':158,'broken_pulse':128,'offbeat_dub':112}


def select_excerpt(pcm,bpm):
    signal=features(pcm)
    if not np.isfinite(bpm) or not 60<=bpm<=180:raise ValueError('Unsupported tempo')
    beat=60/bpm;maximum=round(2*beat*RATE);minimum=RATE//2
    # A short sound can already fit. Do not cut just to make every input shorter.
    if len(pcm)<=maximum:
        return dict(start_frame=0,end_frame=len(pcm),full_input_used=True,bpm=bpm,
                    slot_beats=2,reason='The complete short input already fits the two-beat call',
                    word_boundaries_verified=False,candidates=1)
    hop=RATE//100;mono=pcm.mean(axis=1)
    padded=np.pad(mono,(0,(-len(mono))%hop))
    envelope=np.sqrt(np.mean(padded.reshape(-1,hop)**2,axis=1))
    peak=max(float(envelope.max()),1e-9);prefix=np.r_[0,np.cumsum(mono**2)]

    def boundary(frame):
        center=round(frame/hop);low=max(0,center-5);high=min(len(envelope)-1,center+5)
        index=min(range(low,high+1),key=lambda i:(envelope[i],abs(i-center)))
        return min(len(pcm),index*hop)

    starts={0,max(0,len(pcm)-maximum)}
    for region in signal['regions']:
        for lead in (.06,.12,.24):starts.add(boundary(max(0,region['stress_frame']-round(lead*RATE))))
    lengths={minimum,*[round(beats*beat*RATE) for beats in (1,1.5,2) if beats*beat>=.5]}
    candidates={}
    for start in sorted(starts):
        for length in sorted(lengths):
            end=min(len(pcm),start+maximum,boundary(min(len(pcm),start+length)))
            if end-start<minimum:continue
            rms=np.sqrt((prefix[end]-prefix[start])/(end-start))
            if rms<.001 or rms/peak<.1:continue
            stresses=[r for r in signal['regions'] if start<=r['stress_frame']<end]
            if not stresses:continue
            phase=[(r['stress_frame']-start)/(RATE*beat)*4 for r in stresses]
            grid_error=float(np.mean([abs(x-round(x)) for x in phase]))
            edge=float((envelope[min(start//hop,len(envelope)-1)]+envelope[min((end-1)//hop,len(envelope)-1)])/(2*peak))
            strength=sum(r['strength'] for r in stresses)/len(stresses)
            score=.7*strength+.3*float(rms/peak)-.8*edge-.35*grid_error
            candidates[(start,end)]=dict(score=score,boundary_energy_ratio=edge,quarter_beat_error=grid_error)
    if not candidates:raise ValueError('No audible bounded hook fits this arrangement')
    start,end=max(candidates,key=lambda bounds:(candidates[bounds]['score'],-bounds[0]))
    return dict(start_frame=start,end_frame=end,full_input_used=False,bpm=bpm,slot_beats=2,
                reason='Salient source region with quiet edges and a compact rhythmic fit; not a verified word boundary',
                word_boundaries_verified=False,candidates=len(candidates),**candidates[(start,end)])


def compose(pcm,seed=4123,strategy='half_time'):
    if strategy not in STRATEGIES:raise ValueError('Unknown strategy')
    selected=select_excerpt(pcm,TEMPOS[strategy]);start,end=selected['start_frame'],selected['end_frame']
    mix,stems,plan=arrange(pcm[start:end],seed,strategy)
    for event in plan['events']:
        if 'source_frames' in event:event['source_frames']=[x+start for x in event['source_frames']]
        if event['kind']=='clean_call':event['kind']='clean_selected_hook'
    signal=plan['source_features']
    for region in signal['regions']:
        for field in ('start_frame','end_frame','stress_frame'):region[field]+=start
    signal.update(source_frames=len(pcm),selected_frames=end-start,coordinate_system='original_input')
    plan.update(source_selection=selected,original_input_frames=len(pcm),
                source_policy='Use the part that fits the music; whole-input replay is optional',
                musical_fit='Signal-based candidate; owner listening required')
    return mix,stems,plan
