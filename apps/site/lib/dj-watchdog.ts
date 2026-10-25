import type {DJSessions} from './dj-sessions';
import type {RentalProvider} from './vast-provider';
import {integer} from './economics';

// A successful DELETE is not shutdown proof; complete inventory and cost evidence are separate gates.
export class DJWatchdog{
 constructor(private sessions:DJSessions,private provider:RentalProvider){}
 async prepare(id:string,sequence:number,lease:string,account:number){
  integer(account,1);const db=await this.sessions.pool.connect();try{await db.query('BEGIN');
   const row=(await db.query(`SELECT b.reservation_id FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id WHERE b.session_id=$1 AND b.sequence=$2 AND b.lease=$3 AND b.state='running' AND b.stop_requested_at IS NULL AND b.lease_until>now() AND b.deadline>now() AND s.state='active' AND s.billing_live=$4 FOR UPDATE OF b,s`,[id,sequence,lease,this.sessions.live])).rows[0];if(!row)throw Error('Active worker lease required');
   const label='jamloom-job-'+row.reservation_id;await db.query('INSERT INTO dj_rentals(reservation_id,account_id,label) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[row.reservation_id,account,label]);
   const prior=(await db.query('SELECT * FROM dj_rentals WHERE reservation_id=$1',[row.reservation_id])).rows[0];if(Number(prior.account_id)!==account)throw Error('Rental identity conflict');await db.query('COMMIT');return {reservation:row.reservation_id,label};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async attached(reservation:string,instance:number){integer(instance,1);const r=await this.sessions.pool.query('UPDATE dj_rentals SET instance_id=$2 WHERE reservation_id=$1 AND (instance_id IS NULL OR instance_id=$2) RETURNING reservation_id',[reservation,instance]);if(!r.rowCount)throw Error('Rental identity conflict');}
 async recordCost(reservation:string,cost:number,evidence:string){
  integer(cost);if(!/^[a-f0-9]{64}$/.test(evidence))throw Error('Cost evidence required');
  const r=await this.sessions.pool.query(`UPDATE dj_rentals SET final_cost_micros=$2,cost_evidence_sha256=$3 WHERE reservation_id=$1 AND destroy_confirmed_at IS NOT NULL AND (final_cost_micros IS NULL OR (final_cost_micros=$2 AND cost_evidence_sha256=$3)) RETURNING reservation_id`,[reservation,cost,evidence]);if(!r.rowCount)throw Error('Shutdown missing or cost receipt conflicts');
 }
 async sweep(apply=false){
  const db=await this.sessions.pool.connect();let locked=false;const results:{id:string;status:string}[]=[];
  try{
   locked=(await db.query("SELECT pg_try_advisory_lock(hashtextextended('jamloom-dj-watchdog',0)) AS locked")).rows[0].locked;if(!locked)return [{id:'',status:'busy'}];
   if(apply)await this.sessions.shutdownRequired();
   const jobs=(await db.query(`SELECT b.*,s.owner_id,s.state AS session_state,r.account_id,r.label,r.instance_id,r.destroy_confirmed_at,r.final_cost_micros,r.cost_evidence_sha256 FROM dj_session_batches b JOIN dj_sessions s ON s.id=b.session_id LEFT JOIN dj_rentals r USING(reservation_id) WHERE b.state='running' AND s.billing_live=$1 AND (b.stop_requested_at IS NOT NULL OR b.lease_until IS NULL OR b.lease_until<=now() OR b.deadline<=now() OR s.state<>'active') ORDER BY b.created_at LIMIT 100`,[this.sessions.live])).rows;
   for(const job of jobs){const id=job.reservation_id;try{
    if(!apply){results.push({id,status:'shutdown_required'});continue;}
    if(!job.account_id){results.push({id,status:'local_exit_evidence_required'});continue;}
    if(!job.destroy_confirmed_at){
     const inventory=await this.provider.inventory(Number(job.account_id));const matches=inventory.filter(i=>i.label===job.label||job.instance_id!==null&&i.id===Number(job.instance_id));
     if(matches.length>1||matches.length===1&&(matches[0].label!==job.label||job.instance_id!==null&&matches[0].id!==Number(job.instance_id))){results.push({id,status:'identity_conflict'});continue;}
     if(matches.length){const instance=matches[0];await this.attached(id,instance.id);await db.query('UPDATE dj_rentals SET destroy_requested_at=coalesce(destroy_requested_at,now()) WHERE reservation_id=$1',[id]);await this.provider.destroy(instance.id);results.push({id,status:'destroy_requested'});continue;}
     if(job.instance_id===null){results.push({id,status:'creation_unresolved'});continue;}
     await db.query('UPDATE dj_rentals SET destroy_confirmed_at=now() WHERE reservation_id=$1',[id]);
    }
    if(job.final_cost_micros===null){results.push({id,status:'cost_evidence_required'});continue;}
    await db.query('UPDATE dj_session_batches SET stop_confirmed_at=coalesce(stop_confirmed_at,now()),stop_evidence_sha256=$2 WHERE reservation_id=$1',[id,job.cost_evidence_sha256]);
    const audio=job.audio_sha256?await this.sessions.store.get('masters/'+id+'.wav',Number(job.audio_bytes)):undefined;
    await this.sessions.finish(job.session_id,job.sequence,job.lease,job.session_state==='active'?(audio?'completed':'failed'):'cancelled',Number(job.final_cost_micros),audio);results.push({id,status:'settled'});
   }catch{results.push({id,status:'held_for_reconciliation'});}}
   if(apply)await this.sessions.reconcile();return results;
  }finally{try{if(locked)await db.query("SELECT pg_advisory_unlock(hashtextextended('jamloom-dj-watchdog',0))");}finally{db.release();}}
 }
}
