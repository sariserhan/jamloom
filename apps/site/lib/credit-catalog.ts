// Shared retail units. Provider fees affect internal accounting, never an owner's job price.
export const CREDIT_CATALOG_VERSION = '2026-10-31-v2';
export const LEGACY_CREDIT_MULTIPLIER = 15;
export const CREATOR_PLAN = {key:'creator',cents:1500,credits:300,interval:'month',appleProduct:'com.jamloom.creator.monthly'} as const;
export const TOP_UP = {key:'topup',cents:1000,credits:150,appleProduct:'com.jamloom.credits.topup150'} as const;
export const TRIAL_CREDITS = 20;
export const TARGET_MARGIN_BPS = 6500;
// Conservative planning floor includes the lowest supported channel; not a measured provider cost.
export const NET_MICROS_PER_CREDIT_FLOOR = 20_000;
export type FixedCreditPrice = {version:typeof CREDIT_CATALOG_VERSION;credits:number};
export function songCreditPrice(product:'improvise'|'music-dna'):FixedCreditPrice {
  // One delivered arrangement, throughout the currently supported duration range.
  return {version:CREDIT_CATALOG_VERSION,credits:product==='improvise'?10:20};
}
export const DJ_CREDITS_PER_MINUTE = 2;
export function fixedAllocation(lots:{id:string;credits:number;net_micros:number|string;available:number}[],count:number){
  if(!Number.isSafeInteger(count)||count<1||count>100000)throw Error('Invalid catalog credit price');
  let remaining=count;
  const allocations=[];
  for(const lot of lots){
    const n=Math.min(Math.max(0,lot.available),remaining);
    if(n)allocations.push({id:lot.id,n,net:Math.floor(Number(lot.net_micros)/lot.credits),privacy:0});
    remaining-=n;if(!remaining)break;
  }
  if(remaining)throw Error('Insufficient credits');
  return allocations;
}
export function assertCatalogBudget(price:FixedCreditPrice,cap:number,live:boolean){
  if(price.version!==CREDIT_CATALOG_VERSION||!Number.isSafeInteger(price.credits)||price.credits<1)throw Error('Credit price changed; request a new quote');
  if(live&&cap>Math.floor(price.credits*NET_MICROS_PER_CREDIT_FLOOR*(10000-TARGET_MARGIN_BPS)/10000))
    throw Error('Generation cost exceeds the published price budget; generation is unavailable');
}
export function creditSalesQualified(env:Record<string,string|undefined>=process.env){
  // An explicit reviewed qualification is required, not just payment credentials.
  return env.JAMLOOM_CREDIT_COST_QUALIFICATION===CREDIT_CATALOG_VERSION;
}

export function assertAllocationBudget(allocations:{n:number;net:number}[],cap:number,live:boolean){
  if(live&&cap>Math.floor(allocations.reduce((sum,a)=>sum+a.n*a.net,0)*(10000-TARGET_MARGIN_BPS)/10000))
    throw Error('Purchase proceeds do not cover this generation budget; reconciliation required');
}
