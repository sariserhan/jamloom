// This is a cash-transfer plan, not a second GPU expense. Depositing provider
// credit must never be counted as new customer revenue or free GPU capacity.
export function providerReplenishmentPlan(revenueMicros:number,balanceMicros:number,cycleMicros:number){
 if(![revenueMicros,balanceMicros,cycleMicros].every(Number.isSafeInteger)||balanceMicros<0||cycleMicros<=0)throw Error('Invalid replenishment accounting');
 const backedShortfall=Math.max(0,revenueMicros-balanceMicros);
 const suggestedMicros=balanceMicros<3*cycleMicros&&backedShortfall>=10000000?10000000:0;
 return {status:suggestedMicros?'funded_recharge_ready':revenueMicros<=0?'waiting_for_revenue':balanceMicros>=3*cycleMicros?'provider_funded':'below_minimum_recharge',
  suggestedMicros,automaticCharge:false,reason:'Runpod native auto-pay cannot enforce this revenue cap; a reviewed provider recharge is required.'};
}

export type ProviderAutoPay={enabled:boolean;amountUSD:number;thresholdUSD:number;matchesApprovedPolicy:boolean};
// This reads the separately approved cash buffer. It never enables payments or
// allocates deposited money to the GPU revenue ledger.
export async function inspectProviderAutoPay(env:Record<string,string|undefined>,request:typeof fetch=fetch):Promise<ProviderAutoPay|undefined>{
 const policy=env.JAMLOOM_PROVIDER_AUTO_PAY_POLICY;
 if(!policy)return undefined;
 if(policy!=='50-below-5'||!env.RUNPOD_API_KEY)throw Error('Invalid provider auto-pay policy');
 const r=await request('https://api.runpod.io/graphql',{method:'POST',headers:{Authorization:'Bearer '+env.RUNPOD_API_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({query:'query { myself { isAutoPayEnabled stripeAutoReloadAmount stripeAutoPaymentThreshold } }'}),redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Provider auto-pay read failed');
 const body=await r.json(),v=body.data?.myself;
 if(body.errors?.length||!v||typeof v.isAutoPayEnabled!=='boolean'||![v.stripeAutoReloadAmount,v.stripeAutoPaymentThreshold].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))throw Error('Invalid provider auto-pay response');
 return {enabled:v.isAutoPayEnabled,amountUSD:v.stripeAutoReloadAmount,thresholdUSD:v.stripeAutoPaymentThreshold,
  matchesApprovedPolicy:v.isAutoPayEnabled&&v.stripeAutoReloadAmount===50&&v.stripeAutoPaymentThreshold===5};
}
