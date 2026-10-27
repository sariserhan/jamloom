import test from 'node:test';import assert from 'node:assert/strict';
import {releaseConfiguration,compareMigrations} from '../scripts/release-preflight';
test('release preflight reports missing configuration and preserves sales holds without exposing secrets',()=>{
 const missing=releaseConfiguration({});assert.equal(missing.accountConfigured,false);assert.equal(missing.libraryStorageConfigured,false);assert.equal(missing.djRecordingStorageConfigured,false);assert.equal(missing.cloudSongsEnabled,false);
 const env={DATABASE_URL:'postgres://test@127.0.0.1/test',BETTER_AUTH_URL:'http://127.0.0.1:3010',BETTER_AUTH_SECRET:'private-value-never-print-this-secret',JAMLOOM_LOCAL_OUTBOX:'/tmp/local-only',JAMLOOM_LOCAL_AUDIO_DIR:'/tmp/local-audio',STRIPE_LIVE_SECRET_KEY:'sk_live_private',STRIPE_LIVE_PUBLISHABLE_KEY:'pk_live_private',SINGING_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_private',SINGING_STRIPE_LIVE_PRICE_ID:'price_private',SINGING_STRIPE_LIVE_PRODUCT_ID:'prod_private'};
 const ready=releaseConfiguration(env);assert.equal(ready.accountConfigured,true);assert.equal(ready.libraryStorageConfigured,true);assert.equal(ready.singing.configured,true);assert.equal(ready.singing.academyCheckoutEnabled,false);assert.equal(ready.singingPriceUSD,39);assert.equal(JSON.stringify(ready).includes('private'),false);
 assert.equal(releaseConfiguration({...env,VERCEL:'1'}).accountConfigured,false);assert.equal(releaseConfiguration({...env,JAMLOOM_CLOUD_SONGS_ENABLED:'true'}).cloudSongConfigValid,false);assert.equal(releaseConfiguration({...env,JAMLOOM_AI_DJ_BILLING_MODE:'live'}).djBillingModeValid,false);
});
test('read-only migration comparison distinguishes missing, changed and unexpected SQL',()=>{
 const expected=new Map([['one.sql','a'],['two.sql','b']]);assert.deepEqual(compareMigrations(expected,new Map(expected)),{pending:[],changed:[],unknown:[]});
 assert.deepEqual(compareMigrations(expected,new Map([['one.sql','changed'],['other.sql','c']])),{pending:['two.sql'],changed:['one.sql'],unknown:['other.sql']});
});
