import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {read,save,control,health,endpoint,database,delay} from './deployed-common.mts';
import {DnaCommerce} from '../apps/site/lib/dna-commerce';
import {r2AudioStore,r2Client} from '../apps/site/lib/audio-store';
import {Wallet} from '../apps/site/lib/wallet';
const require=createRequire(new URL('../apps/site/package.json',import.meta.url));const {HeadObjectCommand}=require('@aws-sdk/client-s3');
const result=await read('style-http-result.json'),intent=await read('style-control-intent.json'),c=await read('style-control-result.json'),account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/course-review-account-private.json',import.meta.url),'utf8'));assert.equal(c.cleanup,true);assert.equal(c.remoteGuardianStopped,true);
const before=await control('serverless/'+endpoint),h=await health();assert.equal(before.workers.min,0);assert.equal(before.workers.max,0);assert.deepEqual(before.gpu,intent.previousGpu);assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(v=>v===0));
const ir=await fetch('https://rest.runpod.io/v1/pods?includeWorkers=true&endpointId='+endpoint,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(15000)});assert(ir.ok);const inventory=await ir.json();assert.deepEqual(inventory,[]);
const pool=database(),store=r2AudioStore(),keys=new Set<string>(),client=r2Client();const rows:any[]=[];
try{
 for(const request of result.requests){
  assert(/^[a-f0-9]{32}$/.test(request.id));
  const row=(await pool.query('SELECT d.*,c.output_key,c.source_id,c.provider_id,c.provider_status FROM dna_song_jobs d JOIN cloud_song_runs c ON c.id=d.id WHERE d.id=$1',[request.id])).rows[0];
  if(row){assert.equal(row.owner_id,account.id);assert.equal(row.billing_live,false);assert.equal(row.visibility,'private');
   const commerce=new DnaCommerce(pool,process.env.BETTER_AUTH_SECRET!,store,{product:request.product,live:false});
   // Provider is independently confirmed empty before settling interrupted test jobs.
   if(!['completed','failed','cancelled'].includes(row.state))await commerce.finish(row.id,'cancelled');
   if(row.audio_key)keys.add(row.audio_key);if(row.output_key)keys.add(row.output_key);
   if(row.source_id){const source=(await pool.query('SELECT owner_id,object_key FROM song_uploads WHERE id=$1',[row.source_id])).rows[0];if(source){assert.equal(source.owner_id,account.id);keys.add(source.object_key);}}
   rows.push({id:row.id,product:row.product,state:(await commerce.row(row.id)).state,providerId:row.provider_id,providerStatus:row.provider_status});
  }
  if(request.sourceId){const source=(await pool.query('SELECT owner_id,object_key FROM song_uploads WHERE id=$1',[request.sourceId])).rows[0];if(source){assert.equal(source.owner_id,account.id);keys.add(source.object_key);}}
 }
 await save('style-cleanup-keys-private.json',{keys:[...keys],rows});
 for(const key of keys){await store.remove(key);let absent=false;try{await client.send(new HeadObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(15000)});}catch(e:any){if(e?.$metadata?.httpStatusCode===404)absent=true;else throw e;}assert(absent,'Test object still exists');}
 // Preserve immutable costs, reservations and provider receipts. Only remove audio/phrase metadata from these private diagnostic records.
 const ids=rows.map(r=>r.id);if(ids.length){await pool.query("UPDATE dna_song_jobs SET audio_key=NULL,audio_sha256=NULL,audio_bytes=NULL,song_plan=NULL,profile='{}'::jsonb,withdrawn_at=now() WHERE id=ANY($1::text[]) AND owner_id=$2 AND NOT billing_live",[ids,account.id]);await pool.query('UPDATE cloud_song_runs SET cleanup_at=now() WHERE id=ANY($1::text[])',[ids]);}
 const balance=await new Wallet(pool,false).balance(account.id);assert.equal(balance.reserved,0);const pending=(await pool.query("SELECT count(*)::int n FROM dna_song_jobs WHERE state IN ('queued','running')")).rows[0].n;assert.equal(pending,0);
 const report={status:'PASS',at:new Date().toISOString(),qualification:result.status,workerLimits:[0,0],previousHardwareRestored:true,health:h,workerInventory:inventory,remoteObjectsConfirmedAbsent:keys.size,pendingJobs:pending,testReservedCredits:balance.reserved,costReservationsPreserved:true,rows};await save('style-cleanup.json',report);console.log(JSON.stringify({status:'PASS',qualification:result.status,remoteObjectsConfirmedAbsent:keys.size}));
}finally{client.destroy();await pool.end();}
