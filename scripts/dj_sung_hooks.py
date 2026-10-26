#!/usr/bin/env python3
"""Bounded musical-vocal experiment on Jamloom originals; listening required."""
import hashlib
import json
import math
from pathlib import Path
import random
import numpy as np
from dj_track_worker import request, load_ace
from dj_vocal import steady_grid
from singing_response import VOCAL_PROFILES, vocal_description


def caption(case):
    voice = VOCAL_PROFILES[case['vocal_profile']][0]
    singer = vocal_description(dict(voice=voice, vocal_profile=case['vocal_profile']))
    text = (f"Vocal house; {round(case['cue']['bpm'])} BPM. Natural expressive {voice} lead singing in English. "
            f"{singer}. Sing '{case['phrase']}' once as a short melodic hook within four beats. "
            "Connected syllables, natural breath, a rising melody and resolved ending. "
            "Match the existing harmony and groove; keep drums and bass. No speech narration, robotic effects or long verse.")
    if len(text) > 511: raise ValueError('Singer caption exceeds Music DNA encoder budget')
    return text


def validate_case(case, value, samples, rate):
    if request(value) != case['request'] or value['style'] != 'house': raise ValueError('Prepared sung request changed')
    if case['phrase'] not in ('Feel alive', 'We rise') or case['vocal_profile'] not in ('female-mezzo','male-tenor'):
        raise ValueError('Prepared original lyric or singer changed')
    if rate != 48000 or samples.shape != (2880000,2) or not np.isfinite(samples).all() or not .001 < np.max(np.abs(samples)) < .95:
        raise ValueError('Invalid source original')
    cue=case['cue']
    if set(cue) != {'start','seconds','bpm'} or not all(type(v) in (int,float) and math.isfinite(v) for v in cue.values()):
        raise ValueError('Invalid sung window')
    if not (12<=cue['start']<=44 and 120<=cue['bpm']<=160 and 0<cue['seconds']<=2 and abs(cue['seconds']-240/cue['bpm'])<.001):
        raise ValueError('Four supported beats required')
    grid=steady_grid(samples,rate,round(cue['bpm']))
    if not grid: raise ValueError('No supported source grid')
    bpm,offset,regions=grid
    phase=(cue['start']-offset)*bpm/60
    if abs(bpm-cue['bpm'])>.15 or abs(phase-round(phase))*60/bpm>.025 or not any(a-.001<=cue['start'] and cue['start']+cue['seconds']<=b+.001 for a,b in regions):
        raise ValueError('Sung window is outside supported beats')


def splice(original, candidate, rate, cue):
    if candidate.shape != original.shape or not np.isfinite(candidate).all() or np.max(np.abs(candidate))>=1:
        raise ValueError('Invalid repainted audio')
    start=round(cue['start']*rate);end=start+round(cue['seconds']*rate)
    if not 0<=start<end<=len(original): raise ValueError('Invalid repaint bounds')
    weight=np.ones((end-start,1),dtype=np.float32);fade=round(.03*rate)
    if len(weight)<2*fade: raise ValueError('Sung window too short')
    weight[:fade,0]=np.linspace(0,1,fade);weight[-fade:,0]=np.linspace(1,0,fade)
    output=original.copy()
    output[start:end]=original[start:end]*(1-weight)+candidate[start:end]*weight
    # A changed waveform can be a dropout; reject lost accompaniment, not just clipping.
    frame=max(1,round(.1*rate));step=max(1,round(.05*rate));quiet=0
    for position in range(start,end-frame+1,step):
        before=float(np.sqrt(np.mean(original[position:position+frame]**2)))
        after=float(np.sqrt(np.mean(output[position:position+frame]**2)))
        quiet=quiet+1 if before>=.01 and after<before*.25 else 0
        if quiet>=3: raise ValueError('Repaint drops accompaniment for at least 200 ms')
    if np.sqrt(np.mean((output[start:end]-original[start:end])**2))<.001:
        raise ValueError('Repaint produced no meaningful change; vocal presence unverified')
    if np.max(np.abs(output))>=.95: raise ValueError('Repaint exceeds source headroom')
    return output


def sung_study(value, directory, engine=None, hook=None, fixture_file=None):
    if hook is not None: raise ValueError('No separate speech or isolated-vocal call in this study')
    import soundfile as sf
    import torch
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    fixture_file=fixture_file or Path(__file__).with_name('sung-fixtures.json')
    fixture=json.loads(fixture_file.read_text())
    case=next(c for c in fixture['cases'] if c['request']==value)
    if case['source_file'] not in ('sung-house-1.wav','sung-house-7.wav'): raise ValueError('Unapproved source filename')
    source=fixture_file.parent/case['source_file']
    if hashlib.sha256(source.read_bytes()).hexdigest()!=case['source_sha256']: raise ValueError('Source original changed')
    samples,rate=sf.read(source,always_2d=True,dtype='float32')
    validate_case(case,value,samples,rate)
    random.seed(value['seed']);np.random.seed(value['seed']);torch.manual_seed(value['seed']);torch.cuda.manual_seed_all(value['seed'])
    dit,lm=engine if engine is not None else load_ace()
    cue=case['cue'];description=caption(case)
    params=GenerationParams(task_type='repaint',src_audio=str(source),caption=description,
        lyrics='[Chorus]\n'+case['phrase']+'\n[Instrumental]',instrumental=False,vocal_language='en',
        bpm=round(cue['bpm']),duration=60,seed=value['seed'],inference_steps=8,
        repainting_start=cue['start'],repainting_end=cue['start']+cue['seconds'],chunk_mask_mode='explicit',
        repaint_latent_crossfade_frames=1,repaint_wav_crossfade_sec=.03,enable_normalization=False,
        thinking=False,use_cot_metas=False,use_cot_caption=False,use_cot_language=False,use_cot_lyrics=False)
    result=generate_music(dit,lm,params,GenerationConfig(batch_size=1,audio_format='wav',use_random_seed=False,seeds=[value['seed']]),save_dir=str(directory/'raw'))
    if not result.success or len(result.audios)!=1: raise RuntimeError('Sung repaint failed')
    candidate,candidate_rate=sf.read(result.audios[0]['path'],always_2d=True,dtype='float32')
    if candidate_rate!=rate: raise ValueError('Repaint sample rate changed')
    # Retain the entire raw candidate so listening can reject truncated words or spill beyond the window.
    retained=fixture_file.parent/'sung-candidates';retained.mkdir(exist_ok=True)
    raw=retained/f"raw-{value['sequence']}.wav"
    if raw.exists(): raise FileExistsError('Preserve previous sung candidate')
    raw.write_bytes(Path(result.audios[0]['path']).read_bytes())
    output=splice(samples,candidate,rate,cue)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=case['source_sha256']: raise ValueError('Source changed during repaint')
    (directory/'musical-hook.json').write_text(json.dumps(dict(status='CANDIDATE: voice and complete words require listening',
        source_sha256=case['source_sha256'],raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
        cue=cue,phrase=case['phrase'],vocal_profile=case['vocal_profile'],caption=description,
        task_type='repaint',text_to_speech=False,reference_audio_used=False,unchanged_outside_window_before_finalization=True))+'\n')
    return output,rate
