import 'server-only';
import {ListeningLibrary} from './listening-library';
import {services} from './services';
import {publicListeningTrack} from './public-listening.server';
import {songTrack} from './listening';
import aurowall from '../../../assets/manifests/aurowall-public.json';
export function listeningLibrary(){const {pool,catalogue}=services();return new ListeningLibrary(pool,async(ref,owner)=>{
 if(ref.kind==='aurowall'){const t=aurowall.tracks.find(t=>t.id===ref.id);return t?{id:t.id,title:t.title,artist:t.artist,kind:'aurowall',url:`/api/aurowall/${t.id}`}:null;}
 if(ref.kind==='catalogue'){try{const t=await catalogue?.track(ref.id);return t?{...t,kind:'catalogue',href:`/catalogue/${t.id}`}:null;}catch(e){if((e as {status?:number}).status===404)return null;throw e;}}
 const published=await publicListeningTrack(ref.kind,ref.id);if(published)return published;
 if(ref.kind==='sets')return null;
 const row=(await pool.query(`SELECT d.id,d.title,d.language,d.direction FROM dna_song_jobs d JOIN generation_reservations r ON r.id=d.reservation_id WHERE d.id=$1 AND d.product=$2 AND d.owner_id=$3 AND d.billing_live=$4 AND d.state='completed' AND r.status='completed' AND d.audio_key IS NOT NULL`,[ref.id,ref.kind,owner,process.env.CREDIT_BILLING_MODE==='live'])).rows[0];
 return row?{...songTrack(row,ref.kind),href:undefined}:null;
});}
