import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dir,read,save,control,health,delay,endpoint,database} from './deployed-common.mts';
import {capacityPermit,capacityLease} from '../apps/site/lib/cloud-capacity-permit';
import {assertProductionEndpoint,CLOUD_WORKER_IMAGE,CLOUD_COST_PROFILE} from '../apps/site/lib/cloud-production-profile';
import {hasReadySongWorker} from '../apps/site/lib/cloud-readiness';
import {remoteGuardian} from './remote-guardian.mts';
import {checkSource} from '../apps/site/lib/cloud-songs';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/readiness-recovery-20261102/hosted-plan.json',import.meta.url),'utf8'));
assert.equal(plan.maxUSD,0.75);assert.equal(plan.aggregateMaxUSD,1);assert.equal(plan.priorReservedUSD,0.25);assert.equal(plan.maxRequests,2);assert.equal(plan.maxWorkers,1);assert.equal(plan.maxCycles,1);assert.equal(plan.activeSeconds,2400);assert.equal(plan.retries,0);assert.equal(plan.image,CLOUD_WORKER_IMAGE);assert.equal(plan.profile,CLOUD_COST_PROFILE);
const source=await readFile(new URL('../renders/neural-question-input-20261030/source-16k-mono.wav',import.meta.url));checkSource(source,source.length,plan.sourceSHA256);
for(const [file,sha] of Object.entries(plan.harnessSHA256??{}))assert.equal(createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex'),sha);
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({status:'PASS',maxUSD:0.75,aggregateMaxUSD:1,requests:2,cycles:1,activeSeconds:2400,sourceValidation:'PASS',providerOperations:0}));process.exit(0);}
assert(process.argv.includes('--apply'));assert.equal(plan.status,'APPROVED');
const p=await read('permit.json');capacityPermit({JAMLOOM_CLOUD_CAPACITY_PERMIT:JSON.stringify(p)},CLOUD_COST_PROFILE);
assert(Date.now()+2400000<=p.expiresAt,'Deployment consumed preparation allowance');
const lease={startsAt:Date.now(),expiresAt:Date.now()+2400000,maxMicros:750000};
await writeFile(new URL('lease.json',dir),JSON.stringify(lease),{flag:'wx',mode:0o600});
const state:any={startedAt:new Date().toISOString(),deadline:lease.expiresAt,cleanup:false};
const pool=database();let watchdog:any,configured=false;
try{
 for(let n=0;n<30;n++){try{assert.equal((await read('style-preflight.json')).status,'PASS');break;}catch{if(n===29)throw Error('HTTP preflight missing');await delay(2000);}}
 assert.equal((await pool.query("SELECT count(*)::int n FROM dna_song_jobs WHERE state IN ('queued','running')")).rows[0].n,0);
 const before=await control('serverless/'+endpoint),h=await health();assert.equal(before.image,CLOUD_WORKER_IMAGE);assert.deepEqual(before.workers,{min:0,max:0});assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(n=>n===0));
 state.previousGpu=before.gpu;const catalog=await control('catalog/gpus'),gpu={...before.gpu,count:1,pools:['AMPERE_24'],excludedTypes:catalog.gpus.filter((g:any)=>g.pool==='AMPERE_24'&&g.id!=='NVIDIA L4').map((g:any)=>g.id)};
 assertProductionEndpoint({...before,gpu,workers:{min:1,max:1}},catalog,capacityLease(p,Date.now()),CLOUD_COST_PROFILE);
 await writeFile(new URL('claimed.json',dir),JSON.stringify({at:new Date().toISOString(),plan}),{flag:'wx',mode:0o600});await save('style-control-intent.json',state);
 watchdog=spawn(process.execPath,['--import','tsx',new URL('watchdog.mts',dir).pathname],{cwd:process.cwd(),env:process.env,detached:true,stdio:'ignore'});watchdog.unref();
 for(let n=0;n<40;n++){try{assert.equal((await read('style-watchdog-ready.json')).deadline,state.deadline);break;}catch{if(n===39)throw Error('Deadline watchdog missing');await delay(250);}}
 configured=true;const patched=await control('serverless/'+endpoint,{gpu,workers:{min:0,max:0}});assert.deepEqual(patched.workers,{min:0,max:0});
 state.remoteGuardianAttempted=true;await save('style-control-intent.json',state);await remoteGuardian('start',p);
 for(let n=0;n<30;n++){const g=(await pool.query('SELECT checked_at FROM cloud_capacity_guardians WHERE endpoint=$1',[endpoint])).rows[0];if(g&&Number(g.checked_at)>=lease.startsAt)break;if(n===29)throw Error('Guardian heartbeat missing');await delay(1000);}
 await save('style-prepare-ready.json',{at:new Date().toISOString(),activationCalls:0});
 const readyDeadline=Math.min(Date.now()+1200000,state.deadline-16*60000);state.preparationDeadline=readyDeadline;
 let ready=false;while(Date.now()<readyDeadline){
  try{const result=await read('style-http-result.json');if(result.status==='FAIL')throw Error('HTTP qualification stopped');}catch(e){if((e as any).code!=='ENOENT')throw e;}
  const h=await health();assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);
  const c=(await pool.query("SELECT state FROM cloud_capacity_cycles WHERE permit_id=$1",[p.id])).rows[0];
  if(c&&['stopping','stopped'].includes(c.state))throw Error('Preparation stopped');
  if(c?.state==='ready'&&hasReadySongWorker(h)){ready=true;break;}await delay(5000);
 }
 assert(ready,'No usable L4 within preparation limit');await save('style-ready.json',state);
 while(Date.now()<state.deadline-30000){try{state.result=await read('style-http-result.json');break;}catch{await delay(3000);}}
 assert.equal(state.result?.status,'PASS','Generation did not pass');
 const idleUntil=Math.min(state.deadline,Date.now()+160000);while(Date.now()<idleUntil){const h=await health();const c=(await pool.query('SELECT state FROM cloud_capacity_cycles WHERE permit_id=$1',[p.id])).rows[0];if(c?.state==='stopped'&&Object.values(h.workers).every(n=>n===0)){state.idleShutdown=true;break;}await delay(5000);}
 assert.equal(state.idleShutdown,true,'Idle shutdown did not complete');
}catch(e){state.error=(e as Error).message;}
finally{
 const cleanupDeadline=Math.min(state.deadline+130000,Date.now()+125000);
 // Stop the independent guardian and provider concurrently; neither may delay
 // the other beyond this stage's explicit shutdown allowance.
 const remoteStop=state.remoteGuardianAttempted?remoteGuardian('stop',p).then(()=>{state.remoteGuardianStopped=true;}).catch(e=>{state.remoteGuardianStopError=(e as Error).message;}):Promise.resolve();
 try{
  if(configured){
   await control('serverless/'+endpoint,{workers:{min:0,max:0},gpu:state.previousGpu});
   while(Date.now()<cleanupDeadline-15000){const h=await health();if(h.jobs.inQueue===0&&h.jobs.inProgress===0&&Object.values(h.workers).every(v=>v===0)){state.cleanup=true;break;}await delay(Math.min(5000,Math.max(1,cleanupDeadline-Date.now()-15000)));}
  }
 }catch(e){state.cleanupError=(e as Error).message;}
 await remoteStop;
 if(state.cleanup||!configured)watchdog?.kill();await save('style-control-result.json',state);await pool.end();console.log(JSON.stringify({cleanup:state.cleanup,remoteGuardianStopped:state.remoteGuardianStopped,result:state.result?.status,error:state.error}));
}
