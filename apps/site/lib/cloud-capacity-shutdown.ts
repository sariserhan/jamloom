import {activeWorkerLease} from './cloud-capacity-lease';
import {CLOUD_WORKER_IMAGE} from './cloud-production-profile';
// Called by the authenticated hosted recovery cron, independently of this Mac.
// An expired lease can only disable its configured endpoint, never enable work.
export async function stopExpiredActiveCapacity(env:Record<string,string|undefined>=process.env,request:typeof fetch=fetch,now=Date.now()){
 const lease=activeWorkerLease(env);if(!lease||now<lease.expiresAt)return {stopped:false};
 const key=env.RUNPOD_API_KEY,endpoint=env.RUNPOD_ENDPOINT_ID;
 if(!key||!endpoint||! /^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))throw Error('Expired capacity credentials unavailable');
 const url='https://api.runpod.io/v2/serverless/'+endpoint,headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const response=await request(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Expired capacity could not be inspected');
 const before=await response.json();
 if(before.id!==endpoint||before.image!==CLOUD_WORKER_IMAGE)throw Error('Expired capacity identity changed');
 if(before.workers?.min===0&&before.workers?.max===0)return {stopped:true,alreadyDisabled:true};
 const stopped=await request(url,{method:'PATCH',headers,body:JSON.stringify({workers:{min:0,max:0}}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!stopped.ok)throw Error('Expired capacity shutdown pending');
 const after=await stopped.json();
 if(after.id!==endpoint||after.workers?.min!==0||after.workers?.max!==0)throw Error('Expired capacity shutdown unconfirmed');
 return {stopped:true,alreadyDisabled:false};
}
