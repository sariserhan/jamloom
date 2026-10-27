#!/usr/bin/env python3
"""Measure onset placement on real backing with a known synthetic timing probe, not singing."""
import hashlib
import json
import subprocess
import types
from pathlib import Path
import numpy as np
import soundfile as sf
import dj_vocal

ROOT = Path(__file__).resolve().parents[1]


def main():
    baseline = types.ModuleType('baseline')
    code = subprocess.check_output(['git', 'show', '1829ade:scripts/dj_vocal.py'], cwd=ROOT, text=True, timeout=10)
    exec(compile(code, 'pinned baseline dj_vocal.py', 'exec'), baseline.__dict__)
    source = ROOT/'renders/dj-model-comparison-20261026/house-0.wav'
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == '351561619ef7e40cc215c6024dbe034932489e48979d0a850ccac1b450f00675'
    samples, rate = sf.read(source, always_2d=True, dtype='float32')
    assert rate == 48000 and samples.shape == (2880000, 2)
    voice = np.zeros((10*rate, 2), dtype=np.float32)
    start, duration = round(1.003*rate), round(.6*rate)
    voice[start:start+duration] = (.2*np.sin(2*np.pi*220*np.arange(duration)/rate))[:, None]
    value = dict(version=1, session='a'*32, sequence=2, seed=17, style='house', energy=4)
    grid = dj_vocal.steady_grid(samples, rate, 128);assert grid is not None
    directory = ROOT/'renders/dj-vocal-onsets-20261027';directory.mkdir(exist_ok=False)
    rows = []
    for name, implementation in [('before', baseline), ('after', dj_vocal)]:
        diagnostic = {};calls = []
        def generate(*args, **kwargs):
            calls.append(1);return voice.copy(), rate
        output, cue = implementation.add_hook(value, samples, rate, directory, None, generate, diagnostic)
        assert cue is not None and len(calls) == 1
        clip, bounds = implementation.short_phrase(voice, rate, round(cue['seconds']*rate))
        onset = int(np.flatnonzero(np.max(np.abs(clip), axis=1) > max(.0001, float(np.max(np.abs(clip)))*.01))[0])
        audible = (round(cue['start']*rate)+onset)/rate
        phase = (audible-grid[1])*grid[0]/60
        error = abs(phase-round(phase))*60/grid[0]
        if name == 'after':assert error <= 1/rate
        else:assert error > .014
        a = round(cue['start']*rate);b = a+len(clip)
        np.testing.assert_array_equal(output[:a], samples[:a]);np.testing.assert_array_equal(output[b:], samples[b:])
        assert np.isfinite(output).all() and np.max(np.abs(output)) < 1
        left = max(0, a-2*rate);audio = output[left:left+6*rate]
        file = directory/(name+'.wav');sf.write(file, audio, rate, subtype='PCM_16')
        decoded, decoded_rate = sf.read(file, always_2d=True)
        assert decoded_rate == rate and decoded.shape == audio.shape
        assert np.max(np.abs(decoded-audio)) <= 1/32768+.000001
        rows.append(dict(name=name, cue=cue, onsetOffsetSeconds=onset/rate, audibleStartSeconds=audible,
                         errorToWorkerGridMs=error*1000, diagnostic=diagnostic,
                         file=str(file.relative_to(ROOT)), sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    report = dict(status='PASS technical timing probe', baselineCommit='1829ade', sourceSha256=digest,
                  sourceFile=str(source.relative_to(ROOT)), workerGrid=grid, rows=rows,
                  limitation='Synthetic tone on retained real backing. Threshold onset is not a sung syllable or a labelled musical beat; no vocal quality acceptance.',
                  paidCompute=False, newMusicGeneration=False)
    evidence = ROOT/'docs/evidence/dj-vocal-onsets-20261027';evidence.mkdir(exist_ok=True)
    (evidence/'audio.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
