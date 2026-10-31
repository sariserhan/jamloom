"""Losslessly archive only a finished local trial's private studio intermediates."""
import hashlib
import json
import lzma
from pathlib import Path
import shutil
import tarfile

from dj_metal_probe import save


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def archive(output):
    output=output.resolve();studio=output/'studio'
    execution=json.loads((output/'execution.json').read_text());result=json.loads((output/'result.json').read_text())
    if execution.get('status')!='PASS technical' or execution.get('child_stopped') is not True or result.get('status')!='PASS technical':
        raise ValueError('Only completed, stopped trials may be archived')
    if digest(output/'performance.wav')!=result['sha256']:raise ValueError('Final audio changed')
    if not studio.is_dir() or studio.is_symlink():raise ValueError('Expected private studio folder')
    entries=list(studio.rglob('*'))
    if any(p.is_symlink() or not (p.is_dir() or p.is_file()) for p in entries):raise ValueError('Unsafe studio entry')
    files={str(p.relative_to(output)):digest(p) for p in entries if p.is_file()}
    destination=output/'studio-preservation.tar.xz'
    if destination.exists():raise ValueError('Preserve existing archive')
    partial=destination.with_suffix('.partial')
    if partial.exists():raise ValueError('Preserve interrupted archive')
    with partial.open('xb') as raw,lzma.LZMAFile(raw,'w',filters=[{'id':lzma.FILTER_LZMA2,'preset':3,'dict_size':32*1024**2}]) as stream:
        with tarfile.open(fileobj=stream,mode='w|') as bundle:bundle.add(studio,arcname='studio')
    actual={}
    with tarfile.open(partial,'r:xz') as bundle:
        for member in bundle:
            if member.isdir():continue
            if member.islnk():actual[member.name]=actual[member.linkname]
            elif member.isfile():
                with bundle.extractfile(member) as stream:actual[member.name]=hashlib.file_digest(stream,'sha256').hexdigest()
            else:raise ValueError('Unsafe archive entry')
    if actual!=files:raise ValueError('Archive content differs; originals retained')
    if {str(p.relative_to(output)):digest(p) for p in studio.rglob('*') if p.is_file()}!=files:
        raise ValueError('Studio changed during archive; originals retained')
    partial.rename(destination)
    receipt=dict(status='PASS byte-exact archive',archive=destination.name,archive_sha256=digest(destination),files=files,
        final_audio_retained=True,removed_directory='studio',restoration='Extract the archive in this trial directory to restore all original studio paths')
    save(output/'archive.json',receipt)
    shutil.rmtree(studio)
    return receipt
