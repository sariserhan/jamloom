import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {requestDeletion} from '../lib/account-deletion';import {fulfillDeletion} from '../lib/account-purge';import {OWNER_EMAIL} from '../lib/admin-access';import {AdminStore} from '../lib/admin-store';import {Wallet} from '../lib/wallet';import {DJRecordings} from '../lib/dj-recordings';import type {AudioStore} from '../lib/audio-store';
test('verified deletion waits for work and upload expiry, retries storage failure, removes personal data and retains financial evidence',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const admin=createPool(url.href),name='jamloom_purge_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href);
 const objects=new Map<string,Buffer>();let fail=false;
 const store:AudioStore={local:true,put:async(k,v)=>{objects.set(k,v);},get:async k=>objects.get(k)!,remove:async k=>{if(fail)throw Error('storage offline');objects.delete(k);},uploadURL:async()=>'',playbackURL:async()=>''};
 const recordings=new DJRecordings(pool,{remove:store.remove,abort:async()=>{}} as never);
 try{
  await migrate(pool);for(const [id,email] of [['owner',OWNER_EMAIL],['alice','alice@example.test'],['bob','bob@example.test']])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,email]);
  await pool.query(`INSERT INTO "account"(id,"accountId","providerId","userId",password,"updatedAt") VALUES('auth-alice','alice','credential','alice','test-password-hash',now())`);
  await pool.query(`INSERT INTO "session"(id,token,"expiresAt","updatedAt","userId") VALUES('session-alice','test-token',now()+interval '1 day',now(),'alice')`);
  await pool.query(`INSERT INTO taste_profiles(owner_id,profile) VALUES('alice','{"favorites":[]}'),('bob','{"favorites":[]}')`);
  await pool.query(`INSERT INTO notification_outbox(event_key,message) VALUES('signup:alice',$1)`,[JSON.stringify({to:OWNER_EMAIL,text:'alice@example.test'})]);
  await pool.query(`INSERT INTO verification(id,identifier,value,"expiresAt") VALUES('reset-alice','reset-password:test','alice',now()+interval '1 hour')`);
  const wallet=new Wallet(pool);await wallet.grant('alice',{provider:'stripe_test',receipt:'receipt_alice',credits:10,netMicros:1000000});
  const track=randomUUID(),other=randomUUID();
  for(const [id,owner] of [[track,'alice'],[other,'bob']]){await pool.query(`INSERT INTO tracks(id,owner_id,title,strategy,duration_ms) VALUES($1,$2,'Personal title','hiphop',20000)`,[id,owner]);await pool.query(`INSERT INTO track_assets(track_id,request_id,owner_id,sha256,bytes,state,expires_at) VALUES($1,$2,$3,$4,3840044,'ready',now()-interval '1 hour')`,[id,randomUUID(),owner,'a'.repeat(64)]);objects.set('masters/'+id+'.wav',Buffer.from('test object'));objects.set('uploads/'+id+'.wav',Buffer.from('test upload'));}
  const ticket=await requestDeletion(pool,'http://localhost:3000','alice',new Date(),true);
  await assert.rejects(fulfillDeletion(pool,store,recordings,'bob',ticket.id,'alice'),/Administrator/);
  await assert.rejects(fulfillDeletion(pool,store,recordings,'owner',ticket.id,'bob'),/matching/);
  assert.equal((await fulfillDeletion(pool,store,recordings,'owner',ticket.id,'alice')).status,'pending');
  assert.equal((await pool.query('SELECT count(*)::int n FROM "session" WHERE "userId"=\'alice\'')).rows[0].n,0);
  assert.equal((await pool.query('SELECT frozen FROM credit_wallets WHERE owner_id=\'alice\'')).rows[0].frozen,true);
  assert(objects.has('masters/'+track+'.wav'));await assert.rejects(new AdminStore(pool,'http://localhost').user('owner','alice',false),/cannot be restored/);
  await pool.query("UPDATE account_deletions SET started_at=now()-interval '20 minutes' WHERE owner_id='alice'");
  const reservation=randomUUID();await pool.query(`INSERT INTO generation_reservations(id,owner_id,request_key,fingerprint,status,cost_cap_micros,margin_bps) VALUES($1,'alice','pending','fixture','reserved',100,5000)`,[reservation]);
  assert.equal((await fulfillDeletion(pool,store,recordings,'owner',ticket.id,'alice')).status,'pending');assert(objects.has('masters/'+track+'.wav'));
  await pool.query("UPDATE generation_reservations SET status='cancelled',actual_cost_micros=0 WHERE id=$1",[reservation]);fail=true;
  await assert.rejects(fulfillDeletion(pool,store,recordings,'owner',ticket.id,'alice'),/storage offline/);
  assert.equal((await pool.query("SELECT completed_at FROM account_deletions WHERE owner_id='alice'")).rows[0].completed_at,null);
  fail=false;assert.equal((await fulfillDeletion(pool,store,recordings,'owner',ticket.id,'alice')).status,'complete');
  assert.equal((await fulfillDeletion(pool,store,recordings,'owner',ticket.id,'alice')).status,'complete');
  assert(!objects.has('masters/'+track+'.wav'));assert(objects.has('masters/'+other+'.wav'));
  for(const table of ['tracks','track_assets','taste_profiles'])assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table} WHERE owner_id='alice'`)).rows[0].n,0);
  assert.equal((await pool.query('SELECT count(*)::int n FROM "account" WHERE "userId"=\'alice\'')).rows[0].n,0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM notification_outbox WHERE message::text LIKE '%alice@example.test%'")).rows[0].n,0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM verification WHERE value='alice'")).rows[0].n,0);
  const tombstone=(await pool.query('SELECT * FROM "user" WHERE id=\'alice\'')).rows[0];assert.equal(tombstone.name,'Deleted account');assert.equal(tombstone.emailVerified,false);assert.equal(tombstone.suspended,true);assert.match(tombstone.email,/@accounts.invalid$/);
  assert.equal((await pool.query("SELECT count(*)::int n FROM credit_lots WHERE owner_id='alice'")).rows[0].n,1);assert.equal((await pool.query("SELECT count(*)::int n FROM wallet_ledger_entries WHERE owner_id='alice'")).rows[0].n,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM admin_audit WHERE action='account.deleted'")).rows[0].n,1);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
