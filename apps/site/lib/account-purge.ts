import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {AudioError,uuid} from './audio-validation';
import {adminAccount,OWNER_EMAIL} from './admin-access';
import type {AudioStore} from './audio-store';
import {masterAudioKey} from './music-storage';
import {DJRecordings} from './dj-recordings';
import {DJSessions} from './dj-sessions';
import {AdminStore} from './admin-store';
import {creationSources} from './creation-feedback';

// shortcut: large accounts may exceed the HTTP deadline; use scripts/fulfill-deletion.ts to resume without that limit.
// Financial receipts keep an inaccessible pseudonymous owner; personal content and sign-in are removed.
export async function fulfillDeletion(pool:Pool,store:AudioStore,recordings:DJRecordings,actor:string,ticketId:string,confirmOwner:string){
 uuid(ticketId);const lock=await pool.connect();let locked=false;
 try{
  if(!await adminAccount(lock,actor))throw new AudioError('Administrator access required.',403);
  const ticket=(await lock.query(`SELECT t.owner_id,u.email FROM support_tickets t JOIN "user" u ON u.id=t.owner_id WHERE t.id=$1 AND t.subject='Account deletion request'`,[ticketId])).rows[0];
  if(!ticket||ticket.owner_id!==confirmOwner||ticket.email.toLowerCase()===OWNER_EMAIL)throw new AudioError('A matching account-holder deletion request is required.',409);
  const owner=ticket.owner_id;
  locked=(await lock.query("SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked",['account-deletion:'+owner])).rows[0].locked;
  if(!locked)throw new AudioError('Deletion is already processing. Check again shortly.',409);
  if((await lock.query('SELECT completed_at FROM account_deletions WHERE owner_id=$1',[owner])).rows[0]?.completed_at)return {status:'complete' as const};
  await lock.query('BEGIN');
  try{
   await lock.query('SELECT owner_id FROM credit_wallets WHERE owner_id=$1 FOR UPDATE',[owner]);
   await lock.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[owner]);
   await lock.query('INSERT INTO account_deletions(owner_id,ticket_id) VALUES($1,$2) ON CONFLICT(owner_id) DO NOTHING',[owner,ticketId]);
   await lock.query('UPDATE "user" SET suspended=true WHERE id=$1',[owner]);
   await lock.query('UPDATE credit_wallets SET frozen=true WHERE owner_id=$1',[owner]);
   await lock.query('DELETE FROM "session" WHERE "userId"=$1',[owner]);
   await lock.query("UPDATE cloud_song_runs c SET cancel_requested=true FROM dna_song_jobs d WHERE c.id=d.id AND d.owner_id=$1 AND c.cleanup_at IS NULL",[owner]);
   await lock.query('COMMIT');
  }catch(e){await lock.query('ROLLBACK');throw e;}
  await new AdminStore(pool,'http://localhost').user(actor,owner,true);
  const sessions=(await pool.query('SELECT id,budget,billing_live FROM dj_sessions WHERE owner_id=$1',[owner])).rows;
  for(const s of sessions)await new DJSessions(pool,'deletion-does-not-issue-quotes',store,s.budget,s.billing_live,true).stop(owner,s.id);
  const pending=(await pool.query(`SELECT
   EXISTS(SELECT 1 FROM generation_reservations WHERE owner_id=$1 AND status IN ('reserved','running')) OR
   EXISTS(SELECT 1 FROM generation_rentals r JOIN generation_jobs j USING(reservation_id) WHERE j.owner_id=$1 AND r.destroy_confirmed_at IS NULL) OR
   EXISTS(SELECT 1 FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE d.owner_id=$1 AND (c.cleanup_at IS NULL OR c.lease_until>now())) OR
   EXISTS(SELECT 1 FROM dj_sessions WHERE owner_id=$1 AND state<>'ended') AS pending`,[owner])).rows[0].pending;
  // Wait out existing direct-upload URLs and bounded in-flight requests before final object removal.
  const ready=(await pool.query(`SELECT greatest(a.started_at+interval '10 minutes',
   coalesce((SELECT max(expires_at) FROM track_assets WHERE owner_id=$1),a.started_at),
   coalesce((SELECT max(deadline)+interval '5 minutes' FROM generation_jobs WHERE owner_id=$1),a.started_at),
   coalesce((SELECT max(c.deadline)+interval '5 minutes' FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE d.owner_id=$1),a.started_at)) AS retry_at
   FROM account_deletions a WHERE owner_id=$1`,[owner])).rows[0].retry_at;
  if(pending||new Date(ready).getTime()>Date.now())return {status:'pending' as const,reason:pending?'Waiting for worker shutdown and settled reservations.':'Waiting for existing upload permissions to expire.',retryAt:new Date(ready).toISOString()};
  // Keep rows until every storage delete succeeds, so provider failures can be retried safely.
  await pool.query(`DELETE FROM creation_training_reviews r USING (${creationSources}) s WHERE s.owner_id=$1 AND r.kind=s.kind AND r.creation_id=s.id`,[owner]);
  await pool.query(`DELETE FROM creation_feedback f WHERE f.owner_id=$1 OR EXISTS(SELECT 1 FROM (${creationSources}) s WHERE s.owner_id=$1 AND f.kind=s.kind AND f.creation_id=s.id)`,[owner]);
  await recordings.purgeOwner(owner);
  for(const live of [false,true]){const s=sessions.find(s=>s.billing_live===live);if(s)await new DJSessions(pool,'deletion-does-not-issue-quotes',store,s.budget,live,true).purgeOwner(owner);}
  const keys=new Set<string>();
  for(const row of (await pool.query('SELECT track_id,storage_key FROM track_assets WHERE owner_id=$1',[owner])).rows){keys.add(masterAudioKey(row));keys.add('uploads/'+row.track_id+'.wav');}
  for(const row of (await pool.query(`SELECT audio_key AS key FROM dna_song_jobs WHERE owner_id=$1 UNION SELECT object_key FROM song_uploads WHERE owner_id=$1 UNION SELECT c.output_key FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE d.owner_id=$1`,[owner])).rows)if(row.key)keys.add(row.key);
  for(const row of (await pool.query('SELECT reservation_id,budget FROM generation_jobs WHERE owner_id=$1',[owner])).rows){keys.add('uploads/'+row.reservation_id+'.wav');if(row.budget.render?.inputKey)keys.add(row.budget.render.inputKey);}
  for(const key of keys)await store.remove(key);
  await lock.query('BEGIN');
  try{
   await lock.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[owner]);
   await lock.query('DELETE FROM creation_feedback WHERE owner_id=$1',[owner]);
   await lock.query('DELETE FROM song_feedback WHERE owner_id=$1 OR song_id IN(SELECT id FROM dna_song_jobs WHERE owner_id=$1)',[owner]);
   await lock.query('DELETE FROM cloud_song_runs WHERE id IN(SELECT id FROM dna_song_jobs WHERE owner_id=$1)',[owner]);
   for(const table of ['song_uploads','dna_song_jobs','taste_profiles','music_favorites','playlists','academy_attempts','academy_daily_usage'])await lock.query(`DELETE FROM ${table} WHERE owner_id=$1`,[owner]);
   await lock.query('DELETE FROM catalogue_reports WHERE reporter_id=$1',[owner]);
   await lock.query('DELETE FROM track_assets WHERE owner_id=$1',[owner]);await lock.query('DELETE FROM tracks WHERE owner_id=$1',[owner]);
   await lock.query('DELETE FROM generation_rentals WHERE reservation_id IN(SELECT reservation_id FROM generation_jobs WHERE owner_id=$1)',[owner]);await lock.query('DELETE FROM generation_jobs WHERE owner_id=$1',[owner]);
   await lock.query(`DELETE FROM notification_outbox WHERE message->>'to'=$2 OR event_key='signup:'||$1 OR event_key IN(SELECT 'ticket:'||id FROM support_tickets WHERE owner_id=$1 UNION SELECT 'reply:'||r.id FROM support_replies r JOIN support_tickets t ON t.id=r.ticket_id WHERE t.owner_id=$1)`,[owner,ticket.email]);
   await lock.query('DELETE FROM support_replies WHERE ticket_id IN(SELECT id FROM support_tickets WHERE owner_id=$1)',[owner]);
   await lock.query("UPDATE support_tickets SET name='Deleted account',email='',body='Personal message removed after account deletion.',subject=CASE WHEN id=$2 THEN 'Account deletion request' ELSE 'Deleted account message' END,status='closed',revision=revision+1,updated_at=now() WHERE owner_id=$1",[owner,ticketId]);
   await lock.query('DELETE FROM "session" WHERE "userId"=$1',[owner]);await lock.query('DELETE FROM "account" WHERE "userId"=$1',[owner]);
   await lock.query('DELETE FROM verification WHERE identifier=$1 OR value=$2',[ticket.email,owner]);
   await lock.query('DELETE FROM contact_rate_limits WHERE key=$1',[createHash('sha256').update('email:'+ticket.email.toLowerCase()).digest('hex')]);
   await lock.query(`UPDATE "user" SET name='Deleted account',email=$2,"emailVerified"=false,image=NULL,suspended=true,"updatedAt"=now() WHERE id=$1`,[owner,'deleted-'+createHash('sha256').update(owner).digest('hex')+'@accounts.invalid']);
   await lock.query('UPDATE account_deletions SET completed_at=now() WHERE owner_id=$1',[owner]);
   await lock.query("INSERT INTO admin_audit(actor_id,action,target,details) VALUES($1,'account.deleted',$2,$3)",[actor,owner,JSON.stringify({ticket:ticketId,personalDataRemoved:true,financialRecordsRetained:true})]);
   await lock.query('COMMIT');return {status:'complete' as const};
  }catch(e){await lock.query('ROLLBACK');throw e;}
 }finally{if(locked)await lock.query("SELECT pg_advisory_unlock(hashtextextended($1,0))",['account-deletion:'+confirmOwner]);lock.release();}
}
