"""Isolated four-stem Spleeter runner for hosted Improvise."""
import argparse
import hashlib
import importlib.resources
import json
import os
from pathlib import Path
import tempfile
import time
import wave

import numpy as np
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[2]
RATE = 48000
MODEL = ROOT / 'build-spleeter/models/4stems'


def overlap_add(audio, predict, size=12*44100, overlap=44100):
    if audio.ndim != 2 or audio.shape[1] != 2 or not len(audio) or not np.isfinite(audio).all():
        raise ValueError('Finite stereo audio required')
    stems = None
    weights = np.zeros(len(audio), dtype=np.float32)
    for start in range(0, len(audio), size-overlap):
        end = min(len(audio), start+size)
        parts = predict(audio[start:end])
        if not isinstance(parts, dict) or set(parts) != {'vocals', 'drums', 'bass', 'other'}:
            raise ValueError('Unexpected Spleeter stems')
        if stems is None:
            stems = {name: np.zeros_like(audio) for name in parts}
        length = end-start
        if any(value.shape != (length, 2) or not np.isfinite(value).all() for value in parts.values()):
            raise ValueError('Invalid Spleeter output')
        fade = np.ones(length, dtype=np.float32)
        if start:
            n=min(overlap,length);fade[:n]=np.linspace(0,1,n)
        if end<len(audio):
            n=min(overlap,length);fade[-n:]=np.linspace(1,0,n)
        for name,value in parts.items():
            stems[name][start:end]+=value*fade[:,None]
        weights[start:end]+=fade
    if np.any(weights<=0):
        raise ValueError('Incomplete Spleeter audio coverage')
    return {name: value/weights[:,None] for name,value in stems.items()}


def separate(source, output):
    source,output=Path(source),Path(output)
    if not source.is_file() or source.stat().st_size>100*1024**2 or output.exists():
        raise ValueError('Invalid or already processed singer input')
    source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
    with wave.open(str(source),'rb') as audio_file:
        if audio_file.getparams()[:3]!=(2,2,RATE) or audio_file.getcomptype()!='NONE' or not 30*RATE<=audio_file.getnframes()<=45*RATE:
            raise ValueError('Expected 30–45 seconds of stereo 48 kHz PCM singer audio')
        original=np.frombuffer(audio_file.readframes(audio_file.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float32)/32768
    manifest=json.loads((ROOT/'assets/manifests/spleeter-hosted.json').read_text())
    for name,item in manifest['files'].items():
        path=MODEL/name
        if not path.is_file() or path.stat().st_size!=item['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Spleeter model checksum mismatch')
    import tensorflow as tf
    from spleeter.separator import Separator
    if tf.__version__!='2.12.1':
        raise ValueError('Unexpected isolated Spleeter TensorFlow runtime')
    tf.config.threading.set_intra_op_parallelism_threads(4)
    tf.config.threading.set_inter_op_parallelism_threads(1)
    config=json.loads(importlib.resources.files('spleeter').joinpath('resources/4stems.json').read_text())
    config['model_dir']=str(MODEL)
    output.mkdir(parents=True)
    (output/'.partial').touch()
    config_path=output/'configuration.json'
    config_path.write_text(json.dumps(config))
    separator=Separator(str(config_path),multiprocess=False)
    started=time.monotonic()
    audio=resample_poly(original,147,160,axis=0)
    estimated=overlap_add(audio,lambda chunk:separator.separate(chunk))
    selected={name:resample_poly(estimated[name],160,147,axis=0)[:len(original)] for name in ('vocals','drums')}
    hashes={}
    for name,value in selected.items():
        if value.shape!=original.shape or not np.isfinite(value).all() or np.max(np.abs(value))>=4:
            raise ValueError('Invalid separated stem')
        path=output/f'{name}.npy';np.save(path,value.astype(np.float32),allow_pickle=False)
        hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=source_sha:
        raise ValueError('Singer input changed during separation')
    report={'technical':'PASS','source_sha256':source_sha,'model_revision':manifest['revision'],
        'model_archive_sha256':manifest['archive_sha256'],'stems':hashes,'sample_rate':RATE,
        'frames':len(original),'seconds':time.monotonic()-started,'device':'cpu',
        'separation_quality':'NOT RUN: no clean reference stems; requires listening'}
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n')
    config_path.unlink();(output/'.partial').unlink()
    print('PASS: isolated Spleeter stems saved',flush=True)


if __name__=='__main__':
    os.environ.update(TF_CPP_MIN_LOG_LEVEL='2',TF_NUM_INTRAOP_THREADS='4',TF_NUM_INTEROP_THREADS='1',CUDA_VISIBLE_DEVICES='')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();separate(args.input,args.output)
