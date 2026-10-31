import './env';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {HeadObjectCommand} from '@aws-sdk/client-s3';
import {r2Client} from '../lib/audio-store';
import {createPool} from '../lib/database';
import {RunpodProvider} from '../lib/runpod-provider';
import {cloudSongConfig} from '../lib/cloud-song-config';

// Independent GET, HEAD and SELECT checks only; no cleanup mutations or paid dispatch.
const root=resolve('../..'),stage=Number(process.argv[2]);assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=7);
const folder=resolve(root,'build-neural-qualification-20261030/claims');
const claim=JSON.parse(await readFile(resolve(folder,`stage-${stage}.json`),'utf8'));
const result=JSON.parse(await readFile(claim.receipt,'utf8'));
assert.equal(result.studyStage,stage);assert.equal(result.studyManifestSha256,claim.manifest_sha256);
assert.equal(result.qualification,'PASS');assert.equal(result.cleanup,true);assert.equal(result.creditSettlement,true);
assert.equal(result.requests.length,stage===7?9:10);
assert(result.requests.every((r:any)=>r.sourceBoundsVerified&&r.saved&&r.finalState==='completed'&&Number(r.finalBalance?.reserved)===0));
const config=cloudSongConfig({...process.env,CREDIT_BILLING_MODE:'test',JAMLOOM_CLOUD_SONGS_ENABLED:'true'})!;assert.equal(config.endpoint,'jl77hn92npt65k');
const get=async(path:string)=>{const r=await fetch('https://rest.runpod.io/v1/'+path,{headers:{Authorization:'Bearer '+config.key},signal:AbortSignal.timeout(15000)});assert(r.ok,'Provider GET failed');return r.json();};
const control=await get('endpoints/'+config.endpoint);
const health=await new RunpodProvider(config.key,config.endpoint).health();
const workers=await get('endpoints/'+config.endpoint+'/workers');
assert.equal(control.workersMin,0);assert.equal(control.workersMax,0);
assert.equal(health.jobs?.inQueue,0);assert.equal(health.jobs?.inProgress,0);
assert(Object.values(health.workers??{}).every(v=>v===0));assert.equal(workers.summary.total,0);assert.deepEqual(workers.workers,[]);
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');
const pool=createPool(url.href);let temporaryDatabases;
try{temporaryDatabases=(await pool.query("SELECT datname FROM pg_database WHERE datname LIKE 'jamloom_trial_%'")).rows;assert.deepEqual(temporaryDatabases,[]);}finally{await pool.end();}
assert.equal(result.removedKeys?.length,result.removedObjects);assert(result.removedObjects>0);
const client=r2Client();
try{for(const key of result.removedKeys){
 let absent=false;
 try{await client.send(new HeadObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(15000)});}catch(e:any){if(e?.$metadata?.httpStatusCode===404)absent=true;else throw e;}
 assert(absent,'Temporary test object still exists');
}}finally{client.destroy();}
const check={at:new Date().toISOString(),operation:'Independent GET, HEAD and SELECT only',receipt:claim.receipt,stage,workerLimits:[0,0],health,workers,temporaryDatabases,remoteObjectsConfirmedAbsent:result.removedObjects,cleanup:'PASS',qualification:'PASS'};
await writeFile(resolve(folder,`stage-${stage}-postcheck.json`),JSON.stringify(check,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({stage,cleanup:'PASS',qualification:'PASS',remoteObjectsConfirmedAbsent:result.removedObjects}));
