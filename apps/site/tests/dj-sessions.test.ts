import {spawnSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
import {djRecordingRequest} from '../lib/dj-recordings-http';
import {DJWatchdog} from '../lib/dj-watchdog';
import {djSessionRequest} from '../lib/dj-sessions-http';
import {GenerationQueue} from '../lib/generation-queue';
import {djBetaReadiness} from '../lib/dj-beta-readiness';
import {DJWarmWorker} from '../lib/dj-warm-worker';
import {djSupervisor} from '../lib/dj-supervisor';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {DJSessions} from '../lib/dj-sessions';import {djSessionInput} from '../lib/dj-session-input';import {DJRecordings} from '../lib/dj-recordings';import {djPublicRequest} from '../lib/dj-public-http';
const id=()=>randomUUID().replaceAll('-',''),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const budget={costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000};
const input=()=>({id:id(),title:'Rooftop Friday',visibility:'public' as 'public'|'private',style:'house',energy:4});
function wav(pitch=220){const frames=60*48000,b=Buffer.alloc(44+frames*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(192000,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*4,40);for(let i=0;i<frames;i++){const v=Math.round(2000*Math.sin(2*Math.PI*pitch*i/48000));b.writeInt16LE(v,44+i*4);b.writeInt16LE(v,46+i*4);}return b;}
test('DJ session input defaults Private and rejects unsafe fields',()=>{
 const v=input();delete (v as any).visibility;assert.equal(djSessionInput(v).visibility,'private');
 for(const change of [{id:'../invalid'},{title:''},{visibility:'secret'},{visibility:['public']},{style:['house']},{energy:0},{energy:'4'},{consent:true}])assert.throws(()=>djSessionInput({...v,...change}));
});
test('isolated DJ session ledger, fresh batches and public set policy',async t=>{
 const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://localhost:5432/postgres');assert.ok(['localhost','127.0.0.1'].includes(target.hostname));const admin=createPool(target.toString()),name='jamloom_sessions_'+id();await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
 const objects=new Map<string,Buffer>(),store={local:true,put:async(k:string,b:Buffer)=>{objects.set(k,b);},get:async(k:string)=>objects.get(k)!,remove:async(k:string)=>{objects.delete(k);},uploadURL:async()=>'',playbackURL:async()=>''};
 const sessions=new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,budget);
 const finishWorker=async(...args:Parameters<typeof sessions.finish>)=>{await sessions.localStopped(args[0],args[1],args[2],'e'.repeat(64));return sessions.finish(...args);};
 const recordStore={begin:async()=>id(),partURL:async()=>'',complete:async()=>({}),verify:async()=>true,abort:async()=>{},remove:async()=>{},playbackURL:async(k:string)=>'https://storage.invalid/'+k};
 const recordings=new DJRecordings(pool,recordStore as any);let pitch=220;
 const begin=async(owner:string,visibility:'public'|'private'='public')=>{const v={...input(),visibility};const q=await sessions.quote(owner,v);await sessions.start(owner,v,q.token);return {v,q};};
 const finish=async()=>{const job=await sessions.claim();assert.ok(job);const audio=wav(pitch++);await finishWorker(job.session_id,job.sequence,job.lease,'completed',40000,audio);return {job,audio};};
 const record=async(owner:string,sessionId?:string,complete=true)=>{const v={id:id(),title:'Rooftop Friday',mime:'audio/mp4',bytes:100,sha256:'a'.repeat(64),seconds:60,consent:true,...(sessionId?{sessionId}:{})};await recordings.reserve(owner,v);if(complete)await recordings.complete(owner,v.id);return v.id;};
 try{
  assert.ok((await migrate(pool)).includes('0023_dj_sessions.sql'));assert.deepEqual(await migrate(pool),[]);
  await t.test('bounded supervisor exits on empty inventory and rejects unsafe watch options',async()=>{
   const env={...process.env,DATABASE_URL:target.toString(),BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:'isolated-supervisor-fixture-secret',JAMLOOM_LOCAL_OUTBOX:'/tmp/jamloom-watchdog-test-outbox',JAMLOOM_LOCAL_AUDIO_DIR:'/tmp/jamloom-watchdog-test-audio',JAMLOOM_AI_DJ_BUDGET:JSON.stringify(budget),JAMLOOM_WATCHDOG_TARGET:target.host+target.pathname,JAMLOOM_DJ_SUPERVISOR_SECONDS:'1',VASTAI_KEY:'invalid-test-only-key',VERCEL:''};
   const run=(args:string[],extra:Record<string,string>={})=>spawnSync(process.execPath,['--import','tsx','scripts/dj-watchdog.ts',...args],{env:{...env,...extra},encoding:'utf8',timeout:10000});
   const empty=run(['--apply','--warm','--watch']);assert.equal(empty.status,0,empty.stderr);assert.deepEqual(JSON.parse(empty.stdout).results,[]);
   let inventory=[{id:999,label:'jamloom-supervisor-fixture'}];const active=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{throw Error('No provider mutation expected');}});
   const identity=await active.register({account:123,instance:999,label:'jamloom-supervisor-fixture',permitSha256:'9'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000});
   const bounded=run(['--apply','--warm','--watch'],{JAMLOOM_DJ_SUPERVISOR_SECONDS:'4'});assert.equal(bounded.status,0,bounded.stderr);assert.equal((bounded.stdout.match(/"apply": true/g)??[]).length,2);
   assert.equal((await pool.query('SELECT state FROM dj_warm_workers WHERE id=$1',[identity.id])).rows[0].state,'ready');inventory=[];await active.stop(identity);await active.sweep();
   const preview=run(['--warm','--watch']);assert.notEqual(preview.status,0);assert.match(preview.stderr,/requires --apply --warm/);
   const deadline=run(['--apply','--warm','--watch'],{JAMLOOM_DJ_SUPERVISOR_SECONDS:'2401'});assert.notEqual(deadline.status,0);
   const wrong=run(['--apply','--warm','--watch'],{JAMLOOM_WATCHDOG_TARGET:'wrong'});assert.notEqual(wrong.status,0);assert.match(wrong.stderr,/target confirmation/);
  });
  for(const owner of ['alice','bob','tiny','pending','race','queue','retry','capacity','legacy','price','frozen','watch','http','recover','warm-a','warm-b','warm-fail']){await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:'fixture-'+owner,credits:owner==='tiny'?2:100,netMicros:owner==='tiny'?100000:5000000});}
  await t.test('long rental requires an explicit bounded profile and still obeys the same total budget',async()=>{
   let inventory=[{id:997,label:'jamloom-endurance-fixture'}];const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{inventory=[];}});
   const startedAt=Date.now()-1000,p={account:123,instance:997,label:inventory[0].label,permitSha256:'7'.repeat(64),hourlyMicros:500000,budgetMicros:6000000,startedAt,deadline:startedAt+9000000};
   await assert.rejects(warm.register(p),/Invalid warm rental permit/);
   await assert.rejects(warm.register({...p,maxLifetimeSeconds:9000,hourlyMicros:5000000}),/Invalid warm rental permit/);
   await assert.rejects(warm.register({...p,maxLifetimeSeconds:9000,deadline:p.deadline+1}),/Invalid warm rental permit/);
   await assert.rejects(warm.register({...p,maxLifetimeSeconds:10000 as any}),/Invalid warm rental permit/);
   const worker=await warm.register({...p,maxLifetimeSeconds:9000});
   assert.equal((await pool.query('SELECT deadline FROM dj_warm_workers WHERE id=$1',[worker.id])).rows[0].deadline.getTime(),p.deadline);
   await assert.rejects(warm.register({...p,maxLifetimeSeconds:9000}),/consumed/);
   assert.equal(await warm.heartbeat(worker,6000000),false);
   assert.equal((await warm.sweep())[0].status,'destroy_requested');assert.equal((await warm.sweep())[0].status,'shutdown_confirmed');
  });
  await t.test('hosted supervisor closes a lost controller rental and refunds only after provider absence',async()=>{
   let inventory=[{id:998,label:'jamloom-hosted-supervisor-fixture'}],destroyed=0;
   const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{destroyed++;inventory=[];}});
   const identity=await warm.register({account:123,instance:998,label:inventory[0].label,permitSha256:'8'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000});
   const before=await sessions.wallet.balance('warm-a'),started=await begin('warm-a');assert.ok(await sessions.claim(identity));
   await pool.query("UPDATE dj_warm_workers SET heartbeat_at=now()-interval '20 seconds' WHERE id=$1",[identity.id]);
   const env={CRON_SECRET:'s'.repeat(32),JAMLOOM_DJ_SUPERVISOR_ENABLED:'true',JAMLOOM_WATCHDOG_TARGET:target.host+target.pathname};
   const request=()=>new Request('https://fixture.test/api/ai-dj/supervisor',{headers:{Authorization:'Bearer '+env.CRON_SECRET}});
   const context=()=>({pool,databaseURL:target.toString(),sweep:()=>warm.sweep()});
   assert.equal((await djSupervisor(request(),context,env)).status,503);assert.equal(destroyed,1);
   assert.ok((await sessions.wallet.balance('warm-a')).reserved>0,'No refund before confirmed absence');
   assert.equal((await djSupervisor(request(),context,env)).status,200);
   assert.deepEqual(await sessions.wallet.balance('warm-a'),before);assert.equal((await sessions.status('warm-a',started.v.id)).state,'ended');
   assert.equal((await djSupervisor(request(),context,env)).status,200);assert.equal(destroyed,1);
  });
  await t.test('warm rental delivers distinct customer tracks before shutdown and recovers failed work safely',async()=>{
   assert.equal(await sessions.available(),false);
   let inventory=[{id:654,label:'jamloom-warm-fixture'}],destroyed=0;
   const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{destroyed++;inventory=[];}});
   const permit={account:123,instance:654,label:'jamloom-warm-fixture',permitSha256:'f'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000};
   const worker=await warm.register(permit);await assert.rejects(warm.register(permit),/consumed/);assert.equal(await sessions.available(),true);assert.equal(await new DJSessions(pool,'live-test-secret',sessions.store,sessions.budget,true).available(),false);
   const a=await begin('warm-a'),b=await begin('warm-b','private');assert.equal(await sessions.claim(),null);assert.equal(await new GenerationQueue(pool,'q'.repeat(32)).claim('blocked_by_warm'),null);
   const first=await sessions.claim(worker);assert.ok(first);assert.equal(first.session_id,a.v.id);
   await assert.rejects(sessions.localStopped(first.session_id,0,first.lease,'a'.repeat(64)),/conflicts/);
   const sound=wav(1011),receipt={request:'first',sha256:hash(sound),computeMs:1};
   await assert.rejects(warm.complete({...worker,lease:randomUUID()},first,sound,1,receipt),/mismatch/);
   await warm.complete(worker,first,sound,1,receipt);await warm.complete(worker,first,sound,1,receipt);
   assert.equal(destroyed,0);assert.equal((await sessions.status('warm-a',a.v.id)).batches[0].ready,true);assert.equal((await sessions.audio('warm-a',a.v.id,0)).length,sound.length);
   await assert.rejects(warm.complete(worker,first,sound,2,receipt),/changed/);
   const second=await sessions.claim(worker);assert.ok(second);assert.equal(second.session_id,b.v.id);assert.notEqual(second.seed,first.seed);await warm.complete(worker,second,wav(1012),1,{request:'second'});
   assert.equal((await pool.query('SELECT allocated_micros FROM dj_warm_workers WHERE id=$1',[worker.id])).rows[0].allocated_micros,2n);
   await sessions.played('warm-a',a.v.id,0);await sessions.stop('warm-a',a.v.id);await sessions.stop('warm-b',b.v.id);
   const failure=await begin('warm-fail'),job=await sessions.claim(worker);assert.ok(job);await sessions.stop('warm-fail',failure.v.id);
   await warm.stop(worker);
   assert.equal((await warm.sweep())[0].status,'destroy_requested');assert.equal((await sessions.status('warm-fail',failure.v.id)).state,'ending');
   const finish=sessions.finish.bind(sessions);sessions.finish=async()=>{throw Error('crash after confirmed absence');};await assert.rejects(warm.sweep(),/crash after/);sessions.finish=finish;
   assert.equal((await warm.sweep())[0].status,'shutdown_confirmed');assert.equal((await sessions.status('warm-fail',failure.v.id)).state,'ended');assert.deepEqual(await sessions.wallet.balance('warm-fail'),{available:100,reserved:0});
   assert.equal(await warm.heartbeat(worker,0),false);assert.equal(await sessions.available(),false);assert.equal(destroyed,1);
  });
  await t.test('one listener stopping drains and refunds only their render while the other continues',async()=>{
   const sessions=new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,budget,false,true);
   const begin=async(owner:string)=>{const v=input();await sessions.start(owner,v,(await sessions.quote(owner,v)).token);return {v};};
   let inventory=[{id:656,label:'jamloom-drain-fixture'}],destroyed=0;
   const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{destroyed++;inventory=[];}});
   const worker=await warm.register({account:123,instance:656,label:inventory[0].label,permitSha256:'c'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000});
   const before=await sessions.wallet.balance('warm-a'),a=await begin('warm-a'),b=await begin('warm-b');
   const job=await sessions.claim(worker);assert.equal(job.session_id,a.v.id);
   const resumed=await warm.pending(worker);assert.equal(resumed.lease,job.lease);assert.equal(resumed.seed,job.seed);assert.deepEqual(resumed.settings,job.settings);
   assert.equal(await warm.pending({...worker,lease:randomUUID()}),null);
   await sessions.stop('warm-a',a.v.id);assert.equal(await warm.jobHeartbeat(worker,job),true);assert.deepEqual(await warm.sweep(),[]);
   await assert.rejects(sessions.finish(job.session_id,0,job.lease,'cancelled',1),/shutdown/);
   const sound=wav(1013);await assert.rejects(warm.complete(worker,job,Buffer.from('corrupt'),1,{}));
   assert.equal(await warm.complete(worker,job,sound,1,{done:true}),'cancelled');assert.equal(await warm.complete(worker,job,sound,1,{done:true}),'cancelled');
   assert.deepEqual(await sessions.wallet.balance('warm-a'),before);assert.equal((await sessions.status('warm-a',a.v.id)).state,'ended');assert.equal(objects.has('masters/'+job.reservation_id+'.wav'),false);
   assert.equal(await warm.jobHeartbeat(worker,job),false);assert.equal(await sessions.available(),true);assert.equal(destroyed,0);
   assert.equal(await warm.pending(worker),null);
   const next=await sessions.claim(worker);assert.equal(next.session_id,b.v.id);await warm.complete(worker,next,wav(1014),1,{done:true});assert.equal((await sessions.status('warm-b',b.v.id)).batches[0].ready,true);
   await sessions.stop('warm-b',b.v.id);await warm.stop(worker);await warm.sweep();await warm.sweep();
  });
  await t.test('concurrent Starts cannot overbook a warm worker or consume rejected credits',async()=>{
   let inventory=[{id:655,label:'jamloom-admission-fixture'}];const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{inventory=[];}});
   const worker=await warm.register({account:123,instance:655,label:inventory[0].label,permitSha256:'d'.repeat(64),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000});
   const cheaper=new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,{...budget,hourlyMicros:500000});assert.equal(await cheaper.available(),false);
   const costly=input(),q=await cheaper.quote('warm-fail',costly),before=await cheaper.wallet.balance('warm-fail');await assert.rejects(cheaper.start('warm-fail',costly,q.token),/warming/);assert.deepEqual(await cheaper.wallet.balance('warm-fail'),before);
   const longer=new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,{...budget,maxRuntimeMs:180000,costCapMicros:70000});assert.equal(await longer.available(),false);
   const owners=['warm-a','warm-b','warm-fail'],starts=await Promise.all(owners.map(async owner=>({owner,v:input(),before:await sessions.wallet.balance(owner)})));
   const results=await Promise.allSettled(starts.map(async s=>{const q=await sessions.quote(s.owner,s.v);return sessions.start(s.owner,s.v,q.token);}));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,2);const index=results.findIndex(r=>r.status==='rejected');assert.match((results[index] as PromiseRejectedResult).reason.message,/slots/);
   assert.deepEqual(await sessions.wallet.balance(starts[index].owner),starts[index].before);
   const health=await djBetaReadiness(pool);assert.equal(health.runtime,'Worker heartbeat healthy');assert.equal(health.activeListeners,2);assert.equal(health.freeListenerSlots,0);
   for(const [i,s] of starts.entries())if(i!==index){assert.equal((await sessions.start(s.owner,s.v,'expired')).id,s.v.id);await sessions.stop(s.owner,s.v.id);}
   await sessions.start(starts[index].owner,starts[index].v,(await sessions.quote(starts[index].owner,starts[index].v)).token);await sessions.stop(starts[index].owner,starts[index].v.id);
   await warm.stop(worker);await warm.sweep();await warm.sweep();
  });
  await t.test('warm deadline, budget and lost heartbeat stop capacity and refund unacknowledged jobs',async()=>{
   for(const [index,condition] of ['deadline','budget','heartbeat','disconnect'].entries()){
    let inventory=[{id:700+index,label:'jamloom-warm-'+condition}];const warm=new DJWarmWorker(sessions,{inventory:async()=>inventory,destroy:async()=>{inventory=[];}});
    const worker=await warm.register({account:123,instance:700+index,label:inventory[0].label,permitSha256:hash(Buffer.from(condition)),hourlyMicros:600000,budgetMicros:1000000,startedAt:Date.now()-1000,deadline:Date.now()+180000});
    const started=await begin('warm-fail');assert.ok(await sessions.claim(worker));
    if(condition==='deadline')await pool.query("UPDATE dj_warm_workers SET deadline=now()+interval '20 seconds' WHERE id=$1",[worker.id]);
    if(condition==='budget')assert.equal(await warm.heartbeat(worker,1000000),false);
    if(condition==='heartbeat')await pool.query("UPDATE dj_warm_workers SET heartbeat_at=now()-interval '16 seconds' WHERE id=$1",[worker.id]);
    if(condition==='disconnect'){
     await pool.query("UPDATE dj_sessions SET heartbeat_at=now()-interval '76 seconds' WHERE id=$1",[started.v.id]);
     assert.deepEqual(await warm.sweep(),[],'An active bounded render may drain after a client disconnect');
     await pool.query("UPDATE dj_session_batches SET lease_until=now()-interval '1 second' WHERE session_id=$1",[started.v.id]);
    }
    if(condition!=='disconnect'){assert.equal(await sessions.available(),false);const readiness=await djBetaReadiness(pool);assert.equal(readiness.runtime,'Held');assert.equal(readiness.freeListenerSlots,0);}
    assert.equal((await warm.sweep())[0].status,'destroy_requested');assert.equal(await sessions.claim(worker),null);assert.ok((await sessions.wallet.balance('warm-fail')).reserved>0);
    assert.equal((await warm.sweep())[0].status,'shutdown_confirmed');assert.equal((await sessions.status('warm-fail',started.v.id)).state,'ended');assert.equal((await sessions.wallet.balance('warm-fail')).reserved,0);
   }
  });
  await t.test('quotes bind owner and sharing, equal private price, atomic idempotent Start',async()=>{
   const v=input(),pub=await sessions.quote('alice',v),priv=await sessions.quote('alice',{...v,visibility:'private'});assert.equal(pub.credits,2);assert.equal(priv.credits,2);assert.equal(priv.privacyCredits,0);
   await assert.rejects(sessions.start('bob',v,pub.token));await assert.rejects(sessions.start('alice',{...v,visibility:'private'},pub.token),/changed/);
   const [a,b]=await Promise.all([sessions.start('alice',v,pub.token),sessions.start('alice',v,pub.token)]);assert.equal(a.reservation,b.reservation);assert.equal((await sessions.start('alice',v,'expired-token')).reservation,a.reservation);await assert.rejects(sessions.start('alice',{...v,visibility:'private'},pub.token),/changed/);assert.equal((await sessions.wallet.balance('alice')).reserved,2);
   await sessions.stop('alice',v.id);assert.deepEqual(await sessions.wallet.balance('alice'),{available:100,reserved:0});await assert.rejects(sessions.next('alice',v.id,1),/ending/);await assert.rejects(sessions.status('bob',v.id),/not found/);
  });
  await t.test('bounded preparation, fresh seeds, verified output and immutable settlement retries',async()=>{
   const {v}=await begin('alice'),first=await finish();assert.equal(first.job.session_id,v.id);const before=await sessions.wallet.balance('alice');await finishWorker(v.id,0,first.job.lease,'completed',40000,first.audio);assert.deepEqual(await sessions.wallet.balance('alice'),before);
   await assert.rejects(finishWorker(v.id,0,first.job.lease,'completed',40001,first.audio),/changed/);await assert.rejects(finishWorker(v.id,0,first.job.lease,'completed',40000,wav(900)),/changed/);assert.equal(hash(objects.get('masters/'+first.job.reservation_id+'.wav')!),hash(first.audio));
   await assert.rejects(sessions.next('alice',v.id,1,6),/energy/);await assert.rejects(sessions.next('alice',v.id,1,2,'yes' as any),/vocal/);await assert.rejects(sessions.next('alice',v.id,1,2,false,'sad' as any),/mood/);await assert.rejects(sessions.next('alice',v.id,1,2,false,'warm',{bpm:999,groove:'rolling'}),/beat/);await sessions.next('alice',v.id,1,2,false,'warm',{bpm:126,groove:'rolling'});await sessions.next('alice',v.id,1,5);const second=await finish();assert.equal(second.job.settings.energy,2);assert.equal(second.job.settings.vocals,false);assert.equal(second.job.settings.mood,'warm');assert.deepEqual(second.job.settings.beat,{bpm:126,groove:'rolling'});assert.deepEqual((await sessions.status('alice',v.id)).batches[0].beat,second.job.settings.beat);assert.notEqual(first.job.seed,second.job.seed);await assert.rejects(sessions.next('alice',v.id,2),/waiting/);await assert.rejects(sessions.played('alice',v.id,1),/order/);await sessions.played('alice',v.id,0);await sessions.next('alice',v.id,2);await sessions.stop('alice',v.id);assert.equal((await sessions.status('alice',v.id)).state,'ended');assert.equal((await sessions.wallet.balance('alice')).reserved,0);
   const recording=await record('alice',v.id,false);assert.deepEqual((await recordings.publicList()).sets,[]);await recordings.complete('alice',recording);await assert.rejects(record('bob',v.id),/finished/);assert.equal((await recordings.publicList()).sets[0].id,recording);assert.match(await recordings.publicPlayback(recording),/^https:/);assert.deepEqual((await recordings.publicList('',true)).sets,[]);await assert.rejects(recordings.publicPlayback(recording,true),/not found/);
   const result=await djPublicRequest(new Request('https://jamloom.test/api/ai-dj/sets'),recordings);assert.equal(result.status,200);assert.match(result.headers.get('cache-control')!,/no-store/);
   await assert.rejects(recordings.withdraw('bob',recording),/not found/);const request=new Request('https://jamloom.test/api/ai-dj/recordings/'+recording+'/withdraw',{method:'POST',headers:{origin:'https://jamloom.test','content-type':'application/json'},body:JSON.stringify({owner:'alice'})});assert.equal((await djRecordingRequest(request.clone(),async()=>({owner:'bob',origin:'https://jamloom.test',recordings}),[recording,'withdraw'])).status,409);assert.equal((await djRecordingRequest(request,async()=>({owner:'alice',origin:'https://jamloom.test',recordings}),[recording,'withdraw'])).status,200);assert.deepEqual((await recordings.publicList()).sets,[]);await assert.rejects(recordings.publicPlayback(recording),/not found/);
   const {v:other}=await begin('bob'),otherJob=await sessions.claim();assert.notEqual(otherJob.seed,first.job.seed);await assert.rejects(finishWorker(other.id,0,otherJob.lease,'completed',40000,first.audio),/Repeated/);await finishWorker(other.id,0,otherJob.lease,'failed',1000);
  });
  await t.test('private, local and unplayed recordings never enter public listing or playback',async()=>{
   const {v}=await begin('bob','private'),ready=await finish();await sessions.played('bob',v.id,0);await sessions.stop('bob',v.id);const privateId=await record('bob',v.id),localId=await record('alice');for(const id of [privateId,localId])assert.equal((await djPublicRequest(new Request('https://jamloom.test/api/ai-dj/sets/'+id+'/audio'),recordings,[id,'audio'])).status,404);
   assert.equal((await sessions.status('bob',v.id)).visibility,'private');assert.equal((await pool.query("SELECT -sum(reserved_delta)::int AS n FROM wallet_ledger_entries WHERE reservation_id=$1 AND kind='capture'",[ready.job.reservation_id])).rows[0].n,2);assert.equal((await pool.query('SELECT privacy_surcharge_bps FROM generation_reservations WHERE id=$1',[ready.job.reservation_id])).rows[0].privacy_surcharge_bps,0);
   const active=await begin('pending');await assert.rejects(record('pending',active.v.id),/finished/);await finish();await sessions.stop('pending',active.v.id);await assert.rejects(record('pending',active.v.id),/finished/);assert.deepEqual((await recordings.publicList()).sets,[]);
  });
  await t.test('credit exhaustion stops new reservations without changing visibility',async()=>{
   const {v}=await begin('tiny');await finish();await sessions.played('tiny',v.id,0);assert.deepEqual(await sessions.next('tiny',v.id,1),{ending:'credits'});assert.equal((await sessions.status('tiny',v.id)).state,'ended');assert.equal((await sessions.status('tiny',v.id)).visibility,'public');assert.equal((await sessions.wallet.balance('tiny')).reserved,0);
  });
  await t.test('Stop race refunds queued work; running work waits for its shutdown receipt',async()=>{
   const {v}=await begin('race');await finish();await sessions.played('race',v.id,0);await Promise.allSettled([sessions.next('race',v.id,1),sessions.stop('race',v.id)]);await sessions.stop('race',v.id);assert.equal((await sessions.wallet.balance('race')).reserved,0);
   const b=await begin('queue'),job=await sessions.claim();await sessions.stop('queue',b.v.id);assert.equal((await sessions.status('queue',b.v.id)).state,'ending');assert.ok((await sessions.wallet.balance('queue')).reserved>0);await finishWorker(b.v.id,0,job.lease,'completed',1000,wav(777));assert.equal((await sessions.status('queue',b.v.id)).state,'ended');assert.equal((await sessions.wallet.balance('queue')).reserved,0);assert.equal((await sessions.status('queue',b.v.id)).batches[0].state,'cancelled');
  });
  await t.test('lost settlement response retries once; disconnected sessions cannot dispatch',async()=>{
   const {v}=await begin('retry'),job=await sessions.claim(),audio=wav(888),settle=sessions.wallet.settle.bind(sessions.wallet);let fail=true;sessions.wallet.settle=async(...args:Parameters<typeof settle>)=>{await settle(...args);if(fail){fail=false;throw Error('lost settlement response');}};
   await assert.rejects(finishWorker(v.id,0,job.lease,'completed',40000,audio),/lost settlement/);const balance=await sessions.wallet.balance('retry');await finishWorker(v.id,0,job.lease,'completed',40000,audio);assert.deepEqual(await sessions.wallet.balance('retry'),balance);sessions.wallet.settle=settle;await sessions.stop('retry',v.id);
   const stale=await begin('retry');await pool.query("UPDATE dj_sessions SET heartbeat_at=now()-interval '2 minutes' WHERE id=$1",[stale.v.id]);assert.equal(await sessions.claim(),null);assert.equal(await sessions.expire(),1);assert.equal((await sessions.status('retry',stale.v.id)).endReason,'disconnected');
  });
  await t.test('abandoned queued work expires even while its customer keeps heartbeating',async()=>{
   const before=await sessions.wallet.balance('retry'),started=await begin('retry');
   await pool.query("UPDATE dj_session_batches SET created_at=now()-interval '151 seconds' WHERE session_id=$1",[started.v.id]);
   await sessions.heartbeat('retry',started.v.id);assert.equal(await sessions.expire(),1);
   assert.equal((await sessions.status('retry',started.v.id)).endReason,'failure');assert.deepEqual(await sessions.wallet.balance('retry'),before);
   assert.equal(await sessions.expire(),0);
  });
  await t.test('different purchase fees do not change the fixed per-minute price',async()=>{
   await pool.query("UPDATE credit_lots SET created_at=now()-interval '1 day' WHERE owner_id='price'");
   const ledger=(await pool.query("SELECT id FROM credit_lots WHERE owner_id='price'")).rows[0].id;
   await pool.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES('price',$1,'refund',-97,0)",[ledger]);
   await sessions.wallet.grant('price',{provider:'stripe_test',receipt:'price-second-lot',credits:100,netMicros:500000});
   const {v}=await begin('price','private');await finish();await sessions.played('price',v.id,0);assert.ok((await sessions.next('price',v.id,1)).reservation);await sessions.stop('price',v.id);assert.equal((await sessions.status('price',v.id)).visibility,'private');assert.equal((await sessions.wallet.balance('price')).reserved,0);
  });
  await t.test('DJ and existing generation queues share one worker capacity',async()=>{
   const {v}=await begin('capacity'),legacy=new GenerationQueue(pool,'q'.repeat(32));const job=await sessions.wallet.reserve('legacy','legacy_capacity',50000,5000,{inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000});
   const [dj,old]=await Promise.all([sessions.claim(),legacy.claim('capacity_check')]);assert.equal(Number(!!dj)+Number(!!old),1);
   if(dj){assert.equal(await legacy.claim('second_check'),null);await finishWorker(v.id,0,dj.lease,'failed',0);await legacy.cancel('legacy',job);}else{assert.equal(await sessions.claim(),null);await legacy.stopped(job,old!.leaseToken,0,'failed');await sessions.stop('capacity',v.id);}
  });
  await t.test('frozen accounts cannot complete new public music',async()=>{
   const {v}=await begin('frozen'),job=await sessions.claim();await pool.query("UPDATE credit_wallets SET frozen=true WHERE owner_id='frozen'");await finishWorker(v.id,0,job.lease,'completed',1000,wav(999));assert.equal((await sessions.status('frozen',v.id)).batches[0].state,'cancelled');assert.equal((await sessions.wallet.balance('frozen')).reserved,0);
  });
  await t.test('durable deadlines hold capacity and receipts recover a settlement crash',async()=>{
   const {v}=await begin('watch'),job=await sessions.claim();assert.equal(await sessions.workerHeartbeat(v.id,0,job.lease),true);
   await assert.rejects(sessions.finish(v.id,0,job.lease,'completed',0,wav(801)),/shutdown/);
   await pool.query("UPDATE dj_session_batches SET deadline=now()-interval '1 second' WHERE session_id=$1",[v.id]);assert.equal((await sessions.shutdownRequired()).length,1);assert.equal(await sessions.workerHeartbeat(v.id,0,job.lease),false);assert.equal(await sessions.claim(),null);assert.ok((await sessions.wallet.balance('watch')).reserved>0);
   await finishWorker(v.id,0,job.lease,'failed',0);assert.equal((await sessions.wallet.balance('watch')).reserved,0);
   const next=await begin('recover'),work=await sessions.claim(),settle=sessions.wallet.settle.bind(sessions.wallet);sessions.wallet.settle=async()=>{throw Error('lost before settlement');};
   await assert.rejects(finishWorker(next.v.id,0,work.lease,'completed',0,wav(802)),/lost before/);assert.equal((await sessions.status('recover',next.v.id)).batches[0].ready,false);await assert.rejects(sessions.audio('recover',next.v.id,0),/not ready/);
   sessions.wallet.settle=settle;await new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,budget).reconcile();assert.equal((await sessions.status('recover',next.v.id)).batches[0].ready,true);await sessions.stop('recover',next.v.id);
  });
  await t.test('remote shutdown, complete inventory and immutable cost evidence precede delivery',async()=>{
   const {v}=await begin('watch'),job=await sessions.claim();let instances:any[]=[],deletes=0;
   const watchdog=new DJWatchdog(sessions,{inventory:async()=>instances,destroy:async()=>{deletes++;instances=[];}});
   const rental=await watchdog.prepare(v.id,0,job.lease,123);await assert.rejects(sessions.localStopped(v.id,0,job.lease,'e'.repeat(64)),/conflicts/);
   instances=[{id:456,label:rental.label}];await watchdog.attached(rental.reservation,456);await sessions.stageOutput(v.id,0,job.lease,wav(803));await assert.rejects(sessions.stageOutput(v.id,0,job.lease,wav(804)),/changed/);
   await assert.rejects(watchdog.recordCost(rental.reservation,5000,'c'.repeat(64)),/Shutdown/);assert.equal((await watchdog.sweep(true))[0].status,'destroy_requested');assert.equal(deletes,1);assert.ok((await sessions.wallet.balance('watch')).reserved>0);
   assert.equal((await watchdog.sweep(true))[0].status,'cost_evidence_required');await watchdog.recordCost(rental.reservation,5000,'c'.repeat(64));await assert.rejects(watchdog.recordCost(rental.reservation,5001,'d'.repeat(64)),/conflicts/);assert.equal((await watchdog.sweep(true))[0].status,'settled');assert.equal((await sessions.status('watch',v.id)).batches[0].state,'completed');assert.equal((await sessions.audio('watch',v.id,0)).length,11520044);await sessions.stop('watch',v.id);
   const lost=await begin('watch'),unknown=await sessions.claim();await watchdog.prepare(lost.v.id,0,unknown.lease,123);await sessions.stop('watch',lost.v.id);assert.equal((await watchdog.sweep(true))[0].status,'creation_unresolved');assert.ok((await sessions.wallet.balance('watch')).reserved>0);
   // An observed late creation can be bound and destroyed, never re-rented.
   const label='jamloom-job-'+unknown.reservation_id;instances=[{id:789,label}];assert.equal((await watchdog.sweep(true))[0].status,'destroy_requested');assert.equal((await watchdog.sweep(true))[0].status,'cost_evidence_required');await watchdog.recordCost(unknown.reservation_id,0,'d'.repeat(64));assert.equal((await watchdog.sweep(true))[0].status,'settled');
  });
  await t.test('customer HTTP protects quotes, account identity, audio and paused launch gates',async()=>{
   const value=input(),origin='https://jamloom.test';const context=async()=>({owner:'http',origin,sessions,enabled:true});
   const call=(path:string,body:any,headers:any={origin})=>djSessionRequest(new Request(origin+'/api/ai-dj/sessions/'+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}),context,path.split('/'));
   assert.equal((await call('quote',{owner:'http',input:value},{origin:'https://evil.test'})).status,403);assert.equal((await call('quote',{owner:'alice',input:value})).status,409);
   const price=await (await call('quote',{owner:'http',input:value})).json();assert.equal((await call('start',{owner:'http',input:value,token:price.token})).status,200);
   const ownerless=await djSessionRequest(new Request(origin),async()=>({...await context(),owner:null}),[value.id]);assert.equal(ownerless.status,401);
   assert.equal((await call(value.id+'/played',{owner:'http',sequence:0})).status,409);
   await finish();assert.equal((await djSessionRequest(new Request(origin),context,[value.id,'audio','0'])).status,200);assert.equal((await djSessionRequest(new Request(origin),async()=>({...await context(),owner:'alice'}),[value.id,'audio','0'])).status,404);
   const unavailable=async()=>({...await context(),enabled:false});
   assert.equal((await djSessionRequest(new Request(origin),unavailable,[value.id])).status,200);
   assert.equal((await djSessionRequest(new Request(origin),unavailable,[value.id,'audio','0'])).status,200);
   const paused=(action:string,extra:object={})=>djSessionRequest(new Request(origin,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({owner:'http',...extra})}),unavailable,[value.id,action]);
   assert.equal((await paused('next',{sequence:1})).status,503);
   assert.equal((await paused('stop')).status,200);
   const closed=await djSessionRequest(new Request(origin,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({owner:'http',input:input()})}),async()=>({...await context(),enabled:false}),['quote']);assert.equal(closed.status,503);
  });
  await t.test('account purge keeps running work and saved recordings protected',async()=>{
   await assert.rejects(sessions.purgeOwner('bob'),/Suspend/);await pool.query(`UPDATE "user" SET suspended=true WHERE id='bob'`);await assert.rejects(sessions.purgeOwner('bob'),/saved set/);await recordings.purgeOwner('bob');await sessions.purgeOwner('bob');assert.equal((await pool.query("SELECT count(*)::int AS n FROM dj_sessions WHERE owner_id='bob'")).rows[0].n,0);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
