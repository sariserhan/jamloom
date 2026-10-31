import './env';
import Stripe from 'stripe';
import {readFile,writeFile} from 'node:fs/promises';
import {CREATOR_PLAN,CREDIT_CATALOG_VERSION} from '../lib/credit-catalog';
// Test catalog preparation only. Live catalog publication is a separate release action.
if(process.argv.slice(2).some(a=>a!=='--apply-test'))throw Error('Use --apply-test or no arguments for a dry run');
if(!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('Stripe test key required');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:1});
if((await stripe.accounts.retrieve(null)).id!=='acct_1TxA3vDlEXWDEeHO')throw Error('Unexpected Stripe account');
if(!process.argv.includes('--apply-test')){
 console.log(JSON.stringify({mode:'test',action:'dry-run',creator:CREATOR_PLAN,version:CREDIT_CATALOG_VERSION,livePurchases:false}));
}else{
 const taxCode=process.env.CREDIT_STRIPE_TAX_CODE;if(!/^txcd_[0-9]{8}$/.test(taxCode??''))throw Error('Reviewed tax category required');
 const product=await stripe.products.create({name:'Jamloom Creator',description:'300 nonexpiring credits per month. Cancel future renewals anytime.',tax_code:taxCode,metadata:{jamloom_catalog:CREDIT_CATALOG_VERSION}},{idempotencyKey:`jamloom:creator:product:${CREDIT_CATALOG_VERSION}`});
 const price=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:CREATOR_PLAN.cents,recurring:{interval:'month'},tax_behavior:'exclusive',metadata:{jamloom_catalog:CREDIT_CATALOG_VERSION}},{idempotencyKey:`jamloom:creator:price:${CREDIT_CATALOG_VERSION}`});
 const portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your Jamloom Creator subscription',privacy_policy_url:'https://www.jamloom.com/privacy',terms_of_service_url:'https://www.jamloom.com/terms'},features:{subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:false},payment_method_update:{enabled:true},invoice_history:{enabled:true}},metadata:{jamloom_catalog:CREDIT_CATALOG_VERSION}},{idempotencyKey:`jamloom:creator:portal:${CREDIT_CATALOG_VERSION}`});
 const file=new URL('../.env.local',import.meta.url);let env=await readFile(file,'utf8');
 for(const [key,value] of Object.entries({CREATOR_STRIPE_PRICE_ID:price.id,CREATOR_STRIPE_PORTAL_CONFIGURATION:portal.id})){
  const existing=env.match(new RegExp('^'+key+'=(.*)$','m'));if(existing&&existing[1]!==value)throw Error('Existing local catalog differs; inspect before replacing');if(!existing)env+=`\n${key}=${value}\n`;
 }
 await writeFile(file,env,{mode:0o600});
 console.log(JSON.stringify({status:'PASS',mode:'test',product:product.id,price:price.id,portal:portal.id,localConfigurationSaved:true,livePurchases:false}));
}
