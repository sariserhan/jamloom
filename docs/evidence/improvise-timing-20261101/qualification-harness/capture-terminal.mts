import {writeFile} from 'node:fs/promises';
import {control,endpoint,dir} from './deployed-common.mts';
export async function captureTerminal(deadline:number){
 // Best-effort private receipt before scale-down. Never delay shutdown past deadline.
 if(Date.now()>=deadline)return;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),Math.max(1,Math.min(5000,deadline-Date.now())));
 try{
  const inventory=await control('serverless/'+endpoint+'/workers',undefined,Math.max(1,Math.min(1000,deadline-Date.now())));
  const workers=inventory.workers??[];
  if(workers.length!==1||!/^[a-zA-Z0-9_-]{1,128}$/.test(workers[0].id))return;
  const r=await fetch(`https://api.runpod.io/v2/serverless/${endpoint}/workers/${workers[0].id}/logs?source=container&tail=300`,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:abort.signal});
  if(!r.ok||!r.body)return;
  const reader=r.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(bytes<1024*1024){const n=await reader.read();if(n.done)break;const b=n.value.subarray(0,1024*1024-bytes);chunks.push(b);bytes+=b.length;}}catch{}finally{try{await reader.cancel();}catch{}}
  if(bytes)await writeFile(new URL('terminal-worker-private.log',dir),Buffer.concat(chunks),{mode:0o600});
 }catch{}finally{clearTimeout(timer);abort.abort();}
}
