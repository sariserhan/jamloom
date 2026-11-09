import json,math
from pathlib import Path
p=Path(__file__).parent
prior=json.loads(Path('docs/evidence/credit-repricing-20261108/pricing-scenarios.json').read_text())
receipts=json.loads((p/'endpoint-reconciliation.json').read_text())
rows=[]
for product in ['improvise','music-dna','ai-dj']:
 old=next(x for x in prior['scenarios'] if x['product']==product and x['retainedMonths']==60 and x['monthlyRedeemedCredits']==30000)
 provider=math.ceil(receipts['reports'][0]['postedTotalUSD']*1e6) if product=='music-dna' else old['providerMicros']
 # Assign the entire posted DNA + failed-Improvise window to its one delivered DNA song.
 overhead=old['overhead']; nonfixed=provider+old['overheadMicros']-overhead['infrastructure']; credits={'improvise':10,'music-dna':20,'ai-dj':2}[product]
 capacity=old['budgetMicros']-nonfixed
 minimumCredits=math.ceil(150_000_000*credits/capacity) if capacity>0 else None
 for monthlyCredits in [10000,30000,150000,300000]:
  allocation=math.ceil(150_000_000*credits/monthlyCredits);cost=nonfixed+allocation
  rows.append({'product':product,'monthlyRedeemedCredits':monthlyCredits,'retainedMonths':60,'postedProviderMicros':provider,'nonInfrastructureAllowancesMicros':old['overheadMicros']-overhead['infrastructure'],'infrastructureMicros':allocation,'totalScenarioMicros':cost,'netMicros':old['netMicros'],'margin':1-cost/old['netMicros'],'targetBudgetMicros':old['budgetMicros'],'status':'PASS_SCENARIO_ONLY' if cost<=old['budgetMicros'] else 'FAIL_SCENARIO','minimumMonthlyRedeemedCreditsAtTheseAssumptions':minimumCredits,'qualificationEnabled':False})
review=next(x for x in prior['scenarios'] if x['product']=='improvise' and x['retainedMonths']==60 and x['monthlyRedeemedCredits']==30000)
rp=math.ceil(receipts['reports'][1]['postedTotalUSD']*1e6)
r={'catalog':prior['catalog'],'status':'PARTIAL commercial qualification','source':'Endpoint and worker posted-charge reconciliation; existing owner-approved conservative allowances','assumptions':['150 USD monthly shared infrastructure allocation','Full redemption; conservative net credit floor unchanged','Five-year storage forecast; actual retention remains until deletion','Entire posted mixed DNA/failed-Improvise hour assigned to one successful DNA result','Posted snapshot is not a certified complete lifetime cost or final invoice'],'scenarios':rows,'reviewWindowImprovise':{'providerMicros':rp,'overheadMicros':review['overheadMicros'],'totalMicros':rp+review['overheadMicros'],'margin':1-(rp+review['overheadMicros'])/review['netMicros'],'scope':'Observed posted review-window charges plus forecast overhead only'},'qualificationEnabled':False,'missingRowsAreNotAutomaticallyZero':True}
(p/'cost-scenarios.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'at30000':[x for x in rows if x['monthlyRedeemedCredits']==30000],'review':r['reviewWindowImprovise']},indent=2))
