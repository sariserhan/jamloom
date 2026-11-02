import '../apps/site/scripts/env';
import Stripe from '../apps/site/node_modules/stripe/esm/stripe.esm.node.js';
import {writeFile} from 'node:fs/promises';
const s=new Stripe(process.env.STRIPE_LIVE_SECRET_KEY!,{maxNetworkRetries:0,timeout:15000});
const a=await s.accounts.retrieve(null);if(a.id!=='acct_1TxA3vDlEXWDEeHO')throw Error('Unexpected account');
const [p,price,w,tax]=await Promise.all([s.products.retrieve('prod_VXlMg867UjAY5B'),s.prices.retrieve('price_1UWfq5DlEXWDEeHOohZJG7PI'),s.webhookEndpoints.retrieve('we_1UWfqYDlEXWDEeHOuJRHbAos'),s.tax.settings.retrieve()]);
const report={observedAt:new Date().toISOString(),chargesEnabled:a.charges_enabled,payoutsEnabled:a.payouts_enabled,requirements:{currentlyDue:a.requirements?.currently_due,pastDue:a.requirements?.past_due,disabledReason:a.requirements?.disabled_reason},taxStatus:tax.status,creatorProductActive:p.active,creatorPriceActive:price.active,webhook:{id:w.id,url:w.url,status:w.status,events:w.enabled_events,apiVersion:w.api_version}};
await writeFile('../../build-identity-stems-20261101/stripe-readiness.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
