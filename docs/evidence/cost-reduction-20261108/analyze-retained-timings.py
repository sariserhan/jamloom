"""Extract content-free observed timings and a clearly hypothetical overlap bound."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
from generation_timing import PHASES,MAX_EVENTS,MAX_MS

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('log',type=Path)
args=parser.parse_args()
traces=[]
for line in args.log.read_text().splitlines():
    if not line.startswith('data: ') or 'TIMINGS ' not in line:continue
    record=json.loads(line[6:]);value=record.get('line','')
    if 'TIMINGS ' not in value:continue
    trace=json.JSONDecoder().raw_decode(value.split('TIMINGS ',1)[1])[0]
    if trace.get('schema')=='jamloom-phase-timing-1' and trace.get('outcome')=='completed':traces.append(trace)
assert len(traces)==1,'Need exactly one completed observed timing trace'
trace=traces[0];events=trace['events'];assert 0<len(events)<=MAX_EVENTS
active={};durations={};intervals={};previous=0
for event in events:
    assert set(event)=={'phase','event','ms'}
    name=event['phase'];ms=event['ms']
    assert name in PHASES and type(ms) is int and previous<=ms<=MAX_MS
    previous=ms
    if event['event']=='start':
        assert name not in active;active[name]=ms
    else:
        assert event['event']=='end' and name in active
        duration=ms-active.pop(name)
        durations[name]=durations.get(name,0)+duration
        intervals.setdefault(name,[]).append(duration)
assert not active
assert len(intervals['identity-separate'])==len(intervals['identity-load'])==1
potential_ms=min(durations['identity-separate'],durations['identity-load'])
allowances=json.loads((ROOT/'docs/evidence/economic-closure-20261108/conservative-allowances.json').read_text())
row=next(r for r in allowances['scenarios'] if r['product']=='improvise' and r['retainedMonths']==60 and r['monthlyRedeemedCredits']==300000)
rate=allowances['assumptions']['improvisePlanningUSDPerSecond']
potential_usd=potential_ms/1000*rate
report={
    'status':'PASS retained timing extraction; NOT RUN candidate CUDA benchmark',
    'sourceLogSHA256':hashlib.sha256(args.log.read_bytes()).hexdigest(),
    'observedPhaseDurationsMS':durations,
    'observedPhaseIntervalsMS':intervals,
    'nestedDurationsMustNotBeSummed':True,
    'hypotheticalLoadOnlyOverlapSavingMS':potential_ms,
    'planningUSDPerGPUSecond':rate,
    'hypotheticalLoadOnlyOverlapSavingUSD':round(potential_usd,6),
    'observedSavingsUSD':None,
    'conservative44SecondCohortCostUSD':row['knownOrEstimatedPlusAllowancesUSD'],
    'hypotheticalCostIf44SecondCohortSavedSameLoadTimeUSD':round(row['knownOrEstimatedPlusAllowancesUSD']-potential_usd,6),
    'unitBudgetUSD':row['unitBudgetUSD'],
    'remainingReductionUSDUnderThatHypothesis':round(row['knownOrEstimatedPlusAllowancesUSD']-potential_usd-row['unitBudgetUSD'],6),
    'commercialQualification':False,
    'limits':['Observed timings belong to the 38-second review take, not the 44-second planning take.',
              'Parallel CPU contention, RAM pressure, imports and GPU allocation can erase the saving.',
              'No actual speedup, full invoice, owner listening acceptance or launch margin is established.']}
(Path(__file__).parent/'retained-timing-analysis.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
