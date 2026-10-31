// Real Stripe sandbox lifecycle; no live keys, GPU work or customer charges.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import Stripe from 'stripe';
import {createPool} from '../lib/database.ts';import {migrate} from '../lib/migrations.ts';
import {Wallet} from '../lib/wallet.ts';
import {fulfillSubscriptionInvoice,reconcileSubscription,reverseSubscriptionPayment,subscriptionCheckout} from '../lib/credit-subscriptions.ts';
import {CREDIT_CATALOG_VERSION} from '../lib/credit-catalog.ts';
process.loadEnvFile('.env.local');assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(target.hostname,'127.0.0.1');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:1});assert.equal((await stripe.accounts.retrieve()).id,'acct_1TxA3vDlEXWDEeHO');
const admin=createPool(target.toString()),name='jamloom_creator_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;
const pool=createPool(target.toString()),wallet=new Wallet(pool);let clock,customer,subscription,checkout;
const idOf=v=>typeof v==='string'?v:v?.id;
try{
 await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES(\'creator-provider\',\'Sandbox\',\'creator-provider@example.test\',true)');
 clock=await stripe.testHelpers.testClocks.create({frozen_time:Math.floor(Date.now()/1000),name:'Jamloom Creator lifecycle qualification'});
 customer=await stripe.customers.create({name:'Jamloom sandbox lifecycle',email:'creator-provider@example.test',test_clock:clock.id,address:{line1:'123 Test Street',city:'New York',state:'NY',postal_code:'10001',country:'US'}});
 await pool.query('INSERT INTO credit_customers(owner_id,billing_live,customer_id) VALUES(\'creator-provider\',false,$1)',[customer.id]);
 const sessions=await Promise.all([subscriptionCheckout(stripe,pool,'creator-provider','provider-checkout-1','http://127.0.0.1:3012',false),subscriptionCheckout(stripe,pool,'creator-provider','provider-checkout-2','http://127.0.0.1:3012',false)]);
 assert.equal(sessions[0].id,sessions[1].id);checkout=sessions[0];await stripe.checkout.sessions.expire(checkout.id);checkout=null;
 const method=await stripe.paymentMethods.attach('pm_card_visa',{customer:customer.id});await stripe.customers.update(customer.id,{invoice_settings:{default_payment_method:method.id}});
 subscription=await stripe.subscriptions.create({customer:customer.id,items:[{price:process.env.CREATOR_STRIPE_PRICE_ID}],automatic_tax:{enabled:true},metadata:{jamloom_product:'creator-subscription',jamloom_owner:'creator-provider',catalog:CREDIT_CATALOG_VERSION}});
 async function deliver(invoice){for(let n=0;n<15;n++){try{return await fulfillSubscriptionInvoice(stripe,pool,wallet,invoice);}catch(e){if(n===14)throw e;await delay(1000);}}}
 const initial=idOf(subscription.latest_invoice);assert.ok(initial);await deliver(initial);await deliver(initial);assert.equal((await wallet.balance('creator-provider')).available,300);
 const next=subscription.items.data[0].current_period_end+3600;
 await stripe.testHelpers.testClocks.advance(clock.id,{frozen_time:next});
 for(let n=0;n<45;n++){if((await stripe.testHelpers.testClocks.retrieve(clock.id)).status==='ready')break;if(n===44)throw Error('Test clock timeout');await delay(1000);}
 subscription=await stripe.subscriptions.retrieve(subscription.id);const renewal=idOf(subscription.latest_invoice);assert.notEqual(renewal,initial);
 // Finalize/pay the sandbox renewal when the invoice's automatic finalization grace period is pending.
 let invoice=await stripe.invoices.retrieve(renewal);if(invoice.status==='draft')invoice=await stripe.invoices.finalizeInvoice(renewal);if(invoice.status==='open')await stripe.invoices.pay(renewal);
 await deliver(renewal);await deliver(renewal);assert.equal((await wallet.balance('creator-provider')).available,600);
 await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true});await reconcileSubscription(stripe,pool,wallet,subscription.id);assert.equal((await wallet.subscriptions('creator-provider'))[0].cancel_at_period_end,true);assert.equal((await wallet.balance('creator-provider')).available,600);
 const payments=await stripe.invoicePayments.list({invoice:renewal,status:'paid'}),intent=idOf(payments.data[0].payment.payment_intent);assert.ok(intent);
 await stripe.refunds.create({payment_intent:intent});await reverseSubscriptionPayment(stripe,wallet,intent);await reverseSubscriptionPayment(stripe,wallet,intent);assert.equal((await wallet.balance('creator-provider')).available,300);
 console.log(JSON.stringify({status:'PASS',environment:'Stripe test mode + disposable local Postgres',checkoutDeduplication:'PASS',firstPayment:'PASS',monthlyRenewal:'PASS',duplicateInvoices:'PASS',cancellationPreservesCredits:'PASS',refund:'PASS',liveCharges:0,gpuRequests:0}));
}finally{
 if(checkout)await stripe.checkout.sessions.expire(checkout.id).catch(()=>{});
 if(clock)await stripe.testHelpers.testClocks.del(clock.id);
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();
 console.log(JSON.stringify({cleanup:'PASS',testClockRemoved:!!clock,localDatabaseRemoved:true}));
}
