import Stripe from 'stripe';
import type {Pool} from 'pg';
import {Wallet,type SubscriptionGrant} from './wallet';
import {CREATOR_PLAN,CREDIT_CATALOG_VERSION} from './credit-catalog';

const idOf=(v:string|{id:string}|null|undefined)=>typeof v==='string'?v:v?.id;
const provider=(live:boolean)=>live?'stripe_live' as const:'stripe_test' as const;
export function creatorPriceID(live:boolean,env:Record<string,string|undefined>=process.env){
 const id=env[live?'CREATOR_STRIPE_LIVE_PRICE_ID':'CREATOR_STRIPE_PRICE_ID'];
 if(!/^price_[A-Za-z0-9]+$/.test(id??''))throw Error('Creator subscription is not configured');return id!;
}
function subscriptionGrant(s:Stripe.Subscription):SubscriptionGrant{
 const item=s.items.data[0];
 if(!item||s.items.has_more||s.items.data.length!==1)throw Error('Unsupported subscription');
 return {id:s.id,customer:idOf(s.customer),start:new Date(item.current_period_start*1000),end:new Date(item.current_period_end*1000),status:s.status,cancelAtPeriodEnd:s.cancel_at_period_end};
}
export async function subscriptionCustomer(stripe:Stripe,pool:Pick<Pool,'query'>,owner:string,live:boolean){
 const prior=(await pool.query('SELECT customer_id FROM credit_customers WHERE owner_id=$1 AND billing_live=$2',[owner,live])).rows[0];
 if(prior)return prior.customer_id as string;
 const c=await stripe.customers.create({metadata:{jamloom_owner:owner}},{idempotencyKey:`jamloom:credit-customer:${live}:${owner}`});
 if(c.livemode!==live)throw Error('Customer environment mismatch');
 await pool.query('INSERT INTO credit_customers(owner_id,billing_live,customer_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[owner,live,c.id]);
 return (await pool.query('SELECT customer_id FROM credit_customers WHERE owner_id=$1 AND billing_live=$2',[owner,live])).rows[0].customer_id as string;
}
async function createSubscriptionCheckout(stripe:Stripe,pool:Pick<Pool,'query'>,owner:string,key:string,origin:string,live:boolean){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key)||new URL(origin).origin!==origin)throw Error('Invalid checkout');
 const priceID=creatorPriceID(live),price=await stripe.prices.retrieve(priceID);
 if(price.livemode!==live||!price.active||price.currency!=='usd'||price.unit_amount!==CREATOR_PLAN.cents||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.tax_behavior!=='exclusive')throw Error('Creator price mismatch');
 const existing=(await pool.query(`SELECT status FROM credit_subscriptions WHERE owner_id=$1 AND (provider IN ('stripe_live','apple_live'))=$2`,[owner,live])).rows;
 if(existing.some(s=>!['canceled','incomplete_expired','expired','revoked'].includes(s.status)))throw Error('Manage your existing subscription before subscribing again');
 const customer=await subscriptionCustomer(stripe,pool,owner,live);
 // Reuse an open session across tabs/devices, then let Stripe's customer subscription check prevent duplicates.
 const open=await stripe.checkout.sessions.list({customer,status:'open',limit:100});
 if(open.has_more)throw Error('Checkout reconciliation required');
 const pending=open.data.find(s=>s.metadata?.jamloom_product==='creator-subscription');if(pending)return pending;
 const active=await stripe.subscriptions.list({customer,status:'all',limit:100});
 if(active.has_more||active.data.some(s=>s.metadata.jamloom_product==='creator-subscription'&&!['canceled','incomplete_expired'].includes(s.status)))throw Error('A subscription already exists');
 return stripe.checkout.sessions.create({mode:'subscription',customer,client_reference_id:owner,
   metadata:{jamloom_product:'creator-subscription',catalog:CREDIT_CATALOG_VERSION},
   subscription_data:{metadata:{jamloom_product:'creator-subscription',jamloom_owner:owner,catalog:CREDIT_CATALOG_VERSION}},
   line_items:[{price:priceID,quantity:1}],automatic_tax:{enabled:true},customer_update:{address:'auto'},
   success_url:origin+'/account/credits?payment=complete&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/account/credits?payment=cancelled'
 },{idempotencyKey:`jamloom:creator:${live}:${owner}:${key}`});
}
export async function fulfillSubscriptionInvoice(stripe:Stripe,pool:Pool,wallet:Wallet,id:string){
 const invoice=await stripe.invoices.retrieve(id,{expand:['lines','payments']});
 const subscriptionID=idOf(invoice.parent?.subscription_details?.subscription);
 if(!subscriptionID)return null;
 const subscription=await stripe.subscriptions.retrieve(subscriptionID);
 if(subscription.metadata.jamloom_product!=='creator-subscription')return null;
 const owner=subscription.metadata.jamloom_owner,line=invoice.lines.data[0];
 const customer=(await pool.query('SELECT owner_id FROM credit_customers WHERE customer_id=$1 AND billing_live=$2',[idOf(subscription.customer),wallet.live])).rows[0];
 if(subscription.livemode!==wallet.live||invoice.livemode!==wallet.live||subscription.metadata.catalog!==CREDIT_CATALOG_VERSION||
    !owner||customer?.owner_id!==owner||idOf(invoice.customer)!==idOf(subscription.customer)||invoice.status!=='paid'||invoice.amount_remaining!==0||
    !['subscription_create','subscription_cycle'].includes(invoice.billing_reason??'')||invoice.currency!=='usd'||invoice.subtotal!==CREATOR_PLAN.cents||
    invoice.total_discount_amounts?.some(d=>d.amount!==0)||invoice.post_payment_credit_notes_amount||invoice.pre_payment_credit_notes_amount||
    invoice.lines.has_more||invoice.lines.data.length!==1||!line||line.quantity!==1||line.amount!==CREATOR_PLAN.cents||
    line.pricing?.price_details?.price!==creatorPriceID(wallet.live)||line.parent?.subscription_item_details?.proration||line.period.end<=line.period.start)
   throw Error('Unsupported Creator invoice');
 const payments=await stripe.invoicePayments.list({invoice:id,status:'paid',limit:2});
 const payment=payments.data[0],intentID=idOf(payment?.payment.payment_intent);
 if(payments.has_more||payments.data.length!==1||!intentID||payment.amount_paid!==invoice.amount_paid)throw Error('Invoice payment evidence pending');
 const intent=await stripe.paymentIntents.retrieve(intentID,{expand:['latest_charge.balance_transaction']});
 const charge=intent.latest_charge;
 if(intent.livemode!==wallet.live||intent.status!=='succeeded'||!charge||typeof charge==='string'||!charge.paid||!charge.captured||charge.disputed||charge.refunded||charge.amount_refunded||charge.livemode!==wallet.live||charge.amount!==invoice.amount_paid||charge.currency!=='usd'||charge.payment_intent!==intent.id)throw Error('Subscription payment is not eligible');
 const balance=charge.balance_transaction;
 if(!balance||typeof balance==='string'||balance.currency!=='usd'||balance.source!==charge.id||balance.amount!==charge.amount||balance.net!==balance.amount-balance.fee||balance.exchange_rate!==null)throw Error('Subscription fee evidence pending');
 const tax=(invoice.total_taxes??[]).reduce((sum,t)=>sum+t.amount,0);
 // Reserve Billing plus support/refund costs. Revenue evidence never changes retail credit prices.
 const netMicros=(balance.net-tax-Math.ceil(CREATOR_PLAN.cents*.207))*10000;
 const s={...subscriptionGrant(subscription),start:new Date(line.period.start*1000),end:new Date(line.period.end*1000)};
 return wallet.grant(owner,{provider:provider(wallet.live),receipt:id,credits:CREATOR_PLAN.credits,netMicros,subscription:s});
}
export async function reconcileSubscription(stripe:Stripe,pool:Pool,wallet:Wallet,id:string){
 const s=await stripe.subscriptions.retrieve(id);if(s.metadata.jamloom_product!=='creator-subscription')return;
 const owner=s.metadata.jamloom_owner;
 const c=(await pool.query('SELECT owner_id FROM credit_customers WHERE customer_id=$1 AND billing_live=$2',[idOf(s.customer),wallet.live])).rows[0];
 if(s.livemode!==wallet.live||!owner||c?.owner_id!==owner)throw Error('Subscription account mismatch');
 await wallet.updateSubscription(owner,provider(wallet.live),subscriptionGrant(s));
}
export async function reverseSubscriptionPayment(stripe:Stripe,wallet:Wallet,intent:string){
 const payments=await stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:intent},limit:2});
 if(payments.has_more||payments.data.length>1)throw Error('Ambiguous invoice reversal');
 const invoiceID=idOf(payments.data[0]?.invoice);if(!invoiceID)return;
 const invoice=await stripe.invoices.retrieve(invoiceID),subID=idOf(invoice.parent?.subscription_details?.subscription);if(!subID)return;
 const sub=await stripe.subscriptions.retrieve(subID);if(sub.metadata.jamloom_product!=='creator-subscription')return;
 if(sub.livemode!==wallet.live||invoice.livemode!==wallet.live)throw Error('Invoice environment mismatch');
 await wallet.freezePurchase(provider(wallet.live),invoiceID);
}

export async function subscriptionCheckout(stripe:Stripe,pool:Pool,owner:string,key:string,origin:string,live:boolean){
 const db=await pool.connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`creator-checkout:${live}:${owner}`]);
  const result=await createSubscriptionCheckout(stripe,db,owner,key,origin,live);await db.query('COMMIT');return result;
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
