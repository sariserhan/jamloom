import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import type Stripe from 'stripe';
import {singingOffer} from '../../web/singing-course.js';import {academyProductKey} from '../lib/academy-products';
import {billingReadiness,billingEnvironment} from '../lib/billing-mode';import {AcademyStore} from '../lib/academy-store';
import {verifiedAcademyPrice,academyCheckout,grantAcademy,academyWebhook} from '../lib/academy-payments';
import {createPool} from '../lib/database';import {migrate} from '../lib/migrations';
const config={price:'price_singing',product:'prod_singing',course:'singing-complete' as const};
const price={id:config.price,active:true,livemode:false,currency:'usd',unit_amount:3900,type:'one_time',tax_behavior:'exclusive',product:{id:config.product,active:true,metadata:{jamloom_product:config.course}}};
const receipt=(id='cs_singing')=>({id,livemode:false,mode:'payment',payment_status:'paid',client_reference_id:'singer',payment_intent:'pi_'+id,currency:'usd',amount_subtotal:3900,total_details:{amount_discount:0},metadata:{jamloom_product:config.course},line_items:{data:[{quantity:1,amount_subtotal:3900,price}]}});
test('Singing is $39 once and cannot enable live sales or borrow DJ billing configuration',async()=>{
 assert.equal(singingOffer.priceCents,3900);assert.equal(singingOffer.salesReleased,false);assert.throws(()=>academyProductKey('song-credits'));
 const env={STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_PUBLISHABLE_KEY:'pk_test_fixture',SINGING_STRIPE_PRICE_ID:config.price,SINGING_STRIPE_PRODUCT_ID:config.product,SINGING_STRIPE_WEBHOOK_SECRET:'whsec_singing',SINGING_STRIPE_SANDBOX_ENABLED:'true'};
 assert.equal(billingReadiness('test',env,config.course).academyCheckoutEnabled,true);assert.equal(billingReadiness('test',env).configured,false);
 assert.equal(billingReadiness('live',{...env,STRIPE_LIVE_SECRET_KEY:'sk_live_fixture',STRIPE_LIVE_PUBLISHABLE_KEY:'pk_live_fixture',SINGING_STRIPE_LIVE_PRICE_ID:config.price,SINGING_STRIPE_LIVE_PRODUCT_ID:config.product,SINGING_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_live'},config.course).academyCheckoutEnabled,false);
 assert.equal(billingEnvironment('test',env,config.course).webhook,'whsec_singing');
 for(const patch of [{unit_amount:7999},{unit_amount:39},{type:'recurring'},{livemode:true},{currency:'eur'},{product:{...price.product,metadata:{jamloom_product:'academy-complete'}}}])await assert.rejects(verifiedAcademyPrice({prices:{retrieve:async()=>({...price,...patch})}} as unknown as Stripe,config));
});
test('Singing receipts grant only the purchased course; retries, refund, dispute and mode stay isolated',async()=>{
 const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');const admin=createPool(url.href),name='jamloom_singing_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href),store=new AcademyStore(pool);let current=receipt(),body:any;
 const stripe={prices:{retrieve:async()=>price},checkout:{sessions:{retrieve:async()=>current,create:async(v:any)=>{body=v;return {id:'cs_created'};},list:async()=>({has_more:false,data:[current]})}},disputes:{retrieve:async()=>({livemode:false,payment_intent:current.payment_intent,status:'needs_response'})}} as unknown as Stripe;
 try{await migrate(pool);for(const owner of ['singer','other'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.test']);
  await academyCheckout(stripe,pool,'singer','checkout_key','http://localhost:3000',config);assert.equal(body.metadata.jamloom_product,config.course);assert.equal(body.line_items[0].price,config.price);
  const event={id:'evt_both_endpoints',livemode:false,type:'checkout.session.completed',data:{object:current}} as unknown as Stripe.Event;
  await academyWebhook(stripe,pool,event,JSON.stringify(event),{price:'price_dj',product:'prod_dj'});
  await Promise.all([1,2,3].map(()=>academyWebhook(stripe,pool,event,JSON.stringify(event),config)));
  assert.equal(await store.access('singer',pool,false,config.course),true);assert.equal(await store.access('singer'),false);assert.equal(await store.access('singer',pool,true,config.course),false);assert.equal(await store.access('other',pool,false,config.course),false);
  assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,0);
  await assert.rejects(academyCheckout(stripe,pool,'singer','checkout_key','http://localhost:3000',config),/already active/);
  current={...current,client_reference_id:'other'};await assert.rejects(grantAcademy(stripe,pool,current.id,config),/conflict/);current=receipt();
  const refund={id:'evt_singing_refund',livemode:false,type:'charge.refunded',data:{object:{payment_intent:current.payment_intent}}} as unknown as Stripe.Event;
  await academyWebhook(stripe,pool,refund,JSON.stringify(refund),config);assert.equal(await store.access('singer',pool,false,config.course),false);
  current=receipt('cs_singing_new');await grantAcademy(stripe,pool,current.id,config);assert.equal(await store.access('singer',pool,false,config.course),true);
  const dispute={id:'evt_singing_dispute',livemode:false,type:'charge.dispute.created',data:{object:{id:'dp_singing',payment_intent:current.payment_intent}}} as unknown as Stripe.Event;
  await academyWebhook(stripe,pool,dispute,JSON.stringify(dispute),config);assert.equal(await store.access('singer',pool,false,config.course),false);
  current={...receipt('cs_wrong_price'),amount_subtotal:7999};await assert.rejects(grantAcademy(stripe,pool,current.id,config),/Unverified/);
 }finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
});
