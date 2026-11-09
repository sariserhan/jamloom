import assert from 'node:assert/strict';
import {control,health,endpoint,save} from './deployed-common.mts';
const e=await control('serverless/'+endpoint),h=await health();assert.deepEqual(e.workers,{max:0,min:0});assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(v=>v===0));
const response=await fetch('https://rest.runpod.io/v1/pods?includeWorkers=true&endpointId='+endpoint,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(20000)});assert(response.ok);const inventory=await response.json();assert.deepEqual(inventory,[]);
const routes=[];for(const path of ['/api/taste/song','/api/improvise/song']){const r=await fetch('https://www.jamloom.com'+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);assert.equal((await r.json()).available,false);routes.push({path,status:r.status,available:false});}
const result={status:'PASS',at:new Date().toISOString(),mutations:false,workerLimits:[0,0],health:h,inventory,routes};await save('final-readonly.json',result);console.log(JSON.stringify(result));
