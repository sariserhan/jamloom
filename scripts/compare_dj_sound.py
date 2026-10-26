#!/usr/bin/env python3
"""Stream full reference/generated recordings into descriptive stereo and rhythm measurements."""
import argparse
import json
from pathlib import Path
import subprocess
import time
import numpy as np
from scipy.signal import stft, correlate, find_peaks
from analyze_dj_references import digest

RATE = 24000
HOP = 240
BANDS = [(20,80),(80,250),(250,1000),(1000,4000),(4000,12001)]
NAMES = ['sub','bass','body','presence','brightness']
ROOT = Path(__file__).resolve().parents[1]


def measure(pcm):
    if pcm.ndim != 2 or pcm.shape[1] != 2 or len(pcm) < RATE or not np.isfinite(pcm).all():
        raise ValueError('Finite stereo audio of at least one second required')
    rms = float(np.sqrt(np.mean(pcm.astype(float)**2)))
    if rms < 1e-8: return {'silent': True}
    power = None
    for channel in pcm.T:
        f, _, z = stft(channel, RATE, nperseg=2048, noverlap=2048-HOP, boundary=None)
        p = np.abs(z)**2
        power = p if power is None else power+p
    bands = np.stack([power[(f>=a)&(f<b)].sum(axis=0) for a,b in BANDS])
    fractions = bands.sum(axis=1)/max(1e-20,float(bands.sum()))
    envelopes = np.sqrt(bands)
    attack = np.maximum(0,np.diff(envelopes,axis=1))
    flux = attack.sum(axis=0)
    centered = flux-flux.mean()
    ac = correlate(centered,centered,mode='full',method='fft')[len(centered)-1:]
    ac = ac/ max(1e-20,float(ac[0]))
    peaks, _ = find_peaks(ac)
    pulse = [int(i) for i in peaks if 60<=6000/i<=180]
    candidates = sorted(pulse,key=lambda i:-ac[i])[:3]
    # Fixed-second recurrence describes texture only; it is not a beat/bar or DJ-action label.
    recurrence = {str(seconds):float(ac[seconds*100]) if seconds*100<len(ac) else None for seconds in [1,2,4,8]}
    profile=[]
    for start in range(0,bands.shape[1]-99,100):
        energy=bands[:,start:start+100].sum(axis=1)
        profile.append((energy/max(1e-20,float(energy.sum()))).tolist())
    novelty=[float(np.linalg.norm(np.mean(profile[i:i+4],axis=0)-np.mean(profile[i-4:i],axis=0))) for i in range(4,len(profile)-3)]
    mid=(pcm[:,0]+pcm[:,1])/2;side=(pcm[:,0]-pcm[:,1])/2
    side_fraction=float(np.mean(side.astype(float)**2)/(np.mean(mid.astype(float)**2)+np.mean(side.astype(float)**2)))
    correlation=float(np.corrcoef(pcm.T)[0,1]) if all(np.std(c)>1e-8 for c in pcm.T) else None
    return {'silent':False,'rms_db':20*np.log10(rms),'crest_db':20*np.log10(float(np.max(np.abs(pcm)))/rms),
        'band_fraction':dict(zip(NAMES,map(float,fractions))),'side_fraction':side_fraction,'lr_correlation':correlation,
        'band_modulation':dict(zip(NAMES,map(float,np.std(envelopes,axis=1)/np.maximum(1e-12,np.mean(envelopes,axis=1))))),
        'attack_concentration':float(np.percentile(flux,95)/max(1e-12,float(flux.mean()))),
        'pulse_candidates':[{'bpm':6000/i,'periodicity':float(ac[i])}for i in candidates],
        'texture_recurrence_seconds':recurrence,'texture_novelty_p50_p90':np.percentile(novelty,[50,90]).tolist() if novelty else None}


