import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {parseEnv} from 'node:util';
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
test('payment preflight includes Pro signing and live credits without leaking credentials or opening sales',()=>{
 const missing=releaseConfiguration({});assert.equal(missing.pro.configured,false);assert.equal(missing.pro.licenseSigningConfigured,false);assert.equal(missing.credits.configured,false);
 const env={STRIPE_LIVE_SECRET_KEY:'sk_live_secret_value',PRO_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_secret_value',
  PRO_STRIPE_LIVE_PRODUCT_ID:'prod_fixture',PRO_STRIPE_LIVE_PRICE_ID:'price_fixture',
  CREDIT_STRIPE_LIVE_WEBHOOK_SECRET:'whsec_credit_secret_value',CREDIT_STRIPE_TAX_CODE:'txcd_10000000',
  JAMLOOM_CREDIT_PURCHASES_ENABLED:'true',PRO_LICENSE_PRIVATE_KEY:'invalid_secret_value'};
 const r=releaseConfiguration(env);assert.equal(r.pro.configured,true);assert.equal(r.pro.checkoutEnabled,false);
 assert.equal(r.pro.licenseSigningConfigured,false);assert.equal(r.credits.configured,true);assert.equal(r.credits.taxConfigured,true);
 assert.equal(r.credits.checkoutEnabled,false);assert.equal(JSON.stringify(r).includes('secret_value'),false);
 const wrong=releaseConfiguration({...env,STRIPE_LIVE_SECRET_KEY:'sk_test_wrong'});
 assert.equal(wrong.pro.configured,false);assert.equal(wrong.credits.configured,false);
});
test('deployment templates include each payment product without enabling purchases',()=>{
 for(const name of ['.env.example','.env.production.example']){
  const env=parseEnv(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
  for(const key of ['STRIPE_PUBLISHABLE_KEY','STRIPE_LIVE_PUBLISHABLE_KEY','PRO_LICENSE_PRIVATE_KEY','APPLE_ENVIRONMENT','APPLE_APP_ID',
   ...['ACADEMY','SINGING','PRO'].flatMap(p=>['','LIVE_'].flatMap(mode=>['PRODUCT_ID','PRICE_ID','WEBHOOK_SECRET'].map(k=>p+'_STRIPE_'+mode+k)))])
   assert(Object.hasOwn(env,key),name+' missing '+key);
  for(const key of ['PRO_SALES_ENABLED','SINGING_STRIPE_SANDBOX_ENABLED','ACADEMY_STRIPE_SANDBOX_ENABLED','JAMLOOM_CREDIT_PURCHASES_ENABLED'])assert.equal(env[key],'false');
 }
});
