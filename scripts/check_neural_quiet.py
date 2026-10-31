"""Check an actual saved quiet capture against the accepted neural sample selector."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
from singer_studio import prepare_source,sample_candidate

ROOT=Path(__file__).resolve().parents[1]

def selection_check(path):
    rejected=[]
    for genre in ('jazz','funk','drumandbass'):
        with tempfile.TemporaryDirectory(prefix='jamloom-quiet-check-') as folder:
            work=Path(folder);source=prepare_source(path,work)
            if sample_candidate(work,{},genre,source['original_seconds'],4123,0) is None:rejected.append(genre)
    return dict(status='PASS' if len(rejected)==3 else 'FAIL',rejected_by=rejected,
        scope='Accepted neural sample selector only, before model generation; no upload, ASR, GPU or billing request')

def check(results):
    rows=[]
    for receipt in sorted(results.glob('*-silence.json')):
        if receipt.is_symlink() or receipt.stat().st_size>65536:raise ValueError('Invalid receipt')
        row=json.loads(receipt.read_text());p=row.get('payload',{})
        if row.get('status')!='OWNER_SUBMITTED_REQUIRES_EVALUATION' or row.get('kind')!='silence' or p.get('consent') is not True or p.get('kind')!='recorded_room_silence':raise ValueError('Actual consented quiet observation required')
        path=(results/p['file']).resolve()
        if not path.is_relative_to(results.resolve()) or path.is_symlink() or path.stat().st_size>1024**2:raise ValueError('Invalid recording path')
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        if sha!=p['sha256']:raise ValueError('Recording changed')
        rows.append(dict(receipt=receipt.name,source_sha256=sha,recorded=True,**selection_check(path)))
    return dict(status='NOT RUN' if not rows else 'PASS' if all(r['status']=='PASS' for r in rows) else 'FAIL',
        observations=rows,sampler_sha256=hashlib.sha256((ROOT/'scripts/singer_studio.py').read_bytes()).hexdigest(),
        no_model_generation=True,no_upload=True,synthetic_observations_used=False)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--results',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    report=check(a.results);a.output.write_text(json.dumps(report,indent=2)+'\n');print(report['status'])
