// This is a cash-transfer plan, not a second GPU expense. Depositing provider
// credit must never be counted as new customer revenue or free GPU capacity.
export function providerReplenishmentPlan(revenueMicros:number,balanceMicros:number,cycleMicros:number){
 if(![revenueMicros,balanceMicros,cycleMicros].every(Number.isSafeInteger)||balanceMicros<0||cycleMicros<=0)throw Error('Invalid replenishment accounting');
 const backedShortfall=Math.max(0,revenueMicros-balanceMicros);
 const suggestedMicros=balanceMicros<3*cycleMicros&&backedShortfall>=10000000?10000000:0;
 return {status:suggestedMicros?'funded_recharge_ready':revenueMicros<=0?'waiting_for_revenue':balanceMicros>=3*cycleMicros?'provider_funded':'below_minimum_recharge',
  suggestedMicros,automaticCharge:false,reason:'Runpod native auto-pay cannot enforce this revenue cap; a reviewed provider recharge is required.'};
}
