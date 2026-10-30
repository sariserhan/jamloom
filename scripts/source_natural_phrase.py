"""Conservative pause-delimited excerpts. Quiet signal is not a word transcript."""
import numpy as np
from arrange_voice_research import RATE
from source_phrase_response import features


def select_phrase(pcm):
    features(pcm)  # Keep the existing finite, audible, 0.5–5 second input contract.
    hop = RATE // 100
    # Channel energy avoids treating stereo cancellation as a quiet boundary.
    energy = np.max(np.abs(pcm), axis=1)
    blocks = np.pad(energy, (0, (-len(energy)) % hop)).reshape(-1, hop)
    envelope = np.sqrt(np.mean(blocks**2, axis=1))
    threshold = min(.0015, float(envelope.max()) * .025)
    quiet = envelope < threshold
    changes = np.diff(np.r_[False, quiet, False].astype(int))
    gaps = [(int(a*hop), min(len(pcm), int(b*hop)))
            for a, b in zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1))
            if b-a >= 18 and a*hop > 0 and b*hop < len(pcm)]
    # Boundaries sit in the middle of >=180 ms quiet, leaving consonant margins.
    cuts = [0, *[(a+b)//2 for a, b in gaps], len(pcm)]
    candidates = [(a, b) for a, b in zip(cuts, cuts[1:])
                  if .8*RATE <= b-a <= 3.5*RATE
                  and np.sqrt(np.mean(pcm[a:b]**2)) >= .003]
    # Never shorten an already compact phrase. With no reliable pause, keep it
    # complete and let the musical slot grow instead of cutting at a beat limit.
    a, b = max(candidates, key=lambda pair: pair[1]-pair[0]) if gaps and len(pcm)>3.5*RATE and candidates else (0, len(pcm))
    return dict(start_frame=a, end_frame=b, full_input_used=a == 0 and b == len(pcm),
                boundary_policy='sustained_quiet_or_complete_input', quiet_gaps=gaps,
                minimum_quiet_seconds=.18, word_boundaries_verified=False,
                reason='Keep the complete input unless sustained quiet separates a usable phrase; no forced two-beat cut')
