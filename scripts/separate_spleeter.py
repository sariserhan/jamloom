"""Offline comparison using the publisher's checksum-pinned Spleeter 2-stem model."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import time
import wave

os.environ.update(TF_CPP_MIN_LOG_LEVEL='2', TF_NUM_INTRAOP_THREADS='4', TF_NUM_INTEROP_THREADS='1')
import numpy as np
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]


def overlap_add(audio, predict, rate=44100):
    if audio.ndim != 2 or audio.shape[1] != 2 or not np.isfinite(audio).all() or len(audio) < rate:
        raise ValueError('Finite stereo audio required')
    size, overlap = rate*12, rate
    vocals = np.zeros_like(audio); weights = np.zeros(len(audio), dtype=np.float32)
    for start in range(0, len(audio), size-overlap):
        end = min(len(audio), start+size)
        value = predict(audio[start:end])
        if value.shape != audio[start:end].shape or not np.isfinite(value).all():
            raise ValueError('Invalid separator output')
        fade = np.ones(end-start, dtype=np.float32)
        if start: fade[:min(overlap,len(fade))] = np.linspace(0,1,min(overlap,len(fade)))
        if end < len(audio): fade[-overlap:] = np.linspace(1,0,overlap)
        vocals[start:end] += value*fade[:,None]; weights[start:end] += fade
        if end == len(audio): break
    if not np.all(weights > 0): raise ValueError('Uncovered audio frames')
    return vocals/weights[:,None]


def separate(source, output):
    if output.exists(): raise FileExistsError('Preserve the previous separation')
    manifest=json.loads((ROOT/'assets/manifests/spleeter-separation.json').read_text())
    model=ROOT/'build-spleeter/models/2stems'
    for name, item in manifest['files'].items():
        if Path(name).name != name: raise ValueError('Invalid model manifest path')
        data=(model/name).read_bytes()
        if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:
            raise ValueError('Checkpoint mismatch')
    if not (model/'.probe').is_file(): raise ValueError('Offline checkpoint missing')
    if source.stat().st_size>100*1024**2: raise ValueError('Source exceeds local experiment limit')
    with wave.open(str(source),'rb') as f:
        if f.getparams()[:3]!=(2,2,48000) or not 10*48000<=f.getnframes()<=240*48000:
            raise ValueError('Expected 10–240 second stereo 48 kHz PCM source')
        audio=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float32)/32768
    import tensorflow as tf
    from spleeter.separator import Separator
    if tf.__version__!='2.12.0': raise ValueError('Use the pinned isolated Mac comparison environment')
    tf.config.threading.set_intra_op_parallelism_threads(4)
    tf.config.threading.set_inter_op_parallelism_threads(1)
    output.mkdir(parents=True);(output/'.partial').write_text('Unfinished local separation')
    config=json.loads((ROOT/'build-spleeter/venv/lib/python3.11/site-packages/spleeter/resources/2stems-16kHz.json').read_text())
    config['model_dir']=str(model);(output/'configuration.json').write_text(json.dumps(config))
    separator=Separator(str(output/'configuration.json'),multiprocess=False)
    started=time.monotonic()
    vocals=overlap_add(resample_poly(audio,147,160,axis=0),lambda chunk:separator.separate(chunk)['vocals'])
    vocals=resample_poly(vocals,160,147,axis=0)[:len(audio)]
    if vocals.shape!=audio.shape or not np.isfinite(vocals).all(): raise ValueError('Unaligned separated voice')
    np.save(output/'vocals.npy',vocals,allow_pickle=False)
    report={'technical':'PASS separation and sample alignment','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'vocal_sha256':hashlib.sha256((output/'vocals.npy').read_bytes()).hexdigest(),'frames':len(audio),'sample_rate':48000,
            'model_archive_sha256':manifest['archive_sha256'],'seconds':time.monotonic()-started,'device':'cpu',
            'quality':'NOT RUN: no clean reference stems; requires listening','production_adoption':False}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()
    print(json.dumps(report),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();separate(a.input,a.output)
