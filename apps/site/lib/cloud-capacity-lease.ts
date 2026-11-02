export type ActiveWorkerLease={startsAt:number;expiresAt:number;maxMicros:number};
// Operator-funded capacity is separate from a customer's credits. A lease only
// authorizes admission; the operator must run the independent shutdown watchdog.
export function validateActiveWorkerLease(lease:ActiveWorkerLease){
 const {startsAt,expiresAt,maxMicros}=lease,duration=expiresAt-startsAt;
 if(!Number.isSafeInteger(startsAt)||!Number.isSafeInteger(expiresAt)||duration<=0||duration>40*60000||
  !Number.isSafeInteger(maxMicros)||maxMicros>3000000||maxMicros<Math.ceil(duration/1000+130)*220+20000)
  throw Error('Invalid bounded active-worker lease');
}
export function activeWorkerLease(env:Record<string,string|undefined>):ActiveWorkerLease|undefined{
 const values=[env.JAMLOOM_CLOUD_ACTIVE_LEASE_START,env.JAMLOOM_CLOUD_ACTIVE_LEASE_END,env.JAMLOOM_CLOUD_ACTIVE_LEASE_CAP_MICROS];
 if(values.every(v=>!v))return;
 const lease={startsAt:Date.parse(values[0]??''),expiresAt:Date.parse(values[1]??''),maxMicros:Number(values[2])};
 validateActiveWorkerLease(lease);return lease;
}
export function assertActiveWorkerLease(lease:ActiveWorkerLease,now=Date.now(),remainingMs=0){
 validateActiveWorkerLease(lease);
 if(now<lease.startsAt||now>=lease.expiresAt||lease.expiresAt-now<remainingMs)throw Error('Active-worker lease is unavailable or too close to expiry');
}
