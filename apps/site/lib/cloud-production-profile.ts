import {assertActiveWorkerLease,validateActiveWorkerLease,type ActiveWorkerLease} from './cloud-capacity-lease';
// Explicitly selected release candidate, not proof of provider billing or permission to enable sales.
export const CLOUD_COST_PROFILE='l4-2026-11-01';
// Candidate hardware is available only to a finite private qualification lease.
// It is not a qualified production fallback and must never widen the L4 profile.
export const CLOUD_DIAGNOSTIC_PROFILE='a5000-diagnostic-2026-11-01';
export const CLOUD_4090_DIAGNOSTIC_PROFILE='4090-diagnostic-2026-11-01';
export const CLOUD_PROFILES=[CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE,CLOUD_4090_DIAGNOSTIC_PROFILE];
export function diagnosticSongProfile(profile:string){return [CLOUD_DIAGNOSTIC_PROFILE,CLOUD_4090_DIAGNOSTIC_PROFILE].includes(profile);}
export function validateProfileLease(profile:string,lease?:ActiveWorkerLease){
 if(diagnosticSongProfile(profile)&&!lease)throw Error('Diagnostic hardware requires a finite active-worker lease');
 if(lease){
  validateActiveWorkerLease(lease);
  const rate=profile===CLOUD_4090_DIAGNOSTIC_PROFILE?380:220;
  if(lease.maxMicros<Math.ceil((lease.expiresAt-lease.startsAt)/1000+130)*rate+20000)throw Error('Active-worker lease does not cover the selected hardware rate');
 }
}
export const CLOUD_WORKER_IMAGE='ghcr.io/sariserhan/jamloom/music-worker@sha256:fc903cdc7f41404c7bbe5067a467379106959c39b2172a7629a20bc8b7d8e9bc';
export function productionSongBudget(product:'improvise'|'music-dna',profile=CLOUD_COST_PROFILE){
 if(!CLOUD_PROFILES.includes(profile))throw Error('Unknown song cost profile');
 const faster=profile===CLOUD_4090_DIAGNOSTIC_PROFILE;
 const rate=faster?380:220,fixedCostMicros=20000;
 // Diagnostic deadlines are hypotheses to measure, not verified 4090 performance.
 const [executionSeconds,ttlSeconds]=faster?(product==='improvise'?[120,130]:[250,310]):(product==='improvise'?[190,220]:[480,540]);
 const costCapMicros=rate*ttlSeconds+fixedCostMicros;
 return {rate,fixedCostMicros,executionSeconds,ttlSeconds,costCapMicros,
  budget:{costCapMicros,maxRuntimeMs:executionSeconds*1000,hourlyMicros:rate*3600,fixedCostMicros:rate*(ttlSeconds-executionSeconds)+fixedCostMicros}};
}
// Runpod selects pools minus exclusions. Check the current catalog too: new pool members
// must never silently widen the qualified hardware or increase the hourly rate.
export function assertProductionEndpoint(endpoint:any,catalog:any,activeLease?:ActiveWorkerLease,profile=CLOUD_COST_PROFILE){
 if(!CLOUD_PROFILES.includes(profile))throw Error('Unknown song cost profile');
 validateProfileLease(profile,activeLease);
 const faster=profile===CLOUD_4090_DIAGNOSTIC_PROFILE;
 if(activeLease)assertActiveWorkerLease(activeLease);
 const gpu=endpoint?.gpu,workers=endpoint?.workers;
 // Runpod omits excludedTypes when the configured list is empty. Absence
 // means no exclusions; the live catalog must still resolve to one exact GPU.
 const excludedTypes=gpu?.excludedTypes===undefined?[]:gpu.excludedTypes;
 if(endpoint?.image!==CLOUD_WORKER_IMAGE||endpoint.type!=='QUEUE'||endpoint.disk!==60||
  gpu?.count!==1||!Array.isArray(gpu.pools)||gpu.pools.length!==1||gpu.pools[0]!==(faster?'ADA_24':'AMPERE_24')||
  (!Array.isArray(excludedTypes)||excludedTypes.some((id:unknown)=>typeof id!=='string'))||workers?.min!==(activeLease?1:0)||workers.max!==1||
  endpoint.scaling?.type!=='REQUEST_COUNT'||endpoint.scaling.requestCount!==1||
  !['OFF','FLASHBOOT'].includes(endpoint.flashboot)||
  endpoint.networkVolumes?.length!==0||endpoint.mounts?.network?.length!==0||endpoint.mounts?.global?.length!==0)
  throw Error('Song capacity differs from the reviewed cost profile');
 if(!Array.isArray(catalog?.gpus))throw Error('Song hardware pricing could not be checked');
 const eligible=catalog.gpus.filter((g:any)=>gpu.pools.includes(g.pool)&&!excludedTypes.includes(g.id));
 const expectedGpu=faster?'NVIDIA GeForce RTX 4090':profile===CLOUD_DIAGNOSTIC_PROFILE?'NVIDIA RTX A5000':'NVIDIA L4';
 if(eligible.length!==1||eligible[0].id!==expectedGpu||typeof eligible[0].price?.serverless!=='number'||
  !Number.isFinite(eligible[0].price.serverless)||eligible[0].price.serverless<=0||eligible[0].price.serverless>(faster?1.34:0.75))
  throw Error('Song hardware or price differs from the reviewed cost profile');
}
