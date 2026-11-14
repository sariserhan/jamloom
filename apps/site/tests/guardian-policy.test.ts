import test from 'node:test';
import assert from 'node:assert/strict';
import {providerIdle,guardianNeedsDatabase,type CapacityProvider} from '../lib/cloud-capacity';
import {CLOUD_WORKER_IMAGE} from '../lib/cloud-production-profile';
import {GUARDIAN_FRESH_MS,GUARDIAN_IDLE_FRESH_MS,GUARDIAN_IDLE_SWEEP_MS} from '../lib/cloud-capacity-permit';

const none={idle:0,ready:0,running:0,initializing:0,throttled:0,unhealthy:0};
const provider=(workers:{min:number;max:number},health:any,image=CLOUD_WORKER_IMAGE,id='fixture'):CapacityProvider=>({
 endpoint:async()=>({id,image,workers}),health:async()=>health,catalog:async()=>({}),setWorkers:async()=>{throw Error('never mutate');}});

test('provider idle only when the exact endpoint is 0/0 with no workers or jobs',async()=>{
 const quiet={jobs:{inQueue:0,inProgress:0},workers:none};
 assert.equal(await providerIdle(provider({min:0,max:0},quiet),'fixture'),true);
 assert.equal(await providerIdle(provider({min:1,max:1},quiet),'fixture'),false,'activated endpoint');
 assert.equal(await providerIdle(provider({min:0,max:0},{...quiet,workers:{...none,running:1}}),'fixture'),false,'orphan worker');
 assert.equal(await providerIdle(provider({min:0,max:0},{...quiet,jobs:{inQueue:1,inProgress:0}}),'fixture'),false,'queued job');
 assert.equal(await providerIdle(provider({min:0,max:0},quiet,'other-image'),'fixture'),false,'changed identity');
 assert.equal(await providerIdle(provider({min:0,max:0},{}),'fixture'),false,'unreadable health');
 assert.equal(await providerIdle(provider({min:0,max:0},quiet,CLOUD_WORKER_IMAGE,'other-endpoint'),'fixture'),false,'changed endpoint id');
});
test('guardian sweeps the database on activity, once after it, and on the idle interval',()=>{
 assert.equal(guardianNeedsDatabase(false,false,0,GUARDIAN_IDLE_SWEEP_MS),true);
 assert.equal(guardianNeedsDatabase(true,true,0,GUARDIAN_IDLE_SWEEP_MS),true,'final sweep after activity');
 const at=(h:number,m:number)=>Date.UTC(2026,10,14,h,m,10);
 assert.equal(guardianNeedsDatabase(true,false,600000,GUARDIAN_IDLE_SWEEP_MS,at(2,11)),false,'idle mid-window');
 assert.equal(guardianNeedsDatabase(true,false,600000,GUARDIAN_IDLE_SWEEP_MS,at(2,30)),true,'aligned half hour');
 assert.equal(guardianNeedsDatabase(true,false,60000,GUARDIAN_IDLE_SWEEP_MS,at(2,30)),false,'already swept this window');
 assert.equal(guardianNeedsDatabase(true,false,GUARDIAN_IDLE_SWEEP_MS+300000,GUARDIAN_IDLE_SWEEP_MS,at(2,17)),true,'backstop');
 assert(GUARDIAN_IDLE_FRESH_MS>=GUARDIAN_IDLE_SWEEP_MS+300000&&GUARDIAN_FRESH_MS<GUARDIAN_IDLE_SWEEP_MS);
});
