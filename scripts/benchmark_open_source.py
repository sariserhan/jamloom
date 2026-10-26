#!/usr/bin/env python3
"""Prepare hash-verified real audio and compare the installed librosa offline path. No GPU."""
import hashlib,json,time,urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'build-open-source-audit';OUT.mkdir(exist_ok=True)
EVIDENCE=ROOT/'docs/evidence/open-source-audit-20261026'
def sha(data):return hashlib.sha256(data).hexdigest()
def pcm(name,a,rate,**meta):
    a=np.asarray(a,dtype='<f4');path=OUT/(name+'.f32');path.write_bytes(a.tobytes())
    return dict(name=name,file=str(path.relative_to(ROOT)),rate=rate,frames=len(a),pcm_sha256=sha(path.read_bytes()),**meta)
def prepare():
    cases=[];manifest=json.loads((ROOT/'assets/manifests/acoustic-v1.json').read_text())
    for midi in [48,60,72]:
        row=next(s for s in manifest['samples'] if s['instrument']=='piano' and s['root_midi']==midi)
        with urllib.request.urlopen(row['url'],timeout=30) as response:data=response.read(8_000_001)
        assert sha(data)==row['sha256'],'CC0 source changed'
        path=OUT/(row['id']+'.wav');path.write_bytes(data)
        a,rate=sf.read(path,always_2d=True);a=a.mean(axis=1);a=resample_poly(a,16000,rate).astype('float32');gain=.6/max(abs(a));a*=gain;a=a[int(.12*16000):int(1.5*16000)]
        cases.append(pcm(row['id'],a,16000,kind='real_cc0_note',expected_hz=440*2**((midi-69)/12),source_sha256=row['sha256'],source=row['url'],license='CC0-1.0',gain=float(gain)))
    for hz in [110,220,440,523.251,880]:
        t=np.arange(16000)/16000;a=.25*np.sin(2*np.pi*hz*t)+.07*np.sin(4*np.pi*hz*t)
        cases.append(pcm('tone-'+str(hz),a,16000,kind='synthetic_control',expected_hz=hz))
    rng=np.random.default_rng(20261026)
    cases.append(pcm('noise',rng.normal(0,.06,16000),16000,kind='unvoiced_control'))
    cases.append(pcm('silence',np.zeros(16000),16000,kind='unvoiced_control'))
    for i in [0,1,2]:
        path=ROOT/f'renders/dj-flow-qualification-20261026/house-{i}.wav'
        a,rate=sf.read(path,always_2d=True);a=resample_poly(a.mean(axis=1),8000,rate)
        cases.append(pcm('original-'+str(i),a,8000,kind='real_generated_music',source=str(path.relative_to(ROOT)),source_sha256=sha(path.read_bytes()),expected_hz=None))
    for bpm in [120,128,140]:
        a=np.zeros(8000*30);pulse=np.exp(-np.arange(800)/120)*np.sin(2*np.pi*80*np.arange(800)/8000)
        for t in np.arange(0,30,60/bpm):
            pos=round(t*8000);n=min(len(pulse),len(a)-pos);a[pos:pos+n]+=.6*pulse[:n]
        cases.append(pcm('beat-'+str(bpm),a,8000,kind='synthetic_beat_control',expected_bpm=bpm))
    (OUT/'fixtures.json').write_text(json.dumps(cases,indent=2)+'\n')
    return cases

def librosa_check(cases):
    import librosa
    results=[]
    for row in cases:
        a=np.fromfile(ROOT/row['file'],dtype='<f4')
        if row['kind'] not in ['real_cc0_note','synthetic_control','unvoiced_control']:continue
        start=time.perf_counter();f=librosa.yin(a,fmin=80,fmax=1000,sr=row['rate'],frame_length=2048,hop_length=320,center=False);elapsed=time.perf_counter()-start
        expected=row.get('expected_hz');error=float(np.median(abs(1200*np.log2(f/expected)))) if expected else None
        results.append(dict(name=row['name'],seconds=elapsed,median_cents_error=error,has_voicing_gate=False,frames=len(f)))
    row=next(r for r in cases if r['name']=='original-0');a=np.fromfile(ROOT/row['file'],dtype='<f4')[:8*row['rate']]
    start=time.perf_counter();stretched=librosa.effects.time_stretch(a,rate=1.08);elapsed=time.perf_counter()-start
    sf.write(OUT/'librosa-stretch.wav',stretched,row['rate'],subtype='FLOAT')
    result=dict(version=librosa.__version__,pitch=results,time_stretch=dict(speed=1.08,seconds=elapsed,audio_seconds=len(stretched)/row['rate'],peak=float(np.max(abs(stretched))),file='build-open-source-audit/librosa-stretch.wav'),scope='Offline candidate, not real-time callback or perceptual quality proof')
    (EVIDENCE/'librosa-benchmark.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
if __name__=='__main__':librosa_check(prepare())
