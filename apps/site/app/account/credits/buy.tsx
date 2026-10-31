'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CREATOR_PLAN,TOP_UP,TRIAL_CREDITS} from '../../../lib/credit-catalog';
export function CreditBuy({enabled,live,subscribed=false}:{enabled:boolean;live:boolean;subscribed?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),keys=useRef<Record<string,string>>({}),router=useRouter();
 useEffect(()=>{
  const id=new URL(location.href).searchParams.get('session_id');if(!id)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>,attempts=0;
  async function check(){
   try{const r=await fetch('/api/payments/checkout?session_id='+encodeURIComponent(id!),{signal:AbortSignal.timeout(10000)}),data=await r.json();if(stopped)return;
    if(data.complete){setMessage('Payment verified. Your credits are ready.');router.refresh();return;}
    setMessage('Your payment is being confirmed. Please don’t pay again.');
   }catch{if(stopped)return;setMessage('We’re checking your payment. You can return to this page later.');}
   if(++attempts<15)timer=setTimeout(check,3000);
  }
  void check();return()=>{stopped=true;clearTimeout(timer);};
 },[router]);
 async function buy(pack:string){setBusy(true);setMessage('Opening secure payment…');try{
  keys.current[pack]??=crypto.randomUUID();const r=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pack,key:keys.current[pack]})});const data=await r.json();
  if(!r.ok)throw Error(data.error);const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Payment link unavailable.');location.assign(url.href);
 }catch(error){setMessage(error instanceof Error?error.message:'Could not open checkout.');setBusy(false);}}
 async function subscription(action:'subscribe'|'manage'|'trial'){
  if(busy)return;setBusy(true);setMessage('');
  try{keys.current[action]??=crypto.randomUUID();const r=await fetch('/api/payments/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,key:keys.current[action]})});const data=await r.json();
   if(!r.ok)throw Error(data.error);if(action==='trial'){setMessage(data.claimed?'Your trial credits are ready.':'Your one-time trial has already been claimed.');router.refresh();setBusy(false);return;}
   const url=new URL(data.url);if(url.protocol!=='https:'||!['checkout.stripe.com','billing.stripe.com'].includes(url.hostname))throw Error('Payment link unavailable.');location.assign(url.href);
  }catch(e){setMessage(e instanceof Error?e.message:'Payment service unavailable.');setBusy(false);}
 }
 return <><h2>Creator · ${CREATOR_PLAN.cents/100}/month</h2><p>{CREATOR_PLAN.credits} credits after every successful monthly payment. All paid credits stay in your account without expiry, including after cancellation. Same musical quality on every paid plan.</p>
 <div className="product-actions"><button className="primary" disabled={!enabled||busy||subscribed} onClick={()=>subscription('subscribe')}>{subscribed?'Already subscribed':'Subscribe to Creator'}</button><button className="secondary" disabled={busy} onClick={()=>subscription('manage')}>Manage subscription</button></div>
 <h2>Add credits without a subscription</h2><p>{TOP_UP.credits} credits · ${TOP_UP.cents/100} once. No expiry. No automatic top-ups.</p><button className="primary" disabled={!enabled||busy} onClick={()=>buy('topup')}>Buy {TOP_UP.credits} credits · ${TOP_UP.cents/100}</button>
 <h2>Try your first creations</h2><p>{TRIAL_CREDITS} one-time trial credits per verified account, while trial capacity is available.</p><button className="secondary" disabled={!enabled||busy} onClick={()=>subscription('trial')}>Claim trial credits</button>
 <p>Prices are USD before applicable tax. Improvise: 10 credits per arrangement. Music DNA: 20 credits per song. Private and public creation cost the same. Failed or cancelled generations return their credits. Listening and downloading an existing result cost no extra credits.</p>
 {!live&&<p>Test mode · no real payment or cash value.</p>}{!enabled&&<p>Purchases remain closed while payment and generation-cost validation is completed.</p>}<p role="status">{message}</p></>;
}
