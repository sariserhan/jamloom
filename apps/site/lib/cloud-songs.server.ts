import 'server-only';
import {after} from 'next/server';
import {services} from './services';
import {r2AudioStore} from './audio-store';
import {DnaCommerce} from './dna-commerce';
import {CloudSongs} from './cloud-songs';
import {cloudSongConfig} from './cloud-song-config';
import {cloudSongAPI} from './cloud-song-api';
import {reviewSongConfig} from './cloud-review-config';
import {appleReviewAccount} from './apple-review';
import {CloudCapacity,capacityProvider,stopOrphanedCapacity,providerIdle} from './cloud-capacity';
import {capacityPermit,capacityWindowOpen} from './cloud-capacity-permit';
// Provider-only idle check so the minute cron can skip the database (Neon scale-to-zero).
// Missing configuration or a failed read counts as active: the full sweep then runs.
export async function songCapacityIdle(){
 const endpoint=process.env.RUNPOD_ENDPOINT_ID,key=process.env.RUNPOD_API_KEY;
 if(!key||!endpoint||!/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))return false;
 try{return await providerIdle(capacityProvider(key,endpoint),endpoint);}catch{return false;}
}
export async function reconcileSongCapacity(){
 const profile=process.env.JAMLOOM_CLOUD_COST_PROFILE;
 const endpoint=process.env.RUNPOD_ENDPOINT_ID,key=process.env.RUNPOD_API_KEY;
 if(!key||!endpoint||!/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))return {state:'unavailable'};
 let permit;try{permit=capacityPermit(process.env,profile);}catch{/* Invalid configuration must still shut down recorded capacity. */}
 if(!permit)return stopOrphanedCapacity(services().pool,endpoint,capacityProvider(key,endpoint));
 // Recovery remains active when new generation/purchases are disabled. This cron is the
 // guardian: a full stop-only sweep (including unrecorded workers), then the heartbeat.
 // ponytail: shares Vercel's fate; the headless watchdog can still run as an extra stop path.
 const capacity=new CloudCapacity(services().pool,endpoint,profile!,permit,capacityProvider(key,endpoint));
 const result=await capacity.reconcile(true);
 if(capacityWindowOpen(permit,Date.now()))await capacity.guardianHeartbeat();
 return result;
}
export function hostedSongs(product:'music-dna'|'improvise',review=false){
 const settings=review?reviewSongConfig(product):cloudSongConfig(process.env,product);if(!settings)return null;
 const {pool,config}=services();
 return new CloudSongs(new DnaCommerce(pool,config.secret,r2AudioStore(),{product,live:settings.live,budget:settings.budget}),settings);
}
export async function hostedSongRequest(request:Request,product:'music-dna'|'improvise'){
 if(process.env.JAMLOOM_CLOUD_SONGS_ENABLED!=='true'&&!process.env.JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS)return null;
 const {auth,config}=services(),session=await auth.api.getSession({headers:request.headers});
 const owner=session?.user.emailVerified?session.user.id:null,review=!!owner&&appleReviewAccount(owner);
 const songs=hostedSongs(product,review);
 if(!songs){
  // Product previews can explain sign-in and credit requirements while sales and
  // generation remain held. This read never contacts or starts a GPU worker.
  if(request.method==='GET'&&!new URL(request.url).search)return Response.json({available:false,creditsEnabled:false,signedIn:!!owner,mode:'cloud'},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
  return null;
 }
 return cloudSongAPI(request,songs,owner,id=>{
  after(async()=>{try{await songs.tick(id);}catch{console.error('Song update pending; scheduled recovery will retry.');}});
 },config.baseURL);
}
