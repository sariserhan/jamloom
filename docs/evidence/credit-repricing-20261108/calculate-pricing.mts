import {readFile,writeFile} from 'node:fs/promises';
import {CREATOR_PLAN,TOP_UP,CREDIT_CATALOG_VERSION,NET_MICROS_PER_CREDIT_FLOOR,TARGET_MARGIN_BPS} from '../../../apps/site/lib/credit-catalog';
const earlier=JSON.parse(await readFile(new URL('../economic-closure-20261108/conservative-allowances.json',import.meta.url),'utf8'));
const posted=JSON.parse(await readFile(new URL('capacity-retest-20261108-provider-billing.json',import.meta.url),'utf8'));
if(posted.notYetReported.length||posted.rows.length!==1||!(posted.reportedUSD>0))throw Error('Incomplete staging billing snapshot');
const rows=earlier.scenarios.map((row:any)=>{
 const credits=row.product==='improvise'?10:row.product==='music-dna'?20:2;
 const netMicros=credits*NET_MICROS_PER_CREDIT_FLOOR;
 const budgetMicros=Math.floor(netMicros*(10000-TARGET_MARGIN_BPS)/10000);
 const overhead=Object.fromEntries(Object.entries(row.allowancesUSD).map(([k,v])=>[k,Math.round(Number(v)*1e6)])) as Record<string,number>;
 overhead.fxTaxRisk=Math.ceil(netMicros*.02);
 const overheadMicros=Object.values(overhead).reduce((s,n)=>s+n,0);
 const providerMicros=row.product==='improvise'?Math.ceil(posted.reportedUSD*1e6):row.providerUSD===null?null:Math.round(row.providerUSD*1e6);
 const total=providerMicros===null?null:providerMicros+overheadMicros;
 return {product:row.product,retainedMonths:row.retainedMonths,monthlyRedeemedCredits:row.monthlyRedeemedCredits,
  netMicros,budgetMicros,providerMicros,providerBasis:row.product==='improvise'?'Posted complete observed staging worker runtime; broader failed/review cohorts and final invoice remain incomplete':row.providerBasis,overheadMicros,overhead,
  knownOrEstimatedCostMicros:total,knownOrEstimatedMargin:total===null?null:1-total/netMicros,
  remainingProviderBudgetMicros:budgetMicros-overheadMicros,
  remainingBudgetAfterKnownOrEstimatedCostMicros:total===null?null:budgetMicros-total,
  planningStatus:total===null?'PARTIAL_MISSING_PROVIDER':total<=budgetMicros?'PASS_PLANNING_ONLY':'FAIL_PLANNING',
  commercialQualification:false};
});
const low=earlier.scenarios.find((r:any)=>r.product==='improvise'&&r.retainedMonths===60&&r.monthlyRedeemedCredits===30000);
const requiredMonthlyUSD=(low.knownOrEstimatedPlusAllowancesUSD-low.providerUSD+posted.reportedUSD-low.allowancesUSD.fxTaxRisk)/((1-TARGET_MARGIN_BPS/10000-.02)*10)*300/.4;
const result={catalog:CREDIT_CATALOG_VERSION,creator:CREATOR_PLAN,topup:TOP_UP,targetMarginBps:TARGET_MARGIN_BPS,
 netMicrosPerCreditFloor:NET_MICROS_PER_CREDIT_FLOOR,minimumCreatorUSDForLowVolumeImproviseEstimate:requiredMonthlyUSD,
 assumptionSource:'../economic-closure-20261108/conservative-allowances.json',
 unchangedAssumptions:['Full credit redemption','40% conservative retained proceeds, not an asserted Apple commission rate','Support, storage, shared infrastructure and provider estimates','All posted DJ failed-resource charges retained'],
 unknowns:['Complete failed/review song cohorts and final provider invoice','Music DNA full provider cohort','Actual launch demand and actual fixed/support costs','Storage beyond the forecast horizon'],
 optimizationSavingsAssumed:0,commercialQualification:false,scenarios:rows};
await writeFile(new URL('pricing-scenarios.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({catalog:CREDIT_CATALOG_VERSION,minimumCreatorUSD:requiredMonthlyUSD,lowVolumeFiveYear:rows.filter((r:any)=>r.retainedMonths===60&&r.monthlyRedeemedCredits===30000)},null,2));
