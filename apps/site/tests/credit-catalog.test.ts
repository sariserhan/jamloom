import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet} from '../lib/wallet';
import {reconcileAppleNotification} from '../lib/apple-payments';
import {Environment,Type,NotificationTypeV2} from '@apple/app-store-server-library';
import {CREDIT_CATALOG_VERSION,assertAllocationBudget,assertCatalogBudget,songCreditPrice,fixedAllocation} from '../lib/credit-catalog';

test('catalog prices are independent of channel, privacy, style and voice; live budgets fail closed',()=>{
 const price=songCreditPrice('improvise');assert.equal(price.credits,10);
 assert.equal(songCreditPrice('music-dna').credits,20);
 const lots=[{id:'apple',credits:150,available:150,net_micros:4_000_000}];
 assert.equal(fixedAllocation(lots,10)[0].n,10);
 assert.equal(fixedAllocation([{...lots[0],net_micros:9_000_000}],10)[0].n,10);
 assertCatalogBudget(price,70000,true);assert.throws(()=>assertCatalogBudget(price,70001,true),/budget/);
 assert.throws(()=>assertAllocationBudget([{n:10,net:1000}],70000,true),/proceeds/);
 assertAllocationBudget([{n:10,net:20000}],70000,true);
 assert.throws(()=>fixedAllocation(lots,151),/Insufficient/);
 assert.throws(()=>assertCatalogBudget({...price,version:'old' as never},1,false),/changed/);
});

