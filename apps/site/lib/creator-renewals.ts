import type Stripe from 'stripe';
import type {Pool} from 'pg';
import {creditCatalog,creditSalesQualified,CREDIT_CATALOG_VERSION} from './credit-catalog';
import {creditCapacityForSales} from './credit-release';

// A seven-day launch allowance does not authorize another monthly charge.
// The owner configured guarded continuation; qualification and funding still gate it.
export function creatorRenewalsEnabled(live:boolean,env:Record<string,string|undefined>=process.env){
 return !live&&env.JAMLOOM_TEST_RENEWAL_PROTECTION!=='true'||
  env.JAMLOOM_CREATOR_RENEWALS_ENABLED==='true'&&creditSalesQualified(env);
}
const idOf=(v:string|{id:string}|null|undefined)=>typeof v==='string'?v:v?.id;
async function collectionsFunded(pool:Pick<Pool,'query'>,live:boolean,env:Record<string,string|undefined>){
 return creatorRenewalsEnabled(live,env)&&(!live||await creditCapacityForSales(pool,env));
}
function supportedRenewal(s:Stripe.Subscription,live:boolean,env:Record<string,string|undefined>){
 const item=s.items?.data[0],price=item?.price;
 return s.metadata.catalog===CREDIT_CATALOG_VERSION&&!s.items?.has_more&&s.items?.data.length===1&&item.quantity===1&&
  price?.id===env[live?'CREATOR_STRIPE_LIVE_PRICE_ID':'CREATOR_STRIPE_PRICE_ID']&&price.currency==='usd'&&price.unit_amount===3500&&
  price.recurring?.interval==='month'&&price.recurring.interval_count===1&&!s.discounts?.length&&s.collection_method==='charge_automatically';
}
async function ownedCreator(stripe:Stripe,pool:Pick<Pool,'query'>,id:string,live:boolean){
 const s=await stripe.subscriptions.retrieve(id);
 if(s.metadata.jamloom_product!=='creator-subscription')return null;
 const owner=s.metadata.jamloom_owner;
 const c=(await pool.query('SELECT owner_id FROM credit_customers WHERE customer_id=$1 AND billing_live=$2',[idOf(s.customer),live])).rows[0];
 if(s.livemode!==live||!creditCatalog(s.metadata.catalog)||!owner||c?.owner_id!==owner)throw Error('Renewal account mismatch');
 return s;
}
export async function protectCreatorRenewal(stripe:Stripe,pool:Pick<Pool,'query'>,id:string,live:boolean,env:Record<string,string|undefined>=process.env){
 if(!live&&creatorRenewalsEnabled(live,env))return false;
 const s=await ownedCreator(stripe,pool,id,live);
 if(!s||!['active','past_due','unpaid','trialing'].includes(s.status))return false;
 if(supportedRenewal(s,live,env)&&await collectionsFunded(pool,live,env))return false;
 // Keep an existing indefinite void pause. Never introduce an automatic resume.
 if(s.pause_collection?.behavior==='void'&&!s.pause_collection.resumes_at)return true;
 const updated=await stripe.subscriptions.update(s.id,{pause_collection:{behavior:'void'},metadata:{jamloom_renewal_hold:'operating-funding'}});
 if(updated.pause_collection?.behavior!=='void'||updated.pause_collection.resumes_at)throw Error('Renewal pause unconfirmed');
 return true;
}
export async function protectCreatorInvoice(stripe:Stripe,pool:Pick<Pool,'query'>,id:string,live:boolean,env:Record<string,string|undefined>=process.env){
 if(!live&&creatorRenewalsEnabled(live,env))return false;
 let invoice=await stripe.invoices.retrieve(id);
 // First purchases and unrelated invoices must still be paid and reconciled normally.
 if(invoice.billing_reason!=='subscription_cycle')return false;
 const subID=idOf(invoice.parent?.subscription_details?.subscription);
 if(!subID)return false;
 const s=await ownedCreator(stripe,pool,subID,live);if(!s)return false;
 if(supportedRenewal(s,live,env)&&await collectionsFunded(pool,live,env))return false;
 if(invoice.livemode!==live||idOf(invoice.customer)!==idOf(s.customer))throw Error('Renewal invoice mismatch');
 await protectCreatorRenewal(stripe,pool,s.id,live,env);
 if(invoice.status==='void')return true;
 if(invoice.status==='paid'||invoice.amount_paid>0)throw Error('Renewal already collected; operator review required');
 if(invoice.status==='draft'){
  await stripe.invoices.update(id,{auto_advance:false});
  invoice=await stripe.invoices.finalizeInvoice(id,{auto_advance:false});
 }
 if(invoice.status!=='open'&&invoice.status!=='uncollectible')throw Error('Renewal invoice needs review');
 const result=await stripe.invoices.voidInvoice(id);
 if(result.status!=='void')throw Error('Renewal invoice protection unconfirmed');
 return true;
}
export async function protectCreatorRenewals(stripe:Stripe,pool:Pick<Pool,'query'>,live:boolean,env:Record<string,string|undefined>=process.env){
 let checked=0,protectedCount=0,scanned=0;
 // Read every page: other products may share this Stripe account.
 for await(const s of stripe.subscriptions.list({status:'all',limit:100})){
  if(++scanned>10000)throw Error('Renewal scan limit reached');
  if(s.metadata.jamloom_product!=='creator-subscription'||['canceled','incomplete_expired','incomplete'].includes(s.status))continue;
  checked++;if(await protectCreatorRenewal(stripe,pool,s.id,live,env))protectedCount++;
  for(const status of ['draft','open','uncollectible'] as const){
   for await(const invoice of stripe.invoices.list({subscription:s.id,status,limit:100})){
    if(invoice.billing_reason==='subscription_cycle')await protectCreatorInvoice(stripe,pool,invoice.id,live,env);
   }
  }
 }
 return {checked,protected:protectedCount};
}

