import {randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {readBody,AudioError} from './audio-validation';
import {assertActiveWorkerLease,type ActiveWorkerLease} from './cloud-capacity-lease';
import {capacityLease,capacityPermitHash,capacityWindowOpen,seedPermit,type CapacityPermit} from './cloud-capacity-permit';
import {gpuRevenueBalance,lockGpuFunding,runpodBalanceMicros} from './gpu-revenue';
import {assertProductionEndpoint,CLOUD_WORKER_IMAGE} from './cloud-production-profile';
import {hasReadySongWorker} from './cloud-readiness';

type Cycle={id:string;permit_id:string;endpoint:string;image:string;starts_at:bigint;expires_at:bigint;cap_micros:bigint;state:string;ready_at:bigint|null;busy_at:bigint|null;reason:string|null};
export type CapacityState='off'|'preparing'|'ready'|'stopping'|'unavailable';
export type CapacityProvider={endpoint:()=>Promise<any>;catalog:()=>Promise<any>;health:()=>Promise<any>;setWorkers:(count:0|1)=>Promise<any>;balanceMicros?:()=>Promise<number>};
class CapacityProviderError extends Error{
 constructor(readonly operation:'endpoint'|'catalog'|'health'|'activate'|'stop',readonly kind:'http'|'timeout'|'transport'|'response',readonly status?:number){super('Capacity provider unavailable');}
}
// Never log raw provider/database messages: they can contain URLs or credentials.
export function capacityFailureDiagnostic(error:unknown){
 if(error instanceof CapacityProviderError)return {source:'provider',operation:error.operation,kind:error.kind,...(error.status===undefined?{}:{status:error.status})};
 const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
 if(typeof code==='string'&&['08000','08003','08006','08001','08004','40001','40P01','53300','53400','57014','57P01','57P02','57P03','ECONNRESET','ECONNREFUSED','ETIMEDOUT','EPIPE','ENOTFOUND','EAI_AGAIN'].includes(code))return {source:'database-or-network',code};
 return {source:'unknown'};
}
export function capacityProvider(key:string,endpoint:string,request:typeof fetch=fetch):CapacityProvider{
 async function api(url:string,operation:CapacityProviderError['operation'],count?:0|1){
  // Both GET attempts share the original deadline. Mutations are never retried.
  const signal=AbortSignal.timeout(8000);
  for(let attempt=0;;attempt++){
   let response:Response;
   try{response=await request(url,{method:count===undefined?'GET':'PATCH',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    ...(count===undefined?{}:{body:JSON.stringify({workers:{min:count,max:count}})}),redirect:'error',signal});}
   catch{
    if(count===undefined&&attempt===0&&!signal.aborted)continue;
    throw new CapacityProviderError(operation,signal.aborted?'timeout':'transport');
   }
   if(!response.ok){
    await response.body?.cancel().catch(()=>{});
    if(count===undefined&&attempt===0&&!signal.aborted&&[502,503,504].includes(response.status))continue;
    throw new CapacityProviderError(operation,'http',response.status);
   }
   try{return JSON.parse((await readBody(response.body,1024*1024)).toString());}
   catch{throw new CapacityProviderError(operation,signal.aborted?'timeout':'response');}
  }
 }
 return {endpoint:()=>api('https://api.runpod.io/v2/serverless/'+endpoint,'endpoint'),catalog:()=>api('https://api.runpod.io/v2/catalog/gpus','catalog'),
  health:()=>api('https://api.runpod.ai/v2/'+endpoint+'/health','health'),setWorkers:n=>api('https://api.runpod.io/v2/serverless/'+endpoint,n?'activate':'stop',n),balanceMicros:()=>runpodBalanceMicros(key,request)};
}
const lease=(r:Cycle):ActiveWorkerLease=>({startsAt:Number(r.starts_at),expiresAt:Number(r.expires_at),maxMicros:Number(r.cap_micros)});
const empty=(h:any)=>h?.jobs?.inQueue===0&&h?.jobs?.inProgress===0&&h.workers&&
 ['idle','ready','running','initializing','throttled','unhealthy'].every(k=>h.workers[k]===0);

// Explicit prepare is the only start operation. Reads and recovery never start
// or renew capacity; every process uses the same durable endpoint/permit ledger.
export class CloudCapacity{
 constructor(readonly pool:Pool,readonly endpoint:string,readonly profile:string,readonly permit:CapacityPermit,
  readonly provider:CapacityProvider,readonly clock=Date.now){}
 private async lock<T>(run:(db:PoolClient)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['jamloom-capacity:'+this.endpoint]);
   const result=await run(db);await db.query('COMMIT');return result;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 private async current(db:Pool|PoolClient=this.pool):Promise<Cycle|undefined>{
  return (await db.query("SELECT * FROM cloud_capacity_cycles WHERE endpoint=$1 AND state<>'stopped'",[this.endpoint])).rows[0];
 }
 private identity(e:any,image=CLOUD_WORKER_IMAGE){if(e?.id!==this.endpoint||e?.image!==image)throw Error('Capacity identity changed');}
 private permitOpen(now=this.clock()){
  if(!capacityWindowOpen(this.permit,now))throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
 }
 private async guarded(db:Pool|PoolClient=this.pool){
  const r=(await db.query('SELECT * FROM cloud_capacity_guardians WHERE endpoint=$1',[this.endpoint])).rows[0];
  return !!r&&r.config_sha256===capacityPermitHash(this.permit,this.endpoint,this.profile,CLOUD_WORKER_IMAGE)&&
   Number(r.checked_at)<=this.clock()&&this.clock()-Number(r.checked_at)<90000;
 }
 // Only the separately supervised shutdown process calls this after a successful sweep.
 async guardianHeartbeat(){
  await this.pool.query(`INSERT INTO cloud_capacity_guardians(endpoint,config_sha256,checked_at) VALUES($1,$2,$3)
   ON CONFLICT(endpoint) DO UPDATE SET config_sha256=excluded.config_sha256,checked_at=excluded.checked_at`,
   [this.endpoint,capacityPermitHash(this.permit,this.endpoint,this.profile,CLOUD_WORKER_IMAGE),this.clock()]);
 }
 async state():Promise<CapacityState>{
  const r=await this.current();if(!r)return 'off';
  if(r.permit_id!==this.permit.id||this.clock()>=Number(r.expires_at)||!capacityWindowOpen(this.permit,this.clock()))return 'unavailable';
  return r.state==='ready'?'ready':r.state==='starting'?'preparing':'stopping';
 }
 async ready(remainingMs:number){
  try{
   this.permitOpen();const r=await this.current();if(!r||r.permit_id!==this.permit.id||r.state!=='ready'||!await this.guarded())return false;
   assertActiveWorkerLease(lease(r),this.clock(),remainingMs);
   const e=await this.provider.endpoint();this.identity(e);
   assertProductionEndpoint(e,await this.provider.catalog(),lease(r),this.profile,this.clock());
   return hasReadySongWorker(await this.provider.health());
  }catch{return false;}
 }
 // Called while the generation transaction holds the endpoint lock, preventing
 // an idle shutdown from racing the durable song admission.
 async assertAdmission(db:PoolClient,remainingMs:number){
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['jamloom-capacity:'+this.endpoint]);
  this.permitOpen();const r=await this.current(db);
  if(!r||r.permit_id!==this.permit.id||r.state!=='ready'||!await this.guarded(db))throw new AudioError('Song preparation is not ready. Your credits have not been used.',503);
  try{assertActiveWorkerLease(lease(r),this.clock(),remainingMs);}catch{throw new AudioError('Song preparation has expired. Your credits have not been used.',503);}
  await db.query('UPDATE cloud_capacity_cycles SET busy_at=$2 WHERE id=$1',[r.id,this.clock()]);
 }
 async prepare(owner:string,review?:{enabled:boolean;expiresAt:number;owners:readonly string[]}):Promise<CapacityState>{
  this.permitOpen();let created:Cycle|undefined;
  const state=await this.lock(async db=>{
   const existing=await this.current(db);
   if(existing){
    if(existing.permit_id!==this.permit.id)return 'unavailable';
    if(existing.state==='stopping')return 'stopping';
    if(!await this.guarded(db))throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
    try{assertActiveWorkerLease(lease(existing),this.clock(),120000);}catch{return 'unavailable';}
    // A deliberate warm join gets the same upload window as a new session.
    // Polls never keep workers alive, and the original funded expiry is fixed.
    if(existing.state==='ready')await db.query('UPDATE cloud_capacity_cycles SET busy_at=$2 WHERE id=$1',[existing.id,this.clock()]);
    return existing.state==='ready'?'ready':'preparing';
   }
   const now=this.clock(),p=this.permit,next=capacityLease(p,now);
   if(!await this.guarded(db))throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
   if(!capacityWindowOpen(p,now,p.cycleSeconds*1000))throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
   const recent=await db.query('SELECT 1 FROM cloud_capacity_cycles WHERE owner_id=$1 AND starts_at>$2 LIMIT 1',[owner,now-86400000]);
   // Only trusted server review configuration relaxes the per-owner daily limit.
   // Every new cycle still reserves the full cost under the same finite permit.
   const fundedReviewer=review?.enabled===true&&review.expiresAt>now&&review.owners.includes(owner);
   if(recent.rowCount&&!fundedReviewer)throw new AudioError('You have already prepared song creation today. Please try again later.',429);
   const before=await this.provider.endpoint();this.identity(before);
   if(before.workers?.min!==0||before.workers?.max!==0||!empty(await this.provider.health()))throw Error('Capacity is not independently disabled');
   assertProductionEndpoint({...before,workers:{min:1,max:1}},await this.provider.catalog(),next,this.profile,now);
   if((await db.query("SELECT 1 FROM cloud_song_runs c JOIN dna_song_jobs d ON c.id=d.id WHERE c.endpoint=$1 AND d.state IN ('queued','running') LIMIT 1",[this.endpoint])).rowCount)throw Error('Songs still pending');
   const sha=capacityPermitHash(seedPermit(p),this.endpoint,this.profile,CLOUD_WORKER_IMAGE);
   await db.query('INSERT INTO cloud_capacity_permits(id,config_sha256,cap_micros,config,profile) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[p.id,sha,p.capMicros,JSON.stringify(seedPermit(p)),this.profile]);
   const grant=(await db.query('SELECT * FROM cloud_capacity_permits WHERE id=$1 FOR UPDATE',[p.id])).rows[0];
   if(grant.config_sha256!==sha)throw Error('Capacity permit was changed after use');
   const seedFunded=next.expiresAt<=p.expiresAt&&Number(grant.reserved_micros)+p.cycleMicros<=p.capMicros;
   if(p.revenueShareBps===2000){
    // An internal allocation cannot fund an empty provider account. Read actual
    // prepaid balance before every activation; this never tops up a card.
    const balance=await this.provider.balanceMicros?.();
    if(balance===undefined||!Number.isSafeInteger(balance)||balance<p.cycleMicros)throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
    await db.query(`INSERT INTO gpu_provider_funding(endpoint,balance_micros,checked_at) VALUES($1,$2,$3)
     ON CONFLICT(endpoint) DO UPDATE SET balance_micros=excluded.balance_micros,checked_at=excluded.checked_at`,[this.endpoint,balance,now]);
   }
   if(!seedFunded){
    if(p.revenueShareBps!==2000)throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
    await lockGpuFunding(db);
    if(await gpuRevenueBalance(db)<p.cycleMicros)throw new AudioError('Song preparation is currently unavailable. Your credits have not been used.',503);
   }else await db.query('UPDATE cloud_capacity_permits SET reserved_micros=reserved_micros+$2 WHERE id=$1',[p.id,p.cycleMicros]);
   created=(await db.query(`INSERT INTO cloud_capacity_cycles(id,permit_id,endpoint,image,owner_id,starts_at,expires_at,cap_micros,state)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,'starting') RETURNING *`,[randomUUID(),p.id,this.endpoint,CLOUD_WORKER_IMAGE,owner,now,next.expiresAt,p.cycleMicros])).rows[0];
   if(!seedFunded)await db.query('INSERT INTO gpu_revenue_reservations(cycle_id,micros) VALUES($1,$2)',[created!.id,p.cycleMicros]);
   return 'preparing' as const;
  });
  if(created){
   // Intent and the full cost reservation are committed BEFORE this one PATCH.
   // A lost response is never retried as an activation; recovery only stops it.
   try{
    assertActiveWorkerLease(lease(created),this.clock(),120000);
    const activated=await this.provider.setWorkers(1);this.identity(activated);
    if(activated.workers?.min!==1||activated.workers?.max!==1)throw Error('Capacity activation unconfirmed');
   }catch{
    await this.pool.query("UPDATE cloud_capacity_cycles SET state='stopping',reason='activation-unconfirmed' WHERE id=$1",[created.id]);
    await this.reconcile();return 'stopping';
   }
  }
  return state;
 }
 async reconcile(guardian=false,shutdownOnly=false):Promise<{state:CapacityState;reason?:string}>{
  return this.lock(async db=>{
   const r=await this.current(db);
   if(!r){
    // A healthy database with no activation record is not proof the provider is
    // off. Only the independent stop-only guardian checks this orphan case.
    if(guardian){const stopped=await emergencyCapacityStop(this.endpoint,this.provider);if(stopped.state!=='off')throw Error('Unrecorded capacity shutdown unconfirmed');return stopped;}
    return {state:'off' as CapacityState};
   }
   const now=this.clock(),e=await this.provider.endpoint();this.identity(e,r.image);
   const h=await this.provider.health();
   const busy=(await db.query("SELECT 1 FROM cloud_song_runs c JOIN dna_song_jobs d ON c.id=d.id WHERE c.endpoint=$1 AND d.state IN ('queued','running') LIMIT 1",[this.endpoint])).rowCount||h.jobs?.inQueue>0||h.jobs?.inProgress>0;
   // A provider can briefly report running before replacing/reinitializing a
   // worker. Unusable capacity is preparation, not customer idle time. Retain
   // the original startup deadline so flapping cannot extend the allowance.
   if(r.state==='ready'&&!busy&&!hasReadySongWorker(h)){
    await db.query("UPDATE cloud_capacity_cycles SET state='starting',ready_at=NULL,busy_at=NULL WHERE id=$1",[r.id]);
    r.state='starting';r.ready_at=null;r.busy_at=null;
   }
   let reason:string|undefined;
   if(shutdownOnly)reason='configuration-removed';
   else if(r.permit_id!==this.permit.id||!capacityWindowOpen(this.permit,now)||now>=Number(r.expires_at))reason='expired';
   else if(r.state==='stopping')reason='shutdown-pending';
   else if(!guardian&&!await this.guarded(db))reason='guardian-unavailable';
   else if(h.workers?.unhealthy>0)reason='unhealthy';
   else if(r.state==='starting'&&now-Number(r.starts_at)>=1200000)reason='startup-timeout';
   else if(e.workers?.min!==1||e.workers?.max!==1){
    if(now-Number(r.starts_at)<30000&&r.state==='starting')return {state:'preparing' as CapacityState};
    reason='activation-unconfirmed';
   }else if(r.state==='ready'&&!busy&&now-Number(r.busy_at??r.ready_at)>=120000)reason='idle';
   if(!reason){try{assertProductionEndpoint(e,await this.provider.catalog(),lease(r),this.profile,now);}
    catch{reason='profile-unconfirmed';}}
   if(reason){
    await db.query("UPDATE cloud_capacity_cycles SET state='stopping',reason=COALESCE(reason,$2) WHERE id=$1",[r.id,reason]);
    // Idempotent shutdown may repeat. Never turn a worker back on during recovery.
    if(e.workers?.min!==0||e.workers?.max!==0){const stopped=await this.provider.setWorkers(0);this.identity(stopped,r.image);
     if(stopped.workers?.min!==0||stopped.workers?.max!==0)throw Error('Capacity shutdown unconfirmed');}
    if(empty(await this.provider.health())){
     await db.query("UPDATE cloud_capacity_cycles SET state='stopped',stopped_at=$2 WHERE id=$1",[r.id,now]);
     return {state:'off' as CapacityState,reason};
    }
    return {state:'stopping' as CapacityState,reason};
   }
   if(r.state==='starting'&&hasReadySongWorker(h))await db.query("UPDATE cloud_capacity_cycles SET state='ready',ready_at=$2 WHERE id=$1",[r.id,now]);
   if(busy)await db.query('UPDATE cloud_capacity_cycles SET busy_at=$2 WHERE id=$1',[r.id,now]);
   return {state:(r.state==='ready'||hasReadySongWorker(h)?'ready':'preparing') as CapacityState};
  });
 }
}

// Configuration rollback cannot abandon a worker whose activation is recorded.
// This path only stops the exact endpoint/image in the durable ledger.
export async function stopOrphanedCapacity(pool:Pool,endpoint:string,provider:CapacityProvider,clock=Date.now){
 const r=(await pool.query(`SELECT p.config,p.profile FROM cloud_capacity_cycles c JOIN cloud_capacity_permits p ON p.id=c.permit_id
  WHERE c.endpoint=$1 AND c.state<>'stopped'`,[endpoint])).rows[0];
 if(!r)return {state:'off' as CapacityState};
 return new CloudCapacity(pool,endpoint,r.profile,r.config,provider,clock).reconcile(true,true);
}

// The independently configured guardian must still stop its exact worker when
// database access fails. This path cannot start capacity or modify another image.
export async function emergencyCapacityStop(endpoint:string,provider:CapacityProvider){
 const e=await provider.endpoint();
 if(e?.id!==endpoint||e?.image!==CLOUD_WORKER_IMAGE||![0,1].includes(e.workers?.min)||![0,1].includes(e.workers?.max))throw Error('Emergency capacity identity unconfirmed');
 if(e.workers.min!==0||e.workers.max!==0){
  const stopped=await provider.setWorkers(0);
  if(stopped?.id!==endpoint||stopped?.image!==CLOUD_WORKER_IMAGE||stopped.workers?.min!==0||stopped.workers?.max!==0)throw Error('Emergency shutdown unconfirmed');
 }
 return {state:(empty(await provider.health())?'off':'stopping') as CapacityState};
}
