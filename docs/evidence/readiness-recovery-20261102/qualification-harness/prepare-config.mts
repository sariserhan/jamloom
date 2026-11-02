import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,save} from './deployed-common.mts';
import {capacityPermit} from '../apps/site/lib/cloud-capacity-permit';
import {Wallet} from '../apps/site/lib/wallet';
import {CLOUD_COST_PROFILE} from '../apps/site/lib/cloud-production-profile';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/readiness-recovery-20261102/hosted-plan.json',import.meta.url),'utf8'));
assert(process.argv.includes('--apply'));assert.equal(plan.status,'APPROVED');assert.equal(plan.maxUSD,0.75);assert.equal(plan.aggregateMaxUSD,1);assert.equal(plan.priorReservedUSD,0.25);
const account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/course-review-account-private.json',import.meta.url),'utf8'));
const now=Date.now(),p={id:'release-'+randomUUID(),startsAt:now,expiresAt:now+3600000,capMicros:750000,cycleMicros:750000,cycleSeconds:2400};
capacityPermit({JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p)},CLOUD_COST_PROFILE);
const pool=database();try{
 const wallet=new Wallet(pool,false),beforeLive=await new Wallet(pool,true).balance(account.id);
 assert.equal(Number((await pool.query('SELECT count(*) n FROM cloud_capacity_cycles WHERE owner_id=$1',[account.id])).rows[0].n),0);
 const fixture=await wallet.balance(account.id);assert.equal(fixture.available,0);assert.equal(fixture.reserved,0);
 // Synthetic test-only ledger fixture. Never evidence of a provider purchase or net revenue.
 await wallet.grant(account.id,{provider:'stripe_test',receipt:'synthetic-capacity-recovery-20261102',credits:30,netMicros:1050000});
 assert.deepEqual(await new Wallet(pool,true).balance(account.id),beforeLive);
 await save('synthetic-test-fixture.json',{status:'PASS',credits:30,liveWalletUnchanged:true,synthetic:true,providerPurchaseVerified:false,revenueRecognized:false});
 const spent=Number((await pool.query('SELECT COALESCE(sum(d.cost_cap_micros),0) n FROM cloud_song_runs c JOIN dna_song_jobs d ON c.id=d.id WHERE NOT d.billing_live AND d.owner_id=$1',[account.id])).rows[0].n);
 await writeFile(new URL('permit.json',import.meta.url),JSON.stringify(p),{flag:'wx',mode:0o600});
 const held=JSON.parse(await readFile(new URL('held-environment.json',import.meta.url),'utf8'));
 await save('diagnostic-environment-private.json',{...held,JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p),JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:account.id,JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(p.expiresAt).toISOString(),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:String(spent+207200)});
 console.log('Prepared one-cycle permit and private review configuration; no provider activation');
}finally{await pool.end();}
