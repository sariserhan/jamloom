"""Package only completed, independently cleaned neural stages into a blinded review."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
import numpy as np
from arrange_voice_research import digest,read_pcm
from q0_audit import loudness,level_match
from neural_review_policy import SCHEMA

ROOT=Path(__file__).resolve().parents[1]

def matched_audio(source,destination,compact=False):
    if not compact:return level_match(source,destination,-23,loudness(source))
    if destination.exists():raise ValueError('Preserve existing review audio')
    with tempfile.TemporaryDirectory(prefix='jamloom-review-match-',dir=destination.parent) as directory:
        wav=Path(directory)/'matched.wav'
        gain,measurement=level_match(source,wav,-23,loudness(source))
        subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(wav),'-c:a','flac',str(destination)],check=True,timeout=60)
        def pcm_hash(path):
            raw=subprocess.check_output(['ffmpeg','-nostdin','-v','error','-i',str(path),'-f','s16le','-c:a','pcm_s16le','-'],timeout=60)
            return hashlib.sha256(raw).hexdigest()
        before=pcm_hash(wav)
        if pcm_hash(destination)!=before:raise ValueError('Lossless review conversion changed audio')
        return gain,{**measurement,'lossless_pcm_sha256':before}

def review_page(template,blocks,required,partial):
    page=template.replace('original sound and four anonymous arrangements','original sound and five anonymous arrangements')
    if partial:
        page=page.replace('<h1>',f'<p role="note">Partial review: {blocks} of {required} sources are ready. These judgments cannot qualify the full study.</p><h1>',1)
    return page

def collect(root,manifest,controls,claims,partial=False):
    data=json.loads(manifest.read_text());control=json.loads(controls.read_text());sha=digest(manifest)
    assert control['manifest_sha256']==sha and control['technical']=='PASS'
    assert len(data['fixtures'])==69 and len(data['sources'])==23 and data['stages']==7
    records={};audio_hashes=set();receipts=[]
    for stage in range(1,8):
        if partial and not (claims/f'stage-{stage}.json').exists():continue
        claim=json.loads((claims/f'stage-{stage}.json').read_text());assert claim['manifest_sha256']==sha
        path=Path(claim['receipt']);assert path.resolve().is_relative_to(root.resolve())
        receipt=json.loads(path.read_text());post=json.loads((claims/f'stage-{stage}-postcheck.json').read_text())
        assert receipt['studyStage']==stage and receipt['studyManifestSha256']==sha
        assert (receipt['qualification'] in ('PASS','FAIL') if partial else receipt['qualification']=='PASS') and receipt['cleanup'] and receipt['creditSettlement']
        assert post['receipt']==str(path) and post['cleanup']=='PASS' and (post['qualification'] in ('PASS','FAIL') if partial else post['qualification']=='PASS')
        assert post['workerLimits']==[0,0] and post['workers']['summary']['total']==0 and not post['temporaryDatabases']
        expected=data['fixtures'][(stage-1)*10:stage*10]
        assert [r['label'] for r in receipt['requests']]==[r['label'] for r in expected]
        folder=root/'build-improvise-completion/cloud'/path.parent.name
        for row,fixture in zip(receipt['requests'],expected):
            if partial and row['finalState']!='completed':continue
            source=next(s for s in data['sources'] if s['id']==fixture['source_id'])
            assert row['finalState']=='completed' and row['saved'] and row['sourceBoundsVerified']
            assert row['sourceSha256']==source['sha256'] and row['studySourceId']==source['id']
            assert row['musicalDirection']['genre']==fixture['genre'] and row['musicalDirection']['energy']==fixture['energy']
            audio=folder/(fixture['label']+'.wav');assert digest(audio)==row['audioSha256']
            assert row['audioSha256'] not in audio_hashes;audio_hashes.add(row['audioSha256'])
            samples=read_pcm(audio,(45,45));assert np.max(np.abs(samples))<.999
            assert row['label'] not in records
            records[row['label']]=dict(path=str(audio),sha256=row['audioSha256'],source_excerpt=row['sourceExcerpt'],
                peak=float(np.max(np.abs(samples))),seconds=45,direction=row['musicalDirection'])
        receipts.append(dict(path=str(path),sha256=digest(path),postcheck_sha256=digest(claims/f'stage-{stage}-postcheck.json')))
    assert records if partial else len(records)==69
    assert {r['id'] for r in control['controls']}=={r['id'] for r in data['sources']}
    for row in control['controls']:
        for field in ('source','old_baseline','stock_baseline'):assert digest(root/row[field])==row[field+'_sha256']
    return data,control,records,receipts

def collect_local(root,data,campaign,records):
    state=json.loads(campaign.read_text())
    if state['status'] not in ('PASS local technical coverage','FAIL stopped'):
        raise ValueError('Wait for the local campaign to stop before freezing review audio')
    if state['manifest_sha256']!=digest(root/'renders/neural-qualification-20261030/manifest.json'):
        raise ValueError('Local campaign manifest changed')
    receipts=[];known={r['sha256'] for r in records.values()}
    folders=[Path(state['prior_local_pilot']),*[Path(r['directory']) for r in state['completed']]]
    for folder in folders:
        folder=folder.resolve()
        if not folder.is_relative_to((root/'renders').resolve()):raise ValueError('Invalid local result path')
        result=json.loads((folder/'result.json').read_text());execution=json.loads((folder/'execution.json').read_text())
        arrangement=json.loads((folder/'arrangement.json').read_text());fixture=result['fixture'];label=fixture['label']
        expected=next(f for f in data['fixtures'] if f['label']==label)
        source=next(s for s in data['sources'] if s['id']==fixture['source_id'])
        assert fixture==expected and label not in records
        assert result['status']==execution['status']=='PASS technical' and execution['child_stopped'] is True
        assert result['source_sha256']==source['sha256']==arrangement['original_recording_sha256']
        assert arrangement['sample_used'] is True and arrangement['events']
        excerpt=arrangement['source_excerpt'];a,b=excerpt['original_seconds'];assert 0<=a<b<=source['seconds']
        direction=arrangement['musical_direction'];assert direction['genre']==fixture['genre'] and direction['energy']==fixture['energy']
        audio=folder/'performance.wav';sha=digest(audio);assert sha==result['sha256'] and sha not in known
        samples=read_pcm(audio,(45,45));peak=float(np.max(np.abs(samples)));assert .001<peak<.999
        archived=folder/'archive.json'
        if archived.exists():
            proof=json.loads(archived.read_text());assert proof['status']=='PASS byte-exact archive'
            # Studio bundles exceed the recording input limit; hash them as streams.
            with (folder/'studio-preservation.tar.xz').open('rb') as stream:
                assert hashlib.file_digest(stream,'sha256').hexdigest()==proof['archive_sha256']
        known.add(sha)
        records[label]=dict(path=str(audio),sha256=sha,source_excerpt=excerpt,peak=peak,seconds=45,direction=direction,
            execution_scope='Local Metal, accepted generated singer reference and Demucs; hosted parity NOT RUN')
        receipts.append(dict(path=str(folder/'result.json'),sha256=digest(folder/'result.json'),execution_sha256=digest(folder/'execution.json')))
    return receipts


def prepare(manifest,controls,output,partial=False,local_campaign=None,compact=False):
    output=output.resolve()
    if output.exists() or not output.is_relative_to(ROOT/'renders'):raise ValueError('Use a new renders directory')
    if shutil.disk_usage(ROOT).free<(15*1024**3+64*1024**2 if compact else 17*1024**3):raise RuntimeError('Keep 15 GiB reserve plus review working space')
    data,control,records,receipts=collect(ROOT,manifest,controls,ROOT/'build-neural-qualification-20261030/claims',partial or local_campaign is not None)
    if local_campaign is not None:
        receipts.extend(collect_local(ROOT,data,local_campaign,records))
        if not partial and len(records)!=len(data['fixtures']):raise ValueError('Complete local coverage required')
    required_sources=len(data['sources'])
    sources=[s for s in data['sources'] if all(s['id']+'-'+direction in records for direction in ('jazz','funk','drumandbass'))]
    if not sources:raise ValueError('No complete three-direction source block is available')
    output.mkdir();review=output/'review';review.mkdir();blocks=[];keys=[]
    for source in sources:
        if shutil.disk_usage(ROOT).free<15*1024**3:raise RuntimeError('Disk reserve reached; preserve partial review')
        row=next(r for r in control['controls'] if r['id']==source['id']);folder=review/f'block-{len(blocks)+1:03d}';folder.mkdir()
        os.link(ROOT/row['source'],folder/'source.wav')
        choices=[(direction,Path(records[source['id']+'-'+direction]['path'])) for direction in ('jazz','funk','drumandbass')]
        choices.extend((name,ROOT/row[name]) for name in ('old_baseline','stock_baseline'))
        secrets.SystemRandom().shuffle(choices);mapping={};hashes={};levels={}
        for code,(strategy,path) in zip('ABCDE',choices):
            if shutil.disk_usage(ROOT).free<15*1024**3+64*1024**2:raise RuntimeError('Disk reserve reached; preserve partial review')
            audio=folder/(code+('.flac' if compact else '.wav'))
            gain,measurement=matched_audio(path,audio,compact)
            mapping[code]=strategy;hashes[code]=digest(audio);levels[code]=dict(gain_db=gain,**measurement)
        block=dict(id=source['id'],source_id=source['id'],kind=source['kind'],folder=folder.name,
            source_sha256=digest(folder/'source.wav'),audio_sha256=hashes)
        blocks.append(block);keys.append(dict(id=block['id'],mapping=mapping,levels=levels))
        print(source['id'],'five anonymous candidates ready',flush=True)
    freeze=hashlib.sha256(json.dumps(blocks,sort_keys=True).encode()).hexdigest()
    source_report=dict(manifest_sha256=digest(manifest),controls_sha256=digest(controls),receipts=receipts,outputs=records,technical='PASS',human_listening='NOT RUN',
        execution_scope='Mixed retained hosted and local outputs; not hosted qualification' if local_campaign else 'Retained hosted outputs')
    (output/'source-report.json').write_text(json.dumps(source_report,indent=2)+'\n')
    study=dict(version=2,review_schema=SCHEMA,freeze=freeze,blocks=blocks,listener='owner',ratings='NOT RUN',
        source_report_sha256=digest(output/'source-report.json'),coverage_complete=not partial,required_source_count=required_sources,
        candidate_format='flac' if compact else 'wav')
    (review/'study.json').write_text(json.dumps(study,indent=2)+'\n')
    (output/'organizer-key.json').write_text(json.dumps(dict(freeze=freeze,blocks=keys),indent=2)+'\n')
    for name in ('strategy-review.html','strategy-review.js','owner-review.css'):
        shutil.copyfile(ROOT/'apps/listening'/name,review/('index.html' if name.endswith('.html') else name))
    page=review/'index.html'
    page.write_text(review_page(page.read_text(),len(blocks),required_sources,partial))
    shutil.copyfile(manifest.parent/'ATTRIBUTION.txt',review/'ATTRIBUTION.txt')
    shutil.copyfile(ROOT/'docs/evidence/nondeployment-completion-20261030/listening-protocol.json',output/'evaluation-policy.json')
    (output/'preparation.json').write_text(json.dumps(dict(technical='PASS packaging',coverage='PARTIAL' if partial else 'COMPLETE',human_listening='NOT RUN',blocks=len(blocks),required_source_count=required_sources,candidates=5*len(blocks),freeze=freeze),indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--manifest',type=Path,required=True);p.add_argument('--controls',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--partial',action='store_true',help='Review completed source triples only; cannot qualify the full study');p.add_argument('--local-campaign',type=Path);p.add_argument('--compact',action='store_true',help='Lossless FLAC review copies with verified PCM identity');a=p.parse_args()
    prepare(a.manifest,a.controls,a.output,a.partial,a.local_campaign,a.compact)
