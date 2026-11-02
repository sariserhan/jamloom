import {assertActiveWorkerLease,type ActiveWorkerLease} from './cloud-capacity-lease';
// Explicitly selected release candidate, not proof of provider billing or permission to enable sales.
export const CLOUD_COST_PROFILE='l4-2026-11-01';
// Candidate hardware is available only to a finite private qualification lease.
// It is not a qualified production fallback and must never widen the L4 profile.
export const CLOUD_DIAGNOSTIC_PROFILE='a5000-diagnostic-2026-11-01';
export const CLOUD_WORKER_IMAGE='ghcr.io/sariserhan/jamloom/music-worker@sha256:2de0a4b3c897edbc80aa74cdc7b9a9f6f58d5cbcb312f09d86b190693ae96161';
export function productionSongBudget(product:'improvise'|'music-dna'){
 const rate=220,fixedCostMicros=20000;
 const [executionSeconds,ttlSeconds]=product==='improvise'?[190,220]:[480,540];
 const costCapMicros=rate*ttlSeconds+fixedCostMicros;
 return {rate,fixedCostMicros,executionSeconds,ttlSeconds,costCapMicros,
  budget:{costCapMicros,maxRuntimeMs:executionSeconds*1000,hourlyMicros:rate*3600,fixedCostMicros:rate*(ttlSeconds-executionSeconds)+fixedCostMicros}};
}
// Runpod selects pools minus exclusions. Check the current catalog too: new pool members
// must never silently widen the qualified hardware or increase the hourly rate.
export function assertProductionEndpoint(endpoint:any,catalog:any,activeLease?:ActiveWorkerLease,profile=CLOUD_COST_PROFILE){
 if(![CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE].includes(profile))throw Error('Unknown song cost profile');
 if(profile===CLOUD_DIAGNOSTIC_PROFILE&&!activeLease)throw Error('Diagnostic hardware requires a finite active-worker lease');
 if(activeLease)assertActiveWorkerLease(activeLease);
 const gpu=endpoint?.gpu,workers=endpoint?.workers;
 if(endpoint?.image!==CLOUD_WORKER_IMAGE||endpoint.type!=='QUEUE'||endpoint.disk!==60||
  gpu?.count!==1||!Array.isArray(gpu.pools)||gpu.pools.length!==1||gpu.pools[0]!=='AMPERE_24'||
  !Array.isArray(gpu.excludedTypes)||workers?.min!==(activeLease?1:0)||workers.max!==1||
  endpoint.scaling?.type!=='REQUEST_COUNT'||endpoint.scaling.requestCount!==1||
  !['OFF','FLASHBOOT'].includes(endpoint.flashboot)||
  endpoint.networkVolumes?.length!==0||endpoint.mounts?.network?.length!==0||endpoint.mounts?.global?.length!==0)
  throw Error('Song capacity differs from the reviewed cost profile');
 if(!Array.isArray(catalog?.gpus))throw Error('Song hardware pricing could not be checked');
 const eligible=catalog.gpus.filter((g:any)=>gpu.pools.includes(g.pool)&&!gpu.excludedTypes.includes(g.id));
 const expectedGpu=profile===CLOUD_DIAGNOSTIC_PROFILE?'NVIDIA RTX A5000':'NVIDIA L4';
 if(eligible.length!==1||eligible[0].id!==expectedGpu||typeof eligible[0].price?.serverless!=='number'||
  !Number.isFinite(eligible[0].price.serverless)||eligible[0].price.serverless<=0||eligible[0].price.serverless>0.75)
  throw Error('Song hardware or price differs from the reviewed cost profile');
}
