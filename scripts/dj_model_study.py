"""Fixed, unqualified base/turbo comparison; never selected by production requests."""
import gc
import copy
import hashlib
import json
from pathlib import Path
import random
import re
import numpy as np
from dj_track_worker import request, arranged_brief, load_ace, WEIGHTS_REVISION

BASE_REVISION = 'e432212fec32b8965a14ffa57ae653438d6abd14'
MANIFEST = 'dj-base-model.json'


def cases(consistency=False, flow=False):
    if consistency and flow: raise ValueError("Choose one study")
    rows = []
    for model in ('acestep-v15-turbo', 'acestep-v15-base'):
        for i, style in enumerate(('house', 'bass', 'house')):
            value = dict(version=1, session='26102622222222222222222222222222', sequence=len(rows),
                         seed=601026+i, style=style, energy=4, mood='deep')
            caption, bpm = arranged_brief(value)
            lyrics = '[Instrumental]'
            if i == 2:
                caption = ('Driving vocal house, 128 BPM, punchy four-on-the-floor drums, warm piano chords, '
                           'rounded dance bass. Natural expressive male tenor singing, clear words and melodic phrasing. '
                           'Occasional short two-word hooks with long instrumental answers. Strong groove throughout, '
                           'a developing arrangement and a resolved ending. No speech narration or robotic voice effects.')
                bpm, lyrics = 128, '[Instrumental]\n[Chorus]\nFeel alive\nWe rise\n[Instrumental]\n[Outro]'
            rows.append(dict(request=value, model=model, caption=caption, bpm=bpm, lyrics=lyrics,
                             instrumental=i != 2, seconds=60, vocals=False,
                             label=f'{model}: {style}' + (' musical vocal' if i == 2 else ' instrumental')))
    if consistency:
        preferred = [rows[2], rows[5]]
        rows = []
        for template in preferred:
            for seed in (701026, 711026, 721026):
                row = copy.deepcopy(template)
                row['request'].update(session='26102633333333333333333333333333', sequence=len(rows), seed=seed)
                rows.append(row)
    if flow:
        from dj_vocal import hook_phrase
        templates = [rows[0], rows[2]]
        rows = []
        for sequence in range(12):
            vocal = sequence in (2, 7)
            row = copy.deepcopy(templates[int(vocal)])
            row['request'].update(session='26102655555555555555555555555555', sequence=sequence, seed=901026+sequence*1000)
            if vocal:
                phrase = hook_phrase(row['request'])
                row['lyrics'] = '[Instrumental]\n[Chorus]\n'+phrase+'\n[Instrumental]'
                row['caption'] = row['caption'].replace('a developing arrangement and a resolved ending',
                    'a developing arrangement with a stable drum-and-bass groove through the final bars; no fade-out or resolved ending')
            row['label'] = 'Flow track '+str(sequence+1)+(' with one musical hook' if vocal else ' instrumental')
            rows.append(row)
    return rows


def parameters(case):
    base = case['model'] == 'acestep-v15-base'
    return dict(caption=case['caption'], lyrics=case['lyrics'], bpm=case['bpm'], duration=60,
                instrumental=case['instrumental'], vocal_language='en', seed=case['request']['seed'],
                inference_steps=64 if base else 8, guidance_scale=7.0, use_adg=base,
                shift=3.0 if base else 1.0, thinking=True, use_cot_metas=False,
                use_cot_caption=False, use_cot_language=False, use_cot_lyrics=False,
                enable_normalization=True, normalization_db=-1)


def verify_base(root, manifest):
    data = json.loads(Path(manifest).read_text())
    if (data['repo'] != 'ACE-Step/acestep-v15-base' or data['revision'] != BASE_REVISION
        or set(data['files']) != {'config.json','configuration_acestep_v15.py','modeling_acestep_v15_base.py','apg_guidance.py','README.md','model.safetensors','silence_latent.pt'}):
        raise ValueError('Base model revision changed')
    for name, expected in data['files'].items():
        path = root / name
        if Path(name).name != name or path.stat().st_size != expected['bytes']:
            raise ValueError('Invalid base model file')
        digest = hashlib.sha256()
        with path.open('rb') as source:
            for block in iter(lambda: source.read(1024**2), b''): digest.update(block)
        if digest.hexdigest() != expected['sha256']: raise ValueError('Base model checksum mismatch')
    return data


class ModelStudy:
    def __init__(self, consistency=False, flow=False):
        self.consistency, self.flow = consistency, flow
        self.engine, self.model, self.sequence = None, None, 0

    def __call__(self, value, directory, engine=None, hook=None):
        prepared = cases(self.consistency, self.flow)
        if hook is not None or self.sequence >= len(prepared) or request(value) != prepared[self.sequence]['request']:
            raise ValueError('Exact ordered model-study request required')
        case = prepared[self.sequence]
        self.sequence += 1  # Failed calls cannot be silently regenerated.
        import soundfile as sf
        import torch
        from acestep.inference import GenerationParams, GenerationConfig, generate_music
        if self.model != case['model']:
            self.engine = None
            gc.collect(); torch.cuda.empty_cache()
            if case['model'] == 'acestep-v15-base':
                verify_base(Path.cwd() / 'checkpoints/acestep-v15-base', Path(__file__).with_name(MANIFEST))
            self.engine = load_ace(planned=True, model=case['model'])
            self.model = case['model']
        if not getattr(self.engine[1], 'llm_initialized', False): raise RuntimeError('Initialized music planner required')
        seed = value['seed']
        random.seed(seed); np.random.seed(seed); torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)
        settings = parameters(case)
        result = generate_music(*self.engine, GenerationParams(**settings),
            GenerationConfig(batch_size=1, audio_format='wav32', use_random_seed=False, seeds=[seed]),
            save_dir=str(directory / 'raw'))
        if not result.success or len(result.audios) != 1: raise RuntimeError('Model comparison generation failed')
        # Preserve even rejected outputs before temporary request files are removed.
        retained = Path.cwd().parent / 'results' / f'model-raw-{value["sequence"]}.wav'
        with retained.open('xb') as output: output.write(Path(result.audios[0]['path']).read_bytes())
        codes=result.audios[0].get('params',{}).get('audio_codes','')
        if not isinstance(codes,str) or not re.fullmatch(r'(?:<\|audio_code_\d+\|>)+',codes.strip()):
            raise RuntimeError('Music planner returned no valid semantic codes')
        samples, rate = sf.read(result.audios[0]['path'], always_2d=True, dtype='float32')
        if rate != 48000 or samples.shape != (2880000, 2) or not np.isfinite(samples).all() or not .001 < np.max(np.abs(samples)) < 1:
            raise ValueError('Invalid complete study output')
        proof = dict(model=self.model, weights_revision=BASE_REVISION if self.model.endswith('base') else WEIGHTS_REVISION,
                     parameters=settings, raw_sha256=hashlib.sha256(Path(result.audios[0]['path']).read_bytes()).hexdigest(),
                     audio_codes_sha256=hashlib.sha256(codes.encode()).hexdigest(), code_tokens=codes.count('<|audio_code_'),
                     source_audio_used=False, trained_adapter=False, voice_quality='NOT RUN',
                     short_hook_qualification=False)
        (directory / 'model-study.json').write_text(json.dumps(proof) + '\n')
        return samples, rate
