#!/usr/bin/env python3
"""Local signal study of the permitted question reference; never training labels."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from scipy.signal import correlate, fftconvolve, stft

from analyze_dj_references import features, changes

RATE = 8000
HOP = 128


def fingerprint(pcm):
    frequency, times, spectrum = stft(pcm, RATE, nperseg=512, noverlap=512-HOP, boundary=None)
    magnitude = np.abs(spectrum)
    bands = np.geomspace(120, 3600, 60)
    log = np.log1p(np.stack([np.interp(bands, frequency, column) for column in magnitude.T])*200)
    # Remove each frame's broadband level; comparison concerns spectral shape and order.
    log -= log.mean(axis=1, keepdims=True)
    log /= np.maximum(np.linalg.norm(log, axis=1, keepdims=True), 1e-8)
    return times, log.astype(np.float32), frequency, magnitude


def similarity(search, template, shift_bins=5):
    if search.ndim != 2 or template.ndim != 2 or search.shape[1] != template.shape[1]:
        raise ValueError('Matching spectral dimensions required')
    if len(template) < 4 or len(search) < len(template) or not np.isfinite(search).all() or not np.isfinite(template).all():
        raise ValueError('Invalid spectral input')
    padded = np.pad(search, ((0, 0), (shift_bins, shift_bins)))
    numerator = correlate(padded, template, mode='valid', method='fft')
    energy = fftconvolve(padded*padded, np.ones(template.shape, np.float32), mode='valid')
    denominator = np.sqrt(np.maximum(energy, 0)*np.sum(template*template))
    # FFT cancellation leaves tiny residue in silent windows. Those windows have
    # no usable signal, and dividing their residue can manufacture a perfect match.
    usable = energy > max(float(energy.max())*1e-6, 1e-20)
    scores = np.zeros_like(numerator)
    np.divide(numerator, denominator, out=scores, where=usable & (denominator > 0))
    return np.clip(scores, -1, 1)


def study(source, permission, output):
    ledger = json.loads(permission.read_text())
    expected = next(row for row in ledger['files'] if row['file'] == 'question.mp3')['sha256']
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if (source.name != 'question.mp3' or source_hash != expected or
            ledger['recording_training'] != 'owner_confirmed' or ledger['performer_voice_reuse'] is not False):
        raise ValueError('Expected the exact permitted reference and no maker voice reuse')
    if output.exists():
        raise FileExistsError('Preserve prior evidence')
    raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(source),
                                  '-t', '180', '-ar', str(RATE), '-ac', '1', '-f', 'f32le', 'pipe:1'], timeout=30)
    pcm = np.frombuffer(raw, dtype='<f4')
    if not 150*RATE <= len(pcm) <= 160*RATE or not np.isfinite(pcm).all():
        raise ValueError('Unexpected reference duration or samples')
    windows, seconds = [], []
    for start in range(0, len(pcm), 15*RATE):
        part = pcm[start:start+15*RATE]
        if len(part) < RATE:
            break
        tempos, levels = features(part)
        windows.append({'start_seconds': start/RATE, 'end_seconds': (start+len(part))/RATE,
                        'pulse_candidates': tempos})
        seconds.extend(levels)
    times, spectral, frequencies, magnitude = fingerprint(pcm)
    lo, hi = np.searchsorted(times, [1.78, 3.0])
    template = spectral[lo:hi]
    candidates = []
    warped_templates = []
    for speed in (.75, .875, 1., 1.125, 1.25):
        positions = np.linspace(0, len(template)-1, round(len(template)*speed))
        warped = np.stack([np.interp(positions, np.arange(len(template)), template[:, i])
                           for i in range(template.shape[1])], axis=1).astype(np.float32)
        warped_templates.append(warped)
        scores = similarity(spectral, warped)
        selected = []
        for row in np.argsort(scores.max(axis=1))[::-1]:
            at = float(times[row])
            if at < 4 or any(abs(at-t) < 2 for t in selected):
                continue
            shift = int(np.argmax(scores[row]))-5
            candidates.append({'seconds': round(at, 3), 'score': float(scores[row].max()),
                               'duration_ratio': speed, 'log_frequency_shift_bins': shift,
                               'reviewed': False, 'reuse_verified': False})
            selected.append(at)
            if len(selected) >= 12:
                break
    candidates.sort(key=lambda c: -c['score'])
    unique = []
    for candidate in candidates:
        if all(abs(candidate['seconds']-other['seconds']) >= 2 for other in unique):
            unique.append(candidate)
    candidates = unique
    # Order-scrambled source controls expose nonspecific spectral matches.
    rng = np.random.default_rng(103030)
    null_maxima = []
    for _ in range(8):
        maxima = []
        for warped in warped_templates:
            shuffled = warped[rng.permutation(len(warped))]
            scores = similarity(spectral, shuffled)
            maxima.append(float(scores[times[:len(scores)] >= 4].max()))
        null_maxima.append(max(maxima))
    self_scores = similarity(spectral, template)
    self_row, self_column = np.unravel_index(np.argmax(self_scores), self_scores.shape)
    report = {'status': 'PASS signal analysis; listening NOT RUN', 'source_sha256': source_hash,
              'permission_sha256': hashlib.sha256(permission.read_bytes()).hexdigest(),
              'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'seconds': len(pcm)/RATE, 'windows': windows, 'change_candidates': changes(seconds),
              'crop_seconds': [1.78, 3.0], 'exact_crop_reviewed': False,
              'spectral_self_match': {'seconds': float(times[self_row]), 'score': float(self_scores[self_row, self_column]),
                                      'shift_bins': int(self_column)-5},
              'later_match_candidates': candidates[:12], 'scrambled_order_global_maxima': null_maxima,
              'training_admitted': False, 'audio_uploaded': False, 'maker_voice_sampled': False,
              'limits': ['No listening judgment, instrument identification, genre label or expert action annotation.',
                         'Pulse candidates retain half/double-time ambiguity; they are not a verified beat grid.',
                         'Spectral similarity is not proof of sample reuse; compare the scrambled-order controls.',
                         'Global log-frequency shifts do not model formant-preserving pitch transformations.']}
    if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
        raise ValueError('Reference changed during study')
    output.mkdir(parents=True)
    (output/'analysis.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(3, 1, figsize=(15, 8), sharex=True, constrained_layout=True)
    axes[0].plot(np.arange(len(seconds)), [s['rms_db'] for s in seconds], color='#285f87')
    axes[0].set_ylabel('RMS dBFS')
    axes[0].set_title('Question reference: measured structure, not heard section labels')
    axes[1].pcolormesh(times, frequencies, 20*np.log10(np.maximum(magnitude, 1e-7)),
                       shading='auto', cmap='magma', vmin=-75, vmax=-20, rasterized=True)
    axes[1].set_ylim(80, 3800); axes[1].set_yscale('log'); axes[1].set_ylabel('Frequency Hz')
    axes[2].plot(times[:len(self_scores)], self_scores.max(axis=1), color='#256e52', label='Source-order spectral similarity')
    axes[2].axhline(max(null_maxima), color='#a64242', linestyle='--', label='Highest scrambled-order match')
    axes[2].set_ylabel('Similarity'); axes[2].set_xlabel('Reference time (seconds)'); axes[2].legend()
    for axis in axes:
        for candidate in report['change_candidates']:
            axis.axvline(candidate['seconds'], alpha=.15, color='black')
    fig.savefig(output/'structure.png', dpi=120)
    plt.close(fig)
    print(json.dumps({'status': report['status'], 'changes': report['change_candidates'],
                      'best_later_match': candidates[0], 'max_scrambled_match': max(null_maxima)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--permission', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    study(args.source, args.permission, args.output)
