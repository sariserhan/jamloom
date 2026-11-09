import {read,save,delay,health,endpoint,control} from './deployed-common.mts';
import {writeFile} from 'node:fs/promises';
const permit=await read('permit.json'),stop=Math.min(permit.expiresAt,Date.now()+25*60000);
const workers=new Map<string,any>(),samples:any[]=[],captures:any[]=[];
// Read-only and independent of the controller. Preserve short-lived workers' logs
// before Runpod retires them; logs stay private and are never printed or committed.
async function logs(id:string){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id))return;
 const chunks:Uint8Array[]=[];let bytes=0,status:number|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),Math.max(1,Math.min(4000,stop-Date.now())));
 try{
  const response=await fetch(`https://api.runpod.io/v2/serverless/${endpoint}/workers/${id}/logs?tail=300`,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:abort.signal});status=response.status;
  if(response.ok&&response.body){reader=response.body.getReader();while(bytes<1024*1024){const next=await reader.read();if(next.done)break;const remaining=1024*1024-bytes;chunks.push(next.value.subarray(0,remaining));bytes+=Math.min(next.value.length,remaining);}}
 }catch{}finally{clearTimeout(timer);try{await reader?.cancel();}catch{}abort.abort();}
 const at=new Date().toISOString();
 if(bytes)await writeFile(new URL(`worker-${id}-${captures.length}-private.log`,import.meta.url),Buffer.concat(chunks),{mode:0o600});
 captures.push({id,at,status,bytes});
}
while(Date.now()<stop){
 try{
  const inventory=await control('serverless/'+endpoint+'/workers');
  for(const w of inventory.workers??[]){workers.set(w.id,{...w,observedAt:new Date().toISOString()});if(captures.length<300)await logs(w.id);}
  const h=await health();samples.push({at:new Date().toISOString(),...h});await save('style-observation-private.json',{workers:[...workers.values()],samples,captures});
  console.log(JSON.stringify({at:new Date().toISOString(),workers:h.workers,observedWorkers:workers.size,logCaptures:captures.length}));
 }catch(e){console.log('Read-only observer unavailable');}
 try{await read('live-check-result.json');break;}catch{}
 await delay(Math.max(1,Math.min(15000,stop-Date.now())));
}
