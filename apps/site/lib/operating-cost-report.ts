import {CREDIT_CATALOG_VERSION,DJ_CREDITS_PER_MINUTE,NET_MICROS_PER_CREDIT_FLOOR,TARGET_MARGIN_BPS,songCreditPrice} from './credit-catalog';
import {integer} from './economics';

export const overheadCategories=['orchestration','storage','bandwidth','inference','support','infrastructure','fxTaxRisk'] as const;
type EvidenceCost={micros:number|null;evidence:string|null};
export type OperatingCostCohort={
 id:string;catalog:string;product:'improvise'|'music-dna'|'ai-dj';
 deliveredUnits:number;failedRequests:number;
 resources:string[];
 // Whole resource charges include startup, idle and failed execution. Never add
 // a per-job GPU estimate on top of the same billed resource time.
 charges:{id:string;resource:string;micros:number;evidence:string}[];
 overhead:Record<typeof overheadCategories[number],EvidenceCost>;
};
function label(value:unknown){if(typeof value!=='string'||!value.trim()||value.length>1000)throw Error('Missing cost evidence identity');return value;}
export function operatingCostReport(input:OperatingCostCohort){
 label(input.id);if(input.catalog!==CREDIT_CATALOG_VERSION)throw Error('Cost evidence uses a different catalog');
 if(!['improvise','music-dna','ai-dj'].includes(input.product))throw Error('Unknown cost product');
 integer(input.deliveredUnits,0,1000000);integer(input.failedRequests,0,1000000);
 if(!Array.isArray(input.resources)||!input.resources.length||input.resources.length>10000)throw Error('Resource inventory required');
 input.resources.forEach(label);const resources=new Set(input.resources);if(resources.size!==input.resources.length)throw Error('Repeated resource identity');
 if(!Array.isArray(input.charges)||input.charges.length>100000)throw Error('Invalid charge list');
 const seen=new Set<string>(),reported=new Set<string>();let providerMicros=0;
 for(const row of input.charges){label(row.id);label(row.resource);label(row.evidence);integer(row.micros);
  if(!resources.has(row.resource)||seen.has(row.id))throw Error('Unattributed or duplicate provider charge');
  seen.add(row.id);reported.add(row.resource);providerMicros=integer(providerMicros+row.micros);
 }
 if(!input.overhead||Object.keys(input.overhead).length!==overheadCategories.length||overheadCategories.some(k=>!Object.hasOwn(input.overhead,k)))throw Error('Complete overhead categories required');
 const missingResources=input.resources.filter(id=>!reported.has(id)),missingOverhead:string[]=[];let overheadMicros=0;
 for(const category of overheadCategories){const value=input.overhead[category];if(!value||!Object.hasOwn(value,'micros')||!Object.hasOwn(value,'evidence'))throw Error('Invalid overhead entry');
  if(value.micros===null){missingOverhead.push(category);continue;}
  integer(value.micros);label(value.evidence);overheadMicros=integer(overheadMicros+value.micros);
 }
 const credits=input.product==='ai-dj'?DJ_CREDITS_PER_MINUTE:songCreditPrice(input.product).credits;
 const unitBudgetMicros=Math.floor(credits*NET_MICROS_PER_CREDIT_FLOOR*(10000-TARGET_MARGIN_BPS)/10000);
 const budgetMicros=integer(unitBudgetMicros*input.deliveredUnits),knownCostMicros=integer(providerMicros+overheadMicros);
 const complete=missingResources.length===0&&missingOverhead.length===0;
 const status=knownCostMicros>budgetMicros?'FAIL':!complete||!input.deliveredUnits?'PARTIAL':'PASS';
 return {id:input.id,catalog:input.catalog,product:input.product,status,
  scope:'Measured cohort only; not production qualification or permission to enable sales',
  deliveredUnits:input.deliveredUnits,failedRequests:input.failedRequests,unitBudgetMicros,budgetMicros,
  postedProviderMicros:providerMicros,knownOverheadMicros:overheadMicros,knownCostMicros,
  costPerDeliveredUnitMicros:input.deliveredUnits?Math.ceil(knownCostMicros/input.deliveredUnits):null,
  remainingBudgetMicros:budgetMicros-knownCostMicros,missingResources,missingOverhead,
  completeCostEvidence:complete,missingCostsAreNotZero:true,qualificationEnabled:false};
}
