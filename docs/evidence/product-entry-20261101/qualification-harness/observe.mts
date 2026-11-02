import {read,save,delay,health,endpoint} from './deployed-common.mts';
const workers=new Map<string,any>();const samples:any[]=[];const stop=Date.now()+43*60000;
while(Date.now()<stop){
try{const r=await fetch('https://rest.runpod.io/v1/pods?includeWorkers=true&endpointId='+endpoint,{headers:{Authorization:'Bearer '+process.env.RUNPOD_API_KEY},signal:AbortSignal.timeout(15000)});if(r.ok){const pods=await r.json();if(Array.isArray(pods))for(const w of pods)workers.set(w.id,{...w,observedAt:new Date().toISOString()});}
const h=await health();samples.push({at:new Date().toISOString(),...h});await save('style-observation-private.json',{workers:[...workers.values()],samples});console.log(JSON.stringify(samples.at(-1)));}catch(e){console.log('Read-only observer:',(e as Error).message);}
try{await read('style-control-result.json');break;}catch{}await delay(20000);
}
