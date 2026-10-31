import test from 'node:test';import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {Environment,Type} from '@apple/app-store-server-library';
import {applePurchase} from '../lib/apple-payments';
import {fulfillSubscriptionInvoice,reverseSubscriptionPayment} from '../lib/credit-subscriptions';
import {CREATOR_PLAN,CREDIT_CATALOG_VERSION} from '../lib/credit-catalog';
test('Creator invoice requires a real paid period, exact price and charge evidence',async()=>{
 process.env.CREATOR_STRIPE_PRICE_ID='price_creator';
 const sub={id:'sub_one',metadata:{jamloom_product:'creator-subscription',jamloom_owner:'owner',catalog:CREDIT_CATALOG_VERSION},livemode:false,customer:'cus_one',status:'active',cancel_at_period_end:false,items:{data:[{current_period_start:1790812800,current_period_end:1793491200}]}};
 const invoice:any={id:'in_one',parent:{subscription_details:{subscription:'sub_one'}},customer:'cus_one',livemode:false,status:'paid',amount_remaining:0,billing_reason:'subscription_cycle',currency:'usd',subtotal:1500,amount_paid:1500,total_taxes:[],lines:{data:[{quantity:1,amount:1500,pricing:{price_details:{price:'price_creator'}},parent:{subscription_item_details:{proration:false}},period:{start:1790812800,end:1793491200}}]}};
 const charge={id:'ch_one',payment_intent:'pi_one',livemode:false,paid:true,captured:true,amount:1500,currency:'usd',balance_transaction:{source:'ch_one',currency:'usd',amount:1500,net:1426,fee:74,exchange_rate:null}};
 const stripe={invoices:{retrieve:async()=>invoice},subscriptions:{retrieve:async()=>sub},invoicePayments:{list:async()=>({data:[{payment:{payment_intent:'pi_one'},amount_paid:1500}]})},paymentIntents:{retrieve:async()=>({id:'pi_one',livemode:false,status:'succeeded',latest_charge:charge})}} as unknown as Stripe;
 let grants=0;const wallet={live:false,grant:async(owner:string,p:any)=>{assert.equal(owner,'owner');assert.equal(p.credits,300);assert.equal(p.receipt,'in_one');assert.equal(p.subscription.id,'sub_one');assert.equal(p.netMicros,11150000);grants++;return 'lot';}};
 const pool={query:async()=>({rows:[{owner_id:'owner'}]})};
 await fulfillSubscriptionInvoice(stripe,pool as never,wallet as never,'in_one');assert.equal(grants,1);
 for(const [key,value] of Object.entries({status:'open',livemode:true,subtotal:1,amount_remaining:1,currency:'eur',billing_reason:'subscription_update'})){
  const previous=invoice[key];invoice[key]=value;await assert.rejects(fulfillSubscriptionInvoice(stripe,pool as never,wallet as never,'in_one'));invoice[key]=previous;
 }
 invoice.lines.data[0].parent.subscription_item_details.proration=true;await assert.rejects(fulfillSubscriptionInvoice(stripe,pool as never,wallet as never,'in_one'));assert.equal(grants,1);
});
test('Apple renewals and topups bind account, type, period and amount; historical paid credits can be recovered',()=>{
 const token='11111111-1111-4111-8111-111111111111',tx={transactionId:'tx1',originalTransactionId:'original1',productId:CREATOR_PLAN.appleProduct,type:Type.AUTO_RENEWABLE_SUBSCRIPTION,appAccountToken:token,bundleId:'com.djayvo.app',environment:Environment.SANDBOX,quantity:1,inAppOwnershipType:'PURCHASED',currency:'USD',price:15000,purchaseDate:1000000,expiresDate:2000000};
 const p=applePurchase(tx,token,'com.djayvo.app');assert.equal(p.credits,300);assert.equal(p.subscription?.status,'expired');assert.equal(p.subscription?.id,'original1');
 for(const patch of [{type:Type.CONSUMABLE},{expiresDate:1000000},{originalTransactionId:undefined},{price:10000},{revocationDate:1},{appAccountToken:'wrong'}])assert.throws(()=>applePurchase({...tx,...patch},token,'com.djayvo.app'));
 const topup=applePurchase({...tx,productId:'com.jamloom.credits.topup150',type:Type.CONSUMABLE,price:10000},token,'com.djayvo.app');assert.equal(topup.credits,150);assert.equal(topup.subscription,undefined);
});
test('subscription refund finds exact invoice rather than minting or revoking a different period',async()=>{
 const held:string[]=[];
 const stripe={invoicePayments:{list:async()=>({data:[{invoice:'in_refund'}]})},invoices:{retrieve:async()=>({livemode:false,parent:{subscription_details:{subscription:'sub_one'}}})},subscriptions:{retrieve:async()=>({livemode:false,metadata:{jamloom_product:'creator-subscription'}})}};
 await reverseSubscriptionPayment(stripe as never,{live:false,freezePurchase:async(p:string,r:string)=>{held.push(p+':'+r);}} as never,'pi_one');assert.deepEqual(held,['stripe_test:in_refund']);
});
