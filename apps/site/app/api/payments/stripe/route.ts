import {fulfillSubscriptionInvoice,reconcileSubscription,reverseSubscriptionPayment} from '../../../../lib/credit-subscriptions';
import { createHash } from 'node:crypto';
import { services,accountsConfigured } from '../../../../lib/services';
import { creditBilling,fulfillCheckout,reconcileCreditReversal } from '../../../../lib/stripe-payments';
import { Wallet } from '../../../../lib/wallet';
import { boundedAuthRequest } from '../../../../lib/bounded-request';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!accountsConfigured())return Response.json({error:'Payment service unavailable'},{status:503});
  let billing;try{billing=creditBilling();}catch{return Response.json({error:'Billing not configured'},{status:503});}const {stripe,secret,live}=billing,provider=live?'stripe_live':'stripe_test';
  const bounded=await boundedAuthRequest(request);if(!bounded)return new Response(null,{status:413});
  const raw=await bounded.text();let event;
  try{event=stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature')??'',secret);}
  catch{return Response.json({error:'Invalid signature'},{status:400});}
  if(event.livemode!==live)return Response.json({error:'Billing environment mismatch'},{status:403});
  try{
    const {pool}=services(),wallet=new Wallet(pool,live),hash=createHash('sha256').update(raw).digest('hex');
    const claimed=await pool.query(`INSERT INTO provider_webhook_events(provider,event_id,digest,handled) VALUES($1,$2,$3,false)
     ON CONFLICT(provider,event_id) DO UPDATE SET event_id=EXCLUDED.event_id WHERE provider_webhook_events.digest=EXCLUDED.digest RETURNING handled`,[provider,event.id,hash]);
    if(!claimed.rowCount)throw Error('Webhook conflict');if(claimed.rows[0].handled)return Response.json({received:true});
    if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
      if(event.data.object.payment_status==='paid'&&event.data.object.metadata?.jamloom_product==='song-credits')await fulfillCheckout(stripe,wallet,event.data.object.id);
    }else if(event.type==='invoice.paid'){
      await fulfillSubscriptionInvoice(stripe,pool,wallet,event.data.object.id);
    }else if(event.type==='invoice.payment_failed'){
      const sub=event.data.object.parent?.subscription_details?.subscription;
      if(sub)await reconcileSubscription(stripe,pool,wallet,typeof sub==='string'?sub:sub.id);
    }else if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
      await reconcileSubscription(stripe,pool,wallet,(event.data.object as {id:string}).id);
    }else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){
      await reconcileCreditReversal(stripe,wallet,event);
      const intent=event.data.object.payment_intent;if(typeof intent==='string')await reverseSubscriptionPayment(stripe,wallet,intent);
    }
    await pool.query('UPDATE provider_webhook_events SET handled=true WHERE event_id=$1 AND digest=$2 AND provider=$3',[event.id,hash,provider]);
    return Response.json({received:true});
  }catch{return Response.json({error:'Payment reconciliation pending; retry delivery'},{status:503});}
}
