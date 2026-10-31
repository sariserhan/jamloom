import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';import {DJSessions} from '../lib/dj-sessions';
const id=()=>randomUUID().replaceAll('-',''),record={fingerprint:'isolated-test',save:async()=>{}};
const budget={costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000};
test('DJ allowance retains unused value without changing whole-credit account balances',async t=>{
 const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(target.hostname,'127.0.0.1');
 const admin=createPool(target.toString()),name='jamloom_allowance_'+id();await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString()),wallet=new Wallet(pool,false,true);
 const grant=async(owner:string,credits=1)=>{await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);await wallet.grant(owner,{provider:'stripe_test',receipt:owner,credits,netMicros:credits*1000000});};
 const reserve=async(owner:string,key=id(),visibility:'public'|'private'='public')=>{const q=await wallet.quote(owner,50000,5000,visibility);return {q,id:await wallet.reserve(owner,key,50000,5000,undefined,visibility,q.credits,record)};};
 const objects=new Map<string,Buffer>(),store={local:true,put:async(k:string,b:Buffer)=>{objects.set(k,b);},get:async(k:string)=>objects.get(k)!,remove:async(k:string)=>{objects.delete(k);},uploadURL:async()=>'',playbackURL:async()=>''};
 let sample=0;const finishBatch=async(service:DJSessions,owner:string)=>{const job=await service.claim();assert.ok(job);const audio=Buffer.alloc(11520044);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(2,22);audio.writeUInt32LE(48000,24);audio.writeUInt32LE(192000,28);audio.writeUInt16LE(4,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);for(let i=44;i<audio.length;i+=2)audio.writeInt16LE((i%200<100?1000:-1000)+sample,i);sample++;await service.localStopped(job.session_id,job.sequence,job.lease,'e'.repeat(64));await service.finish(job.session_id,job.sequence,job.lease,'completed',1000,audio);await service.played(owner,job.session_id,job.sequence);};
 try{
  assert.ok((await migrate(pool)).includes('0027_dj_allowance.sql'));assert.deepEqual(await migrate(pool),[]);
  await t.test('one credit funds ten public or private minutes, with no per-minute rounding',async()=>{
   for(const [owner,visibility,count] of [['public','public',10],['private','private',10]] as const){
    await grant(owner);
    for(let n=0;n<count;n++){const r=await reserve(owner,id(),visibility);assert.equal(r.q.credits,n===0?1:0);assert.equal(r.q.djAllowance!.maxCredits,1);assert.equal(r.q.djAllowance!.chargeMicros,50000);if(!n)assert.equal(r.q.djAllowance!.topUpMinutes,count);await wallet.settle(owner,r.id,1000,'completed');await wallet.settle(owner,r.id,1000,'completed');}
    assert.deepEqual(await wallet.balance(owner),{available:0,reserved:0});await assert.rejects(wallet.quote(owner,50000,5000,visibility),/Insufficient credits/);
    assert.equal(Number((await pool.query("SELECT count(*) FROM wallet_ledger_entries WHERE owner_id=$1 AND kind='dj_fund'",[owner])).rows[0].count),1);
   }
  });
  await t.test('cancelled and failed work refunds unused top-ups, with immutable settlement retries',async()=>{
   await grant('refund');for(const status of ['cancelled','failed'] as const){const r=await reserve('refund');await wallet.settle('refund',r.id,status==='failed'?1200:0,status);await wallet.settle('refund',r.id,status==='failed'?1200:0,status);assert.deepEqual(await wallet.balance('refund'),{available:1,reserved:0});await assert.rejects(wallet.settle('refund',r.id,0,'completed'),/conflict/);}
   await assert.rejects(pool.query("UPDATE wallet_ledger_entries SET available_delta=9 WHERE owner_id='refund'"),/append-only/);
  });
  await t.test('a partial top-up survives Stop and process restart; failure restores its reserved allowance',async()=>{
   await grant('carry');const first=await reserve('carry');await wallet.settle('carry',first.id,1000,'completed');
   const restarted=new Wallet(pool,false,true),before=await restarted.quote('carry',50000,5000,'public');assert.equal(before.djAllowance!.availableMicros,450000);assert.equal(before.credits,0);
   const second=await reserve('carry');await restarted.settle('carry',second.id,1200,'failed');assert.equal((await restarted.quote('carry',50000,5000,'public')).djAllowance!.availableMicros,450000);assert.deepEqual(await restarted.balance('carry'),{available:0,reserved:0});
  });
  await t.test('quote mismatch and racing starts cannot convert twice or overdraw allowance',async()=>{
   await grant('race');await assert.rejects(wallet.reserve('race','wrong_quote',50000,5000,undefined,'public',2,record),/Quote changed/);assert.deepEqual(await wallet.balance('race'),{available:1,reserved:0});
   const key=id(),q=await wallet.quote('race',50000,5000,'public'),results=await Promise.all(Array.from({length:5},()=>wallet.reserve('race',key,50000,5000,undefined,'public',q.credits,record)));assert.equal(new Set(results).size,1);
   await assert.rejects(reserve('race'),/One active/);await assert.rejects(wallet.reserve('race',key,50001,5000,undefined,'public',1,record),/Changed quote/);await assert.rejects(wallet.settle('carry',results[0],0,'cancelled'),/Unknown/);await wallet.settle('race',results[0],0,'cancelled');assert.deepEqual(await wallet.balance('race'),{available:1,reserved:0});
   await assert.rejects(new Wallet(pool,true,true).quote('race',50000,5000,'public'),/Insufficient/);
  });
  await t.test('purchase disputes cannot return converted or held credits into spendable allowance',async()=>{
   for(const consumed of [false,true]){const owner='hold-'+consumed;await grant(owner);const r=await reserve(owner);if(consumed)await wallet.settle(owner,r.id,1000,'completed');await wallet.freezePurchase('stripe_test',owner);if(!consumed)await wallet.settle(owner,r.id,0,'cancelled');assert.deepEqual(await wallet.balance(owner),{available:0,reserved:0});await assert.rejects(wallet.quote(owner,50000),/frozen/);
    await pool.query('UPDATE credit_wallets SET frozen=false WHERE owner_id=$1',[owner]);await assert.rejects(wallet.quote(owner,50000),/Insufficient/);
   }
  });
  await t.test('mixed purchase lots preserve carried value and return only an untouched failed top-up',async()=>{
   await grant('mixed');const first=await reserve('mixed');await wallet.settle('mixed',first.id,1000,'completed');
   for(let n=0;n<8;n++){const r=await reserve('mixed');await wallet.settle('mixed',r.id,1000,'completed');}
   await wallet.grant('mixed',{provider:'apple_sandbox',receipt:'mixed-apple',credits:2,netMicros:100000});
   const q=await wallet.quote('mixed',50000,5000,'private');assert.equal(q.djAllowance!.availableMicros,50000);assert.equal(q.credits,0);
   const r=await reserve('mixed',id(),'private');await wallet.settle('mixed',r.id,1200,'failed');
   assert.deepEqual(await wallet.balance('mixed'),{available:2,reserved:0});assert.equal((await wallet.quote('mixed',50000,5000,'private')).djAllowance!.availableMicros,50000);
   const again=await reserve('mixed',id(),'private');await wallet.settle('mixed',again.id,1000,'completed');
   const allocations=(await pool.query('SELECT sum(micros)::int AS n FROM dj_allowance_allocations WHERE reservation_id=$1 AND state=\'captured\'',[again.id])).rows[0];assert.equal(allocations.n,50000);
   assert.deepEqual(await wallet.balance('mixed'),{available:2,reserved:0});assert.equal((await wallet.quote('mixed',50000,5000,'public')).credits,2);
  });
  await t.test('new DJ sessions use fixed credits and stop at the signed minute limit',async()=>{
   await grant('session',12);
   const sessions=new DJSessions(pool,'isolated-allowance-secret-1234567890',store,budget,false,true);
   const input={id:id(),title:'Bounded party',style:'house',energy:4,visibility:'private',minutes:3};
   const q=await sessions.quote('session',input);assert.equal(q.credits,2);assert.equal(q.maxSessionCredits,6);
   await assert.rejects(sessions.start('session',{...input,minutes:4},q.token),/changed/);
   await sessions.start('session',input,q.token);
   for(let n=0;n<3;n++){if(n)assert.ok((await sessions.next('session',input.id,n)).reservation);await finishBatch(sessions,'session');}
   assert.deepEqual(await sessions.next('session',input.id,3),{ending:'limit'});
   assert.deepEqual(await sessions.wallet.balance('session'),{available:6,reserved:0});
   assert.equal((await sessions.status('session',input.id)).endReason,'limit');
  });
  await t.test('a change of purchase lot cannot change the signed price',async()=>{
   await grant('rate-start',5);await wallet.grant('rate-start',{provider:'apple_sandbox',receipt:'rate-start-low',credits:5,netMicros:500000});
   const sessions=new DJSessions(pool,'isolated-allowance-secret-1234567890',store,budget,false,true),input={id:id(),title:'Same price',style:'house',energy:4,visibility:'public'},q=await sessions.quote('rate-start',input);
   const regular=new Wallet(pool),spent=await regular.reserve('rate-start','other_product',2500000);await regular.settle('rate-start',spent,2500000,'completed');
   await sessions.start('rate-start',input,q.token);assert.deepEqual(await wallet.balance('rate-start'),{available:3,reserved:2});await sessions.stop('rate-start',input.id);
   assert.equal((await sessions.quote('rate-start',input)).credits,2);
  });
  await t.test('unavailable capacity rolls back the fixed price without buying allowance',async()=>{
   await grant('unavailable',2);const remote={...store,local:false};
   const sessions=new DJSessions(pool,'isolated-allowance-secret-1234567890',remote,budget,false,true),input={id:id(),title:'No capacity',style:'house',energy:4,visibility:'public'};
   const q=await sessions.quote('unavailable',input);await assert.rejects(sessions.start('unavailable',input,q.token),/warming up/);
   assert.deepEqual(await wallet.balance('unavailable'),{available:2,reserved:0});assert.equal(Number((await pool.query("SELECT count(*) FROM dj_allowance_lots WHERE owner_id='unavailable'")).rows[0].count),0);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
