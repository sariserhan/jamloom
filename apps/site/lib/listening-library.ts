import type {Pool} from 'pg';
import {AudioError,uuid} from './audio-validation';
import type {ListeningTrack} from './listening';
export type MusicReference={kind:string;id:string};
export function musicReference(value:unknown):MusicReference{
 const v=value as MusicReference;
 if(!v||typeof v.kind!=='string'||typeof v.id!=='string'||!['music-dna','improvise','sets','catalogue','aurowall'].includes(v.kind)||!(v.kind==='catalogue'?/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/:v.kind==='aurowall'?/^[a-f0-9]{24}$/:/^[a-f0-9]{32}$/).test(v.id))throw new AudioError('Invalid song reference.');
 return {kind:v.kind,id:v.id};
}
export class ListeningLibrary{
 constructor(readonly pool:Pool,private resolve:(ref:MusicReference,owner:string)=>Promise<ListeningTrack|null>){}
 private async owner(owner:string){if(!(await this.pool.query('SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended',[owner])).rowCount)throw new AudioError('Sign in required.',401);}
 private async hydrate(rows:MusicReference[],owner:string){
  const tracks:ListeningTrack[]=[],unavailable:MusicReference[]=[];
  for(let n=0;n<rows.length;n+=8){const part=rows.slice(n,n+8),found=await Promise.all(part.map(r=>this.resolve(r,owner)));found.forEach((t,i)=>{if(t)tracks.push(t);else unavailable.push(part[i]);});}
  return {tracks,unavailable};
 }
 async favorites(owner:string){await this.owner(owner);return this.hydrate((await this.pool.query('SELECT kind,track_id AS id FROM music_favorites WHERE owner_id=$1 ORDER BY added_at DESC,kind,track_id LIMIT 500',[owner])).rows,owner);}
 async playlists(owner:string){await this.owner(owner);return (await this.pool.query('SELECT id,title FROM playlists WHERE owner_id=$1 ORDER BY created_at,id LIMIT 20',[owner])).rows;}
 async playlist(owner:string,id:string){await this.owner(owner);uuid(id);const list=(await this.pool.query('SELECT id,title FROM playlists WHERE id=$1 AND owner_id=$2',[id,owner])).rows[0];if(!list)throw new AudioError('Playlist not found.',404);
 const rows=(await this.pool.query(`SELECT kind,track_id AS id FROM (SELECT kind,track_id,added_at FROM playlist_listening_items WHERE playlist_id=$1 UNION ALL SELECT 'catalogue',track_id::text,added_at FROM playlist_items WHERE playlist_id=$1) i ORDER BY added_at,kind,track_id LIMIT 100`,[id])).rows;
 return {...list,...await this.hydrate(rows,owner)};
 }
 async change(owner:string,list:string|null,ref:MusicReference|null,remove=false,title?:unknown){
  await this.owner(owner);if(list)uuid(list);if(ref)ref=musicReference(ref);
  if(title!==undefined&&(typeof title!=='string'||!title.trim()||title.length>80||/[\x00-\x1f\x7f]/.test(title)))throw new AudioError('Choose a playlist title.');
  if(ref&&!remove&&!await this.resolve(ref,owner))throw new AudioError('This song is no longer available.',404);
  const db=await this.pool.connect();try{await db.query('BEGIN');if(!(await db.query('SELECT id FROM "user" WHERE id=$1 AND "emailVerified" AND NOT suspended FOR NO KEY UPDATE',[owner])).rowCount)throw new AudioError('Sign in required.',401);
   if(title!==undefined){if((await db.query('SELECT count(*)::int n FROM playlists WHERE owner_id=$1',[owner])).rows[0].n>=20)throw new AudioError('Playlist limit reached.',429);const row=(await db.query('INSERT INTO playlists(owner_id,title) VALUES($1,$2) RETURNING id,title',[owner,(title as string).trim()])).rows[0];await db.query('COMMIT');return row;}
   if(list&&!(await db.query('SELECT id FROM playlists WHERE id=$1 AND owner_id=$2 FOR UPDATE',[list,owner])).rowCount)throw new AudioError('Playlist not found.',404);
   if(!ref){if(!list||!remove)throw new AudioError('Choose a song.');await db.query('DELETE FROM playlists WHERE id=$1',[list]);}
   else{
    const table=list?'playlist_listening_items':'music_favorites',column=list?'playlist_id':'owner_id',key=list??owner;
    if(remove){await db.query(`DELETE FROM ${table} WHERE ${column}=$1 AND kind=$2 AND track_id=$3`,[key,ref.kind,ref.id]);if(list&&ref.kind==='catalogue')await db.query('DELETE FROM playlist_items WHERE playlist_id=$1 AND track_id=$2',[list,ref.id]);}
    else{const usage=(await db.query(`SELECT count(*)::int n,bool_or(kind=$2 AND track_id=$3) present FROM ${table} WHERE ${column}=$1`,[key,ref.kind,ref.id])).rows[0];const legacy=list?(await db.query('SELECT count(*)::int n,bool_or(track_id::text=$2) present FROM playlist_items WHERE playlist_id=$1',[list,ref.id])).rows[0]:{n:0,present:false};
     if(!usage.present&&!(ref.kind==='catalogue'&&legacy.present)){if(usage.n+legacy.n>=(list?100:500))throw new AudioError('Collection is full. Remove a song first.',429);await db.query(`INSERT INTO ${table}(${column},kind,track_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[key,ref.kind,ref.id]);}}
   }
   await db.query('COMMIT');return {saved:true};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
}
