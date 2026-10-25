"""Sparse original hook candidate; listening qualification is required before promotion."""
import numpy as np
from scipy.signal import lfilter, find_peaks, resample_poly
import math
from dj_track_worker import ace, brief


def steady_grid(samples, rate, estimate):
    mono = samples[:, 0]
    divisor = math.gcd(rate, 8000)
    mono = resample_poly(mono, 8000//divisor, rate//divisor)
    low = lfilter([.1], [1, -.9], mono)
    rms = np.sqrt(np.mean(low[:len(low)//40*40].reshape(-1, 40)**2, axis=1))
    onset = np.maximum(0, np.diff(rms, prepend=rms[0]))
    peaks = find_peaks(onset)[0]
    strong = sorted(onset[peaks], reverse=True)[:int(len(mono)/8000*estimate/60)]
    if not strong or np.median(strong)*.35 < .0001: return None
    peaks = peaks[onset[peaks] >= np.median(strong)*.35]
    best, score = None, 0
    for bpm in np.arange(max(90, estimate-2), min(160, estimate+2)+.001, .05):
        period = 60/bpm
        for offset in np.arange(0, period, .005):
            times = np.arange(offset+period, len(mono)/8000-period, period)
            distances = np.abs(times[:, None]-peaks[None, :]/200)
            nearest = distances.argmin(axis=1); error = distances[np.arange(len(times)), nearest]
            if any(np.mean(group<=.025)<.8 for group in np.array_split(error, 3)): continue
            value = np.sum(onset[peaks[nearest]]*np.maximum(0, 1-error/.03))
            if value > score: best, score = (float(bpm), float(offset)), value
    return best


def add_hook(value, samples, rate, directory, engine, generate=ace):
    grid = steady_grid(samples, rate, brief(value)[1])
    if not grid: return samples, None
    bpm, offset = grid
    phrase = ('Feel alive', 'Keep moving', 'Stay together', 'One more')[value['seed'] % 4]
    voice, voice_rate = generate({**value, 'seed': value['seed'] ^ 0xa51c39ef}, directory/'hook', engine, hook=phrase)
    if voice.ndim!=2 or voice.shape[1]!=2 or not np.isfinite(voice).all() or not 9<=len(voice)/voice_rate<=11:
        raise ValueError('Invalid vocal output')
    divisor = math.gcd(rate, voice_rate)
    voice = resample_poly(voice, rate//divisor, voice_rate//divisor, axis=0)
    length = round(4*60/bpm*rate)
    activity = np.max(np.abs(voice), axis=1); peak = float(activity.max())
    if peak<.001: raise ValueError('Silent vocal output')
    first = max(0, int(np.flatnonzero(activity>peak*.15)[0])-round(.015*rate))
    clip = voice[first:first+length].copy()
    if len(clip)!=length: raise ValueError('Incomplete vocal phrase')
    fade = min(round(.03*rate), length//4)
    clip[:fade] *= np.linspace(0, 1, fade)[:, None]; clip[-fade:] *= np.linspace(1, 0, fade)[:, None]
    clip *= .18/max(float(np.max(np.abs(clip))), 1e-9)
    start = offset+round((30-offset)*bpm/60)*60/bpm
    index = round(start*rate); output = samples.copy()
    duck = np.ones(length)*.8; duck[:fade] = np.linspace(1, .8, fade); duck[-fade:] = np.linspace(.8, 1, fade)
    output[index:index+length] = output[index:index+length]*duck[:, None]+clip
    output *= min(1, .95/max(float(np.max(np.abs(output))), 1e-9))
    return output, dict(start=start, seconds=length/rate, bpm=bpm, repeat=value['sequence'] % 10 == 2)
