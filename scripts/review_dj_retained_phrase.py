#!/usr/bin/env python3
"""Review one bounded phrase from retained Jamloom audio; never a production selector."""
import hashlib
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from dj_vocal import mix_phrase, steady_grid
from review_dj_warm import listening_copy

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = ROOT / 'renders/dj-model-comparison-20261026'
    backing = source / 'house-0.wav'
    voice = source / 'stems-5/vocals.npy'
    expected = ['351561619ef7e40cc215c6024dbe034932489e48979d0a850ccac1b450f00675',
                'caff479be92b0f0502d5e4904dabb3cdeb93f817bea7ff3430c7d12894192f19']
    assert [hashlib.sha256(p.read_bytes()).hexdigest() for p in (backing, voice)] == expected
    samples, rate = sf.read(backing, dtype='float32', always_2d=True)
    vocals = np.load(voice, allow_pickle=False)
    assert rate == 48000 and samples.shape == vocals.shape == (2880000, 2)
    assert np.isfinite(vocals).all() and np.max(np.abs(vocals)) < 1
    # Offline word timing suggests this phrase; human review must establish whole-word boundaries.
    start, end = 40.48, 41.55
    phrase = vocals[round(start*rate):round(end*rate)].copy()
    fade = round(.03*rate)
    phrase[:fade] *= np.linspace(0, 1, fade)[:, None]
    phrase[-fade:] *= np.linspace(1, 0, fade)[:, None]
    phrase *= .18 / max(float(np.max(np.abs(phrase))), 1e-9)
    grid = steady_grid(samples, rate, 128)
    assert grid is not None
    bpm, offset, regions = grid
    placement = offset + 44*60/bpm
    assert any(a <= placement and placement+len(phrase)/rate <= b for a, b in regions)
    mixed = mix_phrase(samples, phrase, rate, placement)
    first, last = round(placement*rate), round(placement*rate)+len(phrase)
    assert np.array_equal(mixed[:first], samples[:first]) and np.array_equal(mixed[last:], samples[last:])
    assert np.isfinite(mixed).all() and np.max(np.abs(mixed)) < 1
    output = ROOT / 'renders/club-studies-20261024/retained-phrase/review'
    output.mkdir(parents=True, exist_ok=False)
    cards, rows = [], []
    for name, label, audio in [('context', 'Original vocal context', vocals[round(39.8*rate):round(42*rate)]),
                               ('phrase', 'Short phrase alone', phrase),
                               ('before', 'Instrumental before', samples[16*rate:28*rate]),
                               ('after', 'Same music with one phrase', mixed[16*rate:28*rate])]:
        wav = output / (name+'.wav'); mp3 = output / (name+'.mp3')
        sf.write(wav, audio, rate, subtype='PCM_16'); listening_copy(wav, mp3)
        decoded, decoded_rate = sf.read(wav, always_2d=True)
        assert decoded_rate == rate and decoded.shape == audio.shape and np.max(np.abs(decoded-audio)) < 1/32768+.000001
        rows.append(dict(file=mp3.name, sha256=hashlib.sha256(mp3.read_bytes()).hexdigest(), seconds=len(audio)/rate))
        cards.append(f'<section><h2>{label}</h2><audio controls preload="metadata" src="{mp3.name}"></audio></section>')
    (output/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Retained vocal phrase</title><style>body{font:18px/1.5 system-ui;max-width:800px;margin:40px auto;padding:20px;background:#111b20;color:#edf3ec}section{padding:15px}audio{width:100%}</style><h1>One short sung phrase</h1><p>A review-only edit of an existing Jamloom original, not fresh generation. Compare Before and After; the phrase enters near 4.7 seconds. Check whether the voice is natural and the words sound complete. The automatic transcript is only a timing suggestion. Nothing is enabled in the product.</p>'''+''.join(cards)+'''<script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>''')
    report = dict(status='PASS technical; human listening NOT RUN', sourceHashes=expected,
                  cropSeconds=[start, end], fadeSeconds=.03, grid=grid, placementSeconds=placement,
                  candidateWords='we rise (unverified transcript)', productionChanged=False, newGeneration=False,
                  unchangedOutsidePhrase=True, outputs=rows,
                  limitation='Manual retained-source selection does not qualify fresh vocal generation or automatic phrase selection. Earlier long repeated transcript segments were rejected as unreliable.')
    (ROOT/'docs/evidence/final-gates-20261026/retained-vocal.json').write_text(json.dumps(report, indent=2)+'\n')
    print('http://localhost:8766/retained-phrase/review/')


if __name__ == '__main__':
    main()
