import {stopExpiredActiveCapacity} from '../lib/cloud-capacity-shutdown';
import test from 'node:test';
import {activeWorkerLease,assertActiveWorkerLease} from '../lib/cloud-capacity-lease';
import assert from 'node:assert/strict';
import {CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE,CLOUD_4090_DIAGNOSTIC_PROFILE,CLOUD_WORKER_IMAGE,assertProductionEndpoint} from '../lib/cloud-production-profile';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {reviewSongConfig} from '../lib/cloud-review-config';
import {assertCatalogBudget,songCreditPrice} from '../lib/credit-catalog';
import {RunpodProvider} from '../lib/runpod-provider';
import {releaseConfiguration} from '../scripts/release-preflight';
import {hasReadySongWorker} from '../lib/cloud-readiness';
const env={JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_API_KEY:'fixture',RUNPOD_ENDPOINT_ID:'fixture',CREDIT_BILLING_MODE:'live',VERCEL:'1',JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE};
const endpoint={id:'fixture',image:CLOUD_WORKER_IMAGE,type:'QUEUE',disk:60,gpu:{count:1,pools:['AMPERE_24'],excludedTypes:['other']},workers:{min:0,max:1},scaling:{type:'REQUEST_COUNT',requestCount:1},flashboot:'FLASHBOOT',networkVolumes:[],mounts:{network:[],global:[]}};
const catalog={gpus:[{id:'NVIDIA L4',pool:'AMPERE_24',price:{serverless:.75}},{id:'other',pool:'AMPERE_24',price:{serverless:3}}]};
test('admission accepts the observed active-worker counter without requiring cached readiness',()=>{
 const empty={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0},jobs={inQueue:0,inProgress:0};
 // Actual A5000 health at 2026-11-02T01:39:33.500Z. Active workers do not
 // enter the separate cached-ready counter; requiring both blocks every job.
 assert.equal(hasReadySongWorker({jobs:{completed:46,failed:18,inProgress:0,inQueue:0,retried:0},workers:{...empty,running:1}}),true);
 assert.equal(hasReadySongWorker({jobs,workers:{...empty,running:1,ready:1}}),true);
 for(const state of ['idle','ready'])assert.equal(hasReadySongWorker({jobs,workers:{...empty,[state]:1}}),false);
 assert.equal(hasReadySongWorker({jobs,workers:{...empty,idle:1,ready:1}}),false);
 for(const state of ['initializing','throttled','unhealthy'])for(const running of [0,1])assert.equal(hasReadySongWorker({jobs,workers:{...empty,running,[state]:1}}),false);
 for(const state of ['inQueue','inProgress'])assert.equal(hasReadySongWorker({jobs:{...jobs,[state]:1},workers:{...empty,running:1}}),false);
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

test('alternate GPU qualification cannot widen live production or escape its private lease',async()=>{
 const now=Date.now(),lease={startsAt:now-1000,expiresAt:now+30*60000,maxMicros:3000000};
 const candidate={...endpoint,gpu:{...endpoint.gpu,excludedTypes:['NVIDIA L4','other']},workers:{min:1,max:1}};
 const stock={gpus:[...catalog.gpus,{id:'NVIDIA RTX A5000',pool:'AMPERE_24',price:{serverless:.75}}]};
 assert.throws(()=>assertProductionEndpoint(candidate,stock,lease),/hardware or price/);
 assert.throws(()=>assertProductionEndpoint(candidate,stock,undefined,CLOUD_DIAGNOSTIC_PROFILE),/finite/);
 assertProductionEndpoint(candidate,stock,lease,CLOUD_DIAGNOSTIC_PROFILE);
 for(const bad of [{...candidate,gpu:{...candidate.gpu,excludedTypes:['other']}},{...candidate,workers:{min:0,max:1}},{...candidate,workers:{min:1,max:2}}])assert.throws(()=>assertProductionEndpoint(bad,stock,lease,CLOUD_DIAGNOSTIC_PROFILE));
 assert.throws(()=>assertProductionEndpoint(candidate,{gpus:stock.gpus.map(g=>g.id==='NVIDIA RTX A5000'?{...g,price:{serverless:.76}}:g)},lease,CLOUD_DIAGNOSTIC_PROFILE));
 assert.throws(()=>assertProductionEndpoint(candidate,stock,{...lease,expiresAt:now-1},CLOUD_DIAGNOSTIC_PROFILE),/lease/);
 const privateEnv={...env,JAMLOOM_CLOUD_COST_PROFILE:CLOUD_DIAGNOSTIC_PROFILE,JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(lease.startsAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(lease.expiresAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'3000000',JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:'reviewer',JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(lease.expiresAt).toISOString(),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:'3000000'};
 for(const product of ['improvise','music-dna'] as const){
  assert.throws(()=>cloudSongConfig(privateEnv,product),/restricted to private/);
  const review=reviewSongConfig(product,privateEnv,now)!;
  assert.equal(review.live,false);assert.deepEqual(review.review?.owners,['reviewer']);assert.equal(review.productionProfile,CLOUD_DIAGNOSTIC_PROFILE);
  assert.equal(review.costCapMicros,cloudSongConfig(env,product)!.costCapMicros);
 }
 assert.throws(()=>reviewSongConfig('music-dna',{...privateEnv,JAMLOOM_CLOUD_ACTIVE_LEASE_START:undefined,JAMLOOM_CLOUD_ACTIVE_LEASE_END:undefined,JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:undefined},now),/finite lease/);
 assert.throws(()=>new RunpodProvider('fixture','fixture',fetch,CLOUD_DIAGNOSTIC_PROFILE),/finite/);
 let calls=0;
 const provider=new RunpodProvider('fixture','fixture',async url=>{calls++;assert(!String(url).endsWith('/run'));return Response.json(String(url).endsWith('/catalog/gpus')?stock:candidate);},CLOUD_DIAGNOSTIC_PROFILE,lease);
 assert.equal(await provider.dispatchEnabled(),true);assert.equal(calls,2);
});


test('active capacity is finite, explicitly funded, hardware-bound and closed before expiry',async()=>{
 const now=Date.now(),lease={startsAt:now-1000,expiresAt:now+30*60000,maxMicros:3000000};
 assertActiveWorkerLease(lease,now,660000);
 for(const value of [{...lease,startsAt:now+1},{...lease,expiresAt:now},{...lease,expiresAt:now+41*60000},{...lease,maxMicros:1},{...lease,maxMicros:3000001},{...lease,maxMicros:NaN}])assert.throws(()=>assertActiveWorkerLease(value,now));
 assert.throws(()=>assertActiveWorkerLease(lease,now,31*60000));
 assert.equal(activeWorkerLease({}),undefined);
 assert.throws(()=>activeWorkerLease({JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(lease.expiresAt).toISOString()}));
 const leaseEnv={JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(lease.startsAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(lease.expiresAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'3000000'};
 assert.deepEqual(cloudSongConfig({...env,...leaseEnv},'music-dna')?.activeLease,lease);
 assert.throws(()=>cloudSongConfig({...env,...leaseEnv,JAMLOOM_CLOUD_COST_PROFILE:''},'music-dna'));
 const active={...endpoint,workers:{min:1,max:1}};
 assert.throws(()=>assertProductionEndpoint(active,catalog));assertProductionEndpoint(active,catalog,lease);
 assert.throws(()=>assertProductionEndpoint(active,catalog,{...lease,expiresAt:now-1}));
 assert.throws(()=>assertProductionEndpoint({...active,workers:{min:1,max:2}},catalog,lease));
 assert.throws(()=>assertProductionEndpoint({...active,image:'unreviewed'},catalog,lease));
 let submissions=0;
 const provider=new RunpodProvider('fixture','fixture',async url=>{if(String(url).endsWith('/run'))submissions++;return Response.json(String(url).endsWith('/catalog/gpus')?catalog:active);},CLOUD_COST_PROFILE,lease);
 assert.equal(await provider.dispatchEnabled(),true);assert.equal(submissions,0);
});

test('hosted watchdog disables only expired owned capacity and verifies the stop receipt',async()=>{
 const now=Date.now(),leaseEnv={...env,JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(now-2400000).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(now).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'3000000'};
 let mutations=0;
 const request:typeof fetch=async(url,options)=>{assert.equal(String(url),'https://api.runpod.io/v2/serverless/fixture');if(options?.method==='PATCH'){mutations++;assert.deepEqual(JSON.parse(String(options.body)),{workers:{min:0,max:0}});return Response.json({...endpoint,workers:{min:0,max:0}});}return Response.json({...endpoint,workers:{min:1,max:1}});};
 assert.deepEqual(await stopExpiredActiveCapacity({},request,now),{stopped:false});
 assert.deepEqual(await stopExpiredActiveCapacity(leaseEnv,request,now-1),{stopped:false});assert.equal(mutations,0);
 assert.deepEqual(await stopExpiredActiveCapacity(leaseEnv,request,now),{stopped:true,alreadyDisabled:false});assert.equal(mutations,1);
 assert.deepEqual(await stopExpiredActiveCapacity(leaseEnv,async()=>Response.json({...endpoint,workers:{min:0,max:0}}),now),{stopped:true,alreadyDisabled:true});
 await assert.rejects(stopExpiredActiveCapacity(leaseEnv,async()=>Response.json({...endpoint,id:'another'}),now),/identity/);
 await assert.rejects(stopExpiredActiveCapacity(leaseEnv,async(_url,o)=>o?.method==='PATCH'?new Response(null,{status:503}):Response.json(endpoint),now),/pending/);
 await assert.rejects(stopExpiredActiveCapacity(leaseEnv,async()=>Response.json(endpoint),now),/unconfirmed/);
});


test('4090 diagnostic preserves catalog budgets and rejects live access, underfunding and hardware drift',async()=>{
 const now=Date.now(),lease={startsAt:now-1000,expiresAt:now+30*60000,maxMicros:3000000};
 const candidate={...endpoint,gpu:{count:1,pools:['ADA_24'],excludedTypes:['other']},workers:{min:1,max:1}};
 const stock={gpus:[...catalog.gpus,{id:'NVIDIA GeForce RTX 4090',pool:'ADA_24',price:{serverless:1.34}}]};
 const privateEnv={...env,JAMLOOM_CLOUD_COST_PROFILE:CLOUD_4090_DIAGNOSTIC_PROFILE,JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(lease.startsAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(lease.expiresAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'3000000',JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:'reviewer',JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(lease.expiresAt).toISOString(),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:'3000000'};
 for(const [product,cap,execution,ttl] of [['improvise',69400,100,130],['music-dna',137800,250,310]] as const){
  assert.throws(()=>cloudSongConfig(privateEnv,product),/restricted to private/);
  const review=reviewSongConfig(product,privateEnv,now)!;
  assert.equal(review.live,false);assert.equal(review.productionProfile,CLOUD_4090_DIAGNOSTIC_PROFILE);
  assert.equal(review.rate,380);assert.equal(review.costCapMicros,cap);assert.equal(review.executionSeconds,execution);assert.equal(review.ttlSeconds,ttl);
  assertCatalogBudget(songCreditPrice(product),cap,true);
  assert.equal(review.budget.maxRuntimeMs/1000*review.rate+review.budget.fixedCostMicros,cap);
  assert.throws(()=>reviewSongConfig(product,{...privateEnv,JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'500000'},now),/selected hardware rate/);
 }
 assertProductionEndpoint(candidate,stock,lease,CLOUD_4090_DIAGNOSTIC_PROFILE);
 for(const profile of [CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE])assert.throws(()=>assertProductionEndpoint(candidate,stock,lease,profile));
 assert.throws(()=>assertProductionEndpoint(candidate,stock,undefined,CLOUD_4090_DIAGNOSTIC_PROFILE),/finite/);
 assert.throws(()=>assertProductionEndpoint(candidate,stock,{...lease,maxMicros:500000},CLOUD_4090_DIAGNOSTIC_PROFILE),/selected hardware rate/);
 for(const change of [{workers:{min:0,max:1}},{workers:{min:1,max:2}},{image:'changed'},{gpu:{...candidate.gpu,count:2}},{gpu:{...candidate.gpu,pools:['AMPERE_24']}}])assert.throws(()=>assertProductionEndpoint({...candidate,...change},stock,lease,CLOUD_4090_DIAGNOSTIC_PROFILE));
 for(const price of [1.35,0,NaN,Infinity])assert.throws(()=>assertProductionEndpoint(candidate,{gpus:[{...stock.gpus[2],price:{serverless:price}}]},lease,CLOUD_4090_DIAGNOSTIC_PROFILE));
 assert.throws(()=>assertProductionEndpoint(candidate,{gpus:[...stock.gpus,{id:'new-card',pool:'ADA_24',price:{serverless:1}}]},lease,CLOUD_4090_DIAGNOSTIC_PROFILE));
 assert.throws(()=>new RunpodProvider('fixture','fixture',fetch,CLOUD_4090_DIAGNOSTIC_PROFILE),/finite/);
 assert.throws(()=>new RunpodProvider('fixture','fixture',fetch,CLOUD_4090_DIAGNOSTIC_PROFILE,{...lease,maxMicros:500000}),/selected hardware rate/);
 let calls=0;
 const provider=new RunpodProvider('fixture','fixture',async url=>{calls++;assert(!String(url).endsWith('/run'));return Response.json(String(url).endsWith('/catalog/gpus')?stock:candidate);},CLOUD_4090_DIAGNOSTIC_PROFILE,lease);
 assert.equal(await provider.dispatchEnabled(),true);assert.equal(calls,2);
});
