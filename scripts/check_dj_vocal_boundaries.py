#!/usr/bin/env python3
"""Compare backing preservation on retained originals; not a new vocal-quality candidate."""
import hashlib
import json
import subprocess
import types
from pathlib import Path
import numpy as np
import soundfile as sf
from dj_vocal import mix_phrase, short_phrase

ROOT = Path(__file__).resolve().parents[1]


def main():
    baseline = types.ModuleType('baseline')
    code = subprocess.check_output(['git', 'show', '2a9e2d0:scripts/dj_vocal.py'], cwd=ROOT, text=True, timeout=10)
    exec(compile(code, 'pinned baseline dj_vocal.py', 'exec'), baseline.__dict__)
    source = ROOT/'renders/dj-model-comparison-20261026/house-0.wav'
    phrase_file = ROOT/'renders/club-studies-20261024/retained-phrase/review/phrase.wav'
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    assert source_hash == '351561619ef7e40cc215c6024dbe034932489e48979d0a850ccac1b450f00675'
    samples, rate = sf.read(source, always_2d=True, dtype='float32')
    phrase, phrase_rate = sf.read(phrase_file, always_2d=True, dtype='float32')
    assert rate == phrase_rate == 48000 and phrase.shape == (51360, 2)
    # Deliberate padding isolates the mixer bug; the owner-rejected voice is unchanged.
    clip = np.zeros((2*rate, 2), dtype=np.float32)
    clip[rate//4:rate//4+len(phrase)] = phrase
    before = baseline.mix_phrase(samples, clip, rate, 20)
    after = mix_phrase(samples, clip, rate, 20)
    quiet = slice(round(21.6*rate), round(21.9*rate))
    np.testing.assert_array_equal(after[quiet], samples[quiet])
    assert np.max(np.abs(before[quiet]-samples[quiet])) > .001
    for output in (before, after):
        np.testing.assert_array_equal(output[:20*rate], samples[:20*rate])
        np.testing.assert_array_equal(output[22*rate:], samples[22*rate:])
        assert np.isfinite(output).all() and np.max(np.abs(output)) < 1
    stem = ROOT/'renders/dj-model-comparison-20261026/stems-5/vocals.npy'
    stem_hash = hashlib.sha256(stem.read_bytes()).hexdigest()
    assert stem_hash == 'caff479be92b0f0502d5e4904dabb3cdeb93f817bea7ff3430c7d12894192f19'
    window = np.load(stem, allow_pickle=False)[round(40.48*rate):round(50.48*rate)]
    assert baseline.short_phrase(window, rate, 2*rate)[0] is None
    assert short_phrase(window, rate, 2*rate)[0] is None
    directory = ROOT/'renders/dj-vocal-boundaries-20261027'
    directory.mkdir(exist_ok=False)
    files = []
    for name, output in [('before', before), ('after', after)]:
        file = directory/(name+'.wav');sf.write(file, output[18*rate:24*rate], rate, subtype='PCM_16')
        decoded, decoded_rate = sf.read(file, always_2d=True)
        assert decoded_rate == rate and decoded.shape == (6*rate, 2)
        assert np.max(np.abs(decoded-output[18*rate:24*rate])) <= 1/32768+.000001
        files.append(dict(path=str(file.relative_to(ROOT)), sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    report = dict(status='PASS technical; vocal quality remains rejected', baselineCommit='2a9e2d0',
                  sourceSha256=source_hash, stemSha256=stem_hash,
                  phraseSha256=hashlib.sha256(phrase_file.read_bytes()).hexdigest(),
                  comparison='Same rejected retained voice with 250 ms leading padding; only mixer changes',
                  quietIntervalSeconds=[21.6, 21.9], quietBackingGainBefore=.8, quietBackingGainAfter=1,
                  unchangedOutsideCue=True, realRejectedStemAcceptedBefore=False, realRejectedStemAcceptedAfter=False,
                  outputs=files, newGeneration=False, listening='NOT RUN; no naturalness or timing acceptance claimed')
    evidence = ROOT/'docs/evidence/dj-vocal-boundaries-20261027';evidence.mkdir(exist_ok=True)
    (evidence/'audio.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
