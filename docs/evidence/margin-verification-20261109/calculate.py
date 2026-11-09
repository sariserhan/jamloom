"""Reproducible cost sensitivity; estimates cannot enable renewal qualification."""
import json, math
from decimal import Decimal, ROUND_CEILING
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def read(path): return json.loads(path.read_text())
def ceil_micros(amount): return int((Decimal(str(amount))*1_000_000).to_integral_value(rounding=ROUND_CEILING))
def calculate():
 prior=read(ROOT/'docs/evidence/launch-audit-20261108/cost-scenarios.json')
 billing=read(HERE/'provider-billing.json')
 ledger=read(HERE/'ledger.json')
 config=read(HERE/'configuration.json')
 assert abs(billing['residualUSD'])<1e-9
 assert prior['catalog']=='2026-11-08-v3'
 cycle=config['JAMLOOM_CLOUD_CAPACITY_PERMIT']['cycleMicros']
 rows=[]
 for product,credits,hour in [('improvise',10,'2026-11-09 01:00:00'),('music-dna',20,'2026-11-02 06:00:00'),('ai-dj',2,None)]:
  base=next(r for r in prior['scenarios'] if r['product']==product and r['monthlyRedeemedCredits']==10000)
  if hour:
   matched=[r for r in billing['endpointId'] if r['time']==hour]
   assert len(matched)==1,'Expected exact historical cohort hour'
   provider=ceil_micros(matched[0]['amount'])
  else:provider=base['postedProviderMicros']
  variable=provider+base['nonInfrastructureAllowancesMicros']
  net=base['netMicros'];budget=base['targetBudgetMicros']
  minimum=math.ceil(150_000_000*credits/(budget-variable)) if budget>variable else None
  for volume in [1000,10000,30000]:
   overhead=math.ceil(150_000_000*credits/volume);total=variable+overhead
   rows.append({'product':product,'redeemedCreditsPerMonth':volume,'storageForecastMonths':60,
    'providerMicros':provider,'nonInfrastructureAllowancesMicros':base['nonInfrastructureAllowancesMicros'],
    'infrastructureMicros':overhead,'netMicrosPerUnitFloor':net,'costMicrosPerUnit':total,
    'marginPercent':100*(net-total)/net,'targetMarginPercent':65,
    'status':'PASS_SCENARIO_ONLY' if total<=budget else 'FAIL_SCENARIO',
    'minimumRedeemedCreditsPerMonthAt150USDSharedAllowance':minimum,
    'maximumSharedMonthlyUSDAtThisVolume':max(0,budget-variable)*volume/credits/1e6})
  if product!='ai-dj':
   assert cycle>budget
 # No division by zero, and no free/review receipts counted as customer income.
 settled=int(ledger['proceeds'][0]['settled_net_micros'])+sum(int(r['settled_micros']) for r in ledger['apple'])
 stress=[]
 for product,credits in [('improvise',10),('music-dna',20)]:
  r=next(x for x in rows if x['product']==product)
  stress.append({'product':product,'cycleReservationMicros':cycle,'oneDeliveredSongNetMicrosFloor':r['netMicrosPerUnitFloor'],
   'netCreditCostBudgetMicros':math.floor(r['netMicrosPerUnitFloor']*.35),
   'minimumDeliveredSongsToCoverFullCycleAt65PercentBeforeOtherCosts':math.ceil(cycle/math.floor(r['netMicrosPerUnitFloor']*.35)),
   'status':'DOES_NOT_ESTABLISH_65_PERCENT',
   'scope':'Reservation ceiling stress case, NOT a measured charge or guaranteed delivered throughput. No execution cost added a second time.'})
 return {'catalog':prior['catalog'],'qualification':'PARTIAL_NOT_VERIFIED','renewalsEligible':False,
  'settledCustomerNetMicros':settled,'observedCustomerMarginPercent':None,
  'observedMarginReason':'No settled customer revenue' if settled==0 else 'Complete matching period costs required',
  'currentModelAt10000Credits':'FAIL_SCENARIO',
  'assumptions':['Existing owner-approved USD150/month shared infrastructure allowance, not a measured ceiling',
   'Existing support, orchestration, inference contingency, metadata bandwidth and FX/tax-risk allowances retained',
   'Full redemption at conservative 40-percent retained-proceeds floor; not a claimed Stripe or Apple fee',
   'Five-year storage forecast is NOT a retention limit or lifetime guarantee',
   'Historical measured provider cohorts are NOT representative of all future startup, idle or failure conditions',
   'Shared preparation costs must be counted exactly once regardless of who funds them',
   'GPU20-percent allocation and provider reload are funding controls, not evidence of cost or full-redemption profitability'],
  'scenarios':rows,'cycleStress':stress,
  'missingEvidence':['Complete allocated monthly plan, headless, email, domain, backup and support expenses',
   'Representative current-image startup, idle, success and failed-cycle cost observations with delivery counts',
   'Funded retention model beyond the five-year forecast',
   'Observed customer redemptions and settled proceeds for an actual margin'],
  'qualificationEnabled':False}
if __name__=='__main__':
 result=calculate();(HERE/'qualification.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'qualification':result['qualification'],'settledNetMicros':result['settledCustomerNetMicros'],'at10000':[r for r in result['scenarios'] if r['redeemedCreditsPerMonth']==10000],'cycleStress':result['cycleStress']},indent=2))
