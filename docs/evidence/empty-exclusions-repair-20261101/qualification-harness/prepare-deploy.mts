import {assertActiveWorkerLease} from '../apps/site/lib/cloud-capacity-lease';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {database,dir,save} from './deployed-common.mts';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/empty-exclusions-repair-20261101/hosted-plan.json',import.meta.url),'utf8'));assert.equal(plan.status,'APPROVED');assert.equal(plan.maxUSD,2);assert.equal(plan.aggregateMaxUSD,3);assert.equal(plan.priorReservedUSD,1);assert(process.argv.includes('--apply'));
const accounts=await Promise.all(['review-account-private.json','course-review-account-private.json'].map(async n=>JSON.parse(await readFile(new URL('../build-release-closure-20261031/'+n,import.meta.url),'utf8'))));
const owners=accounts.map(a=>a.id);assert.equal(new Set(owners).size,2);assert(owners.every(x=>typeof x==='string'));
const pool=database();try{
const spent=Number((await pool.query('SELECT COALESCE(sum(d.cost_cap_micros),0) n FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE NOT d.billing_live AND d.owner_id=ANY($1::text[])',[owners])).rows[0].n);
const startsAt=Date.now(),lease={startsAt,expiresAt:startsAt+40*60000,maxMicros:2000000};assertActiveWorkerLease(lease,startsAt);await writeFile(new URL('lease.json',dir),JSON.stringify(lease),{flag:'wx',mode:0o600});const expiry=new Date(lease.expiresAt).toISOString();await writeFile(new URL('review-expiry.txt',dir),expiry,{mode:0o600});
const env={JAMLOOM_CLOUD_ACTIVE_LEASE_START:new Date(lease.startsAt).toISOString(),JAMLOOM_CLOUD_ACTIVE_LEASE_END:expiry,JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS:String(lease.maxMicros),JAMLOOM_COMING_SOON:'true',JAMLOOM_CLOUD_SONGS_ENABLED:'false',JAMLOOM_AI_DJ_ENABLED:'false',JAMLOOM_AI_DJ_BETA_ENABLED:'false',JAMLOOM_CLOUD_COST_PROFILE:'4090-diagnostic-2026-11-01',JAMLOOM_APPLE_REVIEW_ENABLED:'true',JAMLOOM_APPLE_REVIEW_USER_IDS:owners.join(','),JAMLOOM_APPLE_REVIEW_GENERATION_ENABLED:'true',JAMLOOM_APPLE_REVIEW_GENERATION_CAP_MICROS:String(spent+207200),JAMLOOM_APPLE_REVIEW_EXPIRES_AT:expiry,JAMLOOM_CREDIT_COST_QUALIFICATION:'held',JAMLOOM_CREDIT_PURCHASES_ENABLED:'false'};
await save('deployment-env-private.json',env);await save('deployment-bounds.json',{at:new Date().toISOString(),existingCostReservationsMicros:spent,additionalCostCapMicros:207200,expiresAt:expiry,ordinaryGeneration:false,ordinaryPurchases:false});console.log('PASS prepared bounded review configuration');
}finally{await pool.end();}
