import {readFile} from 'node:fs/promises';
import {read,save} from './deployed-common.mts';
import assert from 'node:assert/strict';
const observation=await read('style-observation-private.json'),ids=new Set(observation.workers.map((w:any)=>w.id));
const params=new URLSearchParams({bucketSize:'hour',grouping:'podId',startTime:(await read('style-control-intent.json')).startedAt,endTime:new Date().toISOString()});
const r=await fetch('https://rest.runpod.io/v1/billing/endpoints?'+params,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(20000)});assert(r.ok,'Billing HTTP '+r.status);const all=await r.json();assert(Array.isArray(all));
const rows=all.filter((row:any)=>ids.has(row.podId)),reported=new Set(rows.map((x:any)=>x.podId));
const result={status:'PROVISIONAL',at:new Date().toISOString(),scope:'All exact worker IDs observed during active-worker qualification, including startup and idle; $1 total cap',rows,notYetReported:[...ids].filter(id=>!reported.has(id)),reportedUSD:rows.reduce((sum:number,row:any)=>sum+Number(row.amount),0),finalInvoice:false,missingRowsAreNotZero:true,mutations:false};await save('style-provider-billing.json',result);console.log(JSON.stringify({status:result.status,reportedWorkers:reported.size,pendingWorkers:result.notYetReported.length,reportedUSD:result.reportedUSD}));
