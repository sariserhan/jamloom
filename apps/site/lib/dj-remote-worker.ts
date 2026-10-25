import {isDeepStrictEqual} from 'node:util';
import {readBody,validateWav} from './audio-validation';
import type {DJWarmWorker,WarmIdentity} from './dj-warm-worker';
import {validVocalCue} from './dj-vocal';

const code='ca1e85fe9430179831e6bc6be790c332190a3866',weights='19671f406d603126926c1b7e2adc169acbcade22';
// The loopback endpoint is an SSH tunnel, never a public GPU port or browser credential.
export async function runRemoteDJBatch(warm:DJWarmWorker,worker:WarmIdentity,token:string,signal?:AbortSignal,fetcher:typeof fetch=fetch){
 if(!/^[a-f0-9]{64}$/.test(token))throw Error('Renderer token required');
 if(signal?.aborted)return null;
 const sessions=warm.sessions,job=await sessions.claim(worker);if(!job)return null;
 const request={version:1,session:job.session_id,sequence:job.sequence,seed:job.seed,style:job.settings.style,energy:job.settings.energy};
 const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const deadline=setTimeout(cancel,Math.min(35000,sessions.budget.maxRuntimeMs));let checking=false;
 const heartbeat=setInterval(async()=>{if(checking)return;checking=true;try{await sessions.shutdownRequired();if(!await sessions.workerHeartbeat(job.session_id,job.sequence,job.lease))cancel();}catch{cancel();}finally{checking=false;}},3000);
 try{
  const response=await fetcher('http://127.0.0.1:8768/render',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({job:job.lease,request,vocals:job.settings.vocals!==false}),redirect:'error',signal:abort.signal});
  const header=response.headers.get('x-jamloom-receipt');
  if(!response.ok||response.headers.get('content-type')!=='audio/wav'||response.headers.get('content-length')!=='11520044'||!header||header.length>4096){await response.body?.cancel();throw Error('Invalid renderer response');}
  const receipt=JSON.parse(header),audio=await readBody(response.body,11520044);
  if(receipt.version!==1||receipt.job!==job.lease||!isDeepStrictEqual(receipt.request,request)||receipt.code_revision!==code||receipt.weights_revision!==weights||!/^[a-f0-9]{32}$/.test(receipt.engine)||!Number.isSafeInteger(receipt.compute_ms)||receipt.compute_ms<1||receipt.compute_ms>30000||receipt.bytes!==11520044||validateWav(audio,receipt.bytes,receipt.sha256)!==60000||abort.signal.aborted)throw Error('Renderer receipt mismatch');
  if(receipt.vocal!=null&&(!validVocalCue(receipt.vocal)||job.settings.vocals===false||job.sequence%5!==2||job.settings.energy<3))throw Error('Invalid vocal cue');
  await warm.complete(worker,job,audio,receipt.compute_ms,receipt,receipt.vocal??null);
  return {session:job.session_id,sequence:job.sequence,sha256:receipt.sha256,computeMs:receipt.compute_ms};
 }catch(e){await warm.stop(worker);throw e;}
 finally{clearTimeout(deadline);clearInterval(heartbeat);signal?.removeEventListener('abort',cancel);}
}
