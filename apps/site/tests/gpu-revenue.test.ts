import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet,type Purchase} from '../lib/wallet';
import {gpuRevenueBalance,settleGpuProceeds,runpodBalanceMicros} from '../lib/gpu-revenue';
import {capacityPermit,capacityPermitHash,capacityWindowOpen,seedPermit} from '../lib/cloud-capacity-permit';
import {CloudCapacity,type CapacityProvider} from '../lib/cloud-capacity';
import {CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE} from '../lib/cloud-production-profile';
import {creditCapacityForSales,creditLaunchAuthorized} from '../lib/credit-release';
import {CREDIT_CATALOG_VERSION,creditSalesQualified} from '../lib/credit-catalog';
import {operationAlerts} from '../lib/operations-monitor';

test('revenue funding verifies cash, survives duplicate/refund events and reserves before activation',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_revenue_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.href),wallet=new Wallet(pool,true);
 let now=Date.now(),starts=0,providerBalance=10000000,loseResponse=false;
 const empty={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0};let workers={...empty};
 const endpoint={id:'fixture',image:CLOUD_WORKER_IMAGE,type:'QUEUE',disk:60,gpu:{count:1,pools:['AMPERE_24'],excludedTypes:[]},workers:{min:0,max:0},scaling:{type:'REQUEST_COUNT',requestCount:1},flashboot:'FLASHBOOT',networkVolumes:[],mounts:{network:[],global:[]}};
 const seed={id:'revenue-fixture',startsAt:now-2*86400000,expiresAt:now-86400000,capMicros:10000000,cycleMicros:750000,cycleSeconds:2400};
 const env={JAMLOOM_GPU_REVENUE_SHARE_BPS:'2000',JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(seed),JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE,JAMLOOM_CLOUD_SONGS_ENABLED:'true',JAMLOOM_CREDIT_LAUNCH_APPROVAL:CREDIT_CATALOG_VERSION,RUNPOD_ENDPOINT_ID:'fixture'};
 const p=capacityPermit(env,CLOUD_COST_PROFILE)!;
 const provider:CapacityProvider={endpoint:async()=>structuredClone(endpoint),catalog:async()=>({gpus:[{id:'NVIDIA L4',pool:'AMPERE_24',price:{serverless:.75}}]}),health:async()=>({jobs:{inQueue:0,inProgress:0},workers}),balanceMicros:async()=>providerBalance,
  setWorkers:async n=>{endpoint.workers={min:n,max:n};workers={...empty,...(n?{initializing:1}:{})};if(n){starts++;assert((await pool.query('SELECT 1 FROM gpu_revenue_reservations')).rowCount,'Reservation must be committed before start');if(loseResponse)throw Error('Lost response');}return structuredClone(endpoint);}};
 const c=new CloudCapacity(pool,'fixture',CLOUD_COST_PROFILE,p,provider,()=>now);
 const purchase=(id:string,settled=true):Purchase=>({provider:'stripe_live',receipt:id,credits:150,netMicros:15000000,gpuProceeds:{chargeID:'ch_'+id,balanceID:'txn_'+id,grossCents:2200,feeCents:100,taxCents:200,settled}});
 const shutdown=async()=>{now+=2400000;assert.equal((await c.reconcile(true)).state,'off');await c.guardianHeartbeat();};
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(let i=0;i<12;i++)await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',['user'+i,`user${i}@example.test`]);
  await t.test('only approved share/profile continues after seed expiry; legacy hash stays unchanged',()=>{
   assert(capacityWindowOpen(p,now));assert(!capacityWindowOpen(seed,now));assert(creditLaunchAuthorized(env,now));assert.equal(creditSalesQualified(env),false);
   assert.deepEqual(seedPermit(p),seed);assert.notEqual(capacityPermitHash(p,'fixture',CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE),capacityPermitHash(seed,'fixture',CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE));
   assert.throws(()=>capacityPermit({...env,JAMLOOM_GPU_REVENUE_SHARE_BPS:'3500'},CLOUD_COST_PROFILE));
  });
  await t.test('expired seed and pending or test proceeds cannot activate or open checkout',async()=>{
   await c.guardianHeartbeat();assert.equal(await gpuRevenueBalance(pool),0);
   await assert.rejects(c.prepare('user0'),/unavailable/);assert.equal(starts,0);
   await wallet.grant('user0',purchase('pending',false));assert.equal(await gpuRevenueBalance(pool),0);
   await assert.rejects(new Wallet(pool).grant('user1',{...purchase('test'),provider:'stripe_test'}),/Only verified live/);
   assert.equal(await creditCapacityForSales(pool,env,now),false);
  });
  await t.test('settlement reads authoritative charge and credits precisely 20% after fees and tax once',async()=>{
   let status='pending';const stripe={charges:{retrieve:async(id:string)=>({id,livemode:true,paid:true,captured:true,currency:'usd',refunded:false,amount_refunded:0,disputed:false,balance_transaction:{id:'txn_pending',source:id,currency:'usd',amount:2200,fee:100,net:2100,exchange_rate:null,status}})}};
   assert.deepEqual(await settleGpuProceeds(pool,stripe as never),{checked:1,settled:0});assert.equal(await gpuRevenueBalance(pool),0);
   status='available';assert.deepEqual(await settleGpuProceeds(pool,stripe as never),{checked:1,settled:1});assert.equal(await gpuRevenueBalance(pool),3800000);
   await Promise.all(Array.from({length:5},()=>wallet.grant('user0',purchase('pending'))));assert.equal(await gpuRevenueBalance(pool),3800000);
   await assert.rejects(wallet.grant('user0',{...purchase('pending'),gpuProceeds:{...purchase('pending').gpuProceeds!,taxCents:0}}),/conflict/);
   await assert.rejects(wallet.grant('user1',{...purchase('duplicatecharge'),gpuProceeds:purchase('pending').gpuProceeds}),/unique/);
  });
  await t.test('empty provider balance rejects despite ledger funds; concurrent prepares reserve and start once',async()=>{
   providerBalance=0;await assert.rejects(c.prepare('user0'),/unavailable/);assert.equal(starts,0);
   providerBalance=10000000;assert.deepEqual(await Promise.all([c.prepare('user0'),c.prepare('user1')]),['preparing','preparing']);assert.equal(starts,1);assert.equal(await gpuRevenueBalance(pool),3050000);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[seed.id])).rows[0].reserved_micros),0,'Expired unused seed is not renewed');
   assert(await creditCapacityForSales(pool,env,now));await shutdown();
   assert.equal(await gpuRevenueBalance(pool),3050000,'Shutdown does not invent a provider refund');
  });
  await t.test('refund after spending creates debt; duplicate and delayed events cannot revive funds',async()=>{
   await wallet.freezePurchase('stripe_live','pending');assert.equal(await gpuRevenueBalance(pool),-750000);
   await wallet.freezePurchase('stripe_live','pending');assert.equal(await gpuRevenueBalance(pool),-750000);
   await assert.rejects(wallet.grant('user0',purchase('pending')),/held/);await assert.rejects(c.prepare('user2'),/unavailable/);
   await wallet.freezePurchase('stripe_live','beforepaid');await assert.rejects(wallet.grant('user2',purchase('beforepaid')),/held/);
   assert.equal(await creditCapacityForSales(pool,env,now),false);
  });
  await t.test('new proceeds first cover refund debt; lost activation response retains its reservation',async()=>{
   await wallet.grant('user3',purchase('second'));assert.equal(await gpuRevenueBalance(pool),3050000);
   loseResponse=true;assert.equal(await c.prepare('user3'),'stopping');assert.equal(await gpuRevenueBalance(pool),2300000);assert.equal(endpoint.workers.max,0);assert.equal(starts,2);loseResponse=false;
   await c.reconcile(true);assert.equal(starts,2);
   await pool.query('UPDATE "user" SET email=$2,name=$3,suspended=true WHERE id=$1',['user3','deleted@example.invalid','Deleted account']);assert.equal(await gpuRevenueBalance(pool),2300000,'Account anonymization cannot erase payment or spending evidence');
   await wallet.freezePurchase('stripe_live','second');assert.equal(await gpuRevenueBalance(pool),-1500000);
  });
  await t.test('finite seed remains independently bounded when revenue is enabled',async()=>{
   const liveSeed={...seed,id:'unexpired-seed',startsAt:now-1000,expiresAt:now+86400000,capMicros:750000};
   const current={...liveSeed,revenueShareBps:2000 as const};const s=new CloudCapacity(pool,'fixture',CLOUD_COST_PROFILE,current,{...provider,setWorkers:async n=>{endpoint.workers={min:n,max:n};workers={...empty,...(n?{initializing:1}:{})};return structuredClone(endpoint);}},()=>now);
   await s.guardianHeartbeat();assert.equal(await s.prepare('user4'),'preparing');now+=2400000;assert.equal((await s.reconcile(true)).state,'off');await s.guardianHeartbeat();await assert.rejects(s.prepare('user5'),/unavailable/);
   assert.equal(Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[liveSeed.id])).rows[0].reserved_micros),750000);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});

test('provider credit checks fail closed and cannot issue mutations',async()=>{
 const request=(value:any)=>async(_url:any,o:any)=>{assert.equal(o.method,'POST');assert.equal(JSON.parse(o.body).query,'query { myself { clientBalance underBalance } }');return Response.json(value);};
 assert.equal(await runpodBalanceMicros('fixture',request({data:{myself:{clientBalance:2.5,underBalance:false}}}) as never),2500000);
 assert.equal(await runpodBalanceMicros('fixture',request({data:{myself:{clientBalance:2.5,underBalance:true}}}) as never),0);
 for(const value of [{errors:[{}]}, {data:{myself:{clientBalance:'2.5',underBalance:false}}}])await assert.rejects(runpodBalanceMicros('fixture',request(value) as never));
});
test('revenue policy has no calendar-expiry alert and still alerts at funding exhaustion',()=>{
 const s={now:Date.now(),expiresAt:null,remainingMicros:5000000,cycleMicros:750000,guardianOK:true,shutdownFailed:false,providerMismatch:false,workers:0,liveFailures:0,overdueCleanup:0};
 assert.deepEqual(operationAlerts(s),[]);assert.deepEqual(operationAlerts({...s,remainingMicros:0}),['budget-unavailable']);
});
