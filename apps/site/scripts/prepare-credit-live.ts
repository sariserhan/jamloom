import './env';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CREATOR_PLAN,CREDIT_CATALOG_VERSION} from '../lib/credit-catalog';

// Preparation only: inactive products/prices, disabled webhook, no customers or charges.
const apply=process.argv.includes('--apply-inactive');
assert(process.argv.slice(2).every(a=>a==='--apply-inactive'),'Use no arguments (read-only plan) or --apply-inactive');
const liveKey=process.env.STRIPE_LIVE_SECRET_KEY;assert(typeof liveKey==='string'&&liveKey.startsWith('sk_live_'),'Live Stripe key required');
assert.notEqual(process.env.JAMLOOM_CREDIT_PURCHASES_ENABLED,'true','Keep purchases disabled');
assert(!process.env.JAMLOOM_CREDIT_COST_QUALIFICATION,'Do not prepare over an activated catalog');
const stripe=new Stripe(liveKey,{timeout:15000,maxNetworkRetries:1});
assert.equal((await stripe.accounts.retrieve(null)).id,'acct_1TxA3vDlEXWDEeHO','Wrong Stripe account');
const taxCode=process.env.CREDIT_STRIPE_TAX_CODE;assert(/^txcd_[0-9]{8}$/.test(taxCode??''),'Reviewed tax category required');
const metadata={jamloom_catalog:CREDIT_CATALOG_VERSION,jamloom_product:'creator-subscription',preparation:'launch-held-20261031'};
const events:Stripe.WebhookEndpointCreateParams.EnabledEvent[]=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
const url='https://www.jamloom.com/api/payments/stripe?catalog='+CREDIT_CATALOG_VERSION;
const [products,prices,portals,hooks]=await Promise.all([stripe.products.list({limit:100}),stripe.prices.list({limit:100}),stripe.billingPortal.configurations.list({limit:100}),stripe.webhookEndpoints.list({limit:100})]);
for(const list of [products,prices,portals,hooks])assert(!list.has_more,'Inventory truncated; inspect before mutation');
const match=(m:Stripe.Metadata|null|undefined)=>m?.jamloom_catalog===metadata.jamloom_catalog&&m?.preparation===metadata.preparation;
const one=<T>(items:T[])=>{assert(items.length<2,'Ambiguous prepared records');return items[0];};
let product=one(products.data.filter(p=>match(p.metadata))),price=one(prices.data.filter(p=>match(p.metadata))),portal=one(portals.data.filter(p=>match(p.metadata))),hook=one(hooks.data.filter(p=>match(p.metadata)));
for(const p of [product,price])if(p)assert.equal(p.active,false,'Existing prepared object is active; do not change it');
if(hook){assert.equal(hook.status,'disabled');assert.equal(hook.url,url);}
const plan={mode:'live-preparation',catalog:CREDIT_CATALOG_VERSION,creator:CREATOR_PLAN,taxCode,productActive:false,priceActive:false,portalLoginEnabled:false,cancellation:'at_period_end',proration:'none',webhook:{url,apiVersion:Stripe.API_VERSION,events,status:'disabled'},existing:{product:product?.id,price:price?.id,portal:portal?.id,hook:hook?.id},deployment:false,livePurchases:false};
if(!apply){console.log(JSON.stringify(plan,null,2));process.exit(0);}
const folder=resolve('../../build-launch-preparation-20261031');await mkdir(folder,{recursive:true,mode:0o700});
await writeFile(resolve(folder,'stripe-preparation-intent.json'),JSON.stringify(plan,null,2),{mode:0o600});
const options=(part:string)=>({idempotencyKey:`jamloom:inactive:${CREDIT_CATALOG_VERSION}:${part}`});
product??=await stripe.products.create({name:'Jamloom Creator',description:'300 nonexpiring credits per month. Cancel future renewals anytime.',active:false,tax_code:taxCode,metadata},options('product'));
assert.equal(product.active,false);assert.equal(product.tax_code,taxCode);
price??=await stripe.prices.create({product:product.id,active:false,currency:'usd',unit_amount:CREATOR_PLAN.cents,recurring:{interval:'month'},tax_behavior:'exclusive',metadata},options('price'));
assert.equal(price.product,product.id);assert.equal(price.active,false);assert.equal(price.unit_amount,1500);assert.equal(price.currency,'usd');assert.equal(price.recurring?.interval,'month');assert.equal(price.recurring?.interval_count,1);assert.equal(price.tax_behavior,'exclusive');
if(!portal){
 const created=await stripe.billingPortal.configurations.create({name:'Jamloom Creator — release held',business_profile:{headline:'Manage your Jamloom Creator subscription',privacy_policy_url:'https://www.jamloom.com/privacy',terms_of_service_url:'https://www.jamloom.com/terms'},default_return_url:'https://www.jamloom.com/account/credits',features:{subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:false},payment_method_update:{enabled:true},invoice_history:{enabled:true}},login_page:{enabled:false},metadata},options('portal'));
 // Stripe's first configuration becomes the default and cannot be deactivated.
 // Its login page stays disabled; no PortalSession is created by preparation.
 portal=created.is_default?created:await stripe.billingPortal.configurations.update(created.id,{active:false});
}
assert(!portal.active||portal.is_default);assert.equal(portal.features.subscription_cancel.mode,'at_period_end');assert.equal(portal.features.subscription_cancel.proration_behavior,'none');assert.equal(portal.features.subscription_update.enabled,false);assert.equal(portal.login_page.enabled,false);
const secretPath=resolve(folder,'credit-webhook-secret.txt');
let secret:string;
if(!hook){
 const created=await stripe.webhookEndpoints.create({url,enabled_events:events,api_version:Stripe.API_VERSION,description:'Jamloom v2 credits and Creator; keep disabled until reviewed deployment and cost qualification',metadata},options('webhook'));
 // Stripe creates endpoints enabled; disable immediately, before any other work.
 hook=await stripe.webhookEndpoints.update(created.id,{disabled:true});
 assert(typeof created.secret==='string'&&created.secret.startsWith('whsec_'));secret=created.secret;
 await writeFile(secretPath,secret,{flag:'wx',mode:0o600});
}else secret=(await readFile(secretPath,'utf8')).trim();
assert(secret.startsWith('whsec_'));assert.equal(hook.status,'disabled');assert.equal(hook.api_version,Stripe.API_VERSION);assert.deepEqual([...hook.enabled_events].sort(),[...events].sort());
const prepared={CREATOR_STRIPE_LIVE_PRODUCT_ID:product.id,CREATOR_STRIPE_LIVE_PRICE_ID:price.id,CREATOR_STRIPE_LIVE_PORTAL_CONFIGURATION:portal.id,CREDIT_STRIPE_LIVE_WEBHOOK_SECRET:secret};
await writeFile(resolve(folder,'credits-production.env'),Object.entries(prepared).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
// Only nonsensitive Creator identifiers are added locally; preserve the old live webhook secret until deployment.
const envFile=new URL('../.env.local',import.meta.url);let local=await readFile(envFile,'utf8');
for(const [key,value] of Object.entries(prepared).filter(([key])=>key.startsWith('CREATOR_'))){const found=local.match(new RegExp('^'+key+'=(.*)$','m'));assert(!found||found[1]===value,'Existing identifier differs');if(!found)local+=`\n${key}=${value}\n`;}
await writeFile(envFile,local,{mode:0o600});
const verified=await Promise.all([stripe.products.retrieve(product.id),stripe.prices.retrieve(price.id),stripe.billingPortal.configurations.retrieve(portal.id),stripe.webhookEndpoints.retrieve(hook.id)]);
assert.equal(verified[0].active,false);assert.equal(verified[1].active,false);assert.equal(verified[2].login_page.enabled,false);assert.equal(verified[3].status,'disabled');
console.log(JSON.stringify({status:'PASS',...plan,records:{product:product.id,price:price.id,portal:portal.id,hook:hook.id},productAndPriceInactive:true,portalActive:portal.active,portalLoginEnabled:false,webhookDisabled:true,privateConfigurationPrepared:true,existingWebhookPreserved:true},null,2));
