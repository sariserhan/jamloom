import {services} from '../../../../lib/services';
import {Wallet} from '../../../../lib/wallet';
import {creditBilling} from '../../../../lib/stripe-payments';
import {subscriptionCheckout} from '../../../../lib/credit-subscriptions';
import {boundedAuthRequest} from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const {auth,pool,config}=services();if(request.headers.get('origin')!==config.baseURL)return new Response(null,{status:403});
  const session=await auth.api.getSession({headers:request.headers});if(!session?.user.emailVerified)return new Response(null,{status:401});
  const bounded=await boundedAuthRequest(request,4096);if(!bounded)return new Response(null,{status:413});
  const body=await bounded.json(),billing=creditBilling(),wallet=new Wallet(pool,billing.live);
  if(body.action==='manage'){
   const customer=(await pool.query('SELECT customer_id FROM credit_customers WHERE owner_id=$1 AND billing_live=$2',[session.user.id,billing.live])).rows[0];
   if(!customer)return Response.json({error:'Manage an Apple subscription in your device subscription settings.'},{status:409});
   const configuration=process.env[billing.live?'CREATOR_STRIPE_LIVE_PORTAL_CONFIGURATION':'CREATOR_STRIPE_PORTAL_CONFIGURATION'];
   if(!configuration)throw Error('Portal configuration missing');
   const settings=await billing.stripe.billingPortal.configurations.retrieve(configuration);
   if(!settings.active||settings.livemode!==billing.live||!settings.features.subscription_cancel.enabled||settings.features.subscription_cancel.mode!=='at_period_end'||settings.features.subscription_update.enabled)throw Error('Unsupported portal configuration');
   const portal=await billing.stripe.billingPortal.sessions.create({customer:customer.customer_id,configuration,return_url:config.baseURL+'/account/credits'});
   return Response.json({url:portal.url},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(!billing.enabled)return Response.json({error:'Purchases and trial generation are not open yet.'},{status:503});
  if(body.action==='trial')return Response.json({claimed:await wallet.claimTrial(session.user.id),balance:await wallet.balance(session.user.id)});
  if(body.action!=='subscribe'||typeof body.key!=='string')return new Response(null,{status:400});
  const checkout=await subscriptionCheckout(billing.stripe,pool,session.user.id,body.key,config.baseURL,billing.live);
  return Response.json({url:checkout.url},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Subscription service unavailable. Check your existing plan before trying again.'},{status:503});}
}
