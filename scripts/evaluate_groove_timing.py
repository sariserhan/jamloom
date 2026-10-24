#!/usr/bin/env python3
"""Small MIDI timing/velocity experiment with entire drummers held out."""
import argparse
from collections import defaultdict
import csv
import hashlib
import json
import math
from pathlib import Path
from statistics import mean, median

ROOT = Path(__file__).resolve().parents[1]
HELD_OUT = {'drummer9', 'drummer10'}
METADATA_SHA = '3e17eef2f18012c0160c183ad5b106964eb429876cceb1eee1b746def4e6b11b'


def observations(midi, bpm):
    """Only constant-tempo 4/4 performances; residual from nearest sixteenth."""
    import mido
    if not 40 <= bpm <= 240 or midi.ticks_per_beat <= 0:
        raise ValueError('Unsupported tempo')
    tick = 0
    rows = []
    for msg in mido.merge_tracks(midi.tracks):
        if msg.time < 0:
            raise ValueError('Negative MIDI delta')
        tick += msg.time
        if msg.type == 'time_signature' and (msg.numerator, msg.denominator) != (4, 4):
            raise ValueError('Unsupported meter')
        if msg.type == 'set_tempo' and abs(60_000_000 / msg.tempo - bpm) > .1:
            raise ValueError('Tempo differs from metadata')
        if msg.type == 'note_on' and msg.velocity:
            beat = tick / midi.ticks_per_beat
            nearest = math.floor(beat * 4 + .5)
            rows.append((msg.note, nearest % 16, (beat - nearest / 4) * 60000 / bpm, msg.velocity))
    if not rows:
        raise ValueError('No notes')
    return rows


def fit(rows, by_step):
    groups = defaultdict(list)
    for note, step, offset, velocity in rows:
        groups[(note, step) if by_step else (note,)].append((offset, velocity))
    return {key: (median(x[0] for x in values), median(x[1] for x in values))
            for key, values in groups.items() if not by_step or len(values) >= 20}


def errors(rows, baseline, conditional=None):
    timing, velocity = [], []
    for note, step, offset, strength in rows:
        prediction = (conditional or {}).get((note, step), baseline.get((note,), (0, 80)))
        timing.append(abs(offset - prediction[0]))
        velocity.append(abs(strength - prediction[1]))
    return {'timing_mae_ms': mean(timing), 'velocity_mae': mean(velocity), 'notes': len(rows)}


def main():
    import mido
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Preserve previous experiment')
    source = ROOT / 'renders/ai-dj-training-sources/groove-midi-v1/groove'
    receipt_path = ROOT / 'docs/evidence/ai-dj-baseline-20261024/groove-midi-audit.json'
    receipt = json.loads(receipt_path.read_text())
    if hashlib.sha256((source / 'info.csv').read_bytes()).hexdigest() != METADATA_SHA:
        raise ValueError('Publisher split metadata changed')
    with (source / 'info.csv').open() as handle:
        metadata = list(csv.DictReader(handle))
    held_hashes = {receipt['midi_hashes'][r['midi_filename']] for r in metadata if r['drummer'] in HELD_OUT}
    training, held, skipped, used = [], [], [], []
    for row in metadata:
        filename = row['midi_filename']
        path = source / filename
        if path.is_symlink() or not path.resolve().is_relative_to(source.resolve()):
            raise ValueError('Invalid source path')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != receipt['midi_hashes'][filename]:
            raise ValueError('MIDI hash changed')
        test = row['drummer'] in HELD_OUT
        if row['time_signature'] != '4-4' or not test and digest in held_hashes:
            skipped.append(filename)
            continue
        try:
            notes = observations(mido.MidiFile(path), float(row['bpm']))
        except ValueError:
            skipped.append(filename)
            continue
        if test:
            held.append((row, notes))
        else:
            training.extend(notes)
            used.append(row)
    assert training and held
    assert not {r['drummer'] for r in used} & {r['drummer'] for r, _ in held}
    baseline, conditional = fit(training, False), fit(training, True)
    per_file = [{'file': row['midi_filename'], 'drummer': row['drummer'], 'style': row['style'],
                 'baseline': errors(notes, baseline), 'conditional': errors(notes, baseline, conditional)}
                for row, notes in held]
    metrics = {name: {metric: mean(r[name][metric] for r in per_file)
                     for metric in ('timing_mae_ms', 'velocity_mae')}
               for name in ('baseline', 'conditional')}
    result = {'status': 'PASS experiment', 'promoted': False, 'gpu_cost_usd': 0,
              'license': receipt['license'], 'source_archive_sha256': receipt['archive_sha256'],
              'source_audit_sha256': hashlib.sha256(receipt_path.read_bytes()).hexdigest(),
              'metadata_sha256': METADATA_SHA,
              'split': 'All drummer9/drummer10 performances held out; exact held-out file hashes excluded from training',
              'train_performances': len(used), 'train_notes': len(training),
              'heldout_performances': len(held), 'skipped_files': skipped,
              'baseline': 'Training median timing/velocity per MIDI note',
              'candidate': 'Training median per MIDI note and sixteenth position; >=20 observations, otherwise baseline',
              'metrics_performance_balanced': metrics, 'per_file': per_file,
              'parameters': [{'note': k[0], 'step': k[1], 'offset_ms': v[0], 'velocity': v[1]}
                             for k, v in sorted(conditional.items())],
              'limitations': ['Prediction benchmark, not audio generation or musical preference',
                              'Mostly non-club styles; no qualified target-genre generalization',
                              'Nearest-sixteenth assumption folds triplet/swing timing into residuals',
                              'Performer-independent, not guaranteed composition-independent',
                              'Fixed split/features before this evaluation; no tuning on these results',
                              'No expert DJ decisions, no automatic integration or promotion']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
    print(json.dumps({k: result[k] for k in ('train_performances', 'heldout_performances', 'metrics_performance_balanced')}, indent=2))


if __name__ == '__main__':
    main()
