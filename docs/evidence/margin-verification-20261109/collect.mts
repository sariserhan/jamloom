// Read-only evidence. Run from apps/site with the existing private .env.local.
import '../../../apps/site/scripts/env';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPool} from '../../../apps/site/lib/database';
import {r2Client} from '../../../apps/site/lib/audio-store';
import {ListObjectsV2Command,GetBucketLifecycleConfigurationCommand} from '../../../apps/site/node_modules/@aws-sdk/client-s3/dist-cjs/index.js';
const result:any={at:new Date().toISOString(),mutations:false,qualificationEnabled:false};
const url=new URL(process.env.DATABASE_URL!);assert(url.hostname.endsWith('.neon.tech'),'Expected configured Neon target');
const pool=createPool(url.toString()),db=await pool.connect();
try{
 await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await db.query("SET LOCAL statement_timeout='15s'");
 const queries={
  proceeds:`SELECT count(*)::int receipts,count(*) FILTER(WHERE settled AND NOT revoked)::int settled_receipts,COALESCE(sum(net_micros) FILTER(WHERE settled AND NOT revoked),0)::text settled_net_micros FROM gpu_payment_proceeds`,
  apple:`SELECT state,count(*)::int reports,COALESCE(sum(settled_usd_micros),0)::text settled_micros FROM apple_finance_reports GROUP BY state`,
  lots:`SELECT provider,count(*)::int lots,COALESCE(sum(credits),0)::text granted_credits,COALESCE(sum(net_micros),0)::text recorded_net_micros FROM credit_lots GROUP BY provider`,
  songs:`SELECT product,billing_live,state,count(*)::int jobs,COALESCE(sum(audio_bytes),0)::text audio_bytes,COALESCE(max(audio_bytes),0)::text max_audio_bytes FROM dna_song_jobs GROUP BY product,billing_live,state`,
  recordings:`SELECT state,count(*)::int recordings,COALESCE(sum(bytes),0)::text bytes,COALESCE(sum(seconds),0) seconds FROM dj_recordings GROUP BY state`,
  cycles:`SELECT endpoint,starts_at::text,expires_at::text,ready_at::text,stopped_at::text,cap_micros::text,state,reason FROM cloud_capacity_cycles ORDER BY starts_at`,
  support:`SELECT kind,status,count(*)::int tickets FROM support_tickets GROUP BY kind,status`,
  subscriptions:`SELECT provider,status,count(*)::int subscriptions FROM credit_subscriptions GROUP BY provider,status`
 };
 result.database={};for(const [name,sql] of Object.entries(queries))result.database[name]=(await db.query(sql)).rows;
 await db.query('COMMIT');
}finally{db.release();await pool.end();}
await writeFile(new URL('ledger.json',import.meta.url),JSON.stringify({...result.database,at:result.at,mutations:false},null,2)+'\n');
const endpoint='jl77hn92npt65k',window={startTime:'2026-11-01T00:00:00.000Z',endTime:result.at};
const billing:any={at:result.at,window,endpoint,finalInvoice:false,mutations:false};
for(const grouping of ['endpointId','podId']){
 const params=new URLSearchParams({...window,endpointId:endpoint,bucketSize:'hour',grouping});
 const response=await fetch('https://rest.runpod.io/v1/billing/endpoints?'+params,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(20000)});
 assert(response.ok,'Runpod billing HTTP '+response.status);const rows=await response.json();assert(Array.isArray(rows));
 billing[grouping]=rows;
}
billing.postedEndpointUSD=billing.endpointId.reduce((s:number,r:any)=>s+Number(r.amount),0);
billing.postedWorkerUSD=billing.podId.reduce((s:number,r:any)=>s+Number(r.amount),0);
billing.residualUSD=billing.postedEndpointUSD-billing.postedWorkerUSD;assert(Math.abs(billing.residualUSD)<1e-9);
billing.scope='All posted endpoint hours including development, review and public work; not automatically customer cost. Current hour provisional.';
await writeFile(new URL('provider-billing.json',import.meta.url),JSON.stringify(billing,null,2)+'\n');
const client=r2Client();let token:string|undefined,objects=0,bytes=0,pages=0;
const groups:Record<string,{objects:number,bytes:number}>={};
try{
 do{
  assert(++pages<=100,'Inventory exceeded 100 pages');
  const page=await client.send(new ListObjectsV2Command({Bucket:process.env.R2_BUCKET,ContinuationToken:token,MaxKeys:1000}),{abortSignal:AbortSignal.timeout(20000)});
  for(const o of page.Contents??[]){assert(Number.isSafeInteger(o.Size)&&o.Size!>=0);objects++;bytes+=o.Size!;
   const raw=o.Key?.split('/')[0]??'other';const category=['music-dna','improvise','dj-studio','live-dj','academy','uploads','masters'].includes(raw)?raw:'other';
   const group=groups[category]??={objects:0,bytes:0};group.objects++;group.bytes+=o.Size!;
  }
  token=page.IsTruncated?page.NextContinuationToken:undefined;assert(!page.IsTruncated||token);
 }while(token);
 let lifecycle:any;
 try{const policy=await client.send(new GetBucketLifecycleConfigurationCommand({Bucket:process.env.R2_BUCKET}),{abortSignal:AbortSignal.timeout(20000)});lifecycle={status:'READ',rules:policy.Rules?.map(r=>({status:r.Status,expirationDays:r.Expiration?.Days,expirationDate:r.Expiration?.Date,abortMultipartDays:r.AbortIncompleteMultipartUpload?.DaysAfterInitiation,prefix:r.Filter?.Prefix??r.Prefix}))??[]};}
 catch(error:any){lifecycle={status:'UNAVAILABLE',code:error.name,httpStatus:error.$metadata?.httpStatusCode};}
 result.storage={at:new Date().toISOString(),objects,bytes,pages,groups,lifecycle,standardStorageTariffUSDPerGBMonth:0.015,unroundedMonthlyStorageUSDAtCurrentBytes:bytes/1e9*0.015,scope:'Current bytes only, not historical GB-months, operations, account rounding, free-tier allocation, invoice or future lifetime.',audioDownloaded:false,mutations:false};
 await writeFile(new URL('storage.json',import.meta.url),JSON.stringify(result.storage,null,2)+'\n');
}finally{client.destroy();}
console.log(JSON.stringify({ledger:'PASS',providerPostedUSD:billing.postedEndpointUSD,residualUSD:billing.residualUSD,storage:result.storage},null,2));
