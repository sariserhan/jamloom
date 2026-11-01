import test from 'node:test';
import assert from 'node:assert/strict';
import {CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE,assertProductionEndpoint} from '../lib/cloud-production-profile';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {assertCatalogBudget,songCreditPrice} from '../lib/credit-catalog';
import {RunpodProvider} from '../lib/runpod-provider';
import {releaseConfiguration} from '../scripts/release-preflight';
import {hasReadySongWorker} from '../lib/cloud-readiness';
const env={JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_API_KEY:'fixture',RUNPOD_ENDPOINT_ID:'fixture',CREDIT_BILLING_MODE:'live',VERCEL:'1',JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE};
const endpoint={id:'fixture',image:CLOUD_WORKER_IMAGE,type:'QUEUE',disk:60,gpu:{count:1,pools:['AMPERE_24'],excludedTypes:['other']},workers:{min:0,max:1},scaling:{type:'REQUEST_COUNT',requestCount:1},flashboot:'FLASHBOOT',networkVolumes:[],mounts:{network:[],global:[]}};
const catalog={gpus:[{id:'NVIDIA L4',pool:'AMPERE_24',price:{serverless:.75}},{id:'other',pool:'AMPERE_24',price:{serverless:3}}]};
test('admission requires an idle or ready worker and an empty provider queue',()=>{
 const empty={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0},jobs={inQueue:0,inProgress:0};
 for(const state of ['idle','ready','running'])assert.equal(hasReadySongWorker({jobs,workers:{...empty,[state]:1}}),true);
 for(const state of ['initializing','throttled','unhealthy'])assert.equal(hasReadySongWorker({jobs,workers:{...empty,[state]:1}}),false);
 for(const bad of [null,{}, {jobs}, {jobs,workers:empty}, {jobs:{...jobs,inQueue:1},workers:{...empty,idle:1}}, {jobs:{...jobs,inProgress:1},workers:{...empty,ready:1}}, {jobs,workers:{...empty,idle:'1'}}, {jobs,workers:{...empty,idle:-1}}, {jobs,workers:{idle:1}}])assert.equal(hasReadySongWorker(bad),false);
});
test('production candidate preserves fixed prices and enforces the measured product deadlines',()=>{
 for(const [product,cap,execution,ttl] of [['improvise',68400,190,220],['music-dna',138800,480,540]] as const){
  const c=cloudSongConfig(env,product)!;
  assert.equal(c.costCapMicros,cap);assert.equal(c.executionSeconds,execution);assert.equal(c.ttlSeconds,ttl);
  assert.equal(c.budget.maxRuntimeMs/1000*c.rate+c.budget.fixedCostMicros,cap);assertCatalogBudget(songCreditPrice(product),cap,true);
 }
 assert.throws(()=>cloudSongConfig(env),/requires a product/);
 assert.throws(()=>cloudSongConfig({...env,JAMLOOM_CLOUD_COST_PROFILE:'unknown'},'improvise'),/Unknown/);
 assert.equal(cloudSongConfig({...env,JAMLOOM_CLOUD_SONGS_ENABLED:'false'},'improvise'),null);
 const report=releaseConfiguration(env);assert(report.cloudSongConfigValid);assert.deepEqual(report.cloudPriceCompatibility.map(x=>x.costCapMicros),[68400,138800]);assert.equal(report.credits.costQualified,false);
});
test('capacity refuses changed image, hardware, price, scaling and extra storage before dispatch',async()=>{
 assertProductionEndpoint(endpoint,catalog);
 for(const change of [{image:'new-image'},{disk:100},{type:'LOAD_BALANCER'},{workers:{min:1,max:1}},{workers:{min:0,max:2}},{gpu:{...endpoint.gpu,count:2}},{gpu:{...endpoint.gpu,pools:['ADA_24']}},{gpu:{...endpoint.gpu,excludedTypes:[]}},{scaling:{type:'QUEUE_DELAY'}},{flashboot:'PRIORITY'},{networkVolumes:['volume']},{mounts:{network:[],global:[{}]}}])assert.throws(()=>assertProductionEndpoint({...endpoint,...change},catalog));
 for(const gpus of [[],[...catalog.gpus,{id:'new-card',pool:'AMPERE_24',price:{serverless:.1}}],[{...catalog.gpus[0],price:{serverless:.76}}],[{...catalog.gpus[0],price:{}}]])assert.throws(()=>assertProductionEndpoint(endpoint,{gpus}));
 let calls=0;
 const request:typeof fetch=async url=>{calls++;assert(!String(url).endsWith('/run'));return Response.json(String(url).endsWith('/catalog/gpus')?catalog:endpoint);};
 assert.equal(await new RunpodProvider('fixture','fixture',request,CLOUD_COST_PROFILE).dispatchEnabled(),true);assert.equal(calls,2);
 const disabled=new RunpodProvider('fixture','fixture',async()=>Response.json({id:'fixture',workers:{min:0,max:0}}),CLOUD_COST_PROFILE);
 assert.equal(await disabled.dispatchEnabled(),false);
});
