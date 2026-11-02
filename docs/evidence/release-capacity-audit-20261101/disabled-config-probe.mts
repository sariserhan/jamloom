import assert from 'node:assert/strict';
import {control,health,endpoint,save,delay} from './deployed-common.mts';
import {CLOUD_WORKER_IMAGE} from '../apps/site/lib/cloud-production-profile';
const before=await control('serverless/'+endpoint),h=await health();
assert.equal(before.image,CLOUD_WORKER_IMAGE);assert.deepEqual(before.workers,{min:0,max:0});assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(v=>v===0));
const catalog=await control('catalog/gpus'),gpu={...before.gpu,count:1,pools:['ADA_24'],excludedTypes:catalog.gpus.filter((g:any)=>g.pool==='ADA_24'&&g.id!=='NVIDIA GeForce RTX 4090').map((g:any)=>g.id)};
const sanitize=(v:any)=>({id:v.id,image:v.image,type:v.type,disk:v.disk,gpu:v.gpu,workers:v.workers,scaling:v.scaling,flashboot:v.flashboot,networkVolumes:v.networkVolumes,mounts:v.mounts});
const report:any={at:new Date().toISOString(),scope:'Disabled configuration roundtrip; workers remain 0/0; no GPU or generation authorized',before:sanitize(before),requestedGpu:gpu,samples:[]};
try{
 const patched=await control('serverless/'+endpoint,{gpu,workers:{min:0,max:0}});report.patchReceipt=sanitize(patched);await save('disabled-config-probe.json',report);assert.deepEqual(patched.workers,{min:0,max:0});
 for(const ms of [0,1000,3000]){await delay(ms);const x=await control('serverless/'+endpoint);report.samples.push({at:new Date().toISOString(),...sanitize(x)});await save('disabled-config-probe.json',report);assert.deepEqual(x.workers,{min:0,max:0});}
}finally{
 const restored=await control('serverless/'+endpoint,{gpu:before.gpu,workers:{min:0,max:0}});assert.deepEqual(restored.workers,{min:0,max:0});assert.deepEqual(restored.gpu,before.gpu);const final=await control('serverless/'+endpoint),end=await health();assert.deepEqual(final.workers,{min:0,max:0});assert.deepEqual(final.gpu,before.gpu);assert.equal(end.jobs.inQueue,0);assert.equal(end.jobs.inProgress,0);assert(Object.values(end.workers).every(v=>v===0));report.restored=true;report.finalHealth=end;await save('disabled-config-probe.json',report);console.log(JSON.stringify(report));
}
