#!/usr/bin/env python3
"""Read owner-provided mixes in bounded chunks; emit research metadata, never training audio."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import time
import numpy as np
from scipy.signal import correlate, stft, find_peaks

FOLDERS = {'mr wobbles style': ('bass', 'Bass Playground'), 'standard dj performance': ('house', 'Club Flow'),
           'high-energy': ('techno', 'Peak Time'), 'hip-hop': ('hip-hop', 'Hip-hop'), 'chill and relax': ('chill', 'Chill & Groove')}
RATE = 8000


def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def features(pcm):
    if len(pcm) < RATE or not np.isfinite(pcm).all():
        raise ValueError('Invalid audio window')
    frequency, _, spectrum = stft(pcm, RATE, nperseg=512, noverlap=384, boundary=None)
    magnitude = np.abs(spectrum)
    power = magnitude ** 2
    bands = np.stack([power[frequency < 200].sum(axis=0), power[(frequency >= 200) & (frequency < 2000)].sum(axis=0), power[frequency >= 2000].sum(axis=0)])
    flux = np.maximum(0, np.diff(magnitude, axis=1)).sum(axis=0)
    flux -= flux.mean()
    ac = correlate(flux, flux, mode='full', method='fft')[len(flux)-1:]
    peaks, _ = find_peaks(ac)
    peaks = [int(i) for i in peaks if 60 <= 60 * (RATE / 128) / i <= 180 and ac[0] > 1e-12]
    strongest = sorted(peaks, key=lambda i: -ac[i])[:3]
    tempos = [{'bpm': round(60 * (RATE / 128) / i, 2), 'periodicity': round(float(ac[i] / ac[0]), 3)} for i in strongest]
    seconds = []
    for i in range(len(pcm) // RATE):
        part = pcm[i*RATE:(i+1)*RATE]
        a, b = int(i*RATE/128), min(bands.shape[1], int((i+1)*RATE/128))
        energy = bands[:, a:b].sum(axis=1)
        seconds.append({'rms_db': round(float(20*np.log10(max(1e-9, np.sqrt(np.mean(part**2))))), 2),
                        'bands': [round(float(v), 4) for v in energy / max(1e-12, energy.sum())]})
    return tempos, seconds


def changes(seconds):
    proposals = []
    for t in range(10, len(seconds)-10, 5):
        before, after = seconds[t-5:t], seconds[t:t+5]
        delta = float(np.mean([v['rms_db'] for v in after]) - np.mean([v['rms_db'] for v in before]))
        texture = float(np.linalg.norm(np.mean([v['bands'] for v in after], axis=0)-np.mean([v['bands'] for v in before], axis=0)))
        if abs(delta) >= 3 or texture >= .18:
            proposals.append({'seconds': t, 'energy_delta_db': round(delta, 2), 'texture_delta': round(texture, 3),
                              'kind': 'energy rise' if delta >= 3 else 'energy drop' if delta <= -3 else 'texture change',
                              'reviewed': False, 'dj_action': 'unknown'})
    selected = []
    for p in sorted(proposals, key=lambda p: -(abs(p['energy_delta_db'])/3+p['texture_delta']/.18)):
        if all(abs(p['seconds']-v['seconds']) >= 20 for v in selected): selected.append(p)
        if len(selected) == 120: break
    return sorted(selected, key=lambda p: p['seconds'])


def summarize(rows):
    seconds = [v for row in rows for v in row['seconds']]
    tempos = [w['tempo_candidates'][0]['bpm'] for row in rows for w in row['windows'] if w['tempo_candidates'] and w['tempo_candidates'][0]['periodicity'] >= .15]
    # Half/double-time ambiguity is retained separately; this display normalization is not a beat grid.
    pulse = [v*2 if v < 90 else v for v in tempos]
    return {'recordings': len(rows), 'seconds': sum(row['decoded_seconds'] for row in rows),
            'raw_pulse_bpm_p10_p50_p90': np.percentile(tempos, [10,50,90]).round(1).tolist() if tempos else None,
            'pulse_bpm_p10_p50_p90': np.percentile(pulse, [10,50,90]).round(1).tolist() if pulse else None,
            'periodic_windows': len(tempos), 'total_windows': sum(len(r['windows']) for r in rows),
            'mono_rms_db_p10_p50_p90': np.percentile([v['rms_db'] for v in seconds], [10,50,90]).round(1).tolist(),
            'median_low_band_fraction': round(float(np.median([v['bands'][0] for v in seconds])), 3),
            'candidate_changes': sum(len(r['candidate_changes']) for r in rows)}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--downloads', type=Path, required=True);p.add_argument('--output', type=Path, required=True);args=p.parse_args()
    if args.output.exists(): raise ValueError('Preserve earlier evidence; choose a new output folder')
    args.output.mkdir(parents=True);started=time.monotonic();inventory=[]
    for folder, (style, label) in FOLDERS.items():
        base=(args.downloads/folder).resolve()
        if not base.is_dir(): raise ValueError('Missing folder: '+folder)
        for path in sorted(base.rglob('*')):
            if path.is_file() and path.suffix.lower() in ('.mp3','.wav','.m4a','.flac'):
                if path.is_symlink() or not path.resolve().is_relative_to(base): raise ValueError('Unexpected linked source')
                inventory.append({'path': str(path), 'folder': folder, 'style': style, 'label': label, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    excluded_hashes={r['sha256'] for r in inventory if 'blood' in Path(r['path']).stem.casefold() and 'club' in Path(r['path']).stem.casefold()}
    rows=[];excluded=[];seen=set()
    for row in inventory:
        if row['sha256'] in excluded_hashes: excluded.append({**row,'reason':'Explicit owner exclusion'});continue
        if row['sha256'] in seen: excluded.append({**row,'reason':'Exact duplicate'});continue
        seen.add(row['sha256']);path=Path(row['path'])
        probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,sample_rate,channels','-of','json',str(path)],timeout=30))
        duration=float(probe['format']['duration'])
        if not 30 <= duration <= 14400: raise ValueError('Unsupported reference duration')
        row.update(id='ref-'+row['sha256'][:12],duration_seconds=duration,probe=probe,rights={k:'unverified' for k in ['recording','composition','commercial_training','model_retention','commercial_outputs']},training_admitted=False,windows=[],seconds=[])
        log=args.output/(row['id']+'-decode.log')
        with log.open('wb') as errors:
            child=subprocess.Popen(['ffmpeg','-nostdin','-v','error','-threads','1','-i',str(path),'-map','0:a:0','-vn','-ac','1','-ar',str(RATE),'-f','f32le','pipe:1'],stdout=subprocess.PIPE,stderr=errors)
            try:
                frames=0
                while True:
                    data=child.stdout.read(30*RATE*4)
                    if not data: break
                    pcm=np.frombuffer(data,dtype='<f4');offset=frames/RATE;frames+=len(pcm)
                    if len(pcm)<RATE: break
                    tempos,second_rows=features(pcm);row['windows'].append({'start':offset,'seconds':len(pcm)/RATE,'tempo_candidates':tempos});row['seconds'].extend(second_rows)
                if child.wait(timeout=30)!=0: raise ValueError('Audio decode failed: '+row['id'])
            finally:
                if child.poll() is None: child.kill();child.wait()
                child.stdout.close()
        if abs(frames/RATE-duration)>2: raise ValueError('Incomplete audio decode')
        row['decoded_seconds']=frames/RATE;row['candidate_changes']=changes(row['seconds'])
        if digest(path)!=row['sha256']: raise ValueError('Source changed during analysis')
        (args.output/(row['id']+'.json')).write_text(json.dumps(row,indent=2,allow_nan=False)+'\n');rows.append(row)
        print(row['id'],row['label'],round(frames/RATE/60,1),'minutes analyzed',flush=True)
    result={'version':1,'status':'PASS descriptive analysis','scope':'Private reference analysis only; no training, sampling, upload or distribution. All action/transition candidates unreviewed. Audio alone does not reveal controller actions.',
            'preferred_style':'bass','excluded':excluded,'files':[{k:v for k,v in r.items() if k not in ('windows','seconds','candidate_changes')} for r in rows],
            'styles':{style:{'label':label,**summarize([r for r in rows if r['style']==style])} for style,label in FOLDERS.values()},
            'elapsed_seconds':round(time.monotonic()-started,2),'audio_copies_written':0,'trained':False}
    (args.output/'report.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps(result['styles'],indent=2),flush=True)

if __name__=='__main__': main()
