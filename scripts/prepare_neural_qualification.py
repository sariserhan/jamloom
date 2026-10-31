"""Prepare hash-bound inputs for private neural evaluation; never upload or generate."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = [('jazz', 'low'), ('funk', 'medium'), ('drumandbass', 'high')]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(output):
    output = output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'renders'):
        raise ValueError('Use a new local renders directory')
    if shutil.disk_usage(ROOT).free < 16*1024**3:
        raise RuntimeError('Keep the 15 GiB reserve plus input preparation space')
    ledger = ROOT/'docs/evidence/licensed-evaluation/freeze.json'
    rows = json.loads(ledger.read_text())['dataset']['clips']
    recorded = [r for r in rows if r['source_kind'] == 'recorded']
    assert 20 <= len(recorded) <= 50
    assert {'speech', 'laughter', 'claps', 'noise'} <= {r['kind'] for r in recorded}
    output.mkdir(parents=True)
    sources = []; fixtures = []; credits = []
    for row in recorded:
        # Resolve the authorized brand/path migration without editing historical evidence.
        source = Path(row['path'].replace('/projects/djayvo/', '/projects/jamloom/'))
        assert source.resolve().is_relative_to(ROOT/'renders')
        assert sha(source) == row['sha256'] and row['consent']['local_processing'] is True
        assert row['license']['id'] in ('CC-BY-4.0', 'CC0-1.0', 'PD-author')
        pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(source),
            '-map', '0:a:0', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1'], timeout=30)
        assert 16000*.5 <= len(pcm)//2 <= 16000*5
        target = output/(row['id']+'.wav')
        with wave.open(str(target), 'wb') as wav:
            wav.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'));wav.writeframes(pcm)
        sources.append(dict(id=row['id'], kind=row['kind'], speaker_id=row.get('speaker_id'),
            original=str(source.relative_to(ROOT)), original_sha256=row['sha256'],
            path=str(target.relative_to(ROOT)), sha256=sha(target), seconds=len(pcm)/32000,
            license=row['license'], processing='Complete source, format conversion only; no trim or stretch'))
        credits.append(row['license']['attribution'])
        for genre, energy in DIRECTIONS:
            fixtures.append(dict(label=row['id']+'-'+genre, source_id=row['id'], genre=genre,
                energy=energy, voice='male', duration_seconds=45, visibility='private'))
    manifest=dict(schema='jamloom-neural-qualification-1',prepared_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        scope='Private evaluation only; cloud upload and paid execution require a separate explicit permit',
        source_ledger_sha256=sha(ledger), sources=sources, fixtures=fixtures, stage_size=10,
        stages=(len(fixtures)+9)//10, max_stage_usd=3, max_workers=1, max_stage_seconds=2400,
        shutdown_seconds=130, repeated_requests=0, stop_on_failure=True,
        image='ghcr.io/sariserhan/jamloom/music-worker@sha256:14b230760c1ab28a67bd2a596d179df2849025b7035a8a69b7fe203ef325dee1',
        source_selection='Musically fitting excerpts permitted; store actual source bounds and judge cuts from listening',
        control='Real quiet capture remains separate; never substitute synthetic quiet for that observation',
        training=False, publication=False, owner_judgments='NOT RUN')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (output/'ATTRIBUTION.txt').write_text('\n\n'.join(credits)+'\n')
    return manifest


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();m=prepare(args.output)
    print(json.dumps(dict(status='PASS preparation only',sources=len(m['sources']),requests=len(m['fixtures']),
        stages=m['stages'],maximum_usd=m['stages']*m['max_stage_usd'],uploads=0,provider_requests=0)))
