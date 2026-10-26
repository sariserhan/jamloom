#!/usr/bin/env python3
"""Local spoken-hook audition using cached stock voices; never enables serving."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
import hashlib
import json
from pathlib import Path
import time
import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline
from dj_track_worker import HOOK_PHRASES
from dj_vocal import add_hook

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    models = ROOT/'build-style-training/vocal-identity'
    manifest = json.loads((models/'manifest.json').read_text())['hexgrad/Kokoro-82M']
    assert manifest['revision'] == 'f3ff3571791e39611d31c381e3a41a3af07b4987'
    folder = models/'hexgrad--Kokoro-82M'
    cases = [('house-7.wav', 'am_michael', 'Keep moving'),
             ('house-7.wav', 'af_bella', 'Feel alive'),
             ('bass-17.wav', 'am_fenrir', 'Lights up'),
             ('bass-17.wav', 'af_nicole', 'We rise')]
    files = ['config.json', 'kokoro-v1_0.pth', 'README.md', 'VOICES.md'] + [f'voices/{voice}.pt' for _, voice, _ in cases]
    for name in files:
        assert digest(folder/name) == manifest['files'][name]['sha256'], name
    source = ROOT/'renders/dj-planner-20261026'
    previous = json.loads((source/'report.json').read_text())
    output = ROOT/'renders/dj-spoken-hooks-20261026'
    output.mkdir(exist_ok=False)
    evidence = ROOT/'docs/evidence/dj-spoken-hooks-20261026'
    evidence.mkdir(exist_ok=False)
    torch.set_num_threads(2)
    torch.manual_seed(0)
    model = KModel(repo_id='hexgrad/Kokoro-82M', config=str(folder/'config.json'), model=str(folder/'kokoro-v1_0.pth')).eval()
    pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', model=model, device='cpu')
    rows = []
    for number, (file, voice, phrase) in enumerate(cases, 1):
        original = next(row for row in previous['tracks'] if row['file'] == file)
        assert digest(source/file) == original['receipt']['sha256']
        samples, rate = sf.read(source/file, dtype='float32', always_2d=True)
        started = time.monotonic()
        with torch.inference_mode():
            speech = np.concatenate([r.audio.numpy() for r in pipeline(phrase+'.', voice=str(folder/'voices'/f'{voice}.pt'), speed=1)])
        elapsed = time.monotonic()-started
        assert np.isfinite(speech).all() and .1 < len(speech)/24000 < 2, 'Keep complete short phrases; do not crop words'
        assert .001 < np.max(np.abs(speech)) < 1
        raw = output/f'{number}-voice.wav'
        sf.write(raw, speech, 24000, subtype='PCM_16')
        candidate = np.zeros((240000, 2), dtype=np.float32)
        candidate[6000:6000+len(speech)] = speech[:, None]
        def generate(value, directory, engine, *, hook):
            assert hook == phrase
            return candidate, 24000
        request = {**original['receipt']['request'], 'seed': HOOK_PHRASES.index(phrase)}
        diagnostic = {}
        mixed, cue = add_hook(request, samples, rate, output, None, generate=generate, diagnostic=diagnostic)
        assert cue and diagnostic['status'] == 'placed', diagnostic
        assert cue['seconds'] <= 2 and np.max(np.abs(mixed)) < 1
        start = round(cue['start']*rate)
        end = start+round(cue['seconds']*rate)
        assert np.array_equal(mixed[:start], samples[:start]) and np.array_equal(mixed[end:], samples[end:])
        path = output/f'{number}-mixed.wav'
        sf.write(path, mixed, rate, subtype='PCM_16')
        rows.append(dict(number=number, phrase=phrase, voice=voice, seconds=len(speech)/24000, compute_seconds=elapsed,
                         voice_file=raw.name, voice_sha256=digest(raw), file=path.name, sha256=digest(path),
                         source_file=file, source_sha256=digest(source/file), cue=cue, diagnostic=diagnostic))
        (evidence/'hooks.json').write_text(json.dumps(dict(status='PASS technical' if len(rows)==4 else 'PARTIAL',
            model='hexgrad/Kokoro-82M', revision=manifest['revision'], files={name:manifest['files'][name] for name in files},
            scope='New stock synthetic spoken phrases; no singing, voice cloning, training or reference audio',
            serving_enabled=False, human_listening='NOT RUN', tracks=rows), indent=2)+'\n')
        print(f'{number}: {phrase}, {len(speech)/24000:.2f}s, placed at {cue["start"]:.2f}s', flush=True)


if __name__ == '__main__':
    main()
