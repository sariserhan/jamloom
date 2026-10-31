"""Validate source-bound owner annotations without enabling scoring or training."""
import hashlib
import json
import math
from pathlib import Path


def source(root,category,identity):
    manifest=json.loads((root/'completion-assets.json').read_text())
    rows=manifest.get(category,[])
    row=next((r for r in rows if r['id']==identity),None)
    if row is None:raise ValueError('Unknown review source')
    original=root/row['file'];path=original.resolve()
    if not path.is_relative_to(root.resolve()) or original.is_symlink() or not path.is_file():raise ValueError('Invalid source')
    if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('Review audio changed')
    return row


def number(value):
    return type(value) in (int,float) and math.isfinite(value)


def validate_target(payload,root):
    row=source(root,'singing',payload.get('recordingId'))
    if (payload.get('schema')!='jamloom-sung-target-draft-1' or payload.get('recordingSha256')!=row['sha256']
            or payload.get('seconds')!=row['seconds'] or payload.get('verified') is not False
            or payload.get('scoringEnabled') is not False):raise ValueError('Draft source or verification status changed')
    for kind,limit in [('words',2000),('notes',4000)]:
        items=payload.get(kind)
        if not isinstance(items,list) or len(items)>limit:raise ValueError('Invalid draft rows')
        previous=0
        for item in items:
            if not isinstance(item,dict):raise ValueError('Invalid interval')
            a,b=item.get('at'),item.get('end')
            if not number(a) or not number(b) or not previous<=a<b<=row['seconds']:raise ValueError('Invalid timing')
            previous=b
            if kind=='words':
                value=item.get('text')
                if not isinstance(value,str) or not value.strip() or len(value)>160 or any(ord(c)<32 for c in value):raise ValueError('Invalid word')
            elif item.get('note') is not None and (type(item['note']) is not int or not 21<=item['note']<=108):raise ValueError('Invalid note')


def validate_afro(payload,root):
    row=source(root,'afro',payload.get('id'))
    if (payload.get('schema')!='jamloom-afro-sections-1' or payload.get('audioSha256')!=row['sha256']
            or payload.get('attested') is not True):raise ValueError('Actual source-bound observation required')
    sections=payload.get('sections')
    if not isinstance(sections,list) or not 1<=len(sections)<=40:raise ValueError('Describe the sections heard')
    previous=-1
    for item in sections:
        if not isinstance(item,dict) or not number(item.get('at')) or not 0<=item['at']<row['seconds'] or item['at']<=previous:raise ValueError('Invalid section timing')
        previous=item['at']
        if not isinstance(item.get('name'),str) or not item['name'].strip() or len(item['name'])>160:raise ValueError('Name the section')
    if not isinstance(payload.get('controls'),str) or not 1<=len(payload['controls'].strip())<=2000:raise ValueError('Describe control preferences')
