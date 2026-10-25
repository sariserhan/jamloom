import {createHash,createHmac,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {integer} from './economics';
import {isDeepStrictEqual} from 'node:util';
import {Wallet,type JobBudget} from './wallet';
import {signQuote,verifyQuote} from './generation-quote';
import {AudioError,validateWav} from './audio-validation';
import type {AudioStore} from './audio-store';
import {djSessionInput,type DJSessionInput} from './dj-session-input';
export type DJBudget=Omit<JobBudget,'inputSha256'|'planSha256'>&{costCapMicros:number};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const idCheck=(id:string)=>{if(!/^[a-f0-9]{32}$/.test(id))throw new AudioError('Invalid session.');};
const closed=(s:string)=>['completed','failed','cancelled'].includes(s);
// Dispatch is internal and separately gated from customer session APIs.
export class DJSessions{
 readonly wallet:Wallet;
 constructor(readonly pool:Pool,private secret:string,readonly store:AudioStore,readonly budget:DJBudget,readonly live=false,readonly allowance=false){integer(budget.maxRuntimeMs,1,900000);integer(budget.hourlyMicros,1,5000000);integer(budget.fixedCostMicros);integer(budget.costCapMicros,1,5000000);if(budget.fixedCostMicros+Math.ceil(budget.hourlyMicros*budget.maxRuntimeMs/3600000)>budget.costCapMicros)throw Error('DJ budget exceeds its reserved cap');this.wallet=new Wallet(pool,live,allowance);}
 async available(){return !!(await this.pool.query("SELECT 1 FROM dj_warm_workers WHERE billing_live=$1 AND state='ready' AND heartbeat_at>now()-interval '15 seconds' AND deadline>now()+$2*interval '1 millisecond' AND hourly_micros<=$3 AND observed_micros<budget_micros LIMIT 1",[this.live,this.budget.maxRuntimeMs+30000,this.budget.hourlyMicros])).rowCount;}
 private async atomic<T>(run:(db:PoolClient)=>Promise<T>){const db=await this.pool.connect();try{await db.query('BEGIN');const result=await run(db);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 private async session(owner:string,id:string,db:Pool|PoolClient=this.pool,lock=false){idCheck(id);const r=(await db.query(`SELECT * FROM dj_sessions WHERE id=$1 AND owner_id=$2 AND billing_live=$3${lock?' FOR UPDATE':''}`,[id,owner,this.live])).rows[0];if(!r)throw new AudioError('Session not found.',404);return r;}
 private job(input:DJSessionInput){const {costCapMicros,...budget}=this.budget;return {...budget,inputSha256:hash(input),planSha256:hash([this.allowance?'ai-dj-allowance-1':'ai-dj-session-1',this.budget,this.live])};}
 async quote(owner:string,value:unknown){const input=djSessionInput(value),price=await this.wallet.quote(owner,this.budget.costCapMicros,5000,input.visibility),expiresAt=Date.now()+300000;return {...price,expiresAt,token:signQuote({version:1,owner,expiresAt,...price,job:this.job(input)},this.secret)};}
 async start(owner:string,value:unknown,token:string){
  const input=djSessionInput(value),fingerprint=hash([input,this.budget,this.live,...(this.allowance?['allowance-1']:[])]);
  const prior=(await this.pool.query('SELECT s.fingerprint,b.reservation_id FROM dj_sessions s JOIN dj_session_batches b ON b.session_id=s.id AND b.sequence=0 WHERE s.id=$1 AND s.owner_id=$2 AND s.billing_live=$3',[input.id,owner,this.live])).rows[0];
  if(prior){if(prior.fingerprint!==fingerprint)throw new AudioError('Your session choices changed.',409);return {id:input.id,reservation:prior.reservation_id};}
  const q=verifyQuote(token,owner,this.secret);
  if(q.visibility!==input.visibility||q.costCapMicros!==this.budget.costCapMicros||!!q.djAllowance!==this.allowance||hash(q.job)!==hash(this.job(input)))throw new AudioError('Your session choices changed. Get a new quote.',409);
  const id=await this.wallet.reserve(owner,'dj_'+input.id+'_0',q.costCapMicros,q.marginBps,undefined,input.visibility,q.credits,{fingerprint,minAllowancePer10kCredits:q.djAllowance?.minMicrosPer10kCredits,save:async(db,reservation)=>{
   if(!(await db.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended',[owner])).rowCount)throw new AudioError('Verified sign-in required.',401);
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-generation-capacity',0))");
   const worker=(await db.query("SELECT * FROM dj_warm_workers WHERE state<>'stopped' FOR SHARE")).rows[0];
   if(worker||!this.store.local){
    if(!worker||worker.billing_live!==this.live||worker.state!=='ready'||Date.now()-new Date(worker.heartbeat_at).getTime()>15000||new Date(worker.deadline).getTime()-Date.now()<this.budget.maxRuntimeMs+30000||Number(worker.hourly_micros)>this.budget.hourlyMicros||Number(worker.observed_micros)>=Number(worker.budget_micros))throw new AudioError('The DJ is warming up. Please try again shortly.',503);
    // shortcut: two listeners per experimental worker; expand only after a measured concurrency qualification.
    if(Number((await db.query("SELECT count(*) FROM dj_sessions WHERE state='active' AND heartbeat_at>now()-interval '75 seconds'")).rows[0].count)>=2)throw new AudioError('All DJ slots are in use. Please try again shortly; no credits were charged.',503);
   }
   if((await db.query("SELECT 1 FROM dj_sessions WHERE owner_id=$1 AND state='active' AND heartbeat_at>now()-interval '75 seconds'",[owner])).rowCount)throw new AudioError('Finish your current set before starting another.',409);
   await db.query('INSERT INTO dj_sessions(id,owner_id,title,visibility,settings,budget,max_credits,billing_live,fingerprint,allowance_billing,min_allowance_per_10k_credits) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[input.id,owner,input.title,input.visibility,JSON.stringify({style:input.style,energy:input.energy,...(input.mood?{mood:input.mood}:{})}),JSON.stringify(this.budget),q.djAllowance?.maxCredits??q.credits,this.live,fingerprint,this.allowance,q.djAllowance?.minMicrosPer10kCredits??0]);
   await this.insertBatch(db,owner,input.id,0,reservation);
  }});return {id:input.id,reservation:id};
 }
 private seed(owner:string,id:string,sequence:number){return createHmac('sha256',this.secret).update(JSON.stringify(['dj-seed-1',owner,id,sequence])).digest().readUInt32BE(0);}
 private async insertBatch(db:PoolClient,owner:string,id:string,sequence:number,reservation:string){await db.query('INSERT INTO dj_session_batches(session_id,sequence,reservation_id,seed,render_settings) SELECT $1,$2,$3,$4,settings FROM dj_sessions WHERE id=$1',[id,sequence,reservation,this.seed(owner,id,sequence)]);}
 async status(owner:string,id:string){const s=await this.session(owner,id);const batches=(await this.pool.query(`SELECT b.sequence,b.state,b.played_at,b.audio_sha256,b.vocal,(r.status='completed') AS ready FROM dj_session_batches b JOIN generation_reservations r ON r.id=b.reservation_id WHERE b.session_id=$1 ORDER BY b.sequence DESC LIMIT 3`,[id])).rows;return {id,title:s.title,visibility:s.visibility,settings:s.settings,state:s.state,endReason:s.end_reason,maxCredits:s.max_credits,batches};}
 async heartbeat(owner:string,id:string){await this.session(owner,id);await this.pool.query("UPDATE dj_sessions SET heartbeat_at=now() WHERE id=$1 AND state='active'",[id]);}
 async next(owner:string,id:string,sequence:number,energy?:number,vocals?:boolean,mood?:'warm'|'bright'|'deep'){
  if(mood!==undefined&&!['warm','bright','deep'].includes(mood))throw new AudioError('Invalid mood.');
  if(vocals!==undefined&&typeof vocals!=='boolean')throw new AudioError('Invalid vocal choice.');
  if(energy!==undefined&&(!Number.isInteger(energy)||energy<1||energy>5))throw new AudioError('Invalid energy.');
  const s=await this.session(owner,id);if(!Number.isSafeInteger(sequence)||sequence<1||sequence>1000000)throw new AudioError('Invalid sequence.');
  const prior=(await this.pool.query('SELECT reservation_id FROM dj_session_batches WHERE session_id=$1 AND sequence=$2',[id,sequence])).rows[0];if(prior)return {reservation:prior.reservation_id};
  if(s.state!=='active')throw new AudioError('Session is ending.',409);
  if(s.allowance_billing!==this.allowance||!isDeepStrictEqual(s.budget,this.budget)){await this.stop(owner,id,'price');return {ending:'price'};}
  let price;try{price=await this.wallet.quote(owner,this.budget.costCapMicros,5000,s.visibility);}catch(e){if(e instanceof Error&&e.message.startsWith('Insufficient credits')){await this.stop(owner,id,'credits');return {ending:'credits'};}throw e;}
  if(price.credits>s.max_credits||price.credits>0&&price.djAllowance&&price.djAllowance.minMicrosPer10kCredits<Number(s.min_allowance_per_10k_credits)){await this.stop(owner,id,'price');return {ending:'price'};}
  const reservation=await this.wallet.reserve(owner,'dj_'+id+'_'+sequence,price.costCapMicros,price.marginBps,undefined,s.visibility,price.credits,{fingerprint:hash([s.fingerprint,sequence]),minAllowancePer10kCredits:this.allowance?Number(s.min_allowance_per_10k_credits):undefined,save:async(db,r)=>{
   const current=await this.session(owner,id,db,true);
   if(current.state!=='active'||Date.now()-new Date(current.heartbeat_at).getTime()>75000)throw new AudioError('Session stopped or disconnected.',409);
   const rows=(await db.query('SELECT sequence,state,played_at FROM dj_session_batches WHERE session_id=$1 ORDER BY sequence DESC LIMIT 3',[id])).rows;
   if(rows[0]?.sequence!==sequence-1||rows.some(b=>!closed(b.state))||rows.filter(b=>b.state==='completed'&&!b.played_at).length>=2)throw new AudioError('Prepared music is still waiting to play.',409);
   if(energy!==undefined)await db.query("UPDATE dj_sessions SET settings=jsonb_set(settings,'{energy}',$2::jsonb) WHERE id=$1",[id,JSON.stringify(energy)]);
   if(vocals!==undefined)await db.query("UPDATE dj_sessions SET settings=jsonb_set(settings,'{vocals}',$2::jsonb) WHERE id=$1",[id,JSON.stringify(vocals)]);
   if(mood!==undefined)await db.query("UPDATE dj_sessions SET settings=jsonb_set(settings,'{mood}',$2::jsonb) WHERE id=$1",[id,JSON.stringify(mood)]);
   await this.insertBatch(db,owner,id,sequence,r);
  }});return {reservation};
 }
 // Internal worker boundary only. There is no browser route for claiming or settling work.
 async claim(warm?:{id:string;lease:string}){return this.atomic(async db=>{
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-generation-capacity',0))");
  const worker=(await db.query("SELECT * FROM dj_warm_workers WHERE state<>'stopped' FOR UPDATE")).rows[0];
  if(worker||warm){if(!worker||!warm||worker.id!==warm.id||worker.lease!==warm.lease||worker.state!=='ready'||worker.billing_live!==this.live||Date.now()-new Date(worker.heartbeat_at).getTime()>15000||new Date(worker.deadline).getTime()-Date.now()<this.budget.maxRuntimeMs+30000||Number(worker.observed_micros)>=Number(worker.budget_micros)||Number(worker.hourly_micros)>this.budget.hourlyMicros)return null;}
  if((await db.query("SELECT 1 FROM dj_session_batches WHERE state='running' UNION ALL SELECT 1 FROM generation_jobs WHERE state IN ('running','stopping') LIMIT 1")).rowCount)return null;
  const row=(await db.query(`SELECT b.*,s.owner_id,b.render_settings AS settings,s.visibility,s.budget FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id JOIN generation_reservations r ON r.id=b.reservation_id JOIN credit_wallets w ON w.owner_id=s.owner_id JOIN "user" u ON u.id=s.owner_id
   WHERE b.state='queued' AND s.state='active' AND s.billing_live=$1 AND s.budget=$2::jsonb AND s.heartbeat_at>now()-interval '75 seconds' AND NOT w.frozen AND NOT u.suspended AND r.status='reserved' ORDER BY b.created_at FOR UPDATE OF s,b SKIP LOCKED LIMIT 1`,[this.live,JSON.stringify(this.budget)])).rows[0];
  if(!row)return null;
  const runtime=row.budget.maxRuntimeMs;if(!Number.isSafeInteger(runtime)||runtime<1||runtime>900000)throw new AudioError('Invalid worker deadline.');
  const lease=randomUUID();await db.query("UPDATE dj_session_batches SET state='running',lease=$3,started_at=now(),deadline=now()+$4*interval '1 millisecond',lease_until=now()+least($4,15000)*interval '1 millisecond',warm_worker_id=$5 WHERE session_id=$1 AND sequence=$2",[row.session_id,row.sequence,lease,runtime,warm?.id??null]);return {...row,seed:Number(row.seed),lease,warm_worker_id:warm?.id??null};
 });}
 async stageOutput(id:string,sequence:number,lease:string,audio:Buffer){
  const sha=createHash('sha256').update(audio).digest('hex');if(validateWav(audio,audio.length,sha)!==60000)throw new AudioError('Expected a complete track.');
  await this.atomic(async db=>{
   const b=(await db.query(`SELECT b.* FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND b.state='running' AND s.state='active' AND s.billing_live=$4 AND b.deadline>now() AND b.lease_until>now() FOR UPDATE OF b,s`,[id,sequence,lease,this.live])).rows[0];if(!b||b.stop_requested_at&&!b.audio_sha256)throw new AudioError('Worker no longer active.',409);
   if(b.audio_sha256){if(b.audio_sha256!==sha)throw new AudioError('Worker output changed.',409);return;}
   if((await db.query('SELECT 1 FROM dj_session_batches WHERE audio_sha256=$1',[sha])).rowCount)throw new AudioError('Repeated generated audio is not accepted.',422);
   const key='masters/'+b.reservation_id+'.wav';await this.store.put(key,audio);if(createHash('sha256').update(await this.store.get(key,audio.length)).digest('hex')!==sha)throw Error('Stored output changed');
   await db.query('UPDATE dj_session_batches SET audio_sha256=$3,audio_bytes=$4,stop_requested_at=CASE WHEN warm_worker_id IS NULL THEN now() ELSE stop_requested_at END WHERE session_id=$1 AND sequence=$2',[id,sequence,sha,audio.length]);
  });
 }
 async workerHeartbeat(id:string,sequence:number,lease:string){return !!(await this.pool.query(`UPDATE dj_session_batches b SET lease_until=least(now()+interval '15 seconds',deadline) FROM dj_sessions s WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND b.state='running' AND b.stop_requested_at IS NULL AND b.lease_until>now() AND b.deadline>now() AND s.id=b.session_id AND s.state='active' AND s.billing_live=$4 AND s.heartbeat_at>now()-interval '75 seconds' RETURNING b.sequence`,[id,sequence,lease,this.live])).rowCount;}
 async shutdownRequired(){
  await this.expire();
  return (await this.pool.query(`UPDATE dj_session_batches b SET stop_requested_at=coalesce(stop_requested_at,now()) FROM dj_sessions s JOIN "user" u ON u.id=s.owner_id JOIN credit_wallets w ON w.owner_id=s.owner_id WHERE b.session_id=s.id AND s.billing_live=$1 AND b.state='running' AND (s.state<>'active' OR u.suspended OR w.frozen OR b.lease_until IS NULL OR b.lease_until<=now() OR b.deadline<=now()) RETURNING b.reservation_id,b.session_id,b.sequence`,[this.live])).rows;
 }
 async localStopped(id:string,sequence:number,lease:string,evidence:string){
  if(!this.store.local||this.live||!/^[a-f0-9]{64}$/.test(evidence))throw new AudioError('Local shutdown evidence required.');
  const result=await this.pool.query(`UPDATE dj_session_batches b SET stop_confirmed_at=coalesce(stop_confirmed_at,now()),stop_evidence_sha256=$4 FROM dj_sessions s WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND s.id=b.session_id AND s.billing_live=$5 AND b.warm_worker_id IS NULL AND (b.stop_evidence_sha256 IS NULL OR b.stop_evidence_sha256=$4) AND NOT EXISTS(SELECT 1 FROM dj_rentals r WHERE r.reservation_id=b.reservation_id) RETURNING b.sequence`,[id,sequence,lease,evidence,this.live]);if(!result.rowCount)throw new AudioError('Shutdown receipt conflicts.',409);
 }
 async reconcile(){
  const rows=(await this.pool.query(`SELECT b.*,s.owner_id FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE s.billing_live=$1 AND b.state IN ('completed','failed','cancelled') AND b.actual_cost_micros IS NOT NULL AND (b.lease IS NULL OR b.stop_confirmed_at IS NOT NULL) AND b.settled_at IS NULL LIMIT 100`,[this.live])).rows;
  for(const b of rows){await this.wallet.settle(b.owner_id,b.reservation_id,Number(b.actual_cost_micros),b.state);await this.pool.query('UPDATE dj_session_batches SET settled_at=now() WHERE reservation_id=$1',[b.reservation_id]);await this.closeIfSettled(b.session_id);}return rows.length;
 }
 async audio(owner:string,id:string,sequence:number){
  await this.session(owner,id);if(!Number.isSafeInteger(sequence)||sequence<0)throw new AudioError('Invalid sequence.');
  const row=(await this.pool.query(`SELECT b.reservation_id,b.audio_sha256,b.audio_bytes FROM dj_session_batches b JOIN generation_reservations r ON r.id=b.reservation_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.state='completed' AND r.status='completed'`,[id,sequence])).rows[0];if(!row)throw new AudioError('Track is not ready.',409);
  const bytes=await this.store.get('masters/'+row.reservation_id+'.wav',Number(row.audio_bytes));if(createHash('sha256').update(bytes).digest('hex')!==row.audio_sha256)throw new AudioError('Stored music could not be verified.',503);return bytes;
 }
// shortcut: fixed 60-second batches; qualify variable duration with the rolling renderer.
 async finish(id:string,sequence:number,lease:string,state:'completed'|'failed'|'cancelled',actualCost:number,audio?:Buffer){
  idCheck(id);if(!['completed','failed','cancelled'].includes(state)||!Number.isSafeInteger(actualCost)||actualCost<0)throw new AudioError('Invalid worker receipt.');
  const receipt=await this.atomic(async db=>{
   const s=(await db.query('SELECT * FROM dj_sessions WHERE id=$1 AND billing_live=$2 FOR UPDATE',[id,this.live])).rows[0];if(!s)throw new AudioError('Invalid worker lease.',403);
   const b=(await db.query('SELECT b.*,r.cost_cap_micros FROM dj_session_batches b JOIN generation_reservations r ON r.id=b.reservation_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 FOR UPDATE OF b',[id,sequence,lease])).rows[0];if(!b)throw new AudioError('Invalid worker lease.',403);
   if(!b.stop_confirmed_at)throw new AudioError('Worker shutdown must be confirmed.',409);
   if(b.warm_worker_id){
    const worker=(await db.query('SELECT * FROM dj_warm_workers WHERE id=$1',[b.warm_worker_id])).rows[0];
    if(!worker||b.compute_ms===null||!b.stop_evidence_sha256||Number(b.actual_cost_micros)!==actualCost||(!b.audio_sha256&&worker.state!=='stopped'&&b.compute_ms<=0))throw new AudioError('Warm worker receipt required.',409);
   }
   const rental=(await db.query('SELECT * FROM dj_rentals WHERE reservation_id=$1',[b.reservation_id])).rows[0];
   if(rental&&(!rental.destroy_confirmed_at||rental.final_cost_micros===null||Number(rental.final_cost_micros)!==actualCost))throw new AudioError('Provider shutdown and cost evidence required.',409);
   if(actualCost>Number(b.cost_cap_micros))throw new AudioError('Worker cost exceeds its reservation.');
   const account=(await db.query('SELECT u.suspended,w.frozen FROM "user" u JOIN credit_wallets w ON w.owner_id=u.id WHERE u.id=$1',[s.owner_id])).rows[0];
   const finalState=closed(b.state)?b.state:s.state==='active'&&(!b.stop_requested_at||b.audio_sha256)&&!account.suspended&&!account.frozen?state:state==='completed'?'cancelled':state;
   let sha:string|null=null;if(finalState==='completed'){
    if(!audio||state!=='completed')throw new AudioError('Verified audio is required.');sha=createHash('sha256').update(audio).digest('hex');if(validateWav(audio,audio.length,sha)!==60000)throw new AudioError('Expected a complete 60-second track.');
   }
   if(closed(b.state)){
    if(Number(b.actual_cost_micros)!==actualCost||b.audio_sha256!==sha||state!==b.state&&!(b.state==='cancelled'&&state==='completed'))throw new AudioError('Worker receipt changed.',409);
   }else{
    if(sha){
     if((await db.query('SELECT 1 FROM dj_session_batches WHERE audio_sha256=$1 AND reservation_id<>$2',[sha,b.reservation_id])).rowCount)throw new AudioError('Repeated generated audio is not accepted.',422);
     if(b.audio_sha256&&b.audio_sha256!==sha)throw new AudioError('Worker output changed.',409);
     await this.store.put('masters/'+b.reservation_id+'.wav',audio!);if(createHash('sha256').update(await this.store.get('masters/'+b.reservation_id+'.wav',audio!.length)).digest('hex')!==sha)throw Error('Stored track changed');
    }
    await db.query('UPDATE dj_session_batches SET state=$3,actual_cost_micros=$4,audio_sha256=$5,audio_bytes=$6 WHERE session_id=$1 AND sequence=$2',[id,sequence,finalState,actualCost,sha,sha?audio!.length:null]);
   }
   return {owner:s.owner_id,reservation:b.reservation_id,state:finalState};
  });
  await this.wallet.settle(receipt.owner,receipt.reservation,actualCost,receipt.state);
  await this.pool.query('UPDATE dj_session_batches SET settled_at=now() WHERE reservation_id=$1',[receipt.reservation]);
  if(receipt.state!=='completed'){await this.store.remove('masters/'+receipt.reservation+'.wav');await this.stop(receipt.owner,id,'failure');}
  await this.closeIfSettled(id);return receipt.state as 'completed'|'failed'|'cancelled';
 }
 async played(owner:string,id:string,sequence:number){if(!Number.isSafeInteger(sequence)||sequence<0||sequence>1000000)throw new AudioError('Invalid sequence.');await this.session(owner,id);const r=await this.pool.query(`UPDATE dj_session_batches b SET played_at=coalesce(played_at,now()) FROM generation_reservations r WHERE b.session_id=$1 AND b.sequence=$2 AND b.state='completed' AND r.id=b.reservation_id AND r.status='completed' AND NOT EXISTS(SELECT 1 FROM dj_session_batches prior WHERE prior.session_id=b.session_id AND prior.sequence<b.sequence AND prior.state='completed' AND prior.played_at IS NULL) RETURNING b.sequence`,[id,sequence]);if(!r.rowCount)throw new AudioError('Track is not ready in playback order.',409);}
 async stop(owner:string,id:string,reason:'stop'|'credits'|'price'|'failure'|'disconnected'='stop'){
  await this.atomic(async db=>{await this.session(owner,id,db,true);await db.query("UPDATE dj_sessions SET state='ending',end_reason=coalesce(end_reason,$2) WHERE id=$1 AND state<>'ended'",[id,reason]);await db.query("UPDATE dj_session_batches SET stop_requested_at=coalesce(stop_requested_at,now()) WHERE session_id=$1 AND state='running'",[id]);await db.query("UPDATE dj_session_batches SET state='cancelled',actual_cost_micros=0 WHERE session_id=$1 AND state='queued'",[id]);});
  const rows=(await this.pool.query("SELECT reservation_id FROM dj_session_batches WHERE session_id=$1 AND state='cancelled' AND lease IS NULL",[id])).rows;for(const r of rows){await this.wallet.settle(owner,r.reservation_id,0,'cancelled');await this.pool.query('UPDATE dj_session_batches SET settled_at=now() WHERE reservation_id=$1',[r.reservation_id]);}await this.closeIfSettled(id);
 }
 private async closeIfSettled(id:string){await this.pool.query(`UPDATE dj_sessions s SET state='ended',ended_at=coalesce(ended_at,now()) WHERE id=$1 AND state='ending' AND NOT EXISTS(SELECT 1 FROM dj_session_batches b JOIN generation_reservations r ON r.id=b.reservation_id WHERE b.session_id=s.id AND (b.state IN ('queued','running') OR r.status IN ('reserved','running')))`,[id]);}
 async expire(){const rows=(await this.pool.query(`SELECT owner_id,id,heartbeat_at<now()-interval '75 seconds' AS disconnected FROM dj_sessions s WHERE state='active' AND billing_live=$1 AND (heartbeat_at<now()-interval '75 seconds' OR EXISTS(SELECT 1 FROM dj_session_batches b WHERE b.session_id=s.id AND b.state='queued' AND b.created_at<now()-$2*interval '1 millisecond')) LIMIT 20`,[this.live,2*this.budget.maxRuntimeMs+30000])).rows;for(const r of rows)await this.stop(r.owner_id,r.id,r.disconnected?'disconnected':'failure');return rows.length;}
 async purgeOwner(owner:string){
  if(!(await this.pool.query('SELECT 1 FROM "user" WHERE id=$1 AND suspended',[owner])).rowCount)throw Error('Suspend the account before fulfilling deletion');
  const sessions=(await this.pool.query('SELECT id FROM dj_sessions WHERE owner_id=$1 AND billing_live=$2',[owner,this.live])).rows;
  for(const {id} of sessions){await this.stop(owner,id);if((await this.status(owner,id)).state!=='ended')throw Error('Worker shutdown must be reconciled before deletion');}
  if((await this.pool.query('SELECT 1 FROM dj_recordings r JOIN dj_sessions s ON s.id=r.session_id WHERE s.owner_id=$1 AND s.billing_live=$2',[owner,this.live])).rowCount)throw Error('Remove saved set recordings before session deletion');
  const tracks=(await this.pool.query('SELECT b.reservation_id FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE s.owner_id=$1 AND s.billing_live=$2',[owner,this.live])).rows;
  for(const row of tracks)await this.store.remove('masters/'+row.reservation_id+'.wav');
  await this.atomic(async db=>{await db.query('DELETE FROM dj_rentals r USING dj_session_batches b,dj_sessions s WHERE r.reservation_id=b.reservation_id AND b.session_id=s.id AND s.owner_id=$1 AND s.billing_live=$2',[owner,this.live]);await db.query('DELETE FROM dj_session_batches b USING dj_sessions s WHERE b.session_id=s.id AND s.owner_id=$1 AND s.billing_live=$2',[owner,this.live]);await db.query('DELETE FROM dj_sessions WHERE owner_id=$1 AND billing_live=$2',[owner,this.live]);});
 }
}
