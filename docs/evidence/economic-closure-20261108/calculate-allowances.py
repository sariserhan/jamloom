"""Offline planning sensitivity, USD. Forecasts never enter measured-cohort receipts."""
import json, math
from pathlib import Path
p=Path(__file__).resolve().parent
assumptions={
 'authorized':'Owner: Calculate conservative allowances',
 'support':{'purchaseContactFraction':0.05,'minutesPerContact':10,'hourlyUSD':30,'creditsPerPurchase':150},
 'fixedMonthlyUSD':150,'redeemedCreditsPerMonthScenarios':[30000,150000,300000],
 'fixedMonthlyCompositionUSD':{'webAndScheduledOperations':40,'database':40,'monitoringGuardianBackups':40,'billingRoundingAndContingency':30},
 'storageUSDPerGBMonth':0.015,'retainedMonthsScenarios':[12,60],
 'metadataBandwidthReserveUSDPerCredit':0.0001,
 'additionalInferenceReserveUSDPerCredit':0.0001,'fxTaxRiskFractionOfNetFloor':0.02,
 'netUSDPerCreditFloor':0.02,'targetMargin':0.65,
 'notes':['Planning allowances, not invoices or observed traffic. No free-tier discounts.',
 'Storage horizon is not a deletion rule: completed songs and ready saved sets remain until deleted. Longer retention costs more.',
 'DJ storage assumes every generated minute is saved at 2 MB/minute, above twice the requested 128 kbit/s recording rate. Browser bitrate is advisory, so actual file bytes still require measurement.',
 'Saved songs and sets use signed R2 download redirects with free R2 egress. Bandwidth reserve covers metadata and other traffic, not an invented charge for those audio downloads.',
 'GPU startup, idle and failures must be included in complete provider costs; they are not covered by the shared hosting reserve.',
 'Additional inference is a contingency for non-GPU calls, not a second charge for included model execution.',
 'Fixed hosting is a planning envelope, not a measured ceiling; verify invoices and actual redemptions before qualification.']}
products=[('improvise',10,9,0.003,0.05014,'execution estimate only; startup/idle/failure missing'),('music-dna',20,27,0.005,None,'no complete attributable cohort'),('ai-dj',2,2,0.001,0.008,'posted whole-instance cohort, including failed startup')]
rows=[]
for months in assumptions['retainedMonthsScenarios']:
 for volume in assumptions['redeemedCreditsPerMonthScenarios']:
  for name,credits,mb,orchestration,gpu,basis in products:
   support=.05*10/60*30/150*credits
   parts={'support':support,'storage':mb/1000*.015*months,'bandwidth':.0001*credits,'orchestration':orchestration,'inference':.0001*credits,'fxTaxRisk':.02*.02*credits,'infrastructure':150/volume*credits}
   parts={k:math.ceil(v*1e6)/1e6 for k,v in parts.items()}
   overhead=round(sum(parts.values()),6);budget=round(credits*.02*.35,6)
   total=None if gpu is None else round(gpu+overhead,6)
   rows.append({'product':name,'retainedMonths':months,'monthlyRedeemedCredits':volume,'unitBudgetUSD':budget,'providerUSD':gpu,'providerBasis':basis,'allowancesUSD':parts,'allowancesTotalUSD':overhead,'maximumWholeProviderUSD':round(budget-overhead,6),'knownOrEstimatedPlusAllowancesUSD':total,'planningStatus':'FAIL' if overhead>budget or total is not None and total>budget else 'PARTIAL','commercialQualification':False})
result={'scope':'Conservative planning sensitivity only; no tariff, retention or release change','assumptions':assumptions,'scenarios':rows}
(p/'conservative-allowances.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps([r for r in rows if r['retainedMonths']==60 and r['monthlyRedeemedCredits']==300000],indent=2))
