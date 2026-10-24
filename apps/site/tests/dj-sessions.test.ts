import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
import {djRecordingRequest} from '../lib/dj-recordings-http';
import {GenerationQueue} from '../lib/generation-queue';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {DJSessions} from '../lib/dj-sessions';import {djSessionInput} from '../lib/dj-session-input';import {DJRecordings} from '../lib/dj-recordings';import {djPublicRequest} from '../lib/dj-public-http';
const id=()=>randomUUID().replaceAll('-',''),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const budget={costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000};
const input=()=>({id:id(),title:'Rooftop Friday',visibility:'public' as 'public'|'private',style:'house',energy:4});
function wav(pitch=220){const frames=60*48000,b=Buffer.alloc(44+frames*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(48000,24);b.writeUInt32LE(192000,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*4,40);for(let i=0;i<frames;i++){const v=Math.round(2000*Math.sin(2*Math.PI*pitch*i/48000));b.writeInt16LE(v,44+i*4);b.writeInt16LE(v,46+i*4);}return b;}
test('DJ session input defaults Public and rejects unsafe fields',()=>{
 const v=input();delete (v as any).visibility;assert.equal(djSessionInput(v).visibility,'public');
 for(const change of [{id:'../invalid'},{title:''},{visibility:'secret'},{visibility:['public']},{style:['house']},{energy:0},{energy:'4'},{consent:true}])assert.throws(()=>djSessionInput({...v,...change}));
});
test('isolated DJ session ledger, fresh batches and public set policy',async t=>{
 const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://localhost:5432/postgres');assert.ok(['localhost','127.0.0.1'].includes(target.hostname));const admin=createPool(target.toString()),name='jamloom_sessions_'+id();await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
 const objects=new Map<string,Buffer>(),store={local:true,put:async(k:string,b:Buffer)=>{objects.set(k,b);},get:async(k:string)=>objects.get(k)!,remove:async(k:string)=>{objects.delete(k);},uploadURL:async()=>'',playbackURL:async()=>''};
 const sessions=new DJSessions(pool,'test-only-secret-for-dj-sessions-12345',store,budget);
 const recordStore={begin:async()=>id(),partURL:async()=>'',complete:async()=>({}),verify:async()=>true,abort:async()=>{},remove:async()=>{},playbackURL:async(k:string)=>'https://storage.invalid/'+k};
 const recordings=new DJRecordings(pool,recordStore as any);let pitch=220;
 const begin=async(owner:string,visibility:'public'|'private'='public')=>{const v={...input(),visibility};const q=await sessions.quote(owner,v);await sessions.start(owner,v,q.token);return {v,q};};
 const finish=async()=>{const job=await sessions.claim();assert.ok(job);const audio=wav(pitch++);await sessions.finish(job.session_id,job.sequence,job.lease,'completed',40000,audio);return {job,audio};};
 const record=async(owner:string,sessionId?:string,complete=true)=>{const v={id:id(),title:'Rooftop Friday',mime:'audio/mp4',bytes:100,sha256:'a'.repeat(64),seconds:60,consent:true,...(sessionId?{sessionId}:{})};await recordings.reserve(owner,v);if(complete)await recordings.complete(owner,v.id);return v.id;};
 try{
  assert.ok((await migrate(pool)).includes('0023_dj_sessions.sql'));assert.deepEqual(await migrate(pool),[]);
  for(const owner of ['alice','bob','tiny','pending','race','queue','retry','capacity','legacy','price','frozen']){await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:'fixture-'+owner,credits:owner==='tiny'?2:100,netMicros:owner==='tiny'?100000:5000000});}
  await t.test('quotes bind owner and sharing, private premium, atomic idempotent Start',async()=>{
   const v=input(),pub=await sessions.quote('alice',v),priv=await sessions.quote('alice',{...v,visibility:'private'});assert.equal(pub.credits,2);assert.equal(priv.credits,3);assert.equal(priv.privacyCredits,1);
   await assert.rejects(sessions.start('bob',v,pub.token));await assert.rejects(sessions.start('alice',{...v,visibility:'private'},pub.token),/changed/);
   const [a,b]=await Promise.all([sessions.start('alice',v,pub.token),sessions.start('alice',v,pub.token)]);assert.equal(a.reservation,b.reservation);assert.equal((await sessions.start('alice',v,'expired-token')).reservation,a.reservation);await assert.rejects(sessions.start('alice',{...v,visibility:'private'},pub.token),/changed/);assert.equal((await sessions.wallet.balance('alice')).reserved,2);
   await sessions.stop('alice',v.id);assert.deepEqual(await sessions.wallet.balance('alice'),{available:100,reserved:0});await assert.rejects(sessions.next('alice',v.id,1),/ending/);await assert.rejects(sessions.status('bob',v.id),/not found/);
  });
  await t.test('bounded preparation, fresh seeds, verified output and immutable settlement retries',async()=>{
   const {v}=await begin('alice'),first=await finish();assert.equal(first.job.session_id,v.id);const before=await sessions.wallet.balance('alice');await sessions.finish(v.id,0,first.job.lease,'completed',40000,first.audio);assert.deepEqual(await sessions.wallet.balance('alice'),before);
   await assert.rejects(sessions.finish(v.id,0,first.job.lease,'completed',40001,first.audio),/changed/);await assert.rejects(sessions.finish(v.id,0,first.job.lease,'completed',40000,wav(900)),/changed/);assert.equal(hash(objects.get('masters/'+first.job.reservation_id+'.wav')!),hash(first.audio));
   await assert.rejects(sessions.next('alice',v.id,1,6),/energy/);await sessions.next('alice',v.id,1,2);await sessions.next('alice',v.id,1,5);const second=await finish();assert.equal(second.job.settings.energy,2);assert.notEqual(first.job.seed,second.job.seed);await assert.rejects(sessions.next('alice',v.id,2),/waiting/);await assert.rejects(sessions.played('alice',v.id,1),/order/);await sessions.played('alice',v.id,0);await sessions.next('alice',v.id,2);await sessions.stop('alice',v.id);assert.equal((await sessions.status('alice',v.id)).state,'ended');assert.equal((await sessions.wallet.balance('alice')).reserved,0);
   const recording=await record('alice',v.id,false);assert.deepEqual((await recordings.publicList()).sets,[]);await recordings.complete('alice',recording);await assert.rejects(record('bob',v.id),/finished/);assert.equal((await recordings.publicList()).sets[0].id,recording);assert.match(await recordings.publicPlayback(recording),/^https:/);assert.deepEqual((await recordings.publicList('',true)).sets,[]);await assert.rejects(recordings.publicPlayback(recording,true),/not found/);
   const result=await djPublicRequest(new Request('https://jamloom.test/api/ai-dj/sets'),recordings);assert.equal(result.status,200);assert.match(result.headers.get('cache-control')!,/no-store/);
   await assert.rejects(recordings.withdraw('bob',recording),/not found/);const request=new Request('https://jamloom.test/api/ai-dj/recordings/'+recording+'/withdraw',{method:'POST',headers:{origin:'https://jamloom.test','content-type':'application/json'},body:JSON.stringify({owner:'alice'})});assert.equal((await djRecordingRequest(request.clone(),async()=>({owner:'bob',origin:'https://jamloom.test',recordings}),[recording,'withdraw'])).status,409);assert.equal((await djRecordingRequest(request,async()=>({owner:'alice',origin:'https://jamloom.test',recordings}),[recording,'withdraw'])).status,200);assert.deepEqual((await recordings.publicList()).sets,[]);await assert.rejects(recordings.publicPlayback(recording),/not found/);
   const {v:other}=await begin('bob'),otherJob=await sessions.claim();assert.notEqual(otherJob.seed,first.job.seed);await assert.rejects(sessions.finish(other.id,0,otherJob.lease,'completed',40000,first.audio),/Repeated/);await sessions.finish(other.id,0,otherJob.lease,'failed',1000);
  });
  await t.test('private, local and unplayed recordings never enter public listing or playback',async()=>{
   const {v}=await begin('bob','private'),ready=await finish();await sessions.played('bob',v.id,0);await sessions.stop('bob',v.id);const privateId=await record('bob',v.id),localId=await record('alice');for(const id of [privateId,localId])assert.equal((await djPublicRequest(new Request('https://jamloom.test/api/ai-dj/sets/'+id+'/audio'),recordings,[id,'audio'])).status,404);
   assert.equal((await sessions.status('bob',v.id)).visibility,'private');assert.equal((await pool.query("SELECT -sum(reserved_delta)::int AS n FROM wallet_ledger_entries WHERE reservation_id=$1 AND kind='capture'",[ready.job.reservation_id])).rows[0].n,3);assert.equal((await pool.query('SELECT privacy_surcharge_bps FROM generation_reservations WHERE id=$1',[ready.job.reservation_id])).rows[0].privacy_surcharge_bps,2500);
   const active=await begin('pending');await assert.rejects(record('pending',active.v.id),/finished/);await finish();await sessions.stop('pending',active.v.id);await assert.rejects(record('pending',active.v.id),/finished/);assert.deepEqual((await recordings.publicList()).sets,[]);
  });
  await t.test('credit exhaustion stops new reservations without changing visibility',async()=>{
   const {v}=await begin('tiny');await finish();await sessions.played('tiny',v.id,0);assert.deepEqual(await sessions.next('tiny',v.id,1),{ending:'credits'});assert.equal((await sessions.status('tiny',v.id)).state,'ended');assert.equal((await sessions.status('tiny',v.id)).visibility,'public');assert.equal((await sessions.wallet.balance('tiny')).reserved,0);
  });
  await t.test('Stop race refunds queued work; running work waits for its shutdown receipt',async()=>{
   const {v}=await begin('race');await finish();await sessions.played('race',v.id,0);await Promise.allSettled([sessions.next('race',v.id,1),sessions.stop('race',v.id)]);await sessions.stop('race',v.id);assert.equal((await sessions.wallet.balance('race')).reserved,0);
   const b=await begin('queue'),job=await sessions.claim();await sessions.stop('queue',b.v.id);assert.equal((await sessions.status('queue',b.v.id)).state,'ending');assert.ok((await sessions.wallet.balance('queue')).reserved>0);await sessions.finish(b.v.id,0,job.lease,'completed',1000,wav(777));assert.equal((await sessions.status('queue',b.v.id)).state,'ended');assert.equal((await sessions.wallet.balance('queue')).reserved,0);assert.equal((await sessions.status('queue',b.v.id)).batches[0].state,'cancelled');
  });
  await t.test('lost settlement response retries once; disconnected sessions cannot dispatch',async()=>{
   const {v}=await begin('retry'),job=await sessions.claim(),audio=wav(888),settle=sessions.wallet.settle.bind(sessions.wallet);let fail=true;sessions.wallet.settle=async(...args:Parameters<typeof settle>)=>{await settle(...args);if(fail){fail=false;throw Error('lost settlement response');}};
   await assert.rejects(sessions.finish(v.id,0,job.lease,'completed',40000,audio),/lost settlement/);const balance=await sessions.wallet.balance('retry');await sessions.finish(v.id,0,job.lease,'completed',40000,audio);assert.deepEqual(await sessions.wallet.balance('retry'),balance);sessions.wallet.settle=settle;await sessions.stop('retry',v.id);
   const stale=await begin('retry');await pool.query("UPDATE dj_sessions SET heartbeat_at=now()-interval '2 minutes' WHERE id=$1",[stale.v.id]);assert.equal(await sessions.claim(),null);assert.equal(await sessions.expire(),1);assert.equal((await sessions.status('retry',stale.v.id)).endReason,'disconnected');
  });
  await t.test('rising per-track price preserves Private and requires a fresh decision',async()=>{
   await pool.query("UPDATE credit_lots SET created_at=now()-interval '1 day' WHERE owner_id='price'");
   const ledger=(await pool.query("SELECT id FROM credit_lots WHERE owner_id='price'")).rows[0].id;
   await pool.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES('price',$1,'refund',-97,0)",[ledger]);
   await sessions.wallet.grant('price',{provider:'stripe_test',receipt:'price-second-lot',credits:100,netMicros:500000});
   const {v}=await begin('price','private');await finish();await sessions.played('price',v.id,0);assert.deepEqual(await sessions.next('price',v.id,1),{ending:'price'});assert.equal((await sessions.status('price',v.id)).visibility,'private');assert.equal((await sessions.wallet.balance('price')).reserved,0);
  });
  await t.test('DJ and existing generation queues share one worker capacity',async()=>{
   const {v}=await begin('capacity'),legacy=new GenerationQueue(pool,'q'.repeat(32));const job=await sessions.wallet.reserve('legacy','legacy_capacity',50000,5000,{inputSha256:'a'.repeat(64),planSha256:'b'.repeat(64),maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000});
   const [dj,old]=await Promise.all([sessions.claim(),legacy.claim('capacity_check')]);assert.equal(Number(!!dj)+Number(!!old),1);
   if(dj){assert.equal(await legacy.claim('second_check'),null);await sessions.finish(v.id,0,dj.lease,'failed',0);await legacy.cancel('legacy',job);}else{assert.equal(await sessions.claim(),null);await legacy.stopped(job,old!.leaseToken,0,'failed');await sessions.stop('capacity',v.id);}
  });
  await t.test('frozen accounts cannot complete new public music',async()=>{
   const {v}=await begin('frozen'),job=await sessions.claim();await pool.query("UPDATE credit_wallets SET frozen=true WHERE owner_id='frozen'");await sessions.finish(v.id,0,job.lease,'completed',1000,wav(999));assert.equal((await sessions.status('frozen',v.id)).batches[0].state,'cancelled');assert.equal((await sessions.wallet.balance('frozen')).reserved,0);
  });
  await t.test('account purge keeps running work and saved recordings protected',async()=>{
   await assert.rejects(sessions.purgeOwner('bob'),/Suspend/);await pool.query(`UPDATE "user" SET suspended=true WHERE id='bob'`);await assert.rejects(sessions.purgeOwner('bob'),/saved set/);await recordings.purgeOwner('bob');await sessions.purgeOwner('bob');assert.equal((await pool.query("SELECT count(*)::int AS n FROM dj_sessions WHERE owner_id='bob'")).rows[0].n,0);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
