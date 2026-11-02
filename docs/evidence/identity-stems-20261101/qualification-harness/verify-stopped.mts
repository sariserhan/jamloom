import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {control,health,endpoint,database,save} from './deployed-common.mts';
import {Wallet} from '../apps/site/lib/wallet';
const plan=JSON.parse(await readFile(new URL('../docs/evidence/identity-stems-20261101/hosted-plan.json',import.meta.url),'utf8'));
const [e,h]=await Promise.all([control('serverless/'+endpoint),health()]);
assert.deepEqual(e.workers,{min:0,max:0});assert.equal(e.image,plan.image);assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(v=>v===0));
const r=await fetch('https://rest.runpod.io/v1/pods?includeWorkers=true&endpointId='+endpoint,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(15000)});assert(r.ok);assert.deepEqual(await r.json(),[]);
for(const name of ['claimed.json','style-control-intent.json','style-http-state.json','request-claimed-improvise.json']){let exists=true;try{await access(new URL(name,import.meta.url));}catch(err:any){if(err.code==='ENOENT')exists=false;else throw err;}assert(!exists,name+' unexpectedly exists');}
const alias=JSON.parse(await readFile(new URL('alias-private.json',import.meta.url),'utf8'));
assert.equal(alias.deployment?.id??alias.deploymentId,'dpl_6bA5QCLSMvBSXZ178kxHzFMBUqgC');
const account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/review-account-private.json',import.meta.url),'utf8')),pool=database();
try{
 const pending=(await pool.query("SELECT count(*)::int n FROM dna_song_jobs WHERE state IN ('queued','running')")).rows[0].n;assert.equal(pending,0);
 const jobs=(await pool.query('SELECT count(*)::int n FROM dna_song_jobs WHERE owner_id=$1 AND created_at >= $2',[account.id,plan.approvedAt])).rows[0].n;
 const uploads=(await pool.query('SELECT count(*)::int n FROM song_uploads WHERE owner_id=$1 AND created_at >= $2',[account.id,plan.approvedAt])).rows[0].n;assert.equal(jobs,0);assert.equal(uploads,0);
 const test=await new Wallet(pool,false).balance(account.id),live=await new Wallet(pool,true).balance(account.id);assert.equal(test.reserved,0);assert.equal(test.available,2970);assert.equal(live.reserved,0);assert.equal(live.available,0);
 const routes=[];for(const path of ['/music-dna','/improvise','/api/taste/song','/api/improvise/song']){const res=await fetch('https://www.jamloom.com'+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(res.status,200);if(path.startsWith('/api/')){const b=await res.json();assert.equal(b.available,false);assert.equal(b.signedIn,false);routes.push({path,status:res.status,available:false,signedIn:false});}else{await res.body?.cancel();routes.push({path,status:res.status});}}
 const report={status:'PASS',at:new Date().toISOString(),mutations:false,workerLimits:e.workers,health:h,workerInventoryEmpty:true,pendingJobs:pending,newReviewJobs:jobs,newReviewUploads:uploads,testBalance:test,liveBalance:live,heldDeploymentUnchanged:true,heldDeploymentId:'dpl_6bA5QCLSMvBSXZ178kxHzFMBUqgC',routes,gpuActivated:false,generationSubmitted:false,remoteCleanup:'NOT NEEDED; no source upload or generation started'};await save('stopped-verification.json',report);console.log(JSON.stringify(report));
}finally{await pool.end();}
