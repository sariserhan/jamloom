#!/usr/bin/env python3
"""Compare retained YIN targets with independent normalized autocorrelation.

Offline diagnostic only: agreement is not verified singing ground truth. This
does not transcribe, change practice targets, load a model or enable grading.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE, WINDOW, HOP = 48000, 4096, 960


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def pitch(samples, rate=RATE):
    """NSDF peak picker with explicit level, periodicity and frequency bounds."""
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim != 1 or not 512 <= x.size <= 8192 or not np.isfinite(x).all() or np.max(np.abs(x)) > 1:
        raise ValueError('Expected bounded mono PCM')
    if not 8000 <= rate <= 192000:
        raise ValueError('Invalid rate')
    x = x - x.mean()
    rms = float(np.sqrt(np.mean(x*x)))
    if rms < .003:
        return None
    lo, hi = max(2, int(rate/1000)), min(int(rate/80), len(x)//2)
    if hi <= lo:
        return None
    size = 1 << (2*len(x)-1).bit_length()
    spectrum = np.fft.rfft(x, size)
    correlation = np.fft.irfft(spectrum * spectrum.conj(), size)[:hi+2]
    energy = np.concatenate(([0.], np.cumsum(x*x)))
    lag = np.arange(hi+2)
    denominator = energy[len(x)-lag] + energy[-1] - energy[lag]
    nsdf = np.divide(2*correlation, denominator, out=np.zeros_like(correlation), where=denominator > 0)
    peaks = [t for t in range(lo, hi+1) if nsdf[t] > nsdf[t-1] and nsdf[t] >= nsdf[t+1]]
    if not peaks:
        return None
    floor = .95 if rms < .01 else .9
    strongest = max(nsdf[t] for t in peaks)
    candidates = [t for t in peaks if nsdf[t] >= max(floor, strongest*.9)]
    if not candidates:
        return None
    t = candidates[0]
    denominator = 2*(2*nsdf[t]-nsdf[t-1]-nsdf[t+1])
    refined = t + ((nsdf[t+1]-nsdf[t-1])/denominator if denominator else 0)
    frequency = rate/refined
    return 69+12*np.log2(frequency/440) if 80 <= frequency <= 1000 else None


def intervals(trace, minimum=.12):
    """Only contiguous, same-note agreement; never bridge rejected frames."""
    result, active = [], None
    for at, note in [*trace, (None, None)]:
        if active and (note != active['note'] or at is None or at-active['last'] > .021):
            end = active['last'] + .01
            if end-active['at'] >= minimum-1e-9:
                result.append({'at': round(active['at'], 4), 'end': round(end, 4), 'note': active['note']})
            active = None
        if note is not None:
            if active is None:
                active = {'at': max(0., at-.01), 'last': at, 'note': note}
            active['last'] = at
    return result


def audit(root=ROOT):
    results = []
    for identity, slug in [('deep-house-male', 'long-way-home'), ('eurodance-female', 'leave-it-all-outside')]:
        candidate = root/'renders/produced-target-review-20261030'/f'{identity}.json'
        data = json.loads(candidate.read_text())
        source = root/'renders/spleeter-local-20261027'/identity/'vocals.npy'
        recording = root/'assets/singing-recordings'/f'{slug}-song.mp3'
        for path, expected in [(source, data['source_sha256']), (recording, data['recording_sha256']),
                               (root/'apps/web/singing-pitch.js', data['detector_sha256'])]:
            if digest(path) != expected:
                raise ValueError(f'Stale source or detector: {path.name}')
        if data['recording_id'] != slug or data['verified'] is not False or data['scoringEnabled'] is not False:
            raise ValueError('Expected unverified source-bound candidate')
        audio = np.load(source, allow_pickle=False, mmap_mode='r')
        if audio.shape != (RATE*120, 2):
            raise ValueError('Unexpected stem duration/channels')
        frames = list(range(0, len(audio)-WINDOW+1, HOP))
        if len(frames) != len(data['trace']):
            raise ValueError('Candidate frame count changed')
        counts = {'both_pitched': 0, 'within_50_cents': 0, 'pitch_disagreement': 0,
                  'yin_only': 0, 'nsdf_only': 0, 'neither': 0}
        agreement, disagreements, errors = [], [], []
        for start, (at, yin) in zip(frames, data['trace']):
            if abs(at-(start+WINDOW/2)/RATE) > .000051 or (yin is not None and not np.isfinite(yin)):
                raise ValueError('Candidate timing or pitch changed')
            independent = pitch(audio[start:start+WINDOW].mean(axis=1))
            note = None
            if yin is not None and independent is not None:
                cents = abs(yin-independent)*100
                errors.append(cents)
                counts['both_pitched'] += 1
                if cents <= 50:
                    counts['within_50_cents'] += 1
                    note = int(round((yin+independent)/2))
                else:
                    counts['pitch_disagreement'] += 1
                    disagreements.append({'at': at, 'yin': yin, 'nsdf': round(float(independent), 3), 'cents': round(cents, 1)})
            else:
                counts['yin_only' if yin is not None else 'nsdf_only' if independent is not None else 'neither'] += 1
            agreement.append((at, note))
        results.append({'recording_id': slug, 'recording_sha256': digest(recording), 'source_sha256': digest(source),
                        'candidate_sha256': digest(candidate), 'frames': len(frames), 'counts': counts,
                        'median_joint_pitch_error_cents': round(float(np.median(errors)), 2) if errors else None,
                        'largest_disagreements': sorted(disagreements, key=lambda r: -r['cents'])[:30],
                        'candidate_notes': intervals(agreement), 'verified': False, 'scoringEnabled': False})
    return {'status': 'PASS diagnostic execution', 'scope': 'Estimator comparison, not verified notes, words or timing',
            'method': 'Unwindowed NSDF with parabolic peak interpolation; no octave-error forgiveness',
            'script_sha256': digest(Path(__file__)), 'recordings': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = audit()
    with args.output.open('x') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
        stream.write('\n')
