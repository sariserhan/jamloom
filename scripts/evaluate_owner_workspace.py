"""Summarize actual local owner submissions; never create judgments or train models."""
import argparse
import hashlib
import json
from datetime import datetime,timezone
from pathlib import Path
from collections import defaultdict

from owner_review_server import validate_music
from summarize_listening import estimate

BEFORE=('0','1','2','0','1','1')
AFTER=('1','0','2','0','1','1')


def reference_groups(records):
    """Connected components keep all shared origins together, including performer."""
    groups=[]
    for index,row in enumerate(records):
        keys={(field,row[field].strip().casefold()) for field in ('session_id','speaker_id','phrase_id')}
        if any(not value or value in ('unknown','unverified','tbd','?') for _,value in keys):raise ValueError('Unknown origin group')
        keys|={('asset',row['sha256']),('performer',row.get('performer_group','reference-maker'))}
        overlaps=[g for g in groups if g['keys']&keys]
        merged={'keys':set(keys),'records':[index]}
        for group in overlaps:merged['keys']|=group['keys'];merged['records']+=group['records'];groups.remove(group)
        groups.append(merged)
    return [sorted(g['records']) for g in groups]


def novice_result(payload):
    if payload.get('schema')!='jamloom-dj-novice-1' or payload.get('attested') is not True or payload.get('beginner') is not True:raise ValueError('No actual beginner attestation')
    if not payload['beforeAt']<payload['lessonAt']<payload['afterAt']:raise ValueError('Invalid assessment order')
    if any(len(payload.get(k,[]))!=6 or any(x not in ('0','1','2') for x in payload[k]) for k in ('before','after')):raise ValueError('Incomplete assessment')
    before=sum(x==y for x,y in zip(payload['before'],BEFORE));after=sum(x==y for x,y in zip(payload['after'],AFTER))
    return dict(observation='PASS recorded beginner before/after',before_correct=before,after_correct=after,questions=6,change=after-before,
                observed_improvement=after>before,scope='One owner beginner concept pilot; not hands-on mixing skill, retention, causal effect or general course effectiveness')


def music_summary(study,key,submissions):
    if key['freeze']!=study['freeze']:raise ValueError('Organizer freeze changed')
    latest={}
    for payload in submissions:validate_music(payload,study);latest.update(payload['ratings'])
    keys={b['id']:b['mapping'] for b in key['blocks']};by_style=defaultdict(lambda:defaultdict(lambda:defaultdict(list)));votes=defaultdict(lambda:defaultdict(list));variety=[]
    for block in study['blocks']:
        row=latest.get(block['id'])
        if row is None:continue
        mapping=keys[block['id']];control=next(c for c,s in mapping.items() if s=='baseline')
        candidates=sorted(c for c in mapping if c!=control)
        variety.append(all(row['distinct_pairs'][a+b]=='yes' for i,a in enumerate(candidates) for b in candidates[i+1:]))
        for code,style in mapping.items():
            values=row[code];metrics={'enjoyable':int(values['enjoyment'])>=4,'share':values['share']=='yes','technical_failure':values['technical_failure']=='yes',
                **{field+'_1_5':int(values[field]) for field in ('groove','coherence','originality','enjoyment')}}
            if block['kind'] in ('speech','syllabic_speech'):metrics['recognizable']=values['recognizable']=='yes'
            for name,value in metrics.items():by_style[style][block['source_id']][name].append(value)
            if style!='baseline':
                preferred=row['pairs'][''.join(sorted([code,control]))]
                votes[style][block['source_id']].append('win' if preferred==code else 'tie' if preferred=='tie' else 'loss')
    results={}
    for style,sources in by_style.items():
        metrics={name:estimate([sum(values[name])/len(values[name]) for values in sources.values() if name in values]) for name in ('recognizable','enjoyable','share','technical_failure','groove_1_5','coherence_1_5','originality_1_5','enjoyment_1_5')}
        decisions={source:'win' if rows.count('win')>len(rows)/2 else 'loss' if rows.count('loss')>len(rows)/2 else 'tie' for source,rows in votes[style].items()}
        targets={name:dict(threshold=threshold,observed=metrics[name]['mean'],status='NOT RUN' if metrics[name]['mean'] is None else ('PASS observed threshold' if metrics[name]['mean']>=threshold else 'FAIL observed threshold')) for name,threshold in (('recognizable',.90),('enjoyable',.70),('share',.30))}
        results[style]=dict(metrics=metrics,provisional_targets=targets,paired_clip_decisions=decisions,paired_clip_win_fraction=estimate([v=='win' for v in decisions.values()]))
    return dict(status='NOT RUN' if not latest else 'PARTIAL; human evidence review required',complete_blocks=len(latest),required_blocks=len(study['blocks']),
                all_blocks_complete=len(latest)==len(study['blocks']),owner_reports_three_generated_compositions_distinct=sum(variety),results=results,
                formal_M1='NOT RUN until complete judgments, recorded control and human evidence review',listener_policy='owner only')