def summarize(windows):
    active=[w for w in windows if not w['silent']]
    if not active: return {'active_windows':0}
    result={'active_windows':len(active),'total_windows':len(windows)}
    metrics={key:[w[key]for w in active if w[key] is not None] for key in ['rms_db','crest_db','side_fraction','lr_correlation','attack_concentration']}
    for name in NAMES:
        metrics['band_'+name]=[w['band_fraction'][name] for w in active]
        metrics['modulation_'+name]=[w['band_modulation'][name] for w in active]
    metrics['pulse_periodicity']=[w['pulse_candidates'][0]['periodicity']for w in active if w['pulse_candidates']]
    metrics['texture_novelty']=[w['texture_novelty_p50_p90'][0]for w in active if w['texture_novelty_p50_p90']]
    result['p10_p50_p90']={key:np.percentile(value,[10,50,90]).tolist() for key,value in metrics.items() if value}
    return result


def analyze(row,output):
    path=Path(row['path'])
    if digest(path)!=row['sha256']:raise ValueError('Source hash mismatch')
    seconds=0;windows=[]
    with (output/(row['id']+'-decode.log')).open('wb') as log:
        child=subprocess.Popen(['ffmpeg','-nostdin','-v','error','-threads','1','-i',str(path),'-map','0:a:0','-vn','-ac','2','-ar',str(RATE),'-f','f32le','pipe:1'],stdout=subprocess.PIPE,stderr=log)
        try:
            while True:
                data=child.stdout.read(30*RATE*2*4)
                if not data:break
                pcm=np.frombuffer(data,dtype='<f4').reshape(-1,2)
                if len(pcm)>=RATE:windows.append({'start':seconds,'seconds':len(pcm)/RATE,**measure(pcm)})
                seconds+=len(pcm)/RATE
            if child.wait(timeout=30)!=0:raise ValueError('Decoder failed')
        finally:
            if child.poll() is None:child.kill();child.wait()
            child.stdout.close()
    if abs(seconds-row['duration_seconds'])>2 or digest(path)!=row['sha256']:raise ValueError('Incomplete/changed source')
    result={**row,'decoded_seconds':seconds,'windows':windows,'summary':summarize(windows)}
    (output/(row['id']+'.json')).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    args.output.mkdir(parents=True,exist_ok=False);began=time.monotonic()
    references=json.loads((ROOT/'renders/dj-reference-analysis-20261025/report.json').read_text())
    rows=[{k:r[k]for k in ['id','path','sha256','style','duration_seconds']}|{'kind':'reference'}for r in references['files']]
    feedback=json.loads((ROOT/'docs/evidence/dj-quality-20261025/owner-feedback.json').read_text())
    paths=['dj-style-samples-20261025-replacement/house.wav','dj-quality-20261025/house-0.wav','dj-style-samples-20261025-replacement/bass.wav','dj-quality-20261025/bass-1.wav','dj-quality-20261025/house-2.wav','dj-quality-20261025/bass-7.wav']
    rows.extend({'id':'generated-'+str(r['clip']),'path':str(ROOT/'renders'/path),'sha256':r['source_sha256'],'style':r['style'],'kind':'generated','duration_seconds':60,'owner_status':r['status']}for r,path in zip(feedback['clips'],paths))
    excluded={r['sha256']for r in references['excluded']}
    assert len(rows)==15 and len({r['sha256']for r in rows})==15 and not any(r['sha256']in excluded for r in rows)
    results=[]
    for row in rows:
        result=analyze(row,args.output);results.append({k:v for k,v in result.items() if k not in ['path','windows']});print(row['id'],'complete',flush=True)
    report={'status':'PASS descriptive analysis','sample_rate':RATE,'window_seconds':30,'elapsed_seconds':time.monotonic()-began,'files':results,
        'scope':'All nine eligible references, six previously rated originals. No audio copies, training, uploads, model changes or paid compute.',
        'limits':['Measurements are not listening or a musical-quality score.','Stereo resampled to 24 kHz; spectral analysis excludes content above 12 kHz.','Mixes and one-minute originals differ in duration, mastering, codec and context. Per-window distributions are descriptive, not independent statistical samples.','Pulse estimates have half/double-time ambiguity. No verified beat grids, phrases, instruments, vocals, scratch or deck actions inferred.','Texture recurrence and novelty are spectral-envelope proxies; they do not establish melody, harmonic development or boredom.']}
    (args.output/'report.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n');print('PASS descriptive analysis',round(report['elapsed_seconds'],1),'seconds',flush=True)


if __name__=='__main__':main()
