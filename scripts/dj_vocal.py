"""Sparse original hook candidate; listening qualification is required before promotion."""
import numpy as np
from scipy.signal import lfilter, find_peaks, resample_poly
import math
from dj_track_worker import ace, brief, HOOK_PHRASES


def steady_grid(samples, rate, estimate):
    mono = samples[:, 0]
    divisor = math.gcd(rate, 8000)
    mono = resample_poly(mono, 8000//divisor, rate//divisor)
    # Bass syncopation can hide the clock; a separate percussion-band pass keeps the same timing checks.
    for band in (lfilter([.1], [1, -.9], mono), mono-lfilter([.5], [1, -.5], mono)):
        grid = steady_band(band, estimate)
        if grid is not None: return grid
    return None


def steady_band(mono, estimate):
    envelope = np.sqrt(lfilter([.01], [1, -.99], mono*mono)[39::40])
    onset = np.maximum(0, np.diff(envelope, prepend=envelope[0]))
    peaks = find_peaks(onset)[0]
    peaks = np.array([p for p in peaks if onset[p] >= np.max(onset[max(0,p-8):p+9])], dtype=int)
    strong = sorted(onset[peaks], reverse=True)[:int(len(mono)/8000*estimate/60)]
    if not strong or np.median(strong)*.35 < .0001: return None
    peaks = peaks[onset[peaks] >= np.median(strong)*.35]
    if not len(peaks): return None
    attacks, strengths = peaks/200, onset[peaks]
    best, score = None, 0
    for bpm in np.arange(max(90, estimate-2), min(160, estimate+2)+.001, .05):
        period = 60/bpm
        for offset in np.arange(0, period, .005):
            times = np.arange(offset+period, len(mono)/8000-period, period)
            right = np.minimum(np.searchsorted(attacks, times), len(attacks)-1)
            left = np.maximum(right-1, 0)
            nearest = np.where(np.abs(attacks[left]-times) < np.abs(attacks[right]-times), left, right)
            error = np.abs(attacks[nearest]-times); matched = error<=.025
            if np.mean(matched)<.25: continue
            edges = np.diff(np.r_[False, matched, False].astype(int))
            lengths = np.flatnonzero(edges==-1)-np.flatnonzero(edges==1)
            if np.sum(lengths[lengths>=8])<32: continue
            regions=[(float(times[a]),float(times[b-1])) for a,b in zip(np.flatnonzero(edges==1),np.flatnonzero(edges==-1)) if b-a>=8]
            if not any(max(12,a)+4*period<=min(44+4*period,b) for a,b in regions): continue
            if np.sum(strengths[nearest[matched]])/np.sum(strengths)<.35: continue
            value = np.sum(strengths[nearest[matched]]*np.maximum(0, 1-error[matched]/.03))
            if value > score: best, score = (round(float(bpm),2), float(offset), regions), value
    return best


def add_hook(value, samples, rate, directory, engine, generate=ace):
    bpm = brief(value)[1]
    if bpm < 120: return samples, None  # Four beats would exceed the existing two-second vocal limit.
    grid = steady_grid(samples, rate, bpm)
    if not grid: return samples, None
    bpm, offset, regions = grid
    if bpm < 120: return samples, None
    phrase = HOOK_PHRASES[value['seed'] % len(HOOK_PHRASES)]
    voice, voice_rate = generate({**value, 'seed': value['seed'] ^ 0xa51c39ef}, directory/'hook', engine, hook=phrase)
    if voice.ndim!=2 or voice.shape[1]!=2 or not np.isfinite(voice).all() or not 9<=len(voice)/voice_rate<=11:
        raise ValueError('Invalid vocal output')
    divisor = math.gcd(rate, voice_rate)
    voice = resample_poly(voice, rate//divisor, voice_rate//divisor, axis=0)
    length = round(4*60/bpm*rate)
    activity = np.max(np.abs(voice), axis=1); peak = float(activity.max())
    if peak<.001: raise ValueError('Silent vocal output')
    first = max(0, int(np.flatnonzero(activity>peak*.15)[0])-round(.015*rate))
    # Keep a complete short phrase; never force a longer vocal into a two-second chop.
    active = np.flatnonzero(activity>peak*.15)
    if active[-1]-first > length-round(.06*rate): return samples, None
    clip = voice[first:first+length].copy()
    if len(clip)!=length: raise ValueError('Incomplete vocal phrase')
    fade = min(round(.03*rate), length//4)
    clip[:fade] *= np.linspace(0, 1, fade)[:, None]; clip[-fade:] *= np.linspace(1, 0, fade)[:, None]
    clip *= .18/max(float(np.max(np.abs(clip))), 1e-9)
    # Choose space in the midrange on a supported beat, not a guessed musical downbeat.
    mono = samples.mean(axis=1)
    def lowpass(hz):
        alpha = 1-math.exp(-2*math.pi*hz/rate)
        return lfilter([alpha], [1, alpha-1], mono)
    mids = lowpass(3000)-lowpass(300)
    candidates = offset+np.arange(math.ceil((12-offset)*bpm/60), math.floor((44-offset)*bpm/60)+1)*60/bpm
    candidates = [t for t in candidates if any(a-.001<=t and t+length/rate<=b+.001 for a,b in regions)]
    if not candidates: return samples, None
    start = float(min(candidates, key=lambda t: np.mean(mids[round(t*rate):round(t*rate)+length]**2)))
    index = round(start*rate); output = samples.copy()
    duck = np.ones(length)*.8; duck[:fade] = np.linspace(1, .8, fade); duck[-fade:] = np.linspace(.8, 1, fade)
    output[index:index+length] = output[index:index+length]*duck[:, None]+clip
    output *= min(1, .95/max(float(np.max(np.abs(output))), 1e-9))
    return output, dict(start=start, seconds=length/rate, bpm=bpm, repeat=value['sequence'] % 10 == 2, echo=value['sequence'] % 15 in (7,12))
