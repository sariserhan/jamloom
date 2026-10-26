import type {Pool} from 'pg';
import {AudioError} from './audio-validation';
import examples from '../../../assets/manifests/dna-examples.json';
import {validationSongs} from './music-validation';
import {validateFeedback} from './dna-feedback-schema';

export function creationReference(kind:unknown,id:unknown){
 if(typeof kind!=='string'||!['music-dna','improvise','sets','library','local-remix','local-dj'].includes(kind)||typeof id!=='string'||!(kind==='library'?/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/:kind.startsWith('local-')?/^[a-f0-9]{64}$/:/^[a-f0-9]{32}$/).test(id))throw new AudioError('Choose a valid creation.');
 return {kind,id};
}
// Resolve eligibility afresh: withdrawing or deleting a source excludes it from later exports.
export const creationSources=`
 SELECT d.product kind,d.id,d.owner_id,d.title,d.audio_sha256 sha256,(d.audio_bytes-44)/192000.0 seconds,
 (d.visibility='public' AND d.public_consent_at IS NOT NULL AND d.withdrawn_at IS NULL) public,d.billing_live live,d.withdrawn_at IS NULL retained
 FROM dna_song_jobs d JOIN generation_reservations g ON g.id=d.reservation_id JOIN "user" u ON u.id=d.owner_id
 WHERE d.state='completed' AND g.status='completed' AND d.audio_key IS NOT NULL AND NOT u.suspended
 UNION ALL
 SELECT 'sets',r.id,r.owner_id,r.title,r.sha256,r.seconds,
 (s.state='ended' AND s.visibility='public' AND s.withdrawn_at IS NULL AND EXISTS(SELECT 1 FROM dj_session_batches b JOIN generation_reservations g ON g.id=b.reservation_id WHERE b.session_id=s.id AND b.state='completed' AND b.played_at IS NOT NULL AND g.status='completed')),
 s.billing_live,s.withdrawn_at IS NULL
 FROM dj_recordings r LEFT JOIN dj_sessions s ON s.id=r.session_id JOIN "user" u ON u.id=r.owner_id WHERE r.state='ready' AND NOT u.suspended
 UNION ALL
 SELECT 'library',t.id::text,t.owner_id,t.title,a.sha256,t.duration_ms/1000.0,EXISTS(SELECT 1 FROM catalogue_submissions c WHERE c.track_id=t.id AND c.state='approved'),false,true
 FROM tracks t JOIN track_assets a ON a.track_id=t.id JOIN "user" u ON u.id=t.owner_id WHERE t.deleted_at IS NULL AND a.state='ready' AND NOT u.suspended`;

