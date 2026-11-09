import './env';
import {setTimeout as delay} from 'node:timers/promises';
import {createPool} from '../lib/database';
import {CloudCapacity,capacityProvider,stopOrphanedCapacity,emergencyCapacityStop,capacityFailureDiagnostic} from '../lib/cloud-capacity';
import {capacityPermit} from '../lib/cloud-capacity-permit';

// Supervise independently of the web deployment. Never starts or renews a GPU.
const args=process.argv.slice(2);
if(args.some(a=>!['--apply','--watch'].includes(a))||args.includes('--watch')&&!args.includes('--apply'))throw Error('Use capacity-watchdog.ts [--apply [--watch]]');
const apply=args.includes('--apply'),watch=args.includes('--watch'),url=new URL(process.env.DATABASE_URL??'');
const target=url.host+url.pathname,endpoint=process.env.RUNPOD_ENDPOINT_ID??'';
if(!/^[a-zA-Z0-9_-]{1,80}$/.test(endpoint))throw Error('Invalid capacity endpoint');
if(apply&&(process.env.JAMLOOM_WATCHDOG_TARGET!==target||!process.env.RUNPOD_API_KEY))throw Error('Shutdown target confirmation or credentials missing');
const pool=createPool(url.href),profile=process.env.JAMLOOM_CLOUD_COST_PROFILE;
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
try{
 if(!apply){
  const rows=await pool.query("SELECT state,expires_at,cap_micros FROM cloud_capacity_cycles WHERE endpoint=$1 AND state<>'stopped'",[endpoint]);
  console.log(JSON.stringify({mode:'preview',cycles:rows.rows.map(r=>({...r,expires_at:Number(r.expires_at),cap_micros:Number(r.cap_micros)}))}));
 }else{
  const provider=capacityProvider(process.env.RUNPOD_API_KEY!,endpoint);
  let permit;try{permit=capacityPermit(process.env,profile);}catch{/* Revoked/invalid permits must still stop recorded work. */}
  const capacity=permit?new CloudCapacity(pool,endpoint,profile!,permit,provider):null;
  do{
   let stage='reconcile';
   try{
    const result=capacity?await capacity.reconcile(true):await stopOrphanedCapacity(pool,endpoint,provider);
    stage='heartbeat';
    if(capacity&&watch&&!stopping&&Date.now()<permit!.expiresAt)await capacity.guardianHeartbeat();
    console.log(JSON.stringify({at:new Date().toISOString(),...result}));
    if(permit&&Date.now()>=permit.expiresAt&&result.state==='off')break;
   }catch(error){
    console.error(JSON.stringify({at:new Date().toISOString(),event:'capacity-check-failed',stage,...capacityFailureDiagnostic(error)}));
    if(capacity){try{const result=await emergencyCapacityStop(endpoint,provider);console.log(JSON.stringify({emergencyShutdown:true,...result}));}
     catch(error){console.error(JSON.stringify({at:new Date().toISOString(),event:'emergency-shutdown-unconfirmed',...capacityFailureDiagnostic(error)}));}}
    if(!watch)process.exitCode=2;
   }
   if(watch&&!stopping)await delay(10000);
  }while(watch&&!stopping);
  // Graceful termination also revokes any recorded cycle. A failed shutdown
  // exits nonzero so the supervisor can restart; web cron remains the fallback.
  if(stopping){await pool.query('DELETE FROM cloud_capacity_guardians WHERE endpoint=$1',[endpoint]);
   const result=await stopOrphanedCapacity(pool,endpoint,provider);if(result.state!=='off')process.exitCode=2;}
 }
}finally{await pool.end();}
