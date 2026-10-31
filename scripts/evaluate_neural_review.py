"""Evaluate only the owner's completed judgments for the exact frozen neural audio."""
import argparse
import json
from pathlib import Path
from collections import defaultdict
from owner_review_server import validate_music
from neural_review_policy import SCHEMA,NUMERIC
from summarize_listening import estimate

def summarize(study,key,submissions):
    if study.get('review_schema')!=SCHEMA or key['freeze']!=study['freeze']:raise ValueError('Wrong neural study')
    latest={}
    for payload in submissions:
        if payload.get('freeze')!=study['freeze']:continue
        validate_music(payload,study);latest.update(payload['ratings'])
    keys={b['id']:b['mapping'] for b in key['blocks']};scores=defaultdict(lambda:defaultdict(list));distinct=[]
    for block in study['blocks']:
        if block['id'] not in latest:continue
        ratings=latest[block['id']];mapping=keys[block['id']]
        if set(mapping)!=set('ABCDE') or set(mapping.values())!={'jazz','funk','drumandbass','old_baseline','stock_baseline'}:raise ValueError('Invalid organizer key')
        candidates=sorted(c for c in mapping if not mapping[c].endswith('_baseline'))
        distinct.append(all(ratings['distinct_pairs'][a+b]=='yes' for i,a in enumerate(candidates) for b in candidates[i+1:]))
        for code,style in mapping.items():
            values=ratings[code];metrics={f+'_1_5':int(values[f]) for f in NUMERIC}
            metrics.update(enjoyable=int(values['enjoyment'])>=4,share=values['share']=='yes',usable=values['usable']=='yes',technical_failure=values['technical_failure']=='yes')
            if block['kind'] in ('speech','syllabic_speech'):metrics['recognizable']=values['recognizable']=='yes'
            if code in candidates:
                for baseline in ('old_baseline','stock_baseline'):
                    control=next(c for c in mapping if mapping[c]==baseline)
                    metrics['preferred_over_'+baseline]=ratings['pairs'][''.join(sorted((code,control)))]==code
            for field,value in metrics.items():scores[style][field].append(value)
    results={}
    for style,metrics in scores.items():
        measured={f:estimate(v) for f,v in metrics.items()};checks={}
        if not style.endswith('_baseline'):
            for field,minimum in [('recognizable',.90),('enjoyable',.70),('share',.30),('usable',.80),('preferred_over_old_baseline',.70)]:
                mean=measured.get(field,{}).get('mean');checks[field]='NOT RUN' if mean is None else ('PASS' if mean>=minimum else 'FAIL')
            checks['zero_reported_severe_glitches']='PASS' if sum(metrics['technical_failure'])==0 else 'FAIL'
        results[style]=dict(metrics=measured,checks=checks)
    complete=len(latest)==len(study['blocks']) and len(latest)>=20
    passed=complete and len(distinct)==len(study['blocks']) and all(distinct) and all(
        results.get(style,{}).get('checks') and all(v=='PASS' for v in results[style]['checks'].values()) for style in ('jazz','funk','drumandbass'))
    return dict(status='NOT RUN' if not latest else 'PASS owner listening thresholds' if passed else 'FAIL owner listening thresholds' if complete else 'PARTIAL',
        freeze=study['freeze'],completed_blocks=len(latest),required_blocks=len(study['blocks']),distinct_generated_compositions_by_source=dict(zip([b['id'] for b in study['blocks'] if b['id'] in latest],distinct)),results=results,
        scope='One owner, source-level uncertainty only; no population listener claim. Recorded quiet rejection and hosted technical evidence are separate required gates.',
        drafts_count_as_judgments=False)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--review',type=Path,required=True);p.add_argument('--results',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    submissions=[]
    for file in sorted(a.results.glob('*.json')):
        if file.is_symlink() or file.stat().st_size>2*1024**2:raise ValueError('Unsafe result file')
        row=json.loads(file.read_text())
        if row.get('kind')=='music':
            if row.get('status')!='OWNER_SUBMITTED_REQUIRES_EVALUATION':raise ValueError('Wrong judgment provenance')
            submissions.append(row['payload'])
    result=summarize(json.loads((a.review/'review/study.json').read_text()),json.loads((a.review/'organizer-key.json').read_text()),submissions)
    a.output.write_text(json.dumps(result,indent=2)+'\n');print(result['status'])
