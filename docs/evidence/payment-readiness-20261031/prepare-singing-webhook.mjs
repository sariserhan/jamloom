// Explicit payment preparation only. No activation, Checkout, payment or deployment API.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,chmodSync,existsSync} from 'node:fs';
import Stripe from '../../../apps/site/node_modules/stripe/esm/stripe.esm.node.js';
const args=process.argv.slice(2);assert(args.length===0||(args.length===1&&args[0]==='--prepare-disabled'));
const apply=args.length===1,root=new URL('../../../',import.meta.url),envFile=new URL('apps/site/.env.local',root);
process.loadEnvFile(envFile.pathname);
const key=process.env.STRIPE_LIVE_SECRET_KEY;assert(key?.startsWith('sk_live_'));
const stripe=new Stripe(key,{maxNetworkRetries:0,timeout:15000});
const account=await stripe.accounts.retrieve();assert.equal(account.id,'acct_1TxA3vDlEXWDEeHO');
const product=await stripe.products.retrieve(process.env.SINGING_STRIPE_LIVE_PRODUCT_ID);
const price=await stripe.prices.retrieve(process.env.SINGING_STRIPE_LIVE_PRICE_ID);
assert.equal(product.livemode,true);assert.equal(product.active,false);assert.equal(product.metadata.jamloom_product,'singing-complete');
assert.equal(price.product,product.id);assert.equal(price.active,false);assert.equal(price.livemode,true);assert.equal(price.unit_amount,3900);assert.equal(price.currency,'usd');assert.equal(price.type,'one_time');assert.equal(price.tax_behavior,'exclusive');
const url='https://www.jamloom.com/api/academy/stripe?mode=live&course=singing-complete';
const events=['checkout.session.completed','checkout.session.async_payment_succeeded','charge.refunded','charge.dispute.created','charge.dispute.closed'];
const matches=[];for await(const e of stripe.webhookEndpoints.list({limit:100}))if(e.url===url)matches.push(e);
assert.equal(matches.length,0,'Existing endpoint must be inspected; never duplicate or rotate it automatically');
assert(!process.env.SINGING_STRIPE_LIVE_WEBHOOK_SECRET,'Never overwrite an existing signing secret');
const report={status:apply?'PENDING':'PASS dry run',account:account.id,url,product:product.id,price:price.id,productActive:false,priceActive:false,events,apiVersion:Stripe.API_VERSION,liveCharges:0,deployed:false};
const reportFile=new URL(apply?'singing-webhook-prepared.json':'singing-webhook-dryrun.json',import.meta.url);
assert(!existsSync(reportFile),'Preserve previous receipts');
if(apply){
 const privateDir=new URL('renders/payment-readiness-20261031/',root);mkdirSync(privateDir,{recursive:true,mode:0o700});chmodSync(privateDir,0o700);
 const original=readFileSync(envFile,'utf8');
 writeFileSync(new URL('before-webhook.env',privateDir),original,{flag:'wx',mode:0o600});
 let created;
 try{
  created=await stripe.webhookEndpoints.create({url,enabled_events:events,api_version:Stripe.API_VERSION,
   metadata:{jamloom_product:'singing-complete'},description:'Jamloom Singing: prepared, disabled pending deployment and payment activation'},
   {idempotencyKey:'jamloom-singing-live-webhook-preparation-20261031'});
  assert(created.secret?.startsWith('whsec_'));
  // Save the one-time secret privately before any further network operation.
  writeFileSync(new URL('created-webhook.private.json',privateDir),JSON.stringify(created),{flag:'wx',mode:0o600});
 }finally{
  if(created)await stripe.webhookEndpoints.update(created.id,{disabled:true});
 }
 const endpoint=await stripe.webhookEndpoints.retrieve(created.id);assert.equal(endpoint.status,'disabled');assert.equal(endpoint.url,url);assert.equal(endpoint.livemode,true);
 assert.equal(readFileSync(envFile,'utf8'),original,'Local environment changed concurrently; secret retained privately');
 writeFileSync(envFile,original.replace(/\n?$/,'\n')+'SINGING_STRIPE_LIVE_WEBHOOK_SECRET='+created.secret+'\n',{mode:0o600});chmodSync(envFile,0o600);
 report.status='PASS prepared and disabled';report.endpoint={id:endpoint.id,status:endpoint.status,apiVersion:endpoint.api_version};report.secretSavedLocally=true;
}
writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
