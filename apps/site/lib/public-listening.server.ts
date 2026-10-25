import 'server-only';
import examples from '../../../assets/manifests/dna-examples.json';
import {validationSongs} from './music-validation';
import {services,accountsConfigured} from './services';
import {DJRecordings} from './dj-recordings';
import {djSessionStore} from './dj-session-store';
import {songTrack,type ListeningTrack} from './listening';
export async function publicListeningTrack(kind:string,id:string):Promise<ListeningTrack|null>{
 if(!['music-dna','improvise','sets'].includes(kind)||!/^[a-f0-9]{32}$/.test(id))return null;
 const example=validationSongs.find(s=>s.id===id&&s.product===kind)??(kind==='music-dna'?examples.examples.find(s=>s.id===id):undefined);
 if(example)return {...songTrack(example,kind),artist:'Jamloom'};
 if(!accountsConfigured())return null;
 const {pool}=services(),live=process.env.CREDIT_BILLING_MODE==='live';
 if(kind==='sets'){
  try{const s=await new DJRecordings(pool,djSessionStore()).publicTrack(id,live);return {id,title:s.title,artist:'Jamloom Community',kind,url:`/api/ai-dj/sets/${id}/audio`,href:`/listen/sets/${id}`};}catch(e){if((e as {status?:number}).status===404)return null;throw e;}
 }
 const s=(await pool.query(`SELECT d.id,d.title,d.language,d.direction,d.created_at FROM dna_song_jobs d JOIN generation_reservations r ON r.id=d.reservation_id WHERE d.id=$1 AND d.product=$2 AND d.billing_live=$3 AND d.state='completed' AND r.status='completed' AND d.visibility='public' AND d.public_consent_at IS NOT NULL AND d.withdrawn_at IS NULL AND d.audio_key IS NOT NULL`,[id,kind,live])).rows[0];
 return s?songTrack(s,kind):null;
}
