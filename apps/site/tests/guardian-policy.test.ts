import test from 'node:test';
import assert from 'node:assert/strict';
import {providerIdle,guardianNeedsDatabase,type CapacityProvider} from '../lib/cloud-capacity';
import {CLOUD_WORKER_IMAGE} from '../lib/cloud-production-profile';
import {GUARDIAN_FRESH_MS,GUARDIAN_IDLE_FRESH_MS,GUARDIAN_IDLE_SWEEP_MS} from '../lib/cloud-capacity-permit';

const none={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0};
const provider=(workers:{min:number;max:number},health:any,image=CLOUD_WORKER_IMAGE):CapacityProvider=>({
 endpoint:async()=>({id:'fixture',image,workers}),health:async()=>health,catalog:async()=>({}),setWorkers:async()=>{throw Error('never mutate');}});

test('provider idle only when the exact endpoint is 0/0 with no workers or jobs',async()=>{
 const quiet={jobs:{inQueue:0,inProgress:0},workers:none};
 assert.equal(await providerIdle(provider({min:0,max:0},quiet)),true);
 assert.equal(await providerIdle(provider({min:1,max:1},quiet)),false,'activated endpoint');
 assert.equal(await providerIdle(provider({min:0,max:0},{...quiet,workers:{...none,running:1}})),false,'orphan worker');
 assert.equal(await providerIdle(provider({min:0,max:0},{...quiet,jobs:{inQueue:1,inProgress:0}})),false,'queued job');
 assert.equal(await providerIdle(provider({min:0,max:0},quiet,'other-image')),false,'changed identity');
 assert.equal(await providerIdle(provider({min:0,max:0},{})),false,'unreadable health');
});
test('guardian sweeps the database on activity, once after it, and on the idle interval',()=>{
 assert.equal(guardianNeedsDatabase(false,false,0,GUARDIAN_IDLE_SWEEP_MS),true);
 assert.equal(guardianNeedsDatabase(true,true,0,GUARDIAN_IDLE_SWEEP_MS),true,'final sweep after activity');
 assert.equal(guardianNeedsDatabase(true,false,GUARDIAN_IDLE_SWEEP_MS-1,GUARDIAN_IDLE_SWEEP_MS),false);
 assert.equal(guardianNeedsDatabase(true,false,GUARDIAN_IDLE_SWEEP_MS,GUARDIAN_IDLE_SWEEP_MS),true);
 assert(GUARDIAN_IDLE_FRESH_MS>GUARDIAN_IDLE_SWEEP_MS&&GUARDIAN_FRESH_MS<GUARDIAN_IDLE_SWEEP_MS);
});
