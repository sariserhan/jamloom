"""Reproduce conversion integrity and publish only a local level-matched comparison."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from vocal_identity import mix_identity
from dj_vocal import short_phrase

evidence = Path(__file__).parent
output = ROOT / 'renders/dj-identity-hooks-20261026'
receipt = json.loads((output / 'complete.json').read_text())
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
base, rate = sf.read(output / 'base.wav', dtype='float32')
result, result_rate = sf.read(output / 'singer.wav', dtype='float32')
assert rate == result_rate == 48000 and base.shape == result.shape == (480000, 2)
assert digest(output / 'base.wav') == 'd00b88f70549bbe9dde11f98d5016939f5a463b5d873affc9b6ed0e37b6fd71f'
assert digest(output / 'singer.wav') == receipt['audio_sha256']
stem = np.load(output / 'identity-stems/vocals.npy', allow_pickle=False)
raw_files = list((output / 'identity/raw').glob('*.wav'))
assert len(raw_files) == 1
converted, converted_rate = sf.read(raw_files[0])
assert converted_rate == 44100
recreated, balance = mix_identity(base, stem, converted)
assert balance['backing_sha256'] == receipt['vocal_identity']['backing_sha256']
assert np.max(np.abs(result - recreated)) <= 1 / 32768
assert np.isfinite(result).all() and .001 < np.max(np.abs(result)) < 1
_, bounds = short_phrase(result, rate, 90000)
target_rms = min(float(np.sqrt(np.mean(x.astype('float64')**2))) * .85 / float(np.max(np.abs(x))) for x in (base, result))
review = ROOT / 'renders/club-studies-20261024/identity-hooks/review'
review.mkdir(parents=True, exist_ok=False)
copies = []
for number, samples in enumerate((base, result), 1):
    gain = target_rms / float(np.sqrt(np.mean(samples.astype('float64')**2)))
    path = review / f'{number}.wav'
    sf.write(path, samples * gain, rate, subtype='PCM_16')
    copy, copy_rate = sf.read(path)
    assert copy_rate == rate and copy.shape == samples.shape and np.max(np.abs(copy)) < .851
    assert abs(float(np.sqrt(np.mean(copy**2))) - target_rms) < 1 / 32768
    copies.append(dict(file=path.name, sha256=digest(path), gain=gain, rms=float(np.sqrt(np.mean(copy**2)))))
(review / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Voice comparison</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:760px;margin:36px auto;padding:0 20px}article{padding:22px;border-radius:16px;background:#213039;margin:18px 0}audio{display:block;width:100%;margin-top:16px}h1{font-size:32px}h2{font-size:24px}p{color:#cbd8d3}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style><h1>Can you hear a better voice?</h1><p>Compare the same ten-second performance at matched levels. Listen for a natural voice and clear words: “Feel alive”.</p><article><h2>1 · Before</h2><p>The voice you found unnatural or unclear.</p><audio controls preload="metadata" aria-label="Before voice conversion" src="1.wav"></audio></article><article><h2>2 · After</h2><p>Converted using the voice stage from Music DNA, with a synthetic male voice target.</p><audio controls preload="metadata" aria-label="After voice conversion" src="2.wav"></audio></article><p role="status">Quality is awaiting your review. This tests vocal character in an existing performance; it is not a new song or a qualified short DJ hook. No paid generation was used.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>''')
checks = dict(status='PASS conversion integrity and matched listening levels',
              source_sha256=digest(output / 'base.wav'), output_sha256=digest(output / 'singer.wav'),
              source_frames=len(base), output_frames=len(result), max_pcm_reconstruction_error=float(np.max(np.abs(result-recreated))),
              quiet_bounded_short_phrase=bounds, listening_copies=copies, human_listening='NOT RUN',
              fresh_generation=False, public_activation=False)
(evidence / 'audio-checks.json').write_text(json.dumps(checks, indent=2) + '\n')
for name in ('complete.json', 'execution.json'):
    (evidence / name).write_bytes((output / name).read_bytes())
(evidence / 'source-hashes.json').write_text(json.dumps({str(p.relative_to(ROOT)):digest(p) for p in
    [ROOT / 'scripts/vocal_identity.py', ROOT / 'scripts/separate_singer.py', evidence / 'run_local.py', Path(__file__).resolve()]}, indent=2) + '\n')
print(json.dumps(checks, indent=2))
