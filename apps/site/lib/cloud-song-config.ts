import {integer} from './economics';
import {activeWorkerLease} from './cloud-capacity-lease';
import {CLOUD_PROFILES,diagnosticSongProfile,validateProfileLease,productionSongBudget} from './cloud-production-profile';
export function cloudSongConfig(env:Record<string,string|undefined>=process.env,product?:'improvise'|'music-dna',privateQualification=false){
 if(env.JAMLOOM_CLOUD_SONGS_ENABLED!=='true')return null;
 const endpoint=env.RUNPOD_ENDPOINT_ID,key=env.RUNPOD_API_KEY;
 if(!key||!endpoint||!/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))throw Error('Song service is not configured');
 if(!['test','live'].includes(env.CREDIT_BILLING_MODE??'test'))throw Error('Invalid credit billing mode');
 if(env.VERCEL==='1'&&env.CREDIT_BILLING_MODE!=='live')throw Error('Hosted song generation requires live credits');
 const profile=env.JAMLOOM_CLOUD_COST_PROFILE;
 const activeLease=activeWorkerLease(env);
 if(activeLease&&!profile)throw Error('Active capacity requires the reviewed production profile');
 if(profile&&!CLOUD_PROFILES.includes(profile))throw Error('Unknown song cost profile');
 if(profile&&diagnosticSongProfile(profile)&&(!privateQualification||!activeLease))throw Error('Diagnostic hardware is restricted to private qualification with a finite lease');
 if(profile){
  if(!product)throw Error('Song cost profile requires a product');
  validateProfileLease(profile,activeLease);
  const candidate=productionSongBudget(product,profile);
  return {endpoint,key,...candidate,productionProfile:profile,activeLease,
   live:env.CREDIT_BILLING_MODE==='live',dailyMicros:integer(Number(env.JAMLOOM_CLOUD_DAILY_CAP_MICROS??20000000),candidate.costCapMicros,100000000)};
 }
 const rate=integer(Number(env.JAMLOOM_CLOUD_RATE_MICROS_PER_SECOND),1,1000);
 const executionSeconds=300,ttlSeconds=900,fixedCostMicros=20000;
 // Reserve the entire queue/startup/execution window; queue time is a conservative bound, not a provider bill.
 const costCapMicros=rate*ttlSeconds+fixedCostMicros;
 return {endpoint,key,rate,executionSeconds,ttlSeconds,fixedCostMicros,costCapMicros,productionProfile:undefined,activeLease:undefined,
  live:env.CREDIT_BILLING_MODE==='live',dailyMicros:integer(Number(env.JAMLOOM_CLOUD_DAILY_CAP_MICROS??20000000),costCapMicros,100000000),
  budget:{costCapMicros,maxRuntimeMs:executionSeconds*1000,hourlyMicros:rate*3600,fixedCostMicros:rate*(ttlSeconds-executionSeconds)+fixedCostMicros}};
}
export type CloudSongConfig=NonNullable<ReturnType<typeof cloudSongConfig>>&{review?:{owners:string[];expiresAt:number;capMicros:number;enabled:boolean}};
