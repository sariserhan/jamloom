import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet, type Purchase} from '../lib/wallet';

test('verified renewals survive unrelated refunds without reopening spending',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.href),name='jamloom_reconciliation_'+randomUUID().replaceAll('-','');
 await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.href);
 try{
  await migrate(pool);
  for(const provider of ['apple_sandbox','apple_live','stripe_test','stripe_live'] as const){
   const owner=provider,wallet=new Wallet(pool,provider.endsWith('_live'));
   await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
   const topup:Purchase={provider,receipt:'refunded-topup',credits:150,netMicros:4_000_000};
   await wallet.grant(owner,topup);await wallet.freezePurchase(provider,topup.receipt);
   const renewal:Purchase={provider,receipt:'renewal-after-refund',credits:300,netMicros:6_000_000,
    subscription:{id:'subscription',start:new Date('2026-11-01'),end:new Date('2026-12-01'),status:'active',cancelAtPeriodEnd:false}};
   const lots=await Promise.all(Array.from({length:3},()=>wallet.grant(owner,renewal)));
   assert.equal(new Set(lots).size,1);
   assert.deepEqual(await wallet.balance(owner),{available:300,reserved:0});
   assert.deepEqual(await new Wallet(pool,!wallet.live).balance(owner),{available:0,reserved:0});
   assert.equal((await pool.query('SELECT frozen FROM credit_wallets WHERE owner_id=$1',[owner])).rows[0].frozen,true);
   await assert.rejects(wallet.grant(owner,topup),/held/);
   await assert.rejects(wallet.grant(owner,{...renewal,receipt:'duplicate-period'}),/already credited/);
   await assert.rejects(wallet.reserve(owner,'blocked_refund_spend',1000),/frozen/);
   await assert.rejects(wallet.claimTrial(owner),/frozen/);
   // Provider bookkeeping must also survive account suspension; suspension still blocks use.
   await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',[owner]);
   await wallet.grant(owner,{...renewal,receipt:'next-renewal',subscription:{...renewal.subscription!,start:new Date('2026-12-01'),end:new Date('2027-01-01')}});
   assert.deepEqual(await wallet.balance(owner),{available:600,reserved:0});
   await assert.rejects(wallet.reserve(owner,'blocked_suspended_spend',1000),/suspended/);
   assert.equal((await pool.query('SELECT count(*)::int n FROM wallet_ledger_entries WHERE owner_id=$1 AND kind=\'grant\'',[owner])).rows[0].n,3);
   // A refund can arrive before a subscription receipt is delivered. Hold the
   // refund transaction open while delivery starts, then commit the refund.
   const refund=await pool.connect(),racing={...renewal,receipt:'concurrent-refund',subscription:{...renewal.subscription!,start:new Date('2027-01-01'),end:new Date('2027-02-01')}};
   let pending:Promise<unknown>|undefined;
   try{
    await refund.query('BEGIN');
    await refund.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[provider+':'+racing.receipt]);
    await refund.query('INSERT INTO purchase_holds(provider,receipt) VALUES($1,$2)',[provider,racing.receipt]);
    pending=wallet.grant(owner,racing).then(()=>({granted:true}),error=>({error:String(error)}));
    // Wait for the delivery to reach the held receipt lock, not an arbitrary delay.
    let blocked=false;
    for(let i=0;i<100;i++){
     blocked=!!(await refund.query("SELECT 1 FROM pg_locks waiting JOIN pg_locks held USING(locktype,database,classid,objid,objsubid) WHERE held.pid=pg_backend_pid() AND held.granted AND NOT waiting.granted AND held.locktype='advisory'")).rowCount;
     if(blocked)break;await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert(blocked,'Subscription delivery must serialize with its receipt refund');
    await refund.query('COMMIT');assert.match(String((await pending as {error?:string}).error),/held/);
    assert.equal((await pool.query('SELECT 1 FROM credit_lots WHERE provider=$1 AND receipt=$2',[provider,racing.receipt])).rowCount,0);
   }finally{await refund.query('ROLLBACK');refund.release();await pending;}
  }
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
