import type {Pool} from 'pg';
import {CREDIT_CATALOG_VERSION,creditSalesQualified} from './credit-catalog';
import {capacityPermit,capacityPermitHash} from './cloud-capacity-permit';
import {CLOUD_COST_PROFILE,CLOUD_WORKER_IMAGE} from './cloud-production-profile';

// Owner-authorized public launch is separate from measured cost qualification.
// It expires with the finite operator permit and never alters receipt budgets.
export function creditLaunchAuthorized(env:Record<string,string|undefined>=process.env,now=Date.now()){
 try{
  const permit=capacityPermit(env,env.JAMLOOM_CLOUD_COST_PROFILE);
  return env.JAMLOOM_CREDIT_LAUNCH_APPROVAL===CREDIT_CATALOG_VERSION&&
   env.JAMLOOM_CLOUD_COST_PROFILE===CLOUD_COST_PROFILE&&env.JAMLOOM_CLOUD_SONGS_ENABLED==='true'&&
   !!permit&&now>=permit.startsAt&&now+permit.cycleSeconds*1000<=permit.expiresAt;
 }catch{return false;}
}
export function creditSalesAuthorized(env:Record<string,string|undefined>=process.env,now=Date.now()){
 return creditSalesQualified(env)||creditLaunchAuthorized(env,now);
}
// Read-only admission for new checkout sessions. Recovery and subscription
// cancellation remain available when funding expires or the guardian stops.
export async function creditCapacityForSales(pool:Pick<Pool,'query'>,env:Record<string,string|undefined>=process.env,now=Date.now()){
 try{
  const profile=env.JAMLOOM_CLOUD_COST_PROFILE,endpoint=env.RUNPOD_ENDPOINT_ID;
  const permit=capacityPermit(env,profile);
  if(!permit||!endpoint||!profile||now<permit.startsAt||now+permit.cycleSeconds*1000>permit.expiresAt)return false;
  const hash=capacityPermitHash(permit,endpoint,profile,CLOUD_WORKER_IMAGE);
  const guardian=(await pool.query('SELECT config_sha256,checked_at FROM cloud_capacity_guardians WHERE endpoint=$1',[endpoint])).rows[0];
  if(!guardian||guardian.config_sha256!==hash||Number(guardian.checked_at)>now||now-Number(guardian.checked_at)>=90000)return false;
  const grant=(await pool.query('SELECT config_sha256,reserved_micros FROM cloud_capacity_permits WHERE id=$1',[permit.id])).rows[0];
  if(grant&&grant.config_sha256!==hash)return false;
  return Number(grant?.reserved_micros??0)+permit.cycleMicros<=permit.capMicros;
 }catch{return false;}
}
