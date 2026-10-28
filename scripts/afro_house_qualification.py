#!/usr/bin/env python3
"""Offline full-length Afro House quality run; never changes serving defaults."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import re
import subprocess
import tempfile
import time

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SECONDS = 300
RATE = 48000
MODEL_REVISION = '19671f406d603126926c1b7e2adc169acbcade22'
BASE_REVISION = 'e432212fec32b8965a14ffa57ae653438d6abd14'
JAMLOOM_BASELINE = ROOT / 'renders/dj-quality-20261025/house-0.wav'
STEMS = {
    'matched-house-baseline': ('bass', 'drums', 'percussion', 'keyboard', 'synth'),
    'vocal-led-organic-afro-house': ('vocals', 'bass', 'drums', 'percussion', 'keyboard'),
    'bass-driven-organic-afro-house': ('bass', 'drums', 'percussion', 'keyboard', 'synth'),
    'percussive-driving-organic-afro-house': ('drums', 'percussion', 'bass', 'keyboard', 'synth'),
}
CASES = (
    dict(id='matched-house-baseline', bpm=122, seed=281028, instrumental=True,
         caption='Original instrumental club house, 122 BPM, 4/4. Tight steady kick and bass, crisp offbeat hats, warm chord stabs, restrained melodic variation, clean kick/bass separation, smooth club groove. No vocals, borrowed melodies or artist imitation.',
         lyrics='[Intro]\n[Instrumental]\n[Verse]\n[Instrumental]\n[Chorus]\n[Instrumental]\n[Bridge]\n[Instrumental Break]\n[Chorus]\n[Instrumental]\n[Outro]'),
    dict(id='vocal-led-organic-afro-house', bpm=122, seed=281029, instrumental=False,
         caption='Original vocal-led organic Afro House, 122 BPM, 4/4. Soulful expressive original lead vocal, memorable short hook, deep rounded bass answers the steady four-on-the-floor kick, syncopated hand drums, shakers, rims, claps and toms, warm restrained pads. Evolve through lyric sections and instrumental breathing space; create tension through musical subtraction and a satisfying groove return. No artist imitation, borrowed melody or reference recording.',
         lyrics='[Verse 1]\nRiver light is moving slow\nBare feet find the earth below\nEvery heartbeat joins the sound\nWe lift the night without a crown\n[Pre-Chorus]\nLet the quiet turn to motion\nLet the rhythm cross the room\n[Chorus]\nWe move beneath the amber sky\nOne pulse, one circle, passing by\nKeep this moment close and clear\nThe whole wide world is dancing here\n[Instrumental]\n[Verse 2]\nDust and moonlight on our hands\nNew horizons, shifting sands\nEvery voice can find its place\nEvery step can change the pace\n[Pre-Chorus]\nLet the quiet turn to motion\nLet the rhythm cross the room\n[Chorus]\nWe move beneath the amber sky\nOne pulse, one circle, passing by\nKeep this moment close and clear\nThe whole wide world is dancing here\n[Instrumental Outro]'),
    dict(id='bass-driven-organic-afro-house', bpm=121, seed=281030, instrumental=True,
         caption='Original bass-driven organic Afro House, 121 BPM, 4/4. Deep rounded syncopated bass with a recognizable motif that answers rather than doubles the steady kick, layered hand drums, shakers, rims and toms, restrained warm chord color. Vary bass articulation and percussion answers across phrases; keep the sub controlled and leave breathing space. No vocals, borrowed melodies or artist imitation.',
         lyrics='[Intro]\n[Instrumental]\n[Verse]\n[Instrumental]\n[Chorus]\n[Instrumental]\n[Bridge]\n[Instrumental Break]\n[Chorus]\n[Instrumental]\n[Outro]'),
    dict(id='percussive-driving-organic-afro-house', bpm=124, seed=281031, instrumental=True,
         caption='Original percussive driving organic Afro House, 124 BPM, 4/4. Stable four-on-the-floor kick with interlocking syncopated hand drums, shakers, claps, rims and toms; rounded bass stays distinct and answers the rhythm. Develop layered percussion over musical phrases, use short motivated fills, a reduced-density breakdown and a strong groove return. Warm clear mix, no festival drop, no vocals, borrowed melody or artist imitation.',
         lyrics='[Intro]\n[Instrumental]\n[Verse]\n[Instrumental]\n[Chorus]\n[Instrumental]\n[Bridge]\n[Instrumental Break]\n[Chorus]\n[Instrumental]\n[Outro]'),
)


def plan():
    return dict(version=1, seconds=SECONDS, sample_rate=RATE, reference_audio_used=False,
                previous_jamloom_baseline=dict(path=str(JAMLOOM_BASELINE.relative_to(ROOT)),
                    sha256=hashlib.sha256(JAMLOOM_BASELINE.read_bytes()).hexdigest(),
                    source='prior Jamloom house worker output', seconds=60, bpm_prompt=128),
                trained_adapter=False, model=dict(generation='acestep-v15-turbo', revision=MODEL_REVISION,
                planner='acestep-5Hz-lm-1.7B', extraction='acestep-v15-base',
                extraction_revision=BASE_REVISION,
                publisher_declared_license='MIT; commercial use permitted by publisher; underlying training rights not independently audited'),
                cases=[{**case, 'stems': list(STEMS[case['id']])} for case in CASES])


def validate_plan(value):
    expected = plan()
    if value != expected:
        raise ValueError('Prepared Afro House plan changed')
    return value


def audio_metrics(samples, rate, seconds):
    if (type(rate) is not int or rate != RATE or not isinstance(samples, np.ndarray) or samples.ndim != 2
        or samples.shape[1] != 2 or abs(len(samples) / rate - seconds) > 1
        or not np.isfinite(samples).all()):
        raise ValueError('Invalid duration, format or sample values')
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    if not 0.001 < peak < 1 or rms < 0.001:
        raise ValueError('Silent or clipped audio')
    left, right = samples.astype(np.float64).T
    stereo_correlation = (float(np.corrcoef(left, right)[0, 1])
                          if np.std(left) > 0 and np.std(right) > 0 else 0.0)
    mono = (left + right) * .5
    mono_rms = float(np.sqrt(np.mean(mono * mono)))
    return dict(seconds=round(len(samples) / rate, 3), sample_rate=rate, channels=2,
                peak_dbfs=round(20 * math.log10(peak), 2), rms_dbfs=round(20 * math.log10(rms), 2),
                clipped_samples=int(np.count_nonzero(np.abs(samples) >= 1)),
                stereo_correlation=round(stereo_correlation, 4),
                mono_fold_down_rms_loss_db=round(20 * math.log10(max(mono_rms, 1e-12) / rms), 2),
                status='PASS technical')


def musical_analysis(samples, rate, bpm_hint):
    from scipy.signal import correlate, resample_poly, stft
    mono = samples.mean(axis=1, dtype=np.float32)
    reduced = resample_poly(mono, 147, 640).astype(np.float32, copy=False)
    hop, frame = 256, 2048
    _, times, spectrum = stft(reduced, fs=11025, nperseg=frame, noverlap=frame-hop, boundary=None)
    magnitude = np.abs(spectrum).astype(np.float32, copy=False)
    onset = np.maximum(np.diff(magnitude, axis=1), 0).sum(axis=0)
    onset -= onset.mean()
    ac = correlate(onset, onset, mode='full', method='fft')[len(onset)-1:]
    frame_seconds = hop / 11025
    lag_low, lag_high = max(1, round(60/180/frame_seconds)), round(60/90/frame_seconds)
    lag = lag_low + int(np.argmax(ac[lag_low:lag_high+1]))
    bpm = 60 / (lag * frame_seconds)

    frequencies = np.fft.rfftfreq(frame, 1/11025)
    valid = (frequencies >= 55) & (frequencies <= 5000)
    midi = np.rint(69 + 12*np.log2(frequencies[valid]/440)).astype(int)
    selected = magnitude[valid]
    chroma = np.zeros(12, dtype=np.float64)
    for pitch_class in range(12):
        chroma[pitch_class] = selected[midi % 12 == pitch_class].mean(axis=0).mean()
    profiles = {
        'major': np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]),
        'minor': np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]),
    }
    names = ('C','C#','D','D#','E','F','F#','G','G#','A','A#','B')
    scores = []
    centered = chroma - chroma.mean()
    for mode, profile in profiles.items():
        for tonic, name in enumerate(names):
            rotated = np.roll(profile, tonic)
            corr = float(np.corrcoef(centered, rotated-rotated.mean())[0,1])
            scores.append((corr, name, mode))
    scores.sort(reverse=True)
    best, second = scores[:2]

    phrase_seconds = 32 * 60 / bpm_hint
    windows = []
    for start in np.arange(0, len(samples)/rate, phrase_seconds):
        left, right = int(start*rate), min(len(samples), int((start+phrase_seconds)*rate))
        if right-left < rate: continue
        part = samples[left:right].astype(np.float64)
        rms = np.sqrt(np.mean(part**2))
        window_end = min(len(times), max(1, int((right/rate)/frame_seconds)))
        window_start = min(window_end-1, max(0, int((left/rate)/frame_seconds)))
        band = magnitude[:,window_start:window_end].mean(axis=1)
        band_power = [float(np.sum(band[(frequencies>=a)&(frequencies<b)]**2)) for a,b in ((30,150),(150,2000),(2000,5000))]
        total = max(sum(band_power),1e-12)
        windows.append((float(start), round(float(rms),6), *(round(p/total,5) for p in band_power)))
    distances = []
    for a,b in zip(windows, windows[1:]):
        score = abs(math.log((b[1]+1e-9)/(a[1]+1e-9))) + sum(abs(b[i]-a[i]) for i in (2,3,4))
        distances.append((score, b[0]))
    values = np.array([x[0] for x in distances], dtype=float)
    candidates = []
    if len(values):
        median = float(np.median(values))
        threshold = median * .5 if len(values) == 1 else median + 1.5*float(np.median(np.abs(values-median)))
        candidates = [dict(seconds=round(t,2), score=round(v,4)) for v,t in distances if v > threshold]
    # Per-bar onset strength variation is a signal-level stability check, not a groove score.
    bar_lag = max(1, round(4 * 60 / bpm / frame_seconds))
    bar_strength = np.array([onset[i:i+bar_lag].max(initial=0) for i in range(0, len(onset), bar_lag)])
    beat_variation = float(np.std(bar_strength) / max(np.mean(bar_strength), 1e-12))
    low_band_fraction = float(np.mean([window[2] for window in windows])) if windows else 0.0
    return dict(bpm_estimate=round(bpm,2), requested_bpm=bpm_hint,
        onset_strength_variation=round(beat_variation, 4),
        mean_low_band_fraction=round(low_band_fraction, 5),
        key_estimate=dict(tonic=best[1], mode=best[2], confidence=round(best[0]-second[0],4)),
        section_change_candidates=candidates, phrase_window_bars=8,
        note='Tempo/key are signal estimates. Change points are phrase-aligned candidates; section roles require listening review.')


def loudness_metrics(path):
    result = subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-filter_complex','ebur128=peak=true:framelog=verbose','-f','null','-'],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=120, check=True)
    integrated = re.search(r'Integrated loudness:\s+I:\s+(-?\d+(?:\.\d+)?) LUFS',result.stderr)
    range_match = re.search(r'Loudness range:\s+LRA:\s+(-?\d+(?:\.\d+)?) LU',result.stderr)
    peak = re.search(r'True peak:\s+Peak:\s+(-?\d+(?:\.\d+)?) dBFS',result.stderr)
    if not integrated or not range_match or not peak: raise ValueError('FFmpeg loudness analysis output incomplete')
    return dict(integrated_lufs=float(integrated.group(1)),loudness_range_lu=float(range_match.group(1)),true_peak_dbfs=float(peak.group(1)))


def segment_metrics(samples, rate, seconds, bpm_hint):
    import soundfile as sf
    segment = samples[:seconds * rate]
    with tempfile.TemporaryDirectory(prefix='jamloom-afro-compare-') as temporary:
        path = Path(temporary) / 'segment.wav'
        sf.write(path, segment, rate, subtype='PCM_24')
        return dict(audio=audio_metrics(segment, rate, seconds),
            loudness=loudness_metrics(path), musical=musical_analysis(segment, rate, bpm_hint))


def _render(case, engine, directory, model):
    import soundfile as sf
    import torch
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    seed = case['seed']
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)
    base = model == 'acestep-v15-base'
    params = GenerationParams(caption=case['caption'], lyrics=case['lyrics'], instrumental=case['instrumental'],
        bpm=case['bpm'], timesignature='4/4', duration=SECONDS, seed=seed,
        inference_steps=64 if base else 8, guidance_scale=7.0, use_adg=base,
        shift=3.0 if base else 1.0, thinking=not base, vocal_language='en',
        use_cot_metas=False, use_cot_caption=False, use_cot_language=False, use_cot_lyrics=False,
        enable_normalization=True, normalization_db=-1)
    config = GenerationConfig(batch_size=1, audio_format='wav32', use_random_seed=False, seeds=[seed])
    result = generate_music(*engine, params, config, save_dir=str(directory / 'raw'))
    if not result.success or len(result.audios) != 1: raise RuntimeError('Model call failed; no automatic retry')
    samples, rate = sf.read(result.audios[0]['path'], always_2d=True, dtype='float32')
    metrics = audio_metrics(samples, rate, SECONDS)
    output = directory / 'mix.wav'
    sf.write(output, samples, rate, subtype='PCM_24')
    raw = Path(result.audios[0]['path'])
    return output, dict(model=model, seed=seed, bpm_prompt=case['bpm'], settings=params.__dict__,
        raw_sha256=hashlib.sha256(raw.read_bytes()).hexdigest(), mix_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
        audio=metrics, musical=musical_analysis(samples,rate,case['bpm']),
        loudness=loudness_metrics(output),reference_audio_used=False)


def execute(output, baseline_path):
    import gc
    import soundfile as sf
    import torch
    from acestep.inference import GenerationParams, GenerationConfig, generate_music
    from acestep.constants import TASK_INSTRUCTIONS
    from dj_model_study import verify_base
    from dj_track_worker import load_ace
    output = Path(output).resolve()
    output.mkdir(mode=0o700)
    (output / 'plan.json').write_text(json.dumps(plan(), indent=2) + '\n')
    started = time.monotonic(); tracks = []
    report = dict(status='RUNNING', elapsed_seconds=None, model=plan()['model'], tracks=tracks,
        human_listening='NOT RUN', quality_acceptance='NOT RUN', section_timeline='NOT RUN',
        comparison='NOT RUN', reference_audio_used=False)
    stage = 'generation'
    try:
        baseline_path = Path(baseline_path)
        baseline_data = baseline_path.read_bytes()
        baseline_expected = plan()['previous_jamloom_baseline']['sha256']
        if hashlib.sha256(baseline_data).hexdigest() != baseline_expected:
            raise ValueError('Previous Jamloom baseline does not match the pinned receipt')
        baseline_samples, baseline_rate = sf.read(baseline_path, always_2d=True, dtype='float32')
        baseline_audio = audio_metrics(baseline_samples, baseline_rate, 60)
        baseline_receipt = dict(path=plan()['previous_jamloom_baseline']['path'],
            sha256=baseline_expected, audio=baseline_audio,
            loudness=loudness_metrics(baseline_path), musical=musical_analysis(baseline_samples, baseline_rate, 128),
            original_report='renders/dj-quality-20261025/report.json')
        report['previous_jamloom_baseline'] = baseline_receipt
        engine = load_ace(planned=True, model='acestep-v15-turbo')
        for case in CASES:
            folder = output / case['id']; folder.mkdir(mode=0o700)
            track = dict(id=case['id'], mix=None, receipt=None, stems=[]); tracks.append(track)
            path, receipt = _render(case, engine, folder, 'acestep-v15-turbo')
            track.update(mix=str(path.relative_to(output)), receipt=receipt)
            (folder / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        del engine; gc.collect(); torch.cuda.empty_cache()
        stage = 'base-model-integrity'
        base_dir = Path.cwd() / 'checkpoints/acestep-v15-base'
        verify_base(base_dir, Path(__file__).with_name('dj-base-model.json'))
        engine = load_ace(planned=False, model='acestep-v15-base')
        stage = 'stem-extraction'
        for track, case in zip(tracks, CASES):
            source = output / track['mix']
            for stem in STEMS[case['id']]:
                seed = case['seed']
                instruction = TASK_INSTRUCTIONS['extract'].format(TRACK_NAME=stem.upper())
                params = GenerationParams(task_type='extract', instruction=instruction, src_audio=str(source),
                    caption='', lyrics='', instrumental=False, duration=-1, seed=seed, inference_steps=64,
                    guidance_scale=7.0, use_adg=True, shift=3.0, thinking=False, use_cot_metas=False,
                    use_cot_caption=False, use_cot_language=False, use_cot_lyrics=False)
                stem_dir = source.parent / 'stems' / stem; stem_dir.mkdir(parents=True, mode=0o700, exist_ok=True)
                config = GenerationConfig(batch_size=1, audio_format='wav32', use_random_seed=False, seeds=[seed])
                result = generate_music(*engine, params, config, save_dir=str(stem_dir / 'raw'))
                if not result.success or len(result.audios) != 1: raise RuntimeError(f'{stem} extraction failed; no automatic retry')
                samples, rate = sf.read(result.audios[0]['path'], always_2d=True, dtype='float32')
                metrics = audio_metrics(samples, rate, SECONDS)
                final = stem_dir / 'stem.wav'; sf.write(final, samples, rate, subtype='PCM_24')
                entry = dict(name=stem, file=str(final.relative_to(output)), sha256=hashlib.sha256(final.read_bytes()).hexdigest(), audio=metrics)
                track['stems'].append(entry)
        report['status'] = 'PASS technical'
        baseline = tracks[0]['receipt']
        report['section_timeline'] = 'PARTIAL; phrase-aligned change candidates are in each mix receipt; owner must label and confirm section roles.'
        report['comparison'] = {track['id']: dict(
            bpm_estimate=track['receipt']['musical']['bpm_estimate'],
            bpm_prompt=track['receipt']['bpm_prompt'],
            full_mix_loudness=track['receipt']['loudness'],
            opening_60s=segment_metrics(sf.read(output / track['mix'], always_2d=True, dtype='float32')[0], RATE, 60, track['receipt']['bpm_prompt']),
            previous_jamloom_baseline_60s=dict(
                bpm_estimate=baseline_receipt['musical']['bpm_estimate'],
                integrated_lufs=baseline_receipt['loudness']['integrated_lufs'],
                loudness_range_lu=baseline_receipt['loudness']['loudness_range_lu'],
                true_peak_dbfs=baseline_receipt['loudness']['true_peak_dbfs'],
                stereo_correlation=baseline_audio['stereo_correlation'],
                mono_fold_down_rms_loss_db=baseline_audio['mono_fold_down_rms_loss_db'])) for track in tracks[1:]}
        report['comparison_note'] = 'Numeric comparison is technical only. The previous serving-engine output is 60 seconds at its original 128 BPM prompt; candidates are full-length originals at 121–124 BPM. Owner should compare the opening minute and full-track progression by listening.'
    except Exception as exc:
        report.update(status='FAIL', failed_stage=stage, failure_type=type(exc).__name__, failure=str(exc)[:500])
        raise
    finally:
        report['elapsed_seconds'] = round(time.monotonic()-started, 2)
        (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', action='store_true')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--baseline', type=Path, default=JAMLOOM_BASELINE)
    args = parser.parse_args()
    if args.plan:
        print(json.dumps(plan(), indent=2)); return
    if args.output is None: parser.error('--output is required for a run')
    if args.output.exists(): parser.error('Output folder already exists; refusing overwrite')
    print(json.dumps(execute(args.output, args.baseline), indent=2))


if __name__ == '__main__': main()
