"""Reproduce the failed first candidate without another model call or repaired output."""
import hashlib,json,shutil,sys
from pathlib import Path
import numpy as np
import soundfile as sf

root=Path(__file__).resolve().parents[3];sys.path.insert(0,str(root/'scripts'))
from dj_vocal import short_phrase
evidence=Path(__file__).parent;run=root/'renders/dj-isolated-hooks-20261026'
report=json.loads((run/'report.json').read_text())
assert report['status']=='FAIL' and report['cleanup_confirmed'] and report['tracks']==[]
assert report['observed_debit_usd']<3 and report['rental_seconds']<1200
raw=run/'sung-candidates/raw-0.wav'
digest=hashlib.sha256(raw.read_bytes()).hexdigest()
assert digest=='d00b88f70549bbe9dde11f98d5016939f5a463b5d873affc9b6ed0e37b6fd71f'
samples,rate=sf.read(raw,always_2d=True,dtype='float32')
assert rate==48000 and samples.shape==(480000,2) and np.isfinite(samples).all()
full=np.argwhere(abs(samples)>=1)
assert full.tolist()==[[38974,1]]
try:
    short_phrase(samples,rate,90000)
    raise AssertionError('Raw candidate must reproduce the level rejection')
except ValueError as error:
    assert 'Silent or clipped' in str(error)
# Diagnostic only: headroom still cannot produce a complete two-second phrase.
clip,bounds=short_phrase(samples*10**(-1/20),rate,90000)
assert clip is None and bounds is None
screen=json.loads((run/'word-screen/raw-0.json').read_text())
assert screen['source_sha256']==hashlib.sha256((run/'word-screen/raw-0.wav').read_bytes()).hexdigest()
result=dict(status='FAIL short-hook qualification',raw_sha256=digest,seconds=10,full_scale_samples=1,
            full_scale_time=38974/rate,phrase_after_temporary_headroom=bounds,
            asr_transcript=screen['transcript'],asr_limit='Empty transcript does not establish absence of singing; previous positive control also failed.',
            human_listening='NOT RUN',remaining_model_calls='NOT RUN; stop on failure',repaired_audio_saved=False)
(evidence/'retained-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
(evidence/'failure.json').write_text(json.dumps(report,indent=2)+'\n')
review=root/'renders/club-studies-20261024/isolated-hooks/review'
if review.exists():
    assert hashlib.sha256((review/'1-raw.wav').read_bytes()).hexdigest()==digest
    print(json.dumps(result,indent=2));raise SystemExit(0)
review.mkdir(parents=True)
shutil.copyfile(raw,review/'1-raw.wav')
assert hashlib.sha256((review/'1-raw.wav').read_bytes()).hexdigest()==digest
(review/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Singing diagnostic</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:720px;margin:40px auto;padding:0 20px}article{padding:24px;border-radius:16px;background:#213039}audio{display:block;width:100%;margin-top:16px}h1{font-size:32px}p{color:#cbd8d3}:focus-visible{outline:3px solid #d7ff80}</style><h1>Singing diagnostic</h1><p role="status">This attempt did not pass. Only the first voice was generated; the GPU is shut down. No short hook was added to the music.</p><article><h2>1 · Uncut voice candidate</h2><p>Ten seconds, unchanged from the model. Listen for clear, natural singing and complete words. The intended phrase was “Feel alive”.</p><audio controls preload="metadata" aria-label="Uncut singing candidate" src="1-raw.wav"></audio></article><p>The file reached full scale at one sample. Even with temporary headroom during analysis, no complete phrase fit the current two-second window. This is diagnostic audio, not approved product music.</p></html>''')
print(json.dumps(result,indent=2))
