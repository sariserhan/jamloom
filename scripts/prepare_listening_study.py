#!/usr/bin/env python3
"""Prepare every frozen blind block for one resumable owner review; never create ratings."""
import argparse
import json
from pathlib import Path
import shutil
import tempfile

from prepare_listening_review import ROOT, build_review, bounded


def prepare(batch, output, clone_audio=False):
    batch, output = Path(batch).resolve(), Path(output).resolve()
    if output.exists() or output.is_relative_to(batch):
        raise ValueError('Choose a new directory outside the frozen batch')
    report = json.loads(bounded(batch / 'report.json', 4 * 2**20))
    rows = [r for r in report['records'] if r['packet'] == 'PASS']
    if not rows or len(rows) > 300 or len({r['block_id'] for r in rows}) != len(rows):
        raise ValueError('Expected unique accepted review blocks')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.jamloom-study-', dir=output.parent) as temporary:
        staged = Path(temporary) / 'study'
        staged.mkdir()
        blocks = []
        for number, row in enumerate(rows, 1):
            folder = f'block-{number:03d}'
            result = build_review(batch, row['clip_id'], row['seed'], staged / folder,
                                  owner_only=True, clone_audio=clone_audio)
            blocks.append(dict(number=number, url=folder + '/index.html', **result['packet']))
        study = dict(version=1, freeze_sha256=report['freeze_sha256'], listener_id='owner', blocks=blocks)
        (staged / 'study.json').write_text(json.dumps(study, indent=2) + '\n')
        for source, target in [('study.html', 'index.html'), ('study.js', 'study.js'), ('review.css', 'review.css')]:
            shutil.copyfile(ROOT / 'apps/listening' / source, staged / target)
        (staged / 'preparation.json').write_text(json.dumps(dict(status='PASS technical', blocks=len(blocks),
            human_listening='NOT RUN', audio_copy='APFS copy-on-write clones' if clone_audio else 'copies',
            freeze_sha256=study['freeze_sha256']), indent=2) + '\n')
        if output.exists():
            raise ValueError('Existing review must not be overwritten')
        staged.rename(output)

    return len(blocks)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--batch', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--clone-audio', action='store_true')
    a = p.parse_args()
    print(f'PASS: {prepare(a.batch, a.output, a.clone_audio)} blinded blocks prepared; human listening NOT RUN')
