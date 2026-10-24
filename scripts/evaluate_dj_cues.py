#!/usr/bin/env python3
"""Metadata-only cue prior; never resolves track IDs into audio downloads."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def candidates(row):
    grid = row['beat_grid']
    bpm, start, initial = grid['bpm'], grid['start_pos'], grid['init_beat']
    if (grid['time_sig'] != '4/4' or not all(math.isfinite(x) for x in (bpm, start, initial, row['duration']))
            or not 60 <= bpm <= 180 or initial not in (1, 2, 3, 4) or not 8 <= row['duration'] <= 1200):
        raise ValueError('Unsupported grid')
    origin = start - (initial - 1) * 60 / bpm
    phrase = 32 * 60 / bpm
    return [origin + i * phrase for i in range(math.ceil(row['duration'] / phrase) + 1)
            if 0 <= origin + i * phrase < row['duration']]


def score(predicted, actual, tolerance=.1):
    remaining = list(actual)
    hits = 0
    for value in predicted:
        if remaining:
            nearest = min(remaining, key=lambda t: abs(t-value))
            if abs(nearest-value) <= tolerance:
                hits += 1
                remaining.remove(nearest)
    return hits, len(predicted), len(actual)


def evaluate(train, heldout):
    # Only positional statistics are learned; unavailable audio cannot establish structure.
    counts, positive = Counter(), Counter()
    def bucket(t, row): return min(19, int(t / row['duration'] * 20))
    for row in train:
        for t in candidates(row):
            b = bucket(t, row)
            counts[b] += 1
            positive[b] += int(any(abs(t-c) <= .1 for c in row['cue_pts']))
    prior = {b: (positive[b]+1)/(counts[b]+2) for b in range(20)}
    totals = {name: [0, 0, 0] for name in ['first_four_phrase_points', 'learned_position_prior']}
    for row in heldout:
        points = candidates(row)
        proposals = {'first_four_phrase_points': points[:4],
                     'learned_position_prior': sorted(points, key=lambda t: (-prior[bucket(t, row)], t))[:4]}
        for name, predicted in proposals.items():
            totals[name] = [a+b for a, b in zip(totals[name], score(predicted, row['cue_pts']))]
    metrics = {}
    for name, (hits, predictions, labels) in totals.items():
        p, r = hits/max(1, predictions), hits/max(1, labels)
        metrics[name] = {'precision': p, 'recall': r, 'f1': 2*p*r/max(1e-12, p+r),
                         'hits': hits, 'predictions': predictions, 'labels': labels}
    return {'prior': prior, 'metrics': metrics}


def main():
    import pyarrow.parquet as pq
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists(): raise ValueError('Preserve existing results; choose a fresh path')
    acquisition = json.loads((ROOT/'docs/evidence/ai-dj-training-20261024/source-acquisition.json').read_text())
    splits = {}
    hashes = {}
    for item in acquisition['files']:
        path = ROOT/item['path']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != item['sha256']: raise ValueError('Source hash changed')
        hashes[path.name] = digest
        if path.suffix == '.parquet': splits[path.name.split('-')[0]] = pq.read_table(path, use_threads=False).to_pylist()
    valid = splits['valid']
    held_ids = {r['id'] for r in valid}
    held_artists = {r['artists'].casefold().strip() for r in valid}
    discarded = Counter()
    def clean(rows):
        result, seen = [], set()
        for row in rows:
            try:
                candidates(row)
                if row['id'] in seen: raise ValueError('Duplicate ID')
                if not row['cue_pts'] or not all(math.isfinite(t) and 0 <= t < row['duration'] for t in row['cue_pts']):
                    raise ValueError('Invalid cues')
                seen.add(row['id'])
                result.append(row)
            except (ValueError, TypeError, KeyError): discarded['invalid_or_duplicate'] += 1
        return result
    train = clean([r for r in splits['train'] if r['id'] not in held_ids and r['artists'].casefold().strip() not in held_artists])
    heldout = clean(valid)
    result = evaluate(train, heldout)
    result.update(schema='jamloom-cue-prior-1', status='PASS', source=acquisition['source'],
                  revision=acquisition['revision'], license='MIT metadata only', source_hashes=hashes,
                  train_rows=len(train), heldout_rows=len(heldout), discarded=dict(discarded),
                  test_duplicates_validation=splits['test'] == valid,
                  split='Publisher validation held out once; exact normalized artist strings and IDs excluded from training',
                  limitations=['No audio or deck-action learning', 'Full artist collaboration/session independence unverified',
                               'Four predictions per track; 100 ms matching; no tuning on held-out scores',
                               'Current player requires human-reviewed phrase points; fixed phrase grid is an offline proxy, not a listening benchmark'],
                  commercial_audio_used=False, promoted=False, gpu_cost_usd=0)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps({k: result[k] for k in ['train_rows', 'heldout_rows', 'test_duplicates_validation', 'metrics']}, indent=2))


if __name__ == '__main__': main()
