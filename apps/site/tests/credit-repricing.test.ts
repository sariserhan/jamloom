import test from 'node:test';
import assert from 'node:assert/strict';
import {Environment,Type} from '@apple/app-store-server-library';
import {CREATOR_PLAN,TOP_UP,CREDIT_CATALOG_VERSION,PREVIOUS_CREDIT_CATALOG_VERSION,NET_MICROS_PER_CREDIT_FLOOR,creditSalesQualified,assertAllocationBudget,assertCatalogBudget,songCreditPrice} from '../lib/credit-catalog';
import {applePurchase} from '../lib/apple-payments';
import {checkout,fulfillCheckout} from '../lib/stripe-payments';
import {fulfillSubscriptionInvoice,subscriptionCheckout} from '../lib/credit-subscriptions';

test('approved prices preserve credits, reject stale qualification and retain real purchase-lot limits',()=>{
 assert.deepEqual([CREATOR_PLAN.cents,CREATOR_PLAN.credits,TOP_UP.cents,TOP_UP.credits],[3500,300,2000,150]);
 assert.equal(NET_MICROS_PER_CREDIT_FLOOR,46666);
 assert.equal(creditSalesQualified({JAMLOOM_CREDIT_COST_QUALIFICATION:PREVIOUS_CREDIT_CATALOG_VERSION}),false);
 assert.equal(creditSalesQualified({}),false);
 assertCatalogBudget(songCreditPrice('improvise'),163331,true);
 assert.throws(()=>assertCatalogBudget(songCreditPrice('improvise'),163332,true));
 assert.throws(()=>assertAllocationBudget([{n:10,net:20000}],163331,true),/proceeds/);
 assertAllocationBudget([{n:10,net:46666}],163331,true);
});

test('Apple accepts exact current and historical signed prices without inflating old proceeds',()=>{
 const token='11111111-1111-4111-8111-111111111111';
 const base={transactionId:'tx',originalTransactionId:'original',appAccountToken:token,bundleId:'com.djayvo.app',environment:Environment.SANDBOX,quantity:1,inAppOwnershipType:'PURCHASED',currency:'USD',purchaseDate:1000,expiresDate:2000};
 for(const [productId,type,price,credits,netMicros] of [
  [CREATOR_PLAN.appleProduct,Type.AUTO_RENEWABLE_SUBSCRIPTION,35000,300,14000000],
  [CREATOR_PLAN.appleProduct,Type.AUTO_RENEWABLE_SUBSCRIPTION,15000,300,6000000],
  [TOP_UP.appleProduct,Type.CONSUMABLE,20000,150,8000000],
  [TOP_UP.appleProduct,Type.CONSUMABLE,10000,150,4000000],
 ] as const){
  const tx={...base,productId,type,price},p=applePurchase(tx,token,base.bundleId);
  assert.equal(p.credits,credits);assert.equal(p.netMicros,netMicros);
  for(const patch of [{price:price+1},{price:0},{currency:'EUR'},{offerType:1},{appAccountToken:'another'}])
   assert.throws(()=>applePurchase({...tx,...patch},token,base.bundleId));
 }
});

test('Stripe top-up delivery binds each catalog to its original amount and proceeds',async()=>{
 for(const [catalog,cents,expectedNet] of [[CREDIT_CATALOG_VERSION,2000,15000000],[PREVIOUS_CREDIT_CATALOG_VERSION,1000,7000000]] as const){
  const session={id:'cs',metadata:{pack:'topup',jamloom_product:'song-credits',catalog},client_reference_id:'owner',livemode:false,mode:'payment',payment_status:'paid',currency:'usd',amount_subtotal:cents,amount_total:cents,total_details:{amount_discount:0,amount_tax:0},line_items:{data:[{quantity:1,amount_subtotal:cents}]},payment_intent:'pi'};
  const charge={id:'ch',payment_intent:'pi',livemode:false,paid:true,captured:true,refunded:false,amount_refunded:0,disputed:false,currency:'usd',amount:cents,balance_transaction:{source:'ch',currency:'usd',amount:cents,net:cents-100,fee:100,exchange_rate:null}};
  const sdk={checkout:{sessions:{retrieve:async()=>session}},paymentIntents:{retrieve:async()=>({id:'pi',livemode:false,status:'succeeded',latest_charge:charge})}};
  let granted=0;const wallet={live:false,grant:async(owner:string,p:any)=>{assert.equal(owner,'owner');assert.equal(p.credits,150);assert.equal(p.netMicros,expectedNet);granted++;}};
  await fulfillCheckout(sdk as never,wallet as never,'cs');assert.equal(granted,1);
  session.metadata.catalog=(catalog===CREDIT_CATALOG_VERSION?PREVIOUS_CREDIT_CATALOG_VERSION:CREDIT_CATALOG_VERSION) as typeof catalog;
  await assert.rejects(fulfillCheckout(sdk as never,wallet as never,'cs'));assert.equal(granted,1);
 }
 let captured:any,options:any;
 await checkout({checkout:{sessions:{create:async(v:any,o:any)=>{captured=v;options=o;}}}} as never,'owner','topup','same-key','https://www.jamloom.com',false,'txcd_10000000');
 assert.equal(captured.line_items[0].price_data.unit_amount,2000);assert.equal(captured.metadata.catalog,CREDIT_CATALOG_VERSION);
 assert(options.idempotencyKey.includes(CREDIT_CATALOG_VERSION));
});

