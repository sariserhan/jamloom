import {assertActiveWorkerLease} from '../apps/site/lib/cloud-capacity-lease';
import assert from 'node:assert/strict';
import {hasReadySongWorker} from '../apps/site/lib/cloud-readiness';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dir,read,save,control,health,delay,endpoint,database} from './deployed-common.mts';
import {assertProductionEndpoint,CLOUD_WORKER_IMAGE} from '../apps/site/lib/cloud-production-profile';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/product-entry-20261101/hosted-plan.json',import.meta.url),'utf8'));
assert.equal(plan.maxUSD,3);assert.equal(plan.maxRequests,1);assert.equal(plan.maxSeconds,2400);assert.equal(plan.maxWorkers,1);assert.equal(plan.activeWorkers,1);assert.equal(plan.retries,0);
for(const [file,sha] of Object.entries(plan.harnessSHA256))assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),sha,'Reviewed harness changed');
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({status:'PASS',mode:'dry-run',requests:1,maxUSD:3,workers:1,activeWorkers:1,preparationSeconds:1200,maxSeconds:2400,providerOperations:0}));process.exit(0);}
assert(process.argv.includes('--apply'));assert.equal(plan.status,'APPROVED');assert.equal(plan.image,CLOUD_WORKER_IMAGE);
const lease=await read('lease.json');assertActiveWorkerLease(lease,Date.now(),12*60000);
const pool=database(),state:any={startedAt:new Date().toISOString(),deadline:lease.expiresAt,requests:[],cleanup:false};let watchdog:any,activated=false;
try{
 const expiry=Date.parse(await readFile(new URL('review-expiry.txt',dir),'utf8'));assert(expiry>=lease.expiresAt);assert(state.deadline-Date.now()>12*60000);
 assert.equal((await pool.query("SELECT count(*)::int n FROM dna_song_jobs WHERE state IN ('queued','running')")).rows[0].n,0);
 assert.equal((await read('style-preflight.json')).status,'PASS');
 const cron=await fetch('https://www.jamloom.com/api/song-jobs',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET},signal:AbortSignal.timeout(20000)});assert(cron.ok);assert.deepEqual((await cron.json()).capacity,{stopped:false},'Hosted shutdown guard must be deployed before activation');
 const before=await control('serverless/'+endpoint),h=await health();assert.equal(before.image,CLOUD_WORKER_IMAGE);assert.deepEqual(before.workers,{min:0,max:0});assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(n=>n===0));
 state.previousGpu=before.gpu;const catalog=await control('catalog/gpus'),gpu={...before.gpu,count:1,pools:['AMPERE_24'],excludedTypes:catalog.gpus.filter((g:any)=>g.pool==='AMPERE_24'&&g.id!=='NVIDIA L4').map((g:any)=>g.id)};
 assertProductionEndpoint({...before,gpu,workers:{min:1,max:1}},catalog,lease);
 await writeFile(new URL('claimed.json',dir),JSON.stringify({at:new Date().toISOString(),plan}),{flag:'wx',mode:0o600});await save('style-control-intent.json',state);
 watchdog=spawn(process.execPath,['--import','tsx',new URL('watchdog.mts',dir).pathname],{cwd:process.cwd(),env:process.env,detached:true,stdio:'ignore'});watchdog.unref();
 for(let n=0;n<40;n++){try{assert.equal((await read('style-watchdog-ready.json')).deadline,state.deadline);break;}catch{if(n===39)throw Error('Independent watchdog did not start');await delay(250);}}
 activated=true;await control('serverless/'+endpoint,{gpu,workers:{min:1,max:1}});state.activatedAt=new Date().toISOString();await save('style-control-state.json',state);
 assertProductionEndpoint(await control('serverless/'+endpoint),await control('catalog/gpus'),lease);
 const readyDeadline=Math.min(Date.now()+1200*1000,state.deadline-12*60000);let ready=false;state.preparationDeadline=readyDeadline;state.preparationSamples=[];
 while(Date.now()<readyDeadline){try{const result=await read('style-http-result.json');if(result.status==='FAIL')throw Error('HTTP preflight stopped');}catch(e){if((e as any).code!=='ENOENT')throw e;}const sample=await health();assert.equal(sample.jobs.inQueue,0);assert.equal(sample.jobs.inProgress,0);assert.equal(sample.jobs.retried,h.jobs.retried);state.preparationSamples.push({at:new Date().toISOString(),...sample});await save('style-control-state.json',state);if(Date.now()<readyDeadline&&hasReadySongWorker(sample)){ready=true;break;}await delay(10000);}
 assert(ready,'No active running and ready L4 within preparation limit; no generation request authorized');assert(state.deadline-Date.now()>12*60000);
 state.readyAt=new Date().toISOString();state.activeCapacityVerified=true;state.coldStart=false;await save('style-ready.json',state);console.log('Active running and ready L4 verified; one request may proceed, no warmup generation');
 while(Date.now()<state.deadline){try{state.result=await read('style-http-result.json');break;}catch{await delay(5000);}}
 assert(state.result,'HTTP controller did not finish by deadline');
}catch(e){state.error=(e as Error).message;console.log('Controller stopped:',state.error);}
finally{
 if(activated){await control('serverless/'+endpoint,{workers:{min:0,max:0},gpu:state.previousGpu});state.disabledAt=new Date().toISOString();for(let n=0;n<26;n++){const h=await health();await save('style-health.json',{at:new Date().toISOString(),...h});if(h.jobs.inQueue===0&&h.jobs.inProgress===0&&Object.values(h.workers).every(v=>v===0)){state.cleanup=true;break;}await delay(5000);}}
 if(state.cleanup||!activated)watchdog?.kill();await save('style-control-result.json',state);await pool.end();console.log(JSON.stringify({cleanup:state.cleanup,error:state.error,result:state.result?.status}));
}
