import test from 'node:test';import assert from 'node:assert/strict';
import {reviewSongConfig,reviewSongPath} from '../lib/cloud-review-config';
import {CLOUD_COST_PROFILE} from '../lib/cloud-production-profile';
import {CloudSongs} from '../lib/cloud-songs';
const now=Date.now(),env={RUNPOD_API_KEY:'fixture',RUNPOD_ENDPOINT_ID:'fixture',VERCEL:'1',CREDIT_BILLING_MODE:'live',JAMLOOM_CLOUD_SONGS_ENABLED:'false',JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE,JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:'reviewer',JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(now+3600000).toISOString(),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:'3000000'};
test('review credits require a separate finite operator allowance and never select the live ledger',()=>{
 assert.equal(reviewSongConfig('music-dna',{},now),null);
 const c=reviewSongConfig('music-dna',env,now)!;assert.equal(c.live,false);assert.equal(c.review?.enabled,true);assert.equal(c.review?.capMicros,3000000);assert.equal(c.costCapMicros,138800);
 for(const value of ['NaN','-1','10000001','1'])assert.throws(()=>reviewSongConfig('music-dna',{...env,JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:value},now));
 assert.throws(()=>reviewSongConfig('music-dna',{...env,JAMLOOM_CLOUD_COST_PROFILE:''},now));
 const ended=reviewSongConfig('music-dna',env,now+7200000)!;assert.equal(ended.review?.enabled,false);assert.deepEqual(ended.review?.owners,['reviewer']);
 assert.equal(reviewSongConfig('improvise',{...env,JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'false'},now)?.review?.enabled,false);
 assert.equal(reviewSongConfig('improvise',{...env,JAMLOOM_APPLE_REVIEW_ENABLED:'false'},now)?.review?.enabled,false);
 for(const id of ['',',reviewer','reviewer,reviewer','with space'])assert.throws(()=>reviewSongConfig('music-dna',{...env,JAMLOOM_APPLE_REVIEW_USER_IDS:id},now));
 assert.equal(reviewSongPath('/api/taste/song'),true);assert.equal(reviewSongPath('/api/improvise/song'),true);
 for(const path of ['/api/admin/users','/api/payments/checkout','/api/ai-dj/sessions','/api/taste/song/anything'])assert.equal(reviewSongPath(path),false);
});

test('an Improvise-only allowance keeps shared recovery constructible without admitting Music DNA',async()=>{
 const limited={...env,JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:'68400'};
 const configs=(['improvise','music-dna'] as const).map(product=>reviewSongConfig(product,limited,now)!);
 assert.deepEqual(configs.map(c=>[c.review?.capMicros,c.review?.enabled]),[[68400,true],[68400,false]]);
 const dna=new CloudSongs({store:{},options:{live:false}} as any,configs[1]);
 assert.throws(()=>dna.assertNewRequestAllowed('reviewer'),/unavailable/);
 assert.equal(await dna.available('reviewer'),false);
 const expired=reviewSongConfig('improvise',limited,now+7200000)!;
 assert.equal(expired.review?.enabled,false);assert.equal(expired.review?.capMicros,68400);
 for(const product of ['improvise','music-dna'] as const)assert.throws(()=>reviewSongConfig(product,{...limited,JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:'68399'},now));
});