test('Stripe renewal history uses its exact configured price and catalog instead of the current retail amount',async()=>{
 process.env.CREATOR_STRIPE_PRICE_ID='price_current';process.env.CREATOR_STRIPE_PREVIOUS_PRICE_ID='price_previous';
 for(const [catalog,cents,fee,price,expectedNet] of [[CREDIT_CATALOG_VERSION,3500,132,'price_current',26430000],[PREVIOUS_CREDIT_CATALOG_VERSION,1500,74,'price_previous',11150000]] as const){
  const sub={id:'sub',metadata:{jamloom_product:'creator-subscription',jamloom_owner:'owner',catalog},livemode:false,customer:'cus',status:'active',cancel_at_period_end:false,items:{data:[{current_period_start:1000,current_period_end:2000}]}};
  const invoice={id:'in',parent:{subscription_details:{subscription:'sub'}},customer:'cus',livemode:false,status:'paid',amount_remaining:0,billing_reason:'subscription_cycle',currency:'usd',subtotal:cents,amount_paid:cents,total_taxes:[],lines:{data:[{quantity:1,amount:cents,pricing:{price_details:{price}},parent:{subscription_item_details:{proration:false}},period:{start:1000,end:2000}}]}};
  const charge={id:'ch',payment_intent:'pi',livemode:false,paid:true,captured:true,amount:cents,currency:'usd',balance_transaction:{source:'ch',currency:'usd',amount:cents,net:cents-fee,fee,exchange_rate:null}};
  const sdk={invoices:{retrieve:async()=>invoice},subscriptions:{retrieve:async()=>sub},invoicePayments:{list:async()=>({data:[{payment:{payment_intent:'pi'},amount_paid:cents}]})},paymentIntents:{retrieve:async()=>({id:'pi',livemode:false,status:'succeeded',latest_charge:charge})}};
  let grants=0;const wallet={live:false,grant:async(_owner:string,p:any)=>{assert.equal(p.credits,300);assert.equal(p.netMicros,expectedNet);grants++;}};
  const pool={query:async()=>({rows:[{owner_id:'owner'}]})};
  await fulfillSubscriptionInvoice(sdk as never,pool as never,wallet as never,'in');assert.equal(grants,1);
  invoice.lines.data[0].pricing.price_details.price='price_wrong' as typeof price;
  await assert.rejects(fulfillSubscriptionInvoice(sdk as never,pool as never,wallet as never,'in'));assert.equal(grants,1);
 }
});

test('a superseded open Creator checkout is expired before issuing the new advertised price',async()=>{
 process.env.CREATOR_STRIPE_PRICE_ID='price_current';
 const calls:string[]=[];
 const db={query:async(sql:string)=>({rows:sql.startsWith('SELECT customer_id')?[{customer_id:'cus'}]:[]}),release:()=>{}};
 const pool={connect:async()=>db};
 const pending={id:'cs_old',metadata:{jamloom_product:'creator-subscription',catalog:PREVIOUS_CREDIT_CATALOG_VERSION}};
 const sdk={prices:{retrieve:async()=>({livemode:false,active:true,currency:'usd',unit_amount:3500,recurring:{interval:'month',interval_count:1},tax_behavior:'exclusive'})},subscriptions:{list:async()=>({data:[]})},checkout:{sessions:{list:async()=>({data:[pending]}),expire:async(id:string)=>{calls.push('expire:'+id);},create:async(v:any)=>{assert.equal(v.line_items[0].price,'price_current');assert.equal(v.metadata.catalog,CREDIT_CATALOG_VERSION);calls.push('create');return {id:'cs_new'};}}}};
 assert.equal((await subscriptionCheckout(sdk as never,pool as never,'owner','same-key','https://www.jamloom.com',false)).id,'cs_new');
 assert.deepEqual(calls,['expire:cs_old','create']);
});