def evaluate(workspace,review):
    observations=[]
    for path in sorted((workspace/'results').glob('*.json')):
        if path.is_symlink() or path.stat().st_size>2*1024**2:raise ValueError('Invalid observation path/size')
        row=json.loads(path.read_text())
        if row.get('status')!='OWNER_SUBMITTED_REQUIRES_EVALUATION':raise ValueError('Unexpected observation provenance')
        observations.append(row)
    report=dict(evaluated_at=datetime.now(timezone.utc).isoformat(),owner_submissions=len(observations),automated_answers_used=False,release='HELD by owner',live_payments='HELD by owner')
    if (review/'review/study.json').is_file():
        study=json.loads((review/'review/study.json').read_text());key=json.loads((review/'organizer-key.json').read_text())
        music=[r['payload'] for r in observations if r['kind']=='music']
        report['music']=music_summary(study,key,[p for p in music if p.get('freeze')==study['freeze']])
        report['music']['freeze']=study['freeze']
        report['music']['other_study_receipts_preserved']=sum(p.get('freeze')!=study['freeze'] for p in music)
    else:report['music']={'status':'PREPARING'}
    novice=[r for r in observations if r['kind']=='novice']
    report['novice']=novice_result(novice[0]['payload']) if novice else {'status':'NOT RUN; awaiting owner beginner exercise'}
    report['novice_receipts']=len(novice)
    report['distinct_novice_assessments']=len({json.dumps([r['payload'][k] for k in ('before','after','beforeAt','lessonAt','afterAt')],sort_keys=True) for r in novice})
    practice=[r['payload'] for r in observations if r['kind']=='practice']
    summaries=[dict(before={k:p['before'].get(k) for k in ('outcome','attempts','first_audio_seconds')},after={k:p['after'].get(k) for k in ('outcome','attempts','first_audio_seconds')},clarity=p['clarity'],enjoyment=p['enjoyment']) for p in practice]
    report['hands_on']=dict(status='PARTIAL; owner self-report requires review',observations=summaries,private_notes='Retained locally; omitted here',scope='Actual first-crossfade attempts; no general learning or mini-set claim') if practice else {'status':'NOT RUN; awaiting actual deck attempts'}
    latest_labels={}
    for row in observations:
        if row['kind']=='reference':
            for record in row['payload']['records']:latest_labels[(record['sha256'],tuple(record['source_seconds']))]=record
    labels=list(latest_labels.values())
    groups=reference_groups(labels)
    report['learned_data']=dict(status='PARTIAL' if labels else 'NOT RUN',verified_action_records=len(labels),independent_origin_components=len(groups),
        split_ready=len(groups)>=3,training='NOT RUN',reason='Preserve source, session, phrase, user speaker and performer groups. One maker cannot be split across train/dev/test; reference labels alone do not waive M1 or prove model benefit.')
    silence=[]
    for row in observations:
        if row['kind']!='silence':continue
        from arrange_voice_research import read_pcm,digest
        from source_strategy_response import compose,STRATEGIES
        payload=row['payload'];path=(workspace/'results'/payload['file']).resolve()
        if not path.is_relative_to((workspace/'results').resolve()) or digest(path)!=payload['sha256']:raise ValueError('Quiet control source changed')
        rejected=[]
        for strategy in STRATEGIES:
            try:compose(read_pcm(path,(.5,5)),4123,strategy)
            except ValueError as error:
                if not ('sil' in str(error).lower() or 'audible' in str(error).lower()):raise
                rejected.append(strategy)
        silence.append(dict(sha256=payload['sha256'],recorded=True,status='PASS' if len(rejected)==3 else 'FAIL audible/noisy recording was not rejected by every strategy',rejected_by=rejected))
    report['recorded_silence']=silence or {'status':'NOT RUN; awaiting owner quiet capture'}
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--workspace',type=Path,required=True);p.add_argument('--review',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    a=p.parse_args();result=evaluate(a.workspace,a.review);a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
