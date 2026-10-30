"""Install a frozen owner study without exposing its private organizer key."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil


def install(review,public,folder):
    if not re.fullmatch(r'music(?:-[a-z0-9]+)*',folder):raise ValueError('Invalid study folder')
    source=review/'review';study=json.loads((source/'study.json').read_text())
    if hashlib.sha256(json.dumps(study['blocks'],sort_keys=True).encode()).hexdigest()!=study['freeze']:raise ValueError('Study freeze mismatch')
    files=['index.html','strategy-review.js','owner-review.css','ATTRIBUTION.txt','study.json']
    hashes={}
    for block in study['blocks']:
        if not re.fullmatch(r'block-[0-9]{3}',block['folder']):raise ValueError('Invalid block folder')
        for name,sha in {'source':block['source_sha256'],**block['audio_sha256']}.items():
            if name not in ('source','A','B','C','D'):raise ValueError('Unexpected audio name')
            relative=block['folder']+'/'+name+'.wav';files.append(relative);hashes[relative]=sha
    for relative in files:
        path=source/relative
        if not path.resolve().is_relative_to(source.resolve()) or path.is_symlink() or not path.is_file():raise ValueError('Unsafe study asset')
        if relative in hashes and hashlib.sha256(path.read_bytes()).hexdigest()!=hashes[relative]:raise ValueError('Study audio changed')
    registry=public/'music-studies.json';mapping=json.loads(registry.read_text()) if registry.exists() else {}
    old=public/'music/study.json'
    if old.exists():mapping.setdefault(json.loads(old.read_text())['freeze'],'music')
    if study['freeze'] in mapping:raise ValueError('Study already registered')
    target=public/folder;target.mkdir()
    for relative in files:
        src=source/relative;dst=target/relative;dst.parent.mkdir(exist_ok=True)
        if src.suffix=='.wav':
            # Frozen PCM is immutable; hard links avoid another multi-GiB copy.
            os.link(src,dst)
        else:shutil.copyfile(src,dst)
    mapping[study['freeze']]=folder
    temp=registry.with_suffix('.tmp');temp.write_text(json.dumps(mapping,indent=2)+'\n');temp.replace(registry)
    return dict(status='PASS',freeze=study['freeze'],blocks=len(study['blocks']),verified_audio=len(hashes),public_folder=folder,private_key_served=False,audio_storage='Hard links to frozen immutable review audio')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--review',type=Path,required=True);p.add_argument('--public',type=Path,required=True);p.add_argument('--folder',required=True);a=p.parse_args()
    print(json.dumps(install(a.review,a.public,a.folder),indent=2))
