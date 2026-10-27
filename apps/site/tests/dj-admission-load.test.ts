import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {DJSessions} from '../lib/dj-sessions';
import {DJWarmWorker} from '../lib/dj-warm-worker';

test('forty simultaneous listeners cannot overbook two slots or lose rejected credits across ten rounds', async () => {
 const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(target.hostname,'127.0.0.1');
 const admin=createPool(target.href),name='jamloom_dj_load_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;
 const pool=createPool(target.href),samples:number[]=[],rounds=[];
 const store={local:true,put:async()=>{},get:async()=>{throw Error('Audio is outside admission scope');},remove:async()=>{},uploadURL:async()=>'',playbackURL:async()=>''};
 const sessions=new DJSessions(pool,'isolated-load-qualification-secret',store,{costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000});
 let inventory=[{id:987654,label:'jamloom-local-load-fixture'}];
 const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{inventory=[];}});
 try {
  await migrate(pool);
  const owners=Array.from({length:40},(_,i)=>'listener-'+i);
  for(const owner of owners){await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:'load-'+owner,credits:100,netMicros:5000000});}
  const worker=await warm.register({account:123,instance:987654,label:inventory[0].label,permitSha256:'a'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+600000});
  for(let round=0;round<10;round++){
   await warm.heartbeat(worker,0);
   const inputs=owners.map((owner,i)=>({owner,input:{id:randomUUID().replaceAll('-',''),title:'Local pressure '+round,style:'house',energy:4,visibility:i%2?'private' as const:'public' as const}}));
   const before=await Promise.all(owners.map(owner=>sessions.wallet.balance(owner)));
   const quotes=await Promise.all(inputs.map(v=>sessions.quote(v.owner,v.input)));
   const results=await Promise.allSettled(inputs.map(async(v,i)=>{const start=performance.now();try{return await sessions.start(v.owner,v.input,quotes[i].token);}finally{samples.push(performance.now()-start);}}));
   assert.equal(results.filter(v=>v.status==='fulfilled').length,2);
   for(let i=0;i<inputs.length;i++){
    const result=results[i],v=inputs[i];
    if(result.status==='rejected'){assert.match(result.reason.message,/slots/);assert.deepEqual(await sessions.wallet.balance(v.owner),before[i]);}
    else {assert.equal((await sessions.start(v.owner,v.input,'expired')).id,v.input.id);await sessions.stop(v.owner,v.input.id);assert.deepEqual(await sessions.wallet.balance(v.owner),before[i]);}
   }
   rounds.push({round:round+1,admitted:2,rejected:38,rejectedBalancesUnchanged:true,unstartedWorkRefunded:true});
  }
  await warm.stop(worker);await warm.sweep();await warm.sweep();assert.equal(inventory.length,0);
  samples.sort((a,b)=>a-b);
  const report={status:'PASS',scope:'Local database admission/ledger pressure with a fake provider; not fresh audio, GPU throughput or production capacity',requests:samples.length,concurrentRequests:40,rounds,latencyMs:{median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1)},rssBytes:process.memoryUsage().rss,providerCalls:'in-memory fixture only',publicCapacityChanged:false};
  if(process.env.JAMLOOM_LOAD_REPORT)await writeFile(process.env.JAMLOOM_LOAD_REPORT,JSON.stringify(report,null,2)+'\n');
 } finally {await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
