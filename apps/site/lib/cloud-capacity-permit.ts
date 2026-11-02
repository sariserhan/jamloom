import {createHash} from 'node:crypto';
import {CLOUD_PROFILES,productionSongBudget,validateProfileLease} from './cloud-production-profile';
import type {ActiveWorkerLease} from './cloud-capacity-lease';

export type CapacityPermit={id:string;startsAt:number;expiresAt:number;capMicros:number;cycleMicros:number;cycleSeconds:number};
export function capacityPermit(env:Record<string,string|undefined>,profile?:string):CapacityPermit|undefined{
 const value=env.JAMLOOM_CLOUD_CAPACITY_PERMIT;if(!value)return;
 if(!profile||!CLOUD_PROFILES.includes(profile))throw Error('Demand capacity requires a reviewed hardware profile');
 if(value.length>2048)throw Error('Invalid capacity permit');
 const p=JSON.parse(value) as CapacityPermit;
 if(!p||Array.isArray(p)||Object.keys(p).sort().join(',')!=='capMicros,cycleMicros,cycleSeconds,expiresAt,id,startsAt'||
  typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(p.id)||
  ![p.startsAt,p.expiresAt,p.capMicros,p.cycleMicros,p.cycleSeconds].every(Number.isSafeInteger)||
  p.startsAt<0||p.expiresAt<=p.startsAt||p.expiresAt-p.startsAt>7*86400000||
  p.capMicros<p.cycleMicros||p.capMicros>100000000||p.cycleSeconds<1800||p.cycleSeconds>2400)
  throw Error('Invalid bounded capacity permit');
 validateProfileLease(profile,capacityLease(p,p.startsAt));
 // Admission needs a complete preparation window and the longest product TTL.
 if(p.cycleSeconds<1200+productionSongBudget('music-dna',profile).ttlSeconds+120)
  throw Error('Capacity cycle cannot cover preparation and song completion');
 return p;
}
export function capacityLease(p:CapacityPermit,now:number):ActiveWorkerLease{
 return {startsAt:now,expiresAt:now+p.cycleSeconds*1000,maxMicros:p.cycleMicros};
}
export function capacityPermitHash(p:CapacityPermit,endpoint:string,profile:string,image:string){
 return createHash('sha256').update(JSON.stringify([p.id,p.startsAt,p.expiresAt,p.capMicros,p.cycleMicros,p.cycleSeconds,endpoint,profile,image])).digest('hex');
}
