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
