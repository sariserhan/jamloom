import './env';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {CREDIT_CATALOG_VERSION,songCreditPrice,DJ_CREDITS_PER_MINUTE,NET_MICROS_PER_CREDIT_FLOOR,TARGET_MARGIN_BPS} from '../lib/credit-catalog';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {CLOUD_COST_PROFILE,productionSongBudget} from '../lib/cloud-production-profile';
// Read-only. Historical timing estimates are never treated as provider invoices or qualification.
const root=resolve('../..'),trials=[];
for(const folder of ['docs/evidence/improvise-finish/cloud','docs/evidence/dna-completion/cloud']){
 for(const stamp of (await readdir(resolve(root,folder))).filter(s=>/^\d{4}-\d{2}-\d{2}T/.test(s)&&s>='2026-10-30').sort()){
  const path=resolve(root,folder,stamp,'trial-result.json');let bytes;try{bytes=await readFile(path);}catch{continue;}
  const d=JSON.parse(bytes.toString());
  trials.push({path:relative(root,path),sha256:createHash('sha256').update(bytes).digest('hex'),scope:d.scope,image:d.image,startedAt:d.startedAt,finishedAt:d.finishedAt,
   requests:(d.requests??[]).filter((r:any)=>r.provider_id).map((r:any)=>({product:r.product,state:r.state,providerState:r.provider_status,executionMs:Number(r.execution_ms??0),delayMs:Number(r.delay_ms??0),estimatedCostMicros:Number(r.estimated_cost_micros??0),seconds:r.duration})),cleanup:d.cleanup});
 }
}
const budget=(credits:number)=>Math.floor(credits*NET_MICROS_PER_CREDIT_FLOOR*(10000-TARGET_MARGIN_BPS)/10000);
const products=[{product:'improvise',...songCreditPrice('improvise')},{product:'music-dna',...songCreditPrice('music-dna')},{product:'ai-dj',version:CREDIT_CATALOG_VERSION,credits:DJ_CREDITS_PER_MINUTE}].map(p=>({...p,budgetMicros:budget(p.credits)}));
// The retained qualification harness pins 1000 micros/second. This is not a current provider tariff.
const qualification=cloudSongConfig({RUNPOD_API_KEY:'unused-offline-audit',RUNPOD_ENDPOINT_ID:'unused-offline-audit',JAMLOOM_CLOUD_SONGS_ENABLED:'true',JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND:'1000',CREDIT_BILLING_MODE:'test'})!;
const checks=products.filter(p=>p.product!=='ai-dj').map(p=>{
 const candidate=productionSongBudget(p.product as 'improvise'|'music-dna');
 return {...p,profile:CLOUD_COST_PROFILE,productionCapMicros:candidate.costCapMicros,fitsPublishedBudget:candidate.costCapMicros<=p.budgetMicros,
  executionSeconds:candidate.executionSeconds,ttlSeconds:candidate.ttlSeconds,
  historicalQualificationCapMicros:qualification.costCapMicros,historicalQualificationFitsBudget:qualification.costCapMicros<=p.budgetMicros};
});
const configuredLocalCaps=Object.fromEntries((['improvise','music-dna'] as const).map(product=>{
 try{return [product,cloudSongConfig({...process.env,JAMLOOM_CLOUD_SONGS_ENABLED:'true'},product)?.costCapMicros??null];}catch{return [product,null];}
}));
const records=trials.flatMap(t=>t.requests.map((r:any)=>({...r,path:t.path,image:t.image})));
const stats=products.map(p=>{const rows=records.filter((r:any)=>r.product===p.product),completed=rows.filter((r:any)=>r.state==='completed');return {product:p.product,requests:rows.length,completed:completed.length,unsuccessful:rows.length-completed.length,estimatedSuccessfulMicros:completed.length?{min:Math.min(...completed.map((r:any)=>r.estimatedCostMicros)),max:Math.max(...completed.map((r:any)=>r.estimatedCostMicros))}:null};});
const deployedPath='docs/evidence/release-completion-20261101/deployed-generation-result.json';
let deployedQualification:{status:string;path:string;sha256?:string}={status:'NOT RUN',path:deployedPath};
try{const bytes=await readFile(resolve(root,deployedPath)),result=JSON.parse(bytes.toString());deployedQualification={status:result.status??'UNKNOWN',path:deployedPath,sha256:createHash('sha256').update(bytes).digest('hex')};}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
console.log(JSON.stringify({at:new Date().toISOString(),status:checks.every(c=>c.fitsPublishedBudget)?'PARTIAL_PROVIDER_COSTS':'FAIL_CAP_COMPATIBILITY',catalog:CREDIT_CATALOG_VERSION,products,checks,configuredLocalCaps,historicalStats:stats,trials,
 deployedQualification,
 qualification:'NOT RUN: no complete attributable cost evidence for the live catalog',providerCosts:'Read the independently retained provider billing report; these job estimates are not invoices',
 missing:['Finalized allocation of cold start, idle, failed work and cancellations by worker version','Storage, retention, orchestration and support allocation',...(deployedQualification.status==='PASS'?[]:['Deployed generation under the reviewed production caps']),'AI DJ capacity and operating-cost qualification at the unchanged catalog'],
 next:'The bounded L4 song profiles fit the catalog mathematically. Reconcile deployed qualification and complete provider charges before enabling sales; compatibility alone is not economic qualification.',paidCompute:false,priceChanges:false,qualificationEnabled:false},null,2));
