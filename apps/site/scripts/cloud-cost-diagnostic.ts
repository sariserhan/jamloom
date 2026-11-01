import type {CloudSongConfig} from '../lib/cloud-song-config';
import {assertCatalogBudget,songCreditPrice} from '../lib/credit-catalog';

// Diagnostic candidates only. This module is never imported by a customer route.
// Runpod's published L4-class flex rate is $0.75/hour; round upward for planning.
// Worker initialization/idle and failed work still require separate billed-cost attribution.
export function costDiagnosticConfig(base:CloudSongConfig,product:'improvise'|'music-dna'):CloudSongConfig{
 if(base.live)throw Error('Cost diagnostics require an isolated test ledger');
 const rate=220,fixedCostMicros=20000;
 const [executionSeconds,ttlSeconds]=product==='improvise'?[190,220]:[480,540];
 const costCapMicros=rate*ttlSeconds+fixedCostMicros;
 assertCatalogBudget(songCreditPrice(product),costCapMicros,true);
 return {...base,rate,executionSeconds,ttlSeconds,fixedCostMicros,costCapMicros,
  budget:{costCapMicros,maxRuntimeMs:executionSeconds*1000,hourlyMicros:rate*3600,fixedCostMicros:rate*(ttlSeconds-executionSeconds)+fixedCostMicros}};
}
export function trialSettlement(product:'improvise'|'music-dna',state:string,quoted:number,balance:{available:number;reserved:number}|undefined){
 const expected=state==='completed'?songCreditPrice(product).credits:0;
 return {expected,passed:!!balance&&quoted===songCreditPrice(product).credits&&balance.available===50-expected&&balance.reserved===0};
}
