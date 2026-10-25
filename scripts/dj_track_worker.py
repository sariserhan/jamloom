#!/usr/bin/env python3
"""One original 60-second source track. No provider rental, source audio or network setup."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import time
import wave

import numpy as np
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
CODE_REVISION = 'ca1e85fe9430179831e6bc6be790c332190a3866'
WEIGHTS_REVISION = '19671f406d603126926c1b7e2adc169acbcade22'
STYLE_MANIFEST = Path(__file__).with_name('dj-styles.json')
if not STYLE_MANIFEST.exists(): STYLE_MANIFEST = ROOT/'assets/manifests/dj-styles.json'
STYLES = json.loads(STYLE_MANIFEST.read_text())['styles']


def request(value):
    if not isinstance(value, dict) or set(value) - {'mood', 'beat'} != {'version', 'session', 'sequence', 'seed', 'style', 'energy'}:
        raise ValueError('Invalid track request fields')
    if type(value['version']) is not int or value['version'] != 1 or not isinstance(value['session'], str) or len(value['session']) != 32 or any(c not in '0123456789abcdef' for c in value['session']):
        raise ValueError('Invalid session')
    for key, low, high in [('sequence', 0, 1000000), ('seed', 0, 2**32-1), ('energy', 1, 5)]:
        if type(value[key]) is not int or not low <= value[key] <= high:
            raise ValueError('Invalid '+key)
    if not isinstance(value['style'], str) or value['style'] not in STYLES:
        raise ValueError('Invalid style')
    if 'mood' in value and value['mood'] not in ('warm', 'bright', 'deep'):
        raise ValueError('Invalid mood')
    if 'beat' in value:
        beat = value['beat']
        if not isinstance(beat, dict) or set(beat) != {'bpm', 'groove'} or type(beat['bpm']) is not int or not 70 <= beat['bpm'] <= 160 or beat['groove'] not in ('steady', 'syncopated', 'rolling'):
            raise ValueError('Invalid beat direction')
    return value


def brief(value):
    from club_benchmark_cases import REVISION_CASES, CASES
    profile = STYLES[value['style']]
    row = REVISION_CASES[2] if value['style'] == 'house' else next((r for r in CASES if r[0] == value['style']+'-phrased'), None)
    caption = row[1] if row else f"Original instrumental {profile['genre']}, {profile['bpm']} BPM. {profile['character']} No vocals."
    bpm = row[2] if row else profile['bpm']
    mood = {'warm': 'Warm rounded chords, soulful textures and mellow harmonic color.', 'bright': 'Bright uplifting chords, crisp melodic accents and optimistic color.', 'deep': 'Deep hypnotic bass, restrained minor-key harmony and spacious textures.'}.get(value.get('mood'), '')
    if mood and value['energy'] >= 3:
        mood += ' Start at full dancefloor energy immediately: kick, bass and offbeat hats together, no ambient intro or fade-in. Keep a steady kick and bass through the first and last eight bars for mixing; use short fills instead of long drumless breakdowns.'
    if not row: mood = mood.replace('steady kick and bass', 'clear drum groove and bass')
    beat = value.get('beat')
    if beat:
        groove = {'steady': 'Steady four-on-the-floor kick, locked offbeat hats and a consistent bass pulse.', 'syncopated': 'Syncopated bass and percussion, displaced rhythmic accents over a clear four-on-the-floor kick.', 'rolling': 'Rolling tom and shuffled percussion patterns, a driving repeated bass rhythm and a steady kick.'}[beat['groove']]
        if value['style'] in ('bass', 'hip-hop', 'chill'):
            groove = {'steady': 'Keep a consistent kick and snare pulse.', 'syncopated': 'Use syncopated bass answers and displaced percussion accents.', 'rolling': 'Use rolling bass patterns and gently shuffled percussion.'}[beat['groove']]
        mood += f" Keep the tempo at {beat['bpm']} BPM. {groove} Compose new original notes and melodies around this rhythmic direction."
    if beat:
        caption = f"Original instrumental {profile['genre']}, {beat['bpm']} BPM. {profile['character']} Clear drum transients and clean bass separation. No vocals."
    return caption + (' '+mood if mood else '') + f" Energy {value['energy']} of 5; {'restrained closing groove' if value['energy'] <= 2 else 'confident dancefloor momentum'}.", beat['bpm'] if beat else bpm


def procedural(value, directory):
    if value.get('beat') or value['style'] not in ('house', 'tech-house', 'techno'):
        raise ValueError('This direction requires the music model, not the procedural test fixture')
    from club_studies import events, render, RATE
    manifest = json.loads((ROOT/'assets/manifests/electronic-v2.json').read_text())
    if manifest['reference_audio_used'] or manifest['third_party_sound_assets'] or manifest['generator_sha256'] != hashlib.sha256((ROOT/'scripts/prepare_electronic_bank.py').read_bytes()).hexdigest():
        raise ValueError('Original palette provenance changed')
    # Engineering source only: short authored studies, not the qualified learned music backend.
    rng = np.random.default_rng(value['seed'])
    blocks, plans = [], []
    for _ in range(3):
        plan = events(value['style'], int(rng.integers(0, 2**31)), 'combined')
        for event in plan['events']:
            event['velocity'] *= float(rng.uniform(.88, 1))*(.8+.04*value['energy'])
        plans.append(plan)
        blocks.append(sum(render(plan).values()))
    (directory/'events.json').write_text(json.dumps(plans, separators=(',', ':'))+'\n')
    mono = np.concatenate(blocks)[:60*RATE]
    return np.column_stack((mono, mono)), RATE


def load_ace():
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['ACESTEP_DISABLE_TQDM'] = '1'
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    dit, lm = AceStepHandler(), LLMHandler()
    status, ok = dit.initialize_service(project_root=str(Path.cwd()), config_path='acestep-v15-turbo', device='cuda', compile_model=False, use_mlx_dit=False)
    if not ok: raise RuntimeError(status)
    return dit, lm


def ace(value, directory, engine=None, hook=None):
    import random
    import soundfile as sf
    import torch
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    random.seed(value['seed']); np.random.seed(value['seed']); torch.manual_seed(value['seed'])
    torch.cuda.manual_seed_all(value['seed']); torch.set_num_threads(4)
    dit, lm = engine if engine is not None else load_ace()
    caption, bpm = brief(value)
    if hook is not None:
        if hook not in ('Feel alive', 'Keep moving', 'Stay together', 'One more'): raise ValueError('Original two-word phrase required')
        caption = 'Dry spoken rhythmic vocal, one original voice saying only '+hook+'. No backing music, no drums, no instruments, no imitation of any singer.'
    params = GenerationParams(caption=caption, bpm=bpm, duration=10 if hook else 60, seed=value['seed'], instrumental=hook is None, lyrics=hook or '[Instrumental]', inference_steps=8, thinking=False, use_cot_metas=False, use_cot_caption=False, use_cot_language=False, use_cot_lyrics=False)
    config = GenerationConfig(batch_size=1, audio_format='wav', use_random_seed=False, seeds=[value['seed']])
    result = generate_music(dit, lm, params, config, save_dir=str(directory/'raw'))
    if not result.success or len(result.audios) != 1: raise RuntimeError('Generation failed')
    return sf.read(result.audios[0]['path'], always_2d=True, dtype='float32')


def canonical(samples, rate):
    if type(rate) is not int or not 8000 <= rate <= 192000 or samples.ndim != 2 or samples.shape[1] != 2 or abs(len(samples)/rate-60) > 1 or not np.isfinite(samples).all():
        raise ValueError('Invalid generated audio')
    peak = float(np.max(np.abs(samples)))
    if peak < .001 or peak >= 1: raise ValueError('Silent or clipped audio')
    divisor = math.gcd(rate, 48000)
    output = resample_poly(samples, 48000//divisor, rate//divisor, axis=0) if rate != 48000 else samples.copy()
    output = output[:2880000]
    if len(output) < 2880000: output = np.pad(output, ((0, 2880000-len(output)), (0, 0)))
    output *= min(1, .95/max(float(np.max(np.abs(output))), 1e-9))
    output[:480] *= np.linspace(0, 1, 480)[:, None]; output[-480:] *= np.linspace(1, 0, 480)[:, None]
    return np.rint(output*32767).astype('<i2')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--backend', required=True, choices=['procedural-test', 'ace-step'])
    args = parser.parse_args()
    if args.request.stat().st_size > 4096: raise ValueError('Request too large')
    value = request(json.loads(args.request.read_text()))
    args.output.mkdir(mode=0o700)  # Never replace an earlier result.
    started = time.monotonic()
    samples, rate = procedural(value, args.output) if args.backend == 'procedural-test' else ace(value, args.output)
    pcm = canonical(samples, rate)
    path = args.output/'track.wav'
    with wave.open(str(path), 'wb') as output:
        output.setparams((2, 2, 48000, 0, 'NONE', 'not compressed')); output.writeframes(pcm.tobytes())
    receipt = dict(request=value, backend=args.backend, seconds=60, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), elapsed_seconds=time.monotonic()-started, quality_gate='NOT RUN')
    receipt['worker_sha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    if args.backend == 'procedural-test':
        receipt['provenance'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'scripts/club_studies.py', ROOT/'scripts/prepare_electronic_bank.py', ROOT/'assets/manifests/electronic-v2.json']}
        receipt['events_sha256'] = hashlib.sha256((args.output/'events.json').read_bytes()).hexdigest()
    if args.backend == 'ace-step': receipt['expected_model'] = dict(code=CODE_REVISION, weights=WEIGHTS_REVISION)
    (args.output/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')


if __name__ == '__main__': main()
