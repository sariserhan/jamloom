"""Install source-bound review pages on the existing local owner workspace."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

ROOT=Path(__file__).resolve().parents[1]


def prepare(workspace):
    public=workspace.resolve()/'public'
    if not public.is_relative_to(ROOT/'renders') or not (public/'index.html').is_file():raise ValueError('Existing local workspace required')
    if (public/'completion-assets.json').exists():raise ValueError('Preserve existing completion review')
    manifest={'singing':[],'afro':[]}
    def link(source,target,sha):
        if hashlib.sha256(source.read_bytes()).hexdigest()!=sha:raise ValueError('Review source changed')
        os.link(source,target)
    target=public/'singing-targets';target.mkdir()
    for name in ['deep-house-male','eurodance-female']:
        source=ROOT/'renders/produced-target-review-20261030';data=json.loads((source/(name+'.json')).read_text())
        link(source/(name+'.mp3'),target/(name+'.mp3'),data['recording_sha256'])
        shutil.copyfile(source/(name+'.json'),target/(name+'.json'))
        manifest['singing'].append({'id':data['recording_id'],'sha256':data['recording_sha256'],'seconds':120,'file':'singing-targets/'+name+'.mp3'})
    for source,name in [('produced-targets.html','index.html'),('produced-target-draft.js','produced-target-draft.js')]:shutil.copyfile(ROOT/'scripts/fixtures'/source,target/name)
    target=public/'afro-sections';target.mkdir()
    review=json.loads((ROOT/'docs/evidence/completion-closure-20261030/afro-full-review.json').read_text())
    for track in review['tracks']:
        if track['id'] in ('previous-house','matched-house-baseline'):continue
        link(ROOT/'renders/afro-house-owner-review-20261030'/track['file'],target/track['file'],track['sha256'])
        manifest['afro'].append({'id':track['id'],'sha256':track['sha256'],'seconds':300,'file':'afro-sections/'+track['file'],'title':track['id'].replace('-',' ').title()})
    assert len(manifest['afro'])==3
    shutil.copyfile(ROOT/'apps/listening/afro-sections.html',target/'index.html')
    (public/'completion-assets.json').write_text(json.dumps(manifest,indent=2)+'\n')
    p=public/'index.html';s=p.read_text();links='<section><h2>Review details</h2><p><a href="singing-targets/">Sung words and notes — save drafts here</a></p><p><a href="afro-sections/">Accepted Afro House mixes — section and control notes</a></p></section>'
    if '<script' not in s:raise ValueError('Expected owner workspace script marker')
    s=s.replace('href="http://127.0.0.1:8769/"','href="singing-targets/"').replace('href="http://127.0.0.1:8771/"','href="afro-sections/"')
    p.write_text(s.replace('<script',links+'<script',1))
    return {'status':'PASS preparation','singing_sources':2,'accepted_afro_mixes':3,'audio_copied_bytes':0,'human_observations':'NOT RUN','scoring_enabled':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--workspace',type=Path,required=True);args=parser.parse_args();print(json.dumps(prepare(args.workspace)))
