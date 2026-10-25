import type {Pool,PoolClient} from 'pg';
import {createHash} from 'node:crypto';
import {AudioError} from './audio-validation';
import {recordingTitle} from '../../web/set-recording-name.js';
import {djSessionStore,djRecordingKey,DJ_PART_BYTES,type DJRecordingMime} from './dj-session-store';

export const DJ_RECORDING_BYTES=96*1024*1024;
type Input={id:string;title:string;mime:DJRecordingMime;bytes:number;sha256:string;seconds:number;session_id:string|null};
type Row=Input&{owner_id:string;state:string;upload_id:string|null;expires_at:Date;created_at:Date;streaming:boolean;sealed_at:Date|null;interrupted:boolean};
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
 async stream(owner:string,value:unknown){
  const v=value as Record<string,unknown>;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['owner','id','sessionId','title','mime'].includes(k)))throw new AudioError('Invalid recording details.');
  recordingId(v.id);recordingId(v.sessionId);if(typeof v.title!=='string'||!recordingTitle(v.title)||recordingTitle(v.title)!==v.title||!['audio/webm;codecs=opus','audio/mp4'].includes(String(v.mime)))throw new AudioError('Invalid recording details.');
  return this.locked(async db=>{
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-dj-recording-storage',0))");
   if(!(await db.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended',[owner])).rowCount)throw new AudioError('Verified sign-in required.',401);
   const prior=(await db.query<Row>('SELECT * FROM dj_recordings WHERE id=$1 FOR UPDATE',[v.id])).rows[0];let row=prior;
   if(prior){if(prior.owner_id!==owner)throw new AudioError('Recording not found.',404);if(!prior.streaming||prior.session_id!==v.sessionId||prior.title!==v.title||prior.mime!==v.mime)throw new AudioError('Recording request changed.',409);this.live(prior);}
   else{
    if(!(await db.query("SELECT 1 FROM dj_sessions WHERE id=$1 AND owner_id=$2 AND title=$3 AND state='active' FOR SHARE",[v.sessionId,owner,v.title])).rowCount)throw new AudioError('Active generated session required.',409);
    const usage=(await db.query("SELECT count(*) FILTER(WHERE owner_id=$1 AND state<>'deleted')::int AS owned,count(*) FILTER(WHERE owner_id=$1 AND created_at>now()-interval '1 day')::int AS daily FROM dj_recordings",[owner])).rows[0];
    if(usage.owned>=10||usage.daily>=20)throw new AudioError('Saved-set storage is full.',429);
    if((await db.query('SELECT 1 FROM dj_recordings WHERE session_id=$1',[v.sessionId])).rowCount)throw new AudioError('This session already has a recording.',409);
    row=(await db.query<Row>("INSERT INTO dj_recordings(id,owner_id,title,mime,bytes,sha256,seconds,session_id,streaming) VALUES($1,$2,$3,$4,0,$5,0,$6,true) RETURNING *",[v.id,owner,v.title,v.mime,'0'.repeat(64),v.sessionId])).rows[0];
   }
   if(!row.upload_id){const upload=await this.store.begin(this.key(row),row.mime);await db.query('UPDATE dj_recordings SET upload_id=$2 WHERE id=$1',[row.id,upload]);}
   return {id:row.id,partBytes:DJ_PART_BYTES};
  });
 }
 async streamPart(owner:string,id:string,value:unknown){
  const v=value as {number:number;bytes:number;sha256:string};if(!v||Object.keys(v).sort().join(',')!=='bytes,number,sha256'||!Number.isSafeInteger(v.number)||v.number<1||v.number>2048||!Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>DJ_PART_BYTES||typeof v.sha256!=='string'||!/^[a-f0-9]{64}$/.test(v.sha256))throw new AudioError('Invalid recording part.');
  return this.locked(async db=>{
   await db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-dj-recording-storage',0))");const row=await this.row(db,owner,id);this.live(row);if(!row.streaming||row.sealed_at||!row.upload_id)throw new AudioError('Recording is already finishing.',409);
   if(!(await db.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended',[owner])).rowCount)throw new AudioError('Verified sign-in required.',401);
   const prior=(await db.query('SELECT * FROM dj_recording_parts WHERE recording_id=$1 AND number=$2',[id,v.number])).rows[0];
   if(prior){if(prior.bytes!==v.bytes||prior.sha256!==v.sha256)throw new AudioError('Recording part changed.',409);}
   else{
    const last=(await db.query('SELECT number,bytes FROM dj_recording_parts WHERE recording_id=$1 ORDER BY number DESC LIMIT 1',[id])).rows[0];if(v.number!==(last?.number??0)+1||last&&last.bytes!==DJ_PART_BYTES)throw new AudioError('Recording parts must be ordered.',409);
    const usage=(await db.query("SELECT coalesce(sum(bytes),0)::text AS bytes FROM dj_recordings WHERE state<>'deleted'")).rows[0];if(Number(usage.bytes)+v.bytes>10*1024**3)throw new AudioError('Saved-set storage is full.',429);
    await db.query('INSERT INTO dj_recording_parts(recording_id,number,bytes,sha256) VALUES($1,$2,$3,$4)',[id,v.number,v.bytes,v.sha256]);await db.query("UPDATE dj_recordings SET bytes=bytes+$2,expires_at=now()+interval '24 hours' WHERE id=$1",[id,v.bytes]);
   }
   return {url:await this.store.partURL(this.key(row),row.upload_id,v.number,v.bytes),bytes:v.bytes};
  });
 }
 async sealStream(owner:string,id:string,seconds:unknown,interrupted=false){
  if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0||typeof interrupted!=='boolean')throw new AudioError('Invalid recording duration.');
  return this.locked(async db=>{const row=await this.row(db,owner,id);if(!row.streaming)throw new AudioError('Streaming recording required.');if(row.sealed_at){if(row.seconds!==seconds||row.interrupted!==interrupted)throw new AudioError('Recording details changed.',409);return {id};}this.live(row);
   // Generation can end before playback drains its final 60-second track and brief vocal repeat.
   const session=(await db.query("SELECT extract(epoch FROM least(now(),greatest(s.ended_at,max(b.played_at)+interval '64 seconds'))-s.created_at)::float AS seconds FROM dj_sessions s JOIN dj_session_batches b ON b.session_id=s.id JOIN generation_reservations r ON r.id=b.reservation_id WHERE s.id=$1 AND s.owner_id=$2 AND s.state='ended' AND b.state='completed' AND b.played_at IS NOT NULL AND r.status='completed' GROUP BY s.id",[row.session_id,owner])).rows[0];
   if(!session||seconds>session.seconds+5)throw new AudioError('Finished session duration required.',409);
   const parts=(await db.query('SELECT number,bytes,sha256 FROM dj_recording_parts WHERE recording_id=$1 ORDER BY number',[id])).rows;if(!parts.length)throw new AudioError('No recording captured.');
   // Streaming receipts hash the ordered part manifest; every object's range is checked before publication.
   const hash=createHash('sha256').update(JSON.stringify(parts)).digest('hex');await db.query("UPDATE dj_recordings SET sealed_at=now(),state='finalizing',seconds=$2,sha256=$3,interrupted=$4,expires_at=now()+interval '24 hours' WHERE id=$1",[id,seconds,hash,interrupted]);if(interrupted)await db.query('UPDATE dj_sessions SET withdrawn_at=coalesce(withdrawn_at,now()) WHERE id=$1',[row.session_id]);return {id};
  });
 }
 async completeStream(owner:string,id:string){return this.locked(async db=>{
  const row=await this.row(db,owner,id);if(!row.streaming||!row.sealed_at)throw new AudioError('Finished streaming recording required.',409);if(row.state==='ready')return {id,ready:true};this.live(row);
  const parts=(await db.query('SELECT number,bytes,sha256,verified FROM dj_recording_parts WHERE recording_id=$1 ORDER BY number',[id])).rows,key=this.key(row);
  if(!await this.store.exists(key,Number(row.bytes),row.mime)){if(!row.upload_id)throw Error('Upload missing');await this.store.complete(key,row.upload_id,parts.length,Number(row.bytes));}
  const next=parts.find(p=>!p.verified);if(next){await this.store.verifyPart(key,next.number,next.bytes,Number(row.bytes),next.sha256,row.mime);await db.query('UPDATE dj_recording_parts SET verified=true WHERE recording_id=$1 AND number=$2',[id,next.number]);next.verified=true;}
  const ready=parts.every(p=>p.verified);if(ready)await db.query("UPDATE dj_recordings SET state='ready',completed_at=now() WHERE id=$1",[id]);return {id,ready,verified:parts.filter(p=>p.verified).length,parts:parts.length};
 });}
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
  if(row.streaming)throw new AudioError('Streaming part details required.');
  const count=Math.ceil(Number(row.bytes)/DJ_PART_BYTES);if(!Number.isInteger(number)||Number(number)<1||Number(number)>count)throw new AudioError('Invalid recording part.');
  const bytes=Math.min(DJ_PART_BYTES,Number(row.bytes)-(Number(number)-1)*DJ_PART_BYTES);
  return {url:await this.store.partURL(this.key(row),row.upload_id,Number(number),bytes),bytes};
 });}
 async complete(owner:string,id:string){
  // Persist the immutable completion intent before touching R2; retries first check the completed object.
  await this.locked(async db=>{const row=await this.row(db,owner,id);if(row.streaming)throw new AudioError('Streaming completion required.');if(row.state==='ready')return;this.live(row);await db.query("UPDATE dj_recordings SET state='finalizing' WHERE id=$1",[id]);});
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
 async list(owner:string){return (await this.pool.query("SELECT r.id,r.title,r.seconds,r.state,r.created_at,r.interrupted,coalesce(s.visibility,'private') AS visibility,s.withdrawn_at FROM dj_recordings r LEFT JOIN dj_sessions s ON s.id=r.session_id WHERE r.owner_id=$1 AND r.state<>'deleted' ORDER BY r.created_at DESC,r.id DESC LIMIT 10",[owner])).rows;}
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
