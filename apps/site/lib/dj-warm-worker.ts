import {createHash,randomUUID} from 'node:crypto';
import type {DJSessions} from './dj-sessions';
import type {RentalProvider} from './vast-provider';
import {integer} from './economics';
import {validVocalCue,type VocalCue} from './dj-vocal';
import {AudioError} from './audio-validation';
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export type WarmPermit={billingLive?:boolean;account:number;instance:number;label:string;permitSha256:string;hourlyMicros:number;budgetMicros:number;startedAt:number;deadline:number};
export type WarmIdentity={id:string;lease:string};
// Rental lifetime belongs to the operator; only a completed, metered job slice reaches a customer wallet.
export class DJWarmWorker{
 constructor(readonly sessions:DJSessions,private provider:RentalProvider){}
 async register(p:WarmPermit):Promise<WarmIdentity>{
  if((p.billingLive??false)!==this.sessions.live)throw Error('Rental permit billing mode mismatch');
  for(const n of [p.account,p.instance,p.hourlyMicros,p.budgetMicros])integer(n,1);
  for(const n of [p.startedAt,p.deadline])integer(n,1,Number.MAX_SAFE_INTEGER);
  if(!/^jamloom-[a-z0-9-]{1,100}$/.test(p.label)||!/^[a-f0-9]{64}$/.test(p.permitSha256)||p.hourlyMicros>5000000||p.budgetMicros>6000000||p.startedAt>Date.now()||Date.now()-p.startedAt>2400000||p.deadline<=Date.now()+90000||p.deadline-p.startedAt>2400000||Math.ceil((p.deadline-p.startedAt)*p.hourlyMicros/3600000)>p.budgetMicros)throw Error('Invalid warm rental permit');
  const inventory=await this.provider.inventory(p.account);
  if(inventory.length!==1||inventory[0].id!==p.instance||inventory[0].label!==p.label)throw Error('Exactly one matching rental required');
  const db=await this.sessions.pool.connect();try{await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-generation-capacity',0))");
   const prior=(await db.query('SELECT * FROM dj_warm_workers WHERE permit_sha256=$1',[p.permitSha256])).rows[0];
   if(prior)throw Error('Permit already consumed; resume its recorded worker identity');
   if((await db.query("SELECT 1 FROM dj_warm_workers WHERE state<>'stopped' UNION ALL SELECT 1 FROM dj_session_batches WHERE state='running' UNION ALL SELECT 1 FROM generation_jobs WHERE state IN ('running','stopping') LIMIT 1")).rowCount)throw Error('Worker capacity occupied');
   const identity={id:randomUUID(),lease:randomUUID()};await db.query(`INSERT INTO dj_warm_workers(id,lease,account_id,instance_id,label,permit_sha256,hourly_micros,budget_micros,billing_live,created_at,deadline) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10/1000.0),to_timestamp($11/1000.0))`,[identity.id,identity.lease,p.account,p.instance,p.label,p.permitSha256,p.hourlyMicros,p.budgetMicros,this.sessions.live,p.startedAt,p.deadline]);await db.query('COMMIT');return identity;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async heartbeat(worker:WarmIdentity,observedMicros:number){
  integer(observedMicros);const row=(await this.sessions.pool.query(`UPDATE dj_warm_workers SET observed_micros=greatest(observed_micros,$3),heartbeat_at=now(),state=CASE WHEN $3>=budget_micros OR deadline<=now()+interval '30 seconds' THEN 'stopping' ELSE state END WHERE id=$1 AND lease=$2 AND billing_live=$4 AND state='ready' AND heartbeat_at>now()-interval '15 seconds' RETURNING state`,[worker.id,worker.lease,observedMicros,this.sessions.live])).rows[0];return row?.state==='ready';
 }
 async stop(worker:WarmIdentity){await this.sessions.pool.query("UPDATE dj_warm_workers SET state='stopping' WHERE id=$1 AND lease=$2 AND billing_live=$3 AND state='ready'",[worker.id,worker.lease,this.sessions.live]);}
 async pending(worker:WarmIdentity){
  const row=(await this.sessions.pool.query(`SELECT b.*,b.render_settings AS settings FROM dj_session_batches b JOIN dj_warm_workers w ON w.id=b.warm_worker_id WHERE w.id=$1 AND w.lease=$2 AND w.billing_live=$3 AND w.state='ready' AND w.heartbeat_at>now()-interval '15 seconds' AND w.deadline>now() AND w.observed_micros<w.budget_micros AND b.state='running' AND b.lease_until>now() AND b.deadline>now() LIMIT 1`,[worker.id,worker.lease,this.sessions.live])).rows[0];
  return row?{...row,seed:Number(row.seed)}:null;
 }
 async jobHeartbeat(worker:WarmIdentity,job:{session_id:string;sequence:number;lease:string}){
  // A customer Stop drains this bounded render; it must not kill another listener's worker.
  return !!(await this.sessions.pool.query(`UPDATE dj_session_batches b SET lease_until=least(now()+interval '15 seconds',b.deadline) FROM dj_warm_workers w WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND b.warm_worker_id=w.id AND w.id=$4 AND w.lease=$5 AND w.billing_live=$6 AND w.state='ready' AND w.heartbeat_at>now()-interval '15 seconds' AND w.deadline>now() AND w.observed_micros<w.budget_micros AND b.state='running' AND b.lease_until>now() AND b.deadline>now() RETURNING b.sequence`,[job.session_id,job.sequence,job.lease,worker.id,worker.lease,this.sessions.live])).rowCount;
 }
 async complete(worker:WarmIdentity,job:{session_id:string;sequence:number;lease:string},audio:Buffer,computeMs:number,receipt:unknown,vocal:VocalCue|null=null){
  if(vocal!==null&&!validVocalCue(vocal))throw Error('Invalid vocal cue');
  integer(computeMs,1,this.sessions.budget.maxRuntimeMs);const proof=digest({receipt,vocal});
  const prior=(await this.sessions.pool.query('SELECT b.* FROM dj_session_batches b JOIN dj_warm_workers w ON w.id=b.warm_worker_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND w.id=$4 AND w.lease=$5 AND w.billing_live=$6',[job.session_id,job.sequence,job.lease,worker.id,worker.lease,this.sessions.live])).rows[0];if(!prior)throw Error('Warm job identity mismatch');
  if(prior.stop_confirmed_at){if(prior.stop_evidence_sha256!==proof||prior.compute_ms!==computeMs)throw Error('Warm receipt changed');return this.sessions.finish(job.session_id,job.sequence,job.lease,prior.audio_sha256?'completed':'cancelled',Number(prior.actual_cost_micros),prior.audio_sha256?audio:undefined);}
  let cancelled=false;
  try{await this.sessions.stageOutput(job.session_id,job.sequence,job.lease,audio);}catch(error){
   if(!(error instanceof AudioError)||error.message!=='Worker no longer active.')throw error;
   cancelled=!!(await this.sessions.pool.query(`SELECT 1 FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND b.warm_worker_id=$4 AND b.state='running' AND b.deadline>now() AND b.lease_until>now() AND (s.state<>'active' OR b.stop_requested_at IS NOT NULL)`,[job.session_id,job.sequence,job.lease,worker.id])).rowCount;
   if(!cancelled)throw error;
  }
  const db=await this.sessions.pool.connect();let cost=0;
  try{await db.query('BEGIN');
   const w=(await db.query("SELECT * FROM dj_warm_workers WHERE id=$1 AND lease=$2 AND billing_live=$3 AND state='ready' AND heartbeat_at>now()-interval '15 seconds' AND deadline>now() FOR UPDATE",[worker.id,worker.lease,this.sessions.live])).rows[0];if(!w)throw Error('Warm worker no longer active');
   const b=(await db.query('SELECT * FROM dj_session_batches WHERE session_id=$1 AND sequence=$2 AND lease=$3 AND warm_worker_id=$4 FOR UPDATE',[job.session_id,job.sequence,job.lease,worker.id])).rows[0];if(!b)throw Error('Warm job identity mismatch');
   cost=Math.ceil(computeMs*Number(w.hourly_micros)/3600000);
   if(cost>this.sessions.budget.costCapMicros||computeMs>Date.now()-new Date(b.started_at).getTime()+1000)throw Error('Invalid compute meter');
   if(b.stop_confirmed_at){if(b.stop_evidence_sha256!==proof||b.compute_ms!==computeMs||Number(b.actual_cost_micros)!==cost)throw Error('Warm receipt changed');}
   else{await db.query('UPDATE dj_session_batches SET compute_ms=$4,actual_cost_micros=$5,stop_confirmed_at=now(),stop_evidence_sha256=$6,vocal=$7::jsonb WHERE session_id=$1 AND sequence=$2 AND lease=$3',[job.session_id,job.sequence,job.lease,computeMs,cost,proof,vocal===null?null:JSON.stringify(vocal)]);await db.query('UPDATE dj_warm_workers SET allocated_micros=allocated_micros+$2 WHERE id=$1',[worker.id,cost]);}
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  return this.sessions.finish(job.session_id,job.sequence,job.lease,cancelled?'cancelled':'completed',cost,cancelled?undefined:audio);
 }
 async sweep(){
  await this.sessions.shutdownRequired();
  await this.sessions.pool.query(`UPDATE dj_warm_workers w SET state='stopping' WHERE billing_live=$1 AND state='ready' AND (heartbeat_at<=now()-interval '15 seconds' OR deadline<=now()+interval '30 seconds' OR observed_micros>=budget_micros OR EXISTS(SELECT 1 FROM dj_session_batches b WHERE b.warm_worker_id=w.id AND b.state='running' AND b.stop_confirmed_at IS NULL AND (b.lease_until<=now() OR b.deadline<=now())))`,[this.sessions.live]);
  const workers=(await this.sessions.pool.query("SELECT w.* FROM dj_warm_workers w WHERE billing_live=$1 AND (state='stopping' OR state='stopped' AND EXISTS(SELECT 1 FROM dj_session_batches b WHERE b.warm_worker_id=w.id AND b.state='running'))",[this.sessions.live])).rows,results=[];
  for(const w of workers){
   const inventory=await this.provider.inventory(Number(w.account_id)),matches=inventory.filter(i=>i.id===Number(w.instance_id)||i.label===w.label);
   if(matches.length>1||matches.length===1&&(matches[0].id!==Number(w.instance_id)||matches[0].label!==w.label)){results.push({id:w.id,status:'identity_conflict'});continue;}
   if(matches.length){await this.sessions.pool.query('UPDATE dj_warm_workers SET destroy_requested_at=coalesce(destroy_requested_at,now()) WHERE id=$1',[w.id]);await this.provider.destroy(Number(w.instance_id));results.push({id:w.id,status:'destroy_requested'});continue;}
   const proof=digest({account:Number(w.account_id),instance:Number(w.instance_id),label:w.label,completeInventory:inventory});
   await this.sessions.pool.query("UPDATE dj_warm_workers SET state='stopped',destroy_confirmed_at=now(),shutdown_sha256=$2 WHERE id=$1",[w.id,proof]);
   // Unacknowledged/failed work is refunded after confirmed absence; the operator bears its cost.
   const jobs=(await this.sessions.pool.query("UPDATE dj_session_batches SET compute_ms=coalesce(compute_ms,0),actual_cost_micros=coalesce(actual_cost_micros,0),stop_confirmed_at=coalesce(stop_confirmed_at,now()),stop_evidence_sha256=coalesce(stop_evidence_sha256,$2) WHERE warm_worker_id=$1 AND state='running' RETURNING *",[w.id,proof])).rows;
   for(const b of jobs){const delivered=b.audio_sha256&&b.compute_ms>0;const audio=delivered?await this.sessions.store.get('masters/'+b.reservation_id+'.wav',Number(b.audio_bytes)):undefined;await this.sessions.finish(b.session_id,b.sequence,b.lease,delivered?'completed':'failed',Number(b.actual_cost_micros),audio);}
   results.push({id:w.id,status:'shutdown_confirmed'});
  }
  await this.sessions.reconcile();return results;
 }
}
