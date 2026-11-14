import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {CloudCapacity,stopOrphanedCapacity,emergencyCapacityStop,type CapacityProvider} from '../lib/cloud-capacity';
import {capacityPermit,type CapacityPermit} from '../lib/cloud-capacity-permit';
import {CLOUD_COST_PROFILE,CLOUD_4090_DIAGNOSTIC_PROFILE,CLOUD_WORKER_IMAGE} from '../lib/cloud-production-profile';
import {cloudSongConfig} from '../lib/cloud-song-config';
import {CloudSongs} from '../lib/cloud-songs';
import {cloudSongAPI} from '../lib/cloud-song-api';
import {DnaCommerce} from '../lib/dna-commerce';
import {localAudioStore} from '../lib/audio-store';

const permit=(now=Date.now()):CapacityPermit=>({id:'permit-'+randomUUID(),startsAt:now-1000,expiresAt:now+86400000,capMicros:2000000,cycleMicros:1000000,cycleSeconds:2400});
const config=(p:CapacityPermit)=>({JAMLOOM_CLOUD_SONGS_ENABLED:'true',RUNPOD_API_KEY:'fixture',RUNPOD_ENDPOINT_ID:'fixture',JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE,JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p)});
test('demand capacity is opt-in, finite, funded and cannot widen diagnostic access',()=>{
 assert.equal(capacityPermit({}),undefined);
 const p=permit();assert.deepEqual(capacityPermit(config(p),CLOUD_COST_PROFILE),p);
 for(const change of [{capMicros:1},{capMicros:100000001},{cycleMicros:1},{cycleSeconds:2401},{cycleSeconds:1800},{expiresAt:p.startsAt+8*86400000},{id:'bad'},{extra:true}])
  assert.throws(()=>capacityPermit(config({...p,...change}),CLOUD_COST_PROFILE));
 assert.throws(()=>cloudSongConfig({...config(p),JAMLOOM_CLOUD_COST_PROFILE:CLOUD_4090_DIAGNOSTIC_PROFILE},'improvise'),/private/);
 assert(cloudSongConfig({...config(p),JAMLOOM_CLOUD_COST_PROFILE:CLOUD_4090_DIAGNOSTIC_PROFILE},'improvise',true)?.demandPermit);
 assert.throws(()=>cloudSongConfig({...config(p),JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(p.startsAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:new Date(p.startsAt+2400000).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:'1000000'},'improvise'),/one capacity/);
});

test('database-independent emergency cleanup only stops the configured endpoint/image',async()=>{
 let image=CLOUD_WORKER_IMAGE,limits={min:1,max:1},stops=0;
 const provider:CapacityProvider={endpoint:async()=>({id:'fixture',image,workers:limits}),catalog:async()=>{throw Error('Not needed');},
  health:async()=>({jobs:{inQueue:0,inProgress:0},workers:{idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0}}),
  setWorkers:async n=>{assert.equal(n,0);stops++;limits={min:0,max:0};return {id:'fixture',image,workers:limits};}};
 assert.deepEqual(await emergencyCapacityStop('fixture',provider),{state:'off'});assert.equal(stops,1);
 await emergencyCapacityStop('fixture',provider);assert.equal(stops,1);
 image='foreign';await assert.rejects(emergencyCapacityStop('fixture',provider),/identity/);assert.equal(stops,1);
 image=CLOUD_WORKER_IMAGE;await assert.rejects(emergencyCapacityStop('another-endpoint',provider),/identity/);assert.equal(stops,1);
});

test('durable demand capacity: concurrent starts, full budget, lost responses, idle and expiry',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_capacity_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.href),directory=await mkdtemp(join(tmpdir(),'jamloom-capacity-'));
 let now=Date.now(),starts=0,stops=0,loseActivation=false,price=.75;
 const emptyWorkers={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0};
 const e={id:'fixture',image:CLOUD_WORKER_IMAGE,type:'QUEUE',disk:60,gpu:{count:1,pools:['AMPERE_24'],excludedTypes:[]},workers:{min:0,max:0},scaling:{type:'REQUEST_COUNT',requestCount:1},flashboot:'FLASHBOOT',networkVolumes:[],mounts:{network:[],global:[]}};
 let h={jobs:{inQueue:0,inProgress:0},workers:{...emptyWorkers}};
 const provider:CapacityProvider={endpoint:async()=>structuredClone(e),catalog:async()=>({gpus:[{id:'NVIDIA L4',pool:'AMPERE_24',price:{serverless:price}}]}),health:async()=>structuredClone(h),
  setWorkers:async n=>{e.workers={min:n,max:n};if(n){starts++;h.workers={...emptyWorkers,initializing:1};if(loseActivation)throw Error('Response lost after activation');}
   else{stops++;h={jobs:{inQueue:0,inProgress:0},workers:{...emptyWorkers}};}return structuredClone(e);}};
 const fresh=(p=permit(now))=>new CloudCapacity(pool,'fixture',CLOUD_COST_PROFILE,p,provider,()=>now);
 const start=async(c:CloudCapacity,owner:string)=>{await c.guardianHeartbeat();return c.prepare(owner);};
 const wake=async(c:CloudCapacity)=>{now+=1000;await c.guardianHeartbeat();h.workers={...emptyWorkers,running:1};assert.equal((await c.reconcile()).state,'ready');};
 const cool=async(c:CloudCapacity)=>{now+=120001;await c.guardianHeartbeat();assert.equal((await c.reconcile()).state,'off');};
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(let n=0;n<14;n++)await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['owner'+n,`owner${n}@example.test`]);
  await t.test('reads and recovery never start; concurrent explicit prepares activate once and reserve once',async()=>{
   const c=fresh();assert.equal(await c.state(),'off');assert.equal(await c.ready(300000),false);await c.reconcile();assert.equal(starts,0);
   assert.deepEqual(await Promise.all([start(c,'owner0'),start(c,'owner1')]),['preparing','preparing']);assert.equal(starts,1);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rows[0].reserved_micros),1000000);
   await wake(c);assert.equal(await c.ready(660000),true);assert.equal(await start(c,'owner1'),'ready');assert.equal(starts,1);
   await cool(c);await assert.rejects(start(c,'owner0'),/already prepared/);
   assert.equal(await start(c,'owner1'),'preparing');await wake(c);await cool(c);
   await assert.rejects(start(c,'owner2'),/currently unavailable/);assert.equal(starts,2);assert.equal(stops,2);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rows[0].reserved_micros),2000000);
   await assert.rejects(start(fresh({...c.permit,capMicros:3000000}),'owner2'),/changed after use/);
  });
  await t.test('warm joins refresh idle time without extending the funded lease or reserving another cycle',async()=>{
   const c=fresh();await start(c,'owner13');await wake(c);
   const initial=(await pool.query('SELECT * FROM cloud_capacity_cycles WHERE permit_id=$1',[c.permit.id])).rows[0],before=starts;
   now+=119000;await c.guardianHeartbeat();assert.equal(await c.state(),'ready');assert.equal(await c.ready(660000),true);
   assert.equal((await pool.query('SELECT busy_at FROM cloud_capacity_cycles WHERE id=$1',[initial.id])).rows[0].busy_at,null,'Read polling must not extend idle time');
   assert.equal(await c.prepare('owner0'),'ready');now+=2000;await c.guardianHeartbeat();assert.equal((await c.reconcile()).state,'ready');
   const joined=(await pool.query('SELECT * FROM cloud_capacity_cycles WHERE id=$1',[initial.id])).rows[0];
   assert.equal(joined.expires_at,initial.expires_at);assert.equal(starts,before);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rows[0].reserved_micros),1000000);
   now+=2100001;await assert.rejects(c.prepare('owner0'),/unavailable/);
   now=Number(initial.expires_at)-119999;await c.guardianHeartbeat();assert.equal(await c.prepare('owner0'),'unavailable');
   now=Number(initial.expires_at);assert.equal((await c.reconcile(true)).reason,'expired');assert.equal(e.workers.max,0);
  });
  await t.test('guardian stops workers without a durable activation record and never starts or reserves them',async()=>{
   const c=fresh(),before=starts,beforeStops=stops;
   e.workers={min:1,max:1};h.workers={...emptyWorkers,running:1};
   assert.equal((await c.reconcile()).state,'off');assert.equal(e.workers.max,1,'Ordinary reads do not mutate the provider');
   assert.equal((await c.reconcile(true)).state,'off');assert.equal(stops,beforeStops+1);assert.equal(starts,before);
   assert.equal((await pool.query('SELECT 1 FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rowCount,0);
   e.image='foreign';await assert.rejects(c.reconcile(true),/identity/);e.image=CLOUD_WORKER_IMAGE;
   h.workers={...emptyWorkers,initializing:1};await assert.rejects(c.reconcile(true),/shutdown unconfirmed/);h.workers={...emptyWorkers};
  });
  await t.test('a lost activation response stops and never retries or refunds its operator reservation',async()=>{
   const c=fresh(),before=starts;loseActivation=true;assert.equal(await start(c,'owner2'),'stopping');loseActivation=false;
   assert.equal(starts,before+1);assert.equal(await c.state(),'off');await c.reconcile();assert.equal(starts,before+1);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rows[0].reserved_micros),1000000);
  });
  await t.test('startup timeout and finite expiry shut down even with provider work',async()=>{
   const c=fresh();await start(c,'owner3');now+=1200001;await c.guardianHeartbeat();assert.equal((await c.reconcile()).reason,'startup-timeout');
   const d=fresh();await start(d,'owner4');await wake(d);h.jobs.inProgress=1;now+=180000;
   await d.guardianHeartbeat();assert.equal((await d.reconcile()).state,'ready');assert.equal(e.workers.min,1);
   now+=2400000;assert.equal((await d.reconcile()).reason,'expired');assert.equal(e.workers.max,0);
  });
  await t.test('durable activation intent without a provider call is closed, not replayed',async()=>{
   const c=fresh();await start(c,'owner5');e.workers={min:0,max:0};h.workers={...emptyWorkers};const before=starts;now+=31000;
   assert.equal((await c.reconcile()).reason,'activation-unconfirmed');assert.equal(starts,before);
  });
  await t.test('wrong endpoint identity or insufficient remaining permit cannot activate',async()=>{
   const c=fresh();await c.guardianHeartbeat();e.image='changed';const before=starts;await assert.rejects(start(c,'owner6'),/identity/);e.image=CLOUD_WORKER_IMAGE;
   await assert.rejects(fresh({...permit(now),expiresAt:now+10000}).prepare('owner6'),/unavailable/);assert.equal(starts,before);
  });
  await t.test('independent guardian is mandatory; stale heartbeat and removed configuration stop capacity',async()=>{
   const c=fresh();const before=starts;await assert.rejects(c.prepare('owner7'),/unavailable/);assert.equal(starts,before);
   await start(c,'owner7');await wake(c);now+=179000;assert.equal(await c.ready(300000),true);now+=1001;assert.equal(await c.ready(300000),false);
   assert.equal((await c.reconcile()).reason,'guardian-unavailable');assert.equal(e.workers.max,0);
   const d=fresh();await start(d,'owner8');assert.equal((await stopOrphanedCapacity(pool,'fixture',provider,()=>now)).state,'off');
   assert.equal(e.workers.max,0);assert.equal(await d.state(),'off');
  });
  await t.test('API requires verified owner, same origin, spendable credits and explicit prepare; no wallet hold',async()=>{
   const c=fresh(),settings=cloudSongConfig(config(c.permit),'improvise')!,commerce=new DnaCommerce(pool,'fixture-secret-'.repeat(4),localAudioStore(directory),{product:'improvise',budget:settings.budget});
   const noGeneration={dispatchEnabled:async()=>false,health:async()=>h,submit:async()=>{throw Error('Unexpected generation');},status:async()=>{throw Error('Unexpected generation');},cancel:async()=>{throw Error('Unexpected generation');}};
   const songs=new CloudSongs(commerce,settings,noGeneration,c);
   const req=(method='GET',origin='http://localhost')=>new Request('http://localhost/api/improvise/song',{method,...(method==='POST'?{headers:{Origin:origin,'Content-Type':'application/json','X-Jamloom-DNA':'1'},body:'{"action":"prepare"}'}:{})});
   const api=async(r:Request,owner:string|null)=>{const response=await cloudSongAPI(r,songs,owner,()=>{throw Error('Preparation must not submit a song');});assert(response);return response;};
   const before=starts;assert.equal((await api(req('POST'),null)).status,401);assert.equal((await api(req('POST','http://foreign.test'),'owner6')).status,403);
   assert.equal((await api(req('POST'),'owner6')).status,402);assert.equal(starts,before);
   await commerce.wallet.grant('owner6',{provider:'stripe_test',receipt:'capacity-test',credits:40,netMicros:30000000});
   const balance=await commerce.wallet.balance('owner6');await api(req(),'owner6');assert.equal(starts,before);
   await c.guardianHeartbeat();const prepared=await api(req('POST'),'owner6');assert.equal(prepared.status,202);assert.deepEqual(await prepared.json(),{state:'preparing',creditsUsed:0});
   assert.deepEqual(await commerce.wallet.balance('owner6'),balance);assert.equal((await pool.query('SELECT count(*)::int n FROM dna_song_jobs')).rows[0].n,0);
   await wake(c);await cool(c);
   const forged=new Request('http://localhost/api/improvise/song',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json','X-Jamloom-DNA':'1'},body:JSON.stringify({action:'prepare',review:{enabled:true,owners:['owner6'],expiresAt:now+86400000}})});
   assert.equal((await api(forged,'owner6')).status,429);
  });
  await t.test('a changed provider price stops the existing worker immediately',async()=>{
   const c=fresh();await start(c,'owner9');await wake(c);price=2;
   assert.equal(await c.ready(300000),false);assert.equal((await c.reconcile(true)).reason,'profile-unconfirmed');
   assert.equal(e.workers.max,0);price=.75;
  });
  await t.test('a transient running signal followed by initialization does not consume the idle window',async()=>{
   const c=fresh();await start(c,'owner10');await wake(c);
   now+=50000;h.workers={...emptyWorkers,initializing:1};await c.guardianHeartbeat();
   assert.equal((await c.reconcile()).state,'preparing');assert.equal(e.workers.max,1);
   now+=90000;await c.guardianHeartbeat();assert.equal((await c.reconcile()).state,'preparing');
   assert.equal(await c.ready(300000),false);assert.equal(e.workers.max,1);
   await wake(c);now+=110000;await c.guardianHeartbeat();assert.equal((await c.reconcile()).state,'ready');
   await cool(c);
  });
  await t.test('repeated readiness regression retains the original startup deadline',async()=>{
   const c=fresh(),started=now;await start(c,'owner11');await wake(c);
   now=started+1200001;h.workers={...emptyWorkers,initializing:1};await c.guardianHeartbeat();
   assert.equal((await c.reconcile()).reason,'startup-timeout');assert.equal(e.workers.max,0);
   assert.equal((await pool.query('SELECT reason FROM cloud_capacity_cycles WHERE permit_id=$1',[c.permit.id])).rows[0].reason,'startup-timeout');
  });
  await t.test('funded reviewers can prepare again, but public daily limits and aggregate reservations remain enforced',async()=>{
   const c=fresh(),settings=cloudSongConfig(config(c.permit),'improvise')!,review={enabled:true,owners:['owner12'],expiresAt:now+86400000,capMicros:1000000};
   const commerce=new DnaCommerce(pool,'fixture-secret-'.repeat(4),localAudioStore(directory),{product:'improvise',budget:settings.budget});
   await commerce.wallet.grant('owner12',{provider:'stripe_test',receipt:'review-capacity-test',credits:40,netMicros:30000000});
   const noGeneration={dispatchEnabled:async()=>false,health:async()=>h,submit:async()=>{throw Error('Unexpected generation');},status:async()=>{throw Error('Unexpected generation');},cancel:async()=>{throw Error('Unexpected generation');}};
   const songs=new CloudSongs(commerce,{...settings,review},noGeneration,c),before=starts,balance=await commerce.wallet.balance('owner12');
   await c.guardianHeartbeat();assert.equal((await songs.prepareCapacity('owner12')).state,'preparing');await wake(c);await cool(c);
   await assert.rejects(c.prepare('owner12'),/already prepared/);
   for(const invalid of [{...review,enabled:false},{...review,expiresAt:now},{...review,owners:['owner0']}])await assert.rejects(c.prepare('owner12',invalid),/already prepared/);
   await assert.rejects(songs.prepareCapacity('owner0'),/allowance is unavailable/);
   assert.equal(starts,before+1);
   assert.equal((await songs.prepareCapacity('owner12')).state,'preparing');await wake(c);await cool(c);
   await assert.rejects(songs.prepareCapacity('owner12'),/currently unavailable/);assert.equal(starts,before+2);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[c.permit.id])).rows[0].reserved_micros),2000000);
   assert.deepEqual(await commerce.wallet.balance('owner12'),balance);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();await rm(directory,{recursive:true,force:true});}
});
