import './env';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {createPool} from '../lib/database';
import {readConfig} from '../lib/config';
import {audioStore} from '../lib/audio-store';
import {DJSessions} from '../lib/dj-sessions';
import {DJWarmWorker,type WarmIdentity,type WarmPermit} from '../lib/dj-warm-worker';
import {checkDJRenderer,runRemoteDJBatch} from '../lib/dj-remote-worker';
import {VastProvider} from '../lib/vast-provider';

const config=readConfig(),url=new URL(config.databaseURL),target=url.host+url.pathname;
if(process.env.JAMLOOM_WATCHDOG_TARGET!==target)throw Error('Worker target confirmation does not match');
const store=audioStore(config),permitFile=process.env.JAMLOOM_DJ_WARM_PERMIT,identityFile=process.env.JAMLOOM_DJ_WARM_IDENTITY,tokenFile=process.env.JAMLOOM_DJ_RENDER_TOKEN_FILE;
if(!store||!permitFile||!identityFile||!tokenFile||!process.env.JAMLOOM_AI_DJ_BUDGET)throw Error('Warm worker configuration missing');
async function privateFile(file:string){const meta=await stat(file);if(meta.size>8192||(meta.mode&0o077)!==0)throw Error('Small private operator file required');return readFile(file,'utf8');}
const permit:WarmPermit=JSON.parse(await privateFile(permitFile)),token=(await privateFile(tokenFile)).trim();
const pool=createPool(config.databaseURL),abort=new AbortController();
process.once('SIGINT',()=>abort.abort());process.once('SIGTERM',()=>abort.abort());
const warm=new DJWarmWorker(new DJSessions(pool,config.secret,store,JSON.parse(process.env.JAMLOOM_AI_DJ_BUDGET)),new VastProvider(process.env.VASTAI_KEY??''));
let worker:WarmIdentity|undefined,timer:ReturnType<typeof setInterval>|undefined,checking=false;
try{
 if(!process.argv.includes('--register'))worker=JSON.parse(await privateFile(identityFile));
 await checkDJRenderer(token);
 if(process.argv.includes('--register')){
  // Reserve the receipt file before consuming a permit, so an existing lease is never overwritten.
  await writeFile(identityFile,'',{flag:'wx',mode:0o600});
  worker=await warm.register(permit);await writeFile(identityFile,JSON.stringify(worker),{mode:0o600});
 }
 if(!worker)throw Error('Worker identity missing');
 const saved=(await pool.query('SELECT * FROM dj_warm_workers WHERE id=$1 AND lease=$2 AND permit_sha256=$3',[worker.id,worker.lease,permit.permitSha256])).rows[0];
 if(!saved||Number(saved.hourly_micros)!==permit.hourlyMicros||new Date(saved.created_at).getTime()!==permit.startedAt||new Date(saved.deadline).getTime()!==permit.deadline)throw Error('Permit does not match the recorded worker');
 const pulse=async()=>{if(checking)return;checking=true;try{
  const ceiling=Math.ceil(Math.max(0,Date.now()-permit.startedAt)*permit.hourlyMicros/3600000);
  if(!await warm.heartbeat(worker!,ceiling))abort.abort();
 }catch{abort.abort();}finally{checking=false;}};
 await pulse();timer=setInterval(()=>{void pulse();},3000);
 while(!abort.signal.aborted){
  const result=await runRemoteDJBatch(warm,worker,token,abort.signal);
  if(result)console.log(JSON.stringify(result));else await delay(500);
 }
}finally{
 if(timer)clearInterval(timer);
 try{if(worker){await warm.stop(worker);for(let i=0;i<5;i++){const result=await warm.sweep();console.log(JSON.stringify(result));if(!result.some(r=>r.status==='destroy_requested'))break;await delay(2000);}}}
 finally{await pool.end();}
}