test('real Postgres: catalog conservation, renewals, refunds, nonexpiry, trial caps and legacy conversion',async t=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
 const admin=createPool(url.toString()),name='jamloom_catalog_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const pool=createPool(url.toString()),wallet=new Wallet(pool);
 try{
  await migrate(pool);assert.deepEqual(await migrate(pool),[]);
  for(const id of ['web','apple','trial1','trial2','trial3','legacy','renewal','other','legacy-bank'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,id+'@example.test']);
  await t.test('same published price and no private premium across fees; full technical-failure refund',async()=>{
   await wallet.grant('web',{provider:'stripe_test',receipt:'web',credits:150,netMicros:9_000_000});
   await wallet.grant('apple',{provider:'apple_sandbox',receipt:'apple',credits:150,netMicros:4_000_000});
   for(const owner of ['web','apple']){
    const fixed=songCreditPrice('improvise');
    const pub=await wallet.quote(owner,50000,6500,'public',fixed),priv=await wallet.quote(owner,50000,6500,'private',fixed);
    assert.equal(pub.credits,10);assert.equal(priv.credits,10);assert.equal(priv.privacyCredits,0);
    const save=async()=>{};
    const id=await wallet.reserve(owner,'fixed_completed',50000,6500,undefined,'private',10,{fingerprint:'same',fixedPrice:fixed,save});
    await wallet.settle(owner,id,1,'completed');assert.deepEqual(await wallet.balance(owner),{available:140,reserved:0});
    const failed=await wallet.reserve(owner,'fixed_failure',50000,6500,undefined,'private',10,{fingerprint:'fail',fixedPrice:fixed,save});
    await wallet.settle(owner,failed,40000,'failed');await wallet.settle(owner,failed,40000,'failed');
    assert.deepEqual(await wallet.balance(owner),{available:140,reserved:0});
    assert.equal(Number((await pool.query('SELECT actual_cost_micros FROM generation_reservations WHERE id=$1',[failed])).rows[0].actual_cost_micros),40000);
   }
  });
  await t.test('monthly grants are unique by receipt AND period; cancel does not remove paid credits',async()=>{
   const subscription={id:'sub_one',customer:'cus_one',start:new Date('2026-09-01'),end:new Date('2026-10-01'),status:'active',cancelAtPeriodEnd:false,observedAt:100};
   const purchase={provider:'stripe_test' as const,receipt:'in_one',credits:300,netMicros:10_000_000,subscription};
   const grants=await Promise.all(Array.from({length:6},()=>wallet.grant('renewal',purchase)));assert.equal(new Set(grants).size,1);
   await assert.rejects(wallet.grant('other',purchase),/account mismatch|conflict/i);
   await assert.rejects(wallet.grant('renewal',{...purchase,receipt:'different_invoice'}),/already credited/);
   await wallet.grant('renewal',{...purchase,receipt:'in_two',subscription:{...subscription,start:new Date('2026-10-01'),end:new Date('2026-11-01'),observedAt:200}});
   await wallet.updateSubscription('renewal','stripe_test',{...subscription,start:new Date('2026-10-01'),end:new Date('2026-11-01'),status:'canceled',cancelAtPeriodEnd:true,observedAt:300});
   await wallet.grant('renewal',purchase); // Old delivery cannot reactivate cancellation.
   await wallet.updateSubscription('renewal','stripe_test',{...subscription,status:'active',observedAt:150});
   assert.equal((await wallet.subscriptions('renewal'))[0].status,'canceled');
   assert.deepEqual(await wallet.balance('renewal'),{available:600,reserved:0});
   await wallet.freezePurchase('stripe_test','in_two');assert.deepEqual(await wallet.balance('renewal'),{available:300,reserved:0});
   await assert.rejects(wallet.grant('renewal',{...purchase,receipt:'in_two'}),/frozen|held/);
  });
  await t.test('signed Apple expiry reconciles without renewal info and preserves credits',async()=>{
   const token=await wallet.accountToken('apple');
   const sub={id:'original_apple',start:new Date('2026-09-01'),end:new Date('2026-10-01'),status:'active',cancelAtPeriodEnd:true,observedAt:100};
   await wallet.grant('apple',{provider:'apple_sandbox',receipt:'apple_month',credits:300,netMicros:6000000,subscription:sub});
   const verifier={verifyAndDecodeNotification:async()=>({version:'2.0',notificationUUID:randomUUID(),notificationType:NotificationTypeV2.EXPIRED,signedDate:200,data:{environment:Environment.SANDBOX,bundleId:'com.jamloom',signedTransactionInfo:'verified-fixture'}}),verifyAndDecodeTransaction:async()=>({productId:'com.jamloom.creator.monthly',originalTransactionId:sub.id,transactionId:'apple_month',environment:Environment.SANDBOX,bundleId:'com.jamloom',type:Type.AUTO_RENEWABLE_SUBSCRIPTION,appAccountToken:token,purchaseDate:sub.start.getTime(),expiresDate:sub.end.getTime()})};
   await reconcileAppleNotification(verifier,wallet,'verified-fixture','com.jamloom',Environment.SANDBOX,pool);
   const state=(await wallet.subscriptions('apple'))[0];assert.equal(state.status,'expired');assert.equal(state.cancel_at_period_end,true);
   assert.equal((await wallet.balance('apple')).available,440);
  });
  await t.test('trial is once per verified account, globally capped, isolated from production',async()=>{
   await pool.query('UPDATE credit_trial_budgets SET max_claims=2 WHERE NOT billing_live');
   const claims=await Promise.all(Array.from({length:5},()=>wallet.claimTrial('trial1')));assert.equal(claims.filter(Boolean).length,1);
   await wallet.claimTrial('trial2');await assert.rejects(wallet.claimTrial('trial3'),/unavailable/);
   assert.deepEqual(await wallet.balance('trial1'),{available:20,reserved:0});
   assert.deepEqual(await new Wallet(pool,true).balance('trial1'),{available:0,reserved:0});
   await assert.rejects(new Wallet(pool,true).claimTrial('trial1'),/unavailable/);
  });
  await t.test('unused legacy DJ capacity returns as new credits exactly once',async()=>{
   await wallet.accountToken('legacy-bank');
   const lot=(await pool.query("INSERT INTO credit_lots(owner_id,provider,receipt,credits,net_micros,unit_version) VALUES('legacy-bank','stripe_test','cs_bank',10,7000000,1) RETURNING id")).rows[0].id;
   const bank=(await pool.query("INSERT INTO dj_allowance_lots(owner_id,credit_lot_id,credits,capacity_micros) VALUES('legacy-bank',$1,4,1000000) RETURNING id",[lot])).rows[0].id;
   await pool.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES('legacy-bank',$1,'grant',10,0)",[lot]);
   await pool.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta,dj_allowance_lot_id) VALUES('legacy-bank',$1,'dj_fund',-4,0,$2)",[lot,bank]);
   assert.deepEqual(await wallet.balance('legacy-bank'),{available:150,reserved:0});
   assert.deepEqual(await wallet.balance('legacy-bank'),{available:150,reserved:0});
   assert.equal((await pool.query('SELECT state FROM dj_allowance_lots WHERE id=$1',[bank])).rows[0].state,'returned');
  });
  await t.test('legacy conversion is once, preserves receipts, and leaves historic ledger immutable',async()=>{
   await wallet.accountToken('legacy');
   const lot=(await pool.query("INSERT INTO credit_lots(owner_id,provider,receipt,credits,net_micros,unit_version) VALUES('legacy','stripe_test','cs_old',10,7000000,1) RETURNING id")).rows[0].id;
   await pool.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta) VALUES('legacy',$1,'grant',10,0)",[lot]);
   for(let i=0;i<3;i++)assert.deepEqual(await wallet.balance('legacy'),{available:150,reserved:0});
   await wallet.grant('legacy',{provider:'stripe_test',receipt:'cs_old',credits:150,netMicros:7000000});
   assert.equal((await pool.query('SELECT count(*)::int AS n FROM wallet_ledger_entries WHERE lot_id=$1',[lot])).rows[0].n,2);
   await assert.rejects(pool.query("UPDATE wallet_ledger_entries SET available_delta=0 WHERE lot_id=$1",[lot]),/append-only/);
  });
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
