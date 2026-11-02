import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,save} from './deployed-common.mts';
import {capacityPermit} from '../apps/site/lib/cloud-capacity-permit';
import {CLOUD_COST_PROFILE} from '../apps/site/lib/cloud-production-profile';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/release-execution-20261102/hosted-plan.json',import.meta.url),'utf8'));
assert(process.argv.includes('--apply'));assert.equal(plan.status,'APPROVED');assert.equal(plan.maxUSD,1);
const account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/review-account-private.json',import.meta.url),'utf8'));
const now=Date.now(),p={id:'release-'+randomUUID(),startsAt:now,expiresAt:now+3600000,capMicros:1000000,cycleMicros:1000000,cycleSeconds:2400};
capacityPermit({JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p)},CLOUD_COST_PROFILE);
const pool=database();try{
 const spent=Number((await pool.query('SELECT COALESCE(sum(d.cost_cap_micros),0) n FROM cloud_song_runs c JOIN dna_song_jobs d ON c.id=d.id WHERE NOT d.billing_live AND d.owner_id=$1',[account.id])).rows[0].n);
 await writeFile(new URL('permit.json',import.meta.url),JSON.stringify(p),{flag:'wx',mode:0o600});
 const held=JSON.parse(await readFile(new URL('held-environment.json',import.meta.url),'utf8'));
 await save('diagnostic-environment-private.json',{...held,JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p),JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:account.id,JAMLOOM_APPLE_REVIEW_EXPIRES_AT:new Date(p.expiresAt).toISOString(),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:String(spent+207200)});
 console.log('Prepared one-cycle permit and private review configuration; no provider activation');
}finally{await pool.end();}
