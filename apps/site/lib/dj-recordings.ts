import type {Pool,PoolClient} from 'pg';
import {AudioError} from './audio-validation';
import {recordingTitle} from '../../web/set-recording-name.js';
import {djSessionStore,djRecordingKey,DJ_PART_BYTES,type DJRecordingMime} from './dj-session-store';

export const DJ_RECORDING_BYTES=96*1024*1024;
type Input={id:string;title:string;mime:DJRecordingMime;bytes:number;sha256:string;seconds:number;session_id:string|null};
type Row=Input&{owner_id:string;state:string;upload_id:string|null;expires_at:Date;created_at:Date};
export function recordingId(value:unknown):asserts value is string{if(typeof value!=='string'||!/^[a-f0-9]{32}$/.test(value))throw new AudioError('Invalid recording.');}
export function recordingInput(value:unknown):Input{
 const v=value as Record<string,unknown>;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','title','mime','bytes','sha256','seconds','consent','owner','sessionId'].includes(k))||v.consent!==true)throw new AudioError('Confirm private saving of this recording.');
 recordingId(v.id);if(v.sessionId!==undefined)recordingId(v.sessionId);
 if(typeof v.title!=='string'||!recordingTitle(v.title)||v.title!==recordingTitle(v.title)||!['audio/webm;codecs=opus','audio/mp4'].includes(String(v.mime))||!Number.isSafeInteger(v.bytes)||Number(v.bytes)<1||Number(v.bytes)>DJ_RECORDING_BYTES||typeof v.sha256!=='string'||!/^[a-f0-9]{64}$/.test(v.sha256)||typeof v.seconds!=='number'||!Number.isFinite(v.seconds)||v.seconds<=0||v.seconds>3605)throw new AudioError('The recording details are invalid.');
 return {id:v.id,title:v.title,mime:v.mime as DJRecordingMime,bytes:Number(v.bytes),sha256:v.sha256,seconds:v.seconds,session_id:typeof v.sessionId==='string'?v.sessionId:null};
}
export class DJRecordings{
 constructor(readonly pool:Pool,readonly store:ReturnType<typeof djSessionStore>){}
 private async locked<T>(action:(db:PoolClient)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');const result=await action(db);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 private async row(db:PoolClient,owner:string,id:string){recordingId(id);const row=(await db.query<Row>('SELECT * FROM dj_recordings WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,owner])).rows[0];if(!row)throw new AudioError('Recording not found.',404);return row;}
 private key(row:Row){return djRecordingKey(row.owner_id,row.id,row.mime);}
 private live(row:Row){if(!['uploading','finalizing'].includes(row.state)||row.expires_at.getTime()<=Date.now())throw new AudioError('This upload expired or was removed.',409);}
 async reserve(owner:string,value:unknown){
  const input=recordingInput(value);
  return this.locked(async db=>{
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-dj-recording-storage',0))");
   if(!(await db.query('SELECT id FROM "user" WHERE id=$1 AND "emailVerified"=true AND NOT suspended',[owner])).rowCount)throw new AudioError('Verified sign-in required.',401);
   const existing=(await db.query<Row>('SELECT * FROM dj_recordings WHERE id=$1 FOR UPDATE',[input.id])).rows[0];let row=existing;
   if(existing){if(existing.owner_id!==owner)throw new AudioError('Recording not found.',404);if(Object.entries(input).some(([k,v])=>String(existing[k as keyof Row])!==String(v)))throw new AudioError('Recording request changed.',409);if(existing.state==='ready')return {id:row.id,ready:true};this.live(existing);}
   else{
    if(input.session_id){
     const session=(await db.query(`SELECT s.id FROM dj_sessions s WHERE s.id=$1 AND s.owner_id=$2 AND s.title=$3 AND s.state='ended'
      AND EXISTS(SELECT 1 FROM dj_session_batches b JOIN generation_reservations r ON r.id=b.reservation_id WHERE b.session_id=s.id AND b.state='completed' AND b.played_at IS NOT NULL AND r.status='completed') FOR SHARE OF s`,[input.session_id,owner,input.title])).rows[0];
     if(!session)throw new AudioError('A finished generated session is required.',409);
     if((await db.query('SELECT 1 FROM dj_recordings WHERE session_id=$1',[input.session_id])).rowCount)throw new AudioError('This session already has a recording.',409);
    }
    const usage=(await db.query(`SELECT count(*) FILTER (WHERE owner_id=$1 AND state<>'deleted')::int AS owned,coalesce(sum(bytes) FILTER (WHERE state<>'deleted'),0)::text AS total,count(*) FILTER (WHERE owner_id=$1 AND created_at>now()-interval '1 day')::int AS daily FROM dj_recordings`,[owner])).rows[0];
    if(usage.owned>=10||Number(usage.total)+input.bytes>10*1024**3||usage.daily>=20)throw new AudioError('Saved-set storage is full. Download your recording or remove an older saved set.',429);
    row=(await db.query<Row>(`INSERT INTO dj_recordings(id,owner_id,title,mime,bytes,sha256,seconds,session_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[input.id,owner,input.title,input.mime,input.bytes,input.sha256,input.seconds,input.session_id])).rows[0];
   }
   if(!row.upload_id){const upload=await this.store.begin(this.key(row),row.mime);await db.query('UPDATE dj_recordings SET upload_id=$2 WHERE id=$1',[row.id,upload]);}
   return {id:row.id,ready:false,finalizing:row.state==='finalizing',partBytes:DJ_PART_BYTES};
  });
 }
 async part(owner:string,id:string,number:unknown){return this.locked(async db=>{
  const row=await this.row(db,owner,id);this.live(row);if(row.state!=='uploading'||!row.upload_id)throw new AudioError('Recording is already finishing.',409);
  const count=Math.ceil(Number(row.bytes)/DJ_PART_BYTES);if(!Number.isInteger(number)||Number(number)<1||Number(number)>count)throw new AudioError('Invalid recording part.');
  const bytes=Math.min(DJ_PART_BYTES,Number(row.bytes)-(Number(number)-1)*DJ_PART_BYTES);
  return {url:await this.store.partURL(this.key(row),row.upload_id,Number(number),bytes),bytes};
 });}
 async complete(owner:string,id:string){
  // Persist the immutable completion intent before touching R2; retries first check the completed object.
  await this.locked(async db=>{const row=await this.row(db,owner,id);if(row.state==='ready')return;this.live(row);await db.query("UPDATE dj_recordings SET state='finalizing' WHERE id=$1",[id]);});
  return this.locked(async db=>{
   const row=await this.row(db,owner,id);if(row.state==='ready')return {id,ready:true};this.live(row);const key=this.key(row);
   if(!await this.store.verify(key,Number(row.bytes),row.sha256,row.mime)){
    if(!row.upload_id)throw new AudioError('Recording upload unavailable.',409);
    await this.store.complete(key,row.upload_id,Math.ceil(Number(row.bytes)/DJ_PART_BYTES),Number(row.bytes));
    if(!await this.store.verify(key,Number(row.bytes),row.sha256,row.mime))throw new Error('Recording verification failed');
   }
   await db.query("UPDATE dj_recordings SET state='ready',completed_at=now() WHERE id=$1",[id]);return {id,ready:true};
  });
 }
 async list(owner:string){return (await this.pool.query("SELECT r.id,r.title,r.seconds,r.state,r.created_at,coalesce(s.visibility,'private') AS visibility,s.withdrawn_at FROM dj_recordings r LEFT JOIN dj_sessions s ON s.id=r.session_id WHERE r.owner_id=$1 AND r.state<>'deleted' ORDER BY r.created_at DESC,r.id DESC LIMIT 10",[owner])).rows;}
 private publicWhere=`r.state='ready' AND s.state='ended' AND s.visibility='public' AND s.withdrawn_at IS NULL AND NOT u.suspended
  AND EXISTS(SELECT 1 FROM dj_session_batches b JOIN generation_reservations g ON g.id=b.reservation_id WHERE b.session_id=s.id AND b.state='completed' AND b.played_at IS NOT NULL AND g.status='completed')`;
 async publicList(after='',live=false){if(after)recordingId(after);const rows=(await this.pool.query(`SELECT r.id,r.title,r.seconds,r.completed_at FROM dj_recordings r JOIN dj_sessions s ON s.id=r.session_id JOIN "user" u ON u.id=r.owner_id WHERE ${this.publicWhere} AND s.billing_live=$2 AND ($1='' OR (r.completed_at,r.id)<(SELECT completed_at,id FROM dj_recordings WHERE id=$1)) ORDER BY r.completed_at DESC,r.id DESC LIMIT 13`,[after,live])).rows;return {sets:rows.slice(0,12),next:rows.length>12?rows[11].id:null};}
 async publicPlayback(id:string,live=false){recordingId(id);const row=(await this.pool.query(`SELECT r.* FROM dj_recordings r JOIN dj_sessions s ON s.id=r.session_id JOIN "user" u ON u.id=r.owner_id WHERE r.id=$1 AND ${this.publicWhere} AND s.billing_live=$2`,[id,live])).rows[0];if(!row)throw new AudioError('Set not found.',404);return this.store.playbackURL(this.key(row),false,row.title);}
 async withdraw(owner:string,id:string){recordingId(id);const row=await this.pool.query(`UPDATE dj_sessions s SET withdrawn_at=coalesce(withdrawn_at,now()) FROM dj_recordings r WHERE r.id=$1 AND r.owner_id=$2 AND r.session_id=s.id RETURNING s.id`,[id,owner]);if(!row.rowCount)throw new AudioError('Set not found.',404);return {withdrawn:true};}
 async playback(owner:string,id:string,download=false){return this.locked(async db=>{const row=await this.row(db,owner,id);if(row.state!=='ready')throw new AudioError('Recording not found.',404);return this.store.playbackURL(this.key(row),download,row.title);});}
 async remove(owner:string,id:string){await this.locked(async db=>{const row=await this.row(db,owner,id);if(row.state!=='deleted')await db.query("UPDATE dj_recordings SET state='deleting' WHERE id=$1",[id]);});await this.clean(owner,id);return {removed:true};}
 private async clean(owner:string,id:string){await this.locked(async db=>{
  const row=await this.row(db,owner,id);if(row.state==='deleted'||row.state==='ready'||row.state!=='deleting'&&row.expires_at.getTime()>Date.now())return;
  if(row.upload_id)try{await this.store.abort(this.key(row),row.upload_id);}catch(e){if((e as Error).name!=='NoSuchUpload')throw e;}
  await this.store.remove(this.key(row));
  await db.query("UPDATE dj_recordings SET state='deleted',title='Deleted set',upload_id=NULL WHERE id=$1",[id]);
 });}
 async cleanup(){const rows=(await this.pool.query("SELECT id,owner_id FROM dj_recordings WHERE state='deleting' OR (state IN ('uploading','finalizing') AND expires_at<now()) ORDER BY expires_at LIMIT 20")).rows;let cleaned=0,failed=0;for(const row of rows)try{await this.clean(row.owner_id,row.id);cleaned++;}catch{failed++;}return {checked:rows.length,cleaned,failed};}
 // Call during verified account-deletion fulfilment, before removing the user row.
 async purgeOwner(owner:string){if(!(await this.pool.query('SELECT id FROM "user" WHERE id=$1 AND suspended=true',[owner])).rowCount)throw new Error('Suspend the account before fulfilling deletion');const rows=await this.pool.query('SELECT id FROM dj_recordings WHERE owner_id=$1',[owner]);for(const {id} of rows.rows)await this.remove(owner,id);await this.pool.query("DELETE FROM dj_recordings WHERE owner_id=$1 AND state='deleted'",[owner]);}
}
