"""Assemble a loopback-only owner workspace; preserve original reviews and results."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]


def prepare(output):
    if output.exists():raise ValueError('Preserve existing owner workspaces')
    permission=json.loads((ROOT/'docs/evidence/improvise-reference-study-20261030/permission.json').read_text())
    needed=sum((Path(permission['source'])/item['file']).stat().st_size for item in permission['files'])
    if shutil.disk_usage(output.parent).free<needed+15*1024**3:raise RuntimeError('Owner workspace needs its source copies plus 15 GiB reserve')
    public=output/'public';public.mkdir(parents=True)
    for name in ('owner-workspace.html','owner-review.css','novice.html','novice.js','practice-observation.html','practice-observation.js'):
        shutil.copyfile(ROOT/'apps/listening'/name,public/('index.html' if name=='owner-workspace.html' else name))
    reference=public/'reference';reference.mkdir()
    analysis=json.loads((ROOT/'docs/evidence/improvise-reference-study-20261030/recovered-summary.json').read_text())
    lengths={r['file']:r['seconds'] for r in analysis['files']};rows=[]
    for item in permission['files']:
        source=Path(permission['source'])/item['file']
        with source.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==item['sha256']
        shutil.copyfile(source,reference/item['file']);row=dict(item,seconds=lengths[item['file']])
        if item['file']=='question.mp3':row['confirmed_source_seconds']=[1.78,3.0]
        rows.append(row)
    (reference/'manifest.json').write_text(json.dumps(dict(files=rows,performer_voice_reuse=False),indent=2)+'\n')
    shutil.copyfile(ROOT/'apps/listening/reference-review.html',reference/'index.html')
    shutil.copyfile(ROOT/'apps/listening/reference-review.js',reference/'reference-review.js')
    (output/'results').mkdir()
    (output/'preparation.json').write_text(json.dumps(dict(status='PASS preparation',owner_observations='NOT RUN',publication=False,reference_files=len(rows)),indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();prepare(a.output)