// Configured by the owner, but executable only after actual cost qualification
// and fresh funded capacity. Only our own indefinite funding pause is removed.
export async function resumeFundedCreatorRenewals(stripe:Stripe,pool:Pick<Pool,'query'>,live:boolean,env:Record<string,string|undefined>=process.env,now=Date.now()){
 if(!creatorRenewalsEnabled(live,env))return {status:'held' as const,reason:'economics-or-renewal-configuration',resumed:0};
 if(!await collectionsFunded(pool,live,env))return {status:'held' as const,reason:'capacity-unavailable',resumed:0};
 let resumed=0,scanned=0;
 for await(const listed of stripe.subscriptions.list({status:'active',limit:100})){
  if(++scanned>10000)throw Error('Renewal scan limit reached');
  if(listed.metadata.jamloom_product!=='creator-subscription'||listed.metadata.catalog!==CREDIT_CATALOG_VERSION||listed.metadata.jamloom_renewal_hold!=='operating-funding')continue;
  const s=await ownedCreator(stripe,pool,listed.id,live);
  if(!s||!supportedRenewal(s,live,env)||s.status!=='active'||s.cancel_at_period_end||s.cancel_at||s.schedule||s.pause_collection?.behavior!=='void'||s.pause_collection.resumes_at)continue;
  // Avoid resuming across a billing boundary or reviving an older unpaid invoice.
  if(s.items.data.length!==1||s.items.data[0].current_period_end*1000<=now+300000)continue;
  let debt=false;
  for(const status of ['draft','open','uncollectible'] as const){const invoices=await stripe.invoices.list({subscription:s.id,status,limit:1});if(invoices.data.length||invoices.has_more)debt=true;}
  if(debt)continue;
  if(!await collectionsFunded(pool,live,env))break;
  const updated=await stripe.subscriptions.update(s.id,{pause_collection:'',proration_behavior:'none',metadata:{jamloom_renewal_hold:''}});
  if(updated.pause_collection)throw Error('Renewal resume unconfirmed');
  resumed++;
 }
 return {status:'checked' as const,resumed};
}
