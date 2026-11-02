import {appleReviewAccount} from './apple-review';
import {cloudSongConfig,type CloudSongConfig} from './cloud-song-config';
import {CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE} from './cloud-production-profile';
import {integer} from './economics';

// A sandbox receipt is not funding. This independent, finite operator allowance is
// charged at the full reservation cap, including failed/cancelled requests.
export function reviewSongConfig(product:'improvise'|'music-dna',env:Record<string,string|undefined>=process.env,now=Date.now()):CloudSongConfig|null{
 if(!env.JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS)return null;
 if(![CLOUD_COST_PROFILE,CLOUD_DIAGNOSTIC_PROFILE].includes(env.JAMLOOM_CLOUD_COST_PROFILE??''))throw Error('Review generation requires the bounded production profile');
 const owners=(env.JAMLOOM_APPLE_REVIEW_USER_IDS??'').split(',').map(s=>s.trim()),expiresAt=Date.parse(env.JAMLOOM_APPLE_REVIEW_EXPIRES_AT??'');
 if(owners.length<1||owners.length>5||owners.some(id=>!/^[A-Za-z0-9_-]{1,128}$/.test(id))||new Set(owners).size!==owners.length||!Number.isFinite(expiresAt)||expiresAt>now+30*86400000)throw Error('Invalid review generation allowance');
 const settings=cloudSongConfig({...env,JAMLOOM_CLOUD_SONGS_ENABLED:'true',CREDIT_BILLING_MODE:'live'},product,true)!;
 const capMicros=integer(Number(env.JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS),settings.costCapMicros,10000000);
 return {...settings,live:false,review:{owners,expiresAt,capMicros,enabled:env.JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED==='true'&&appleReviewAccount(owners[0],env,now)}};
}
export function reviewSongPath(path:string){return ['/api/improvise/song','/api/taste/song'].includes(path);}
