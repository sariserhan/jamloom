#!/usr/bin/env python3
"""Recreate the reviewed source-only audit cache; never installs or executes upstream code."""
import argparse,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def fetch(folder):
    rows=json.loads((ROOT/'docs/evidence/open-source-audit-20261026/sources.json').read_text())
    for row in rows:
        if 'error' in row:continue
        expected=f'https://raw.githubusercontent.com/{row["repository"]}/{row["commit"]}/{row["path"]}'
        if row['url']!=expected or '..' in Path(row['path']).parts or Path(row['path']).is_absolute():raise ValueError('Invalid pinned source reference')
        target=folder/row['repository'].replace('/','__')/'source'/row['path']
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==row['sha256']:continue
        with urllib.request.urlopen(row['url'],timeout=30) as response:data=response.read(1_500_001)
        if len(data)!=row['bytes'] or hashlib.sha256(data).hexdigest()!=row['sha256']:raise ValueError('Pinned source changed: '+row['path'])
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    return len(rows)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,default=Path('/tmp/jamloom-oss-audit-20261026'));args=p.parse_args();print('Verified source records:',fetch(args.output))
