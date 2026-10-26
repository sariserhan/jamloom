import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {Environment,Type,type JWSTransactionDecodedPayload} from '@apple/app-store-server-library';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';import {Wallet} from '../lib/wallet';import {AcademyStore} from '../lib/academy-store';
import {grantAppleCourse,singingAppleProduct} from '../lib/apple-course';import {reconcileAppleNotification} from '../lib/apple-payments';
import {singingContent} from '../lib/singing-access';
test('free singing content contains warm-ups and First Light, never paid scores or lyrics',()=>{
 const free=singingContent(false);assert.equal(free.singingLessons.length,12);assert.deepEqual(free.singingSongs.map(l=>l.id),['first-light']);assert.equal(singingContent(true).singingSongs.length,8);
});
test('Apple course purchase and restore are account-bound, idempotent, refund-safe and isolated from credits and DJ Academy',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const admin=createPool(url.href),name='jamloom_apple_course_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href),store=new AcademyStore(pool),wallet=new Wallet(pool);
 const bundle='com.djayvo.app';let tx:JWSTransactionDecodedPayload;
 const verifier={verifyAndDecodeTransaction:async(jws:string)=>{assert.equal(jws,'verified-test-fixture');return tx;}};
 try{await migrate(pool);for(const id of ['learner','other'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[id,id+'@example.test']);
  const original={bundleId:bundle,environment:Environment.SANDBOX,productId:singingAppleProduct,type:Type.NON_CONSUMABLE,originalTransactionId:'123456',transactionId:'123456',appAccountToken:await wallet.accountToken('learner'),inAppOwnershipType:'PURCHASED',quantity:1,currency:'USD',price:39000};tx=original;
  const grant=()=>grantAppleCourse(verifier,pool,'learner','verified-test-fixture',bundle);
  assert.deepEqual(await Promise.all([grant(),grant(),grant()]),Array(3).fill('apple_sandbox:123456'));
  assert.equal(await store.access('learner',pool,false,'singing-complete'),true);assert.equal(await store.access('learner',pool,true,'singing-complete'),false);assert.equal(await store.access('learner',pool,false),false);
  await assert.rejects(grantAppleCourse(verifier,pool,'other','verified-test-fixture',bundle));
  tx={...original,appAccountToken:await wallet.accountToken('other')};await assert.rejects(grantAppleCourse(verifier,pool,'other','verified-test-fixture',bundle),/conflict/);
  for(const patch of [{price:3900},{price:79990},{currency:'EUR'},{quantity:2},{offerType:1},{revocationDate:1},{revocationReason:0},{appAccountToken:undefined},{environment:Environment.PRODUCTION},{inAppOwnershipType:'FAMILY_SHARED'},{type:Type.CONSUMABLE},{originalTransactionId:'not-a-receipt'},{bundleId:'wrong'}]){tx={...original,...patch};await assert.rejects(grant());}
  assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  const notification={...verifier,verifyAndDecodeNotification:async()=>({version:'2.0',notificationUUID:randomUUID(),notificationType:'REFUND',data:{bundleId:bundle,environment:Environment.SANDBOX,signedTransactionInfo:'verified-test-fixture'}})};
  tx={...original,revocationDate:1};await reconcileAppleNotification(notification,wallet,'notice',bundle,Environment.SANDBOX,pool);
  assert.equal(await store.access('learner',pool,false,'singing-complete'),false);
  tx=original;await grant();assert.equal(await store.access('learner',pool,false,'singing-complete'),false,'Old valid receipt cannot undo refund');
  tx={...original,originalTransactionId:'123457',revocationDate:1};await reconcileAppleNotification(notification,wallet,'notice',bundle,Environment.SANDBOX,pool);
  delete tx.revocationDate;await grant();assert.equal(await store.access('learner',pool,false,'singing-complete'),false,'Refund before grant survives restore');
  tx={...original,originalTransactionId:'123458'};await grant();assert.equal(await store.access('learner',pool,false,'singing-complete'),true);
  tx={...tx,revocationDate:1,environment:Environment.PRODUCTION};await assert.rejects(reconcileAppleNotification(notification,wallet,'notice',bundle,Environment.SANDBOX,pool));assert.equal(await store.access('learner',pool,false,'singing-complete'),true);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
