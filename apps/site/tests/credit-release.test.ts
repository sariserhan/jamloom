import test from 'node:test';import assert from 'node:assert/strict';
import {creditLaunchAuthorized,creditSalesAuthorized,creditCapacityForSales} from '../lib/credit-release';
import {CREDIT_CATALOG_VERSION,creditSalesQualified,assertCatalogBudget,songCreditPrice} from '../lib/credit-catalog';
import {capacityPermitHash} from '../lib/cloud-capacity-permit';
import {CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE} from '../lib/cloud-production-profile';
const now=1800000000000,permit={id:'public-launch-fixture',startsAt:now-1000,expiresAt:now+6*86400000,capMicros:10000000,cycleMicros:750000,cycleSeconds:1860};
const env={JAMLOOM_CREDIT_LAUNCH_APPROVAL:CREDIT_CATALOG_VERSION,JAMLOOM_CLOUD_SONGS_ENABLED:'true',JAMLOOM_CLOUD_COST_PROFILE:CLOUD_COST_PROFILE,JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(permit),RUNPOD_ENDPOINT_ID:'fixture-endpoint'};
test('finite launch authorization does not fabricate economic qualification or waive credit budgets',()=>{
 assert(creditLaunchAuthorized(env,now));assert(creditSalesAuthorized(env,now));assert.equal(creditSalesQualified(env),false);
 assert.throws(()=>assertCatalogBudget(songCreditPrice('improvise'),163332,true));
 for(const patch of [{JAMLOOM_CREDIT_LAUNCH_APPROVAL:''},{JAMLOOM_CREDIT_LAUNCH_APPROVAL:'2026-10-31-v2'},{JAMLOOM_CLOUD_SONGS_ENABLED:'false'},{JAMLOOM_CLOUD_CAPACITY_PERMIT:'bad'},{JAMLOOM_CLOUD_COST_PROFILE:'a5000-diagnostic-2026-11-01'}])assert.equal(creditLaunchAuthorized({...env,...patch},now),false);
 assert.equal(creditLaunchAuthorized(env,permit.startsAt-1),false);
 assert.equal(creditLaunchAuthorized(env,permit.expiresAt-permit.cycleSeconds*1000+1),false);
 assert.equal(creditLaunchAuthorized(env,permit.expiresAt),false);
 assert.equal(creditLaunchAuthorized({...env,JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify({...permit,expiresAt:permit.startsAt+8*86400000})},now),false);
});
test('new purchases close on exhausted or changed funding, stale guardian and read failure without starting compute',async()=>{
 const hash=capacityPermitHash(permit,env.RUNPOD_ENDPOINT_ID,CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE);
 let guardian:any={config_sha256:hash,checked_at:now-1000},grant:any;const queries:string[]=[];
 const pool={query:async(sql:string)=>{queries.push(sql);return {rows:sql.includes('cloud_capacity_guardians')?(guardian?[guardian]:[]):grant?[grant]:[]};}};
 const check=()=>creditCapacityForSales(pool as never,env,now);
 assert(await check());grant={config_sha256:hash,reserved_micros:9000000};assert(await check());
 grant.reserved_micros=9750000;assert.equal(await check(),false);
 grant={config_sha256:'changed',reserved_micros:0};assert.equal(await check(),false);grant=undefined;
 for(const value of [undefined,{config_sha256:'old-permit',checked_at:now},{config_sha256:hash,checked_at:now-2100000},{config_sha256:hash,checked_at:now+1}]){guardian=value;assert.equal(await check(),false);}
 assert.equal(await creditCapacityForSales({query:async()=>{throw Error('offline');}} as never,env,now),false);
 assert(queries.every(sql=>sql.startsWith('SELECT ')));
});
