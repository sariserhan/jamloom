import './env';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CREATOR_PLAN,TOP_UP,CREDIT_CATALOG_VERSION,PREVIOUS_CREDIT_CATALOG_VERSION,creditCatalog} from '../lib/credit-catalog';

// Reuse the existing product, portal and webhook. Never migrate a subscription or enable live sales.
const args=process.argv.slice(2),live=args.includes('--live'),apply=args.includes('--apply');
assert(args.every(a=>a==='--live'||a==='--apply'),'Use [--live] [--apply]; default is a read-only test plan');
const key=process.env[live?'STRIPE_LIVE_SECRET_KEY':'STRIPE_SECRET_KEY'];
assert(key?.startsWith(live?'sk_live_':'sk_test_'),'Wrong Stripe key mode');
if(live){assert.notEqual(process.env.JAMLOOM_CREDIT_PURCHASES_ENABLED,'true');assert(!process.env.JAMLOOM_CREDIT_COST_QUALIFICATION);}
const stripe=new Stripe(key!,{timeout:15000,maxNetworkRetries:1});
assert.equal((await stripe.accounts.retrieve(null)).id,'acct_1TxA3vDlEXWDEeHO','Unexpected Stripe account');
const priceKey=live?'CREATOR_STRIPE_LIVE_PRICE_ID':'CREATOR_STRIPE_PRICE_ID';
const previousKey=live?'CREATOR_STRIPE_LIVE_PREVIOUS_PRICE_ID':'CREATOR_STRIPE_PREVIOUS_PRICE_ID';
const priorId=process.env[previousKey]??process.env[priceKey];assert(/^price_[A-Za-z0-9]+$/.test(priorId??''),'Previous Creator price required');
const prior=await stripe.prices.retrieve(priorId!);
assert.equal(prior.livemode,live);assert.equal(prior.unit_amount,creditCatalog(PREVIOUS_CREDIT_CATALOG_VERSION)!.creator.cents);
assert.equal(prior.currency,'usd');assert.equal(prior.recurring?.interval,'month');assert.equal(prior.recurring?.interval_count,1);assert.equal(prior.tax_behavior,'exclusive');
assert.equal(typeof prior.product,'string');
const product=await stripe.products.retrieve(prior.product as string);assert(!product.deleted,'Creator product is deleted');
assert.equal(product.metadata.jamloom_catalog,PREVIOUS_CREDIT_CATALOG_VERSION,'Unrecognized existing Creator product');
if(live){assert.equal(product.active,false,'Live product must remain inactive');assert.equal(prior.active,false,'Live prior price must remain inactive');}
const prices=await stripe.prices.list({product:product.id,limit:100});assert(!prices.has_more,'Price inventory truncated');
const matches=prices.data.filter(p=>p.metadata.jamloom_catalog===CREDIT_CATALOG_VERSION);assert(matches.length<=1,'Duplicate candidate prices');
let price=matches[0];
const check=(p:Stripe.Price)=>{
 assert.equal(p.product,product.id);assert.equal(p.livemode,live);assert.equal(p.active,!live);
 assert.equal(p.currency,'usd');assert.equal(p.unit_amount,CREATOR_PLAN.cents);assert.equal(p.recurring?.interval,'month');
 assert.equal(p.recurring?.interval_count,1);assert.equal(p.tax_behavior,'exclusive');
};
if(price)check(price);
const plan={mode:live?'live-inactive':'test',catalog:CREDIT_CATALOG_VERSION,creator:CREATOR_PLAN,topup:TOP_UP,
 product:product.id,priorPrice:prior.id,candidatePrice:price?.id??null,createPrice:!price,
 reuseProduct:true,existingSubscriptionsChanged:false,existingPricesChanged:false,webhookChanged:false,
 livePurchases:false,deployment:false,topupImplementation:'Version-bound inline Checkout price; no duplicate Stripe product required'};
if(!apply){console.log(JSON.stringify(plan,null,2));process.exit(0);}
price??=await stripe.prices.create({product:product.id,active:!live,currency:'usd',unit_amount:CREATOR_PLAN.cents,
 recurring:{interval:'month'},tax_behavior:'exclusive',metadata:{jamloom_catalog:CREDIT_CATALOG_VERSION,jamloom_product:'creator-subscription'}},
 {idempotencyKey:`jamloom:reprice:${live}:${CREDIT_CATALOG_VERSION}:creator`});
check(await stripe.prices.retrieve(price.id));
const folder=resolve('../../build-credit-repricing-20261108');await mkdir(folder,{recursive:true,mode:0o700});
const config={[priceKey]:price.id,[previousKey]:prior.id};
await writeFile(resolve(folder,live?'live-price-candidate.env':'test-price-candidate.env'),Object.entries(config).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
const report={...plan,status:'PASS',candidatePrice:price.id,privateCandidateConfigurationSaved:true,defaultEnvironmentChanged:false};
await writeFile(resolve(folder,live?'stripe-live-prepared.json':'stripe-test-prepared.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(report,null,2));