export class CreationFeedback {
 constructor(readonly pool:Pool,readonly live=false){}
 async account(owner:string){if(!(await this.pool.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended',[owner])).rowCount)throw new AudioError('Sign in to rate music.',401);}
 async source(owner:string,kind:string,id:string){
  creationReference(kind,id);
  if(kind.startsWith('local-'))return null;
  const row=(await this.pool.query(`WITH sources AS (${creationSources}) SELECT * FROM sources WHERE kind=$1 AND id=$2 AND (owner_id=$3 OR public) AND (kind='library' OR live IS NULL OR live=$4)`,[kind,id,owner,this.live])).rows[0];
  if(!row&&['music-dna','improvise'].includes(kind)){
   const sample=validationSongs.find(s=>s.product===kind&&s.id===id)??(kind==='music-dna'?examples.examples.find(s=>s.id===id):undefined);
   if(sample)return {owner_id:null,sha256:sample.audioSha256,seconds:(sample.audioBytes-44)/192000};
  }
  if(!row)throw new AudioError('This creation is not available for feedback.',404);return row;
 }
 async read(owner:string,kind:string,id:string){await this.account(owner);const source=await this.source(owner,kind,id);
  const row=(await this.pool.query('SELECT feedback,rights_confirmed FROM creation_feedback WHERE owner_id=$1 AND kind=$2 AND creation_id=$3',[owner,kind,id])).rows[0];
  const legacy=!row&&kind==='music-dna'?(await this.pool.query('SELECT feedback FROM song_feedback WHERE owner_id=$1 AND song_id=$2',[owner,id])).rows[0]:null;
  return {feedback:row?.feedback??(legacy?{...legacy.feedback,trainingConsent:false}:null),canTrain:!!source&&source.owner_id===owner&&source.retained!==false,rightsConfirmed:row?.rights_confirmed??false,local:kind.startsWith('local-')};
 }
 async save(owner:string,kind:string,id:string,input:unknown){
  await this.account(owner);creationReference(kind,id);
  let feedback;try{feedback=validateFeedback(input);}catch{throw new AudioError('Choose a valid rating and feedback options.');}
  const source=await this.source(owner,kind,id),rights=(input as {rightsConfirmed?:unknown}).rightsConfirmed===true;
  if(feedback.trainingConsent&&(!source||source.owner_id!==owner||source.retained===false||!rights))throw new AudioError('Only the owner of cloud-saved music can grant training permission, with rights to all included audio and voices.',403);
  if(feedback.momentSeconds!==undefined&&source&&feedback.momentSeconds>Number(source.seconds))throw new AudioError('Choose a moment within this creation.');
  const db=await this.pool.connect();try{await db.query('BEGIN');
   if(!(await db.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended FOR NO KEY UPDATE',[owner])).rowCount)throw new AudioError('Sign in required.',401);
   const existing=(await db.query('SELECT 1 FROM creation_feedback WHERE owner_id=$1 AND kind=$2 AND creation_id=$3',[owner,kind,id])).rowCount;
   if(!existing&&Number((await db.query('SELECT count(*) n FROM creation_feedback WHERE owner_id=$1',[owner])).rows[0].n)>=10000)throw new AudioError('Feedback storage is full. Delete an old rating first.',429);
   await db.query(`INSERT INTO creation_feedback(owner_id,kind,creation_id,feedback,audio_sha256,rights_confirmed) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(owner_id,kind,creation_id) DO UPDATE SET feedback=EXCLUDED.feedback,audio_sha256=EXCLUDED.audio_sha256,rights_confirmed=EXCLUDED.rights_confirmed,updated_at=now()`,[owner,kind,id,JSON.stringify(feedback),source?.sha256??null,feedback.trainingConsent&&rights]);
   // Existing DNA personalization continues, without granting the old trainer new consent.
   if(kind==='music-dna'&&source?.owner_id)await db.query(`INSERT INTO song_feedback(owner_id,song_id,feedback) VALUES($1,$2,$3) ON CONFLICT(owner_id,song_id) DO UPDATE SET feedback=EXCLUDED.feedback,updated_at=now()`,[owner,id,JSON.stringify({...feedback,trainingConsent:false,consentVersion:1})]);
   await db.query('COMMIT');return {feedback,canTrain:!!source&&source.owner_id===owner&&source.retained!==false,rightsConfirmed:feedback.trainingConsent&&rights};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async remove(owner:string,kind?:string,id?:string){await this.account(owner);if(kind!==undefined)creationReference(kind,id);
  const db=await this.pool.connect();try{await db.query('BEGIN');await db.query('DELETE FROM creation_feedback WHERE owner_id=$1 AND ($2::text IS NULL OR (kind=$2 AND creation_id=$3))',[owner,kind??null,id??null]);
   if(kind===undefined||kind==='music-dna')await db.query('DELETE FROM song_feedback WHERE owner_id=$1 AND ($2::text IS NULL OR song_id=$2)',[owner,id??null]);
   await db.query('COMMIT');return {deleted:true};}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
}

export async function creationTrainingSnapshot(pool:Pool,live=true){
 const records=(await pool.query(`WITH sources AS (${creationSources}) SELECT f.kind,f.creation_id,s.sha256,f.feedback,f.consent_version,f.updated_at,r.rights_note,r.reviewed_at
 FROM creation_feedback f JOIN sources s ON s.kind=f.kind AND s.id=f.creation_id AND s.owner_id=f.owner_id AND s.sha256=f.audio_sha256
 JOIN creation_training_reviews r ON r.kind=s.kind AND r.creation_id=s.id AND r.audio_sha256=s.sha256
 WHERE f.feedback->>'trainingConsent'='true' AND f.rights_confirmed AND r.approved AND s.retained AND (s.kind='library' OR s.live IS NULL OR s.live=$1)
 ORDER BY f.kind,f.creation_id`,[live])).rows;
 return {schema:'jamloom-creation-training-1',checkedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30000).toISOString(),live,records,
  use:'Revalidate owner consent, source hash and rights review before each training run. Ratings include negative examples; do not treat them all as positive targets. No raw inputs or favorite recordings included.'};
}
