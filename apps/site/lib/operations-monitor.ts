import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {GUARDIAN_IDLE_FRESH_MS,capacityPermit,capacityPermitHash,capacityWindowOpen,seedPermit} from './cloud-capacity-permit';
import {CLOUD_WORKER_IMAGE} from './cloud-production-profile';
import {protectCreatorRenewals,resumeFundedCreatorRenewals} from './creator-renewals';
import {providerReplenishmentPlan,inspectProviderAutoPay,type ProviderAutoPay} from './provider-replenishment';
import {gpuRevenueBalance,gpuRevenueEnabled,runpodBalanceMicros,settleGpuProceeds} from './gpu-revenue';
import {creditBilling} from './stripe-payments';

export const operationMessages={
 'provider-autopay-mismatch':'Runpod auto-pay no longer matches the owner-approved cash buffer: enabled, $25 per reload, below $10. Inspect Billing. Deposits do not increase the 20% GPU usage allowance.',
 'provider-recharge-ready':'Settled revenue can cover a $10 provider recharge and prepaid capacity is low. Review Runpod Billing and replenish within the recorded revenue-backed shortfall. Native auto-pay is not revenue-capped; do not enable an unbounded reload.',
 'apple-finance-read-failed':'The scheduled Apple financial report read failed. Check the report credential, vendor and service logs. No unverified proceeds were added to GPU funding.',
 'apple-finance-review':'An Apple financial report changed or a live refund requires reconciliation. Apple GPU funding is held pending verified payment/refund evidence.',
 'budget-low':'Fewer than three funded preparation cycles remain. Check settled payment allocations and provider credit. Do not add unapproved owner funds.',
 'budget-expiring':'The finite seed allowance expires within 48 hours. Revenue continuation requires settled allocations and provider credit.',
 'budget-unavailable':'Operating funding is expired, exhausted or missing. New sales/generation must remain closed; paid credits remain valid.',
 'guardian-stale':'The shutdown guardian heartbeat is missing, stale or does not match this permit. New work must remain closed. Check the guardian service.',
 'shutdown-unconfirmed':'A capacity shutdown failed, a worker remains after expiry, or provider identity differs. Check the provider and stop unapproved capacity.',
 'generation-failed':'A recent live song failed or its cleanup is overdue. Check private operational records and credit returns; do not retry automatically.',
 'renewal-check-failed':'Creator renewal protection could not be confirmed. Inspect Stripe collection pauses and outstanding renewal invoices immediately.',
 'song-jobs-failing':'The song recovery and guardian job has not completed a database sweep for over 35 minutes. Song creation may be failing or closed. Check /api/song-jobs logs (song-jobs-failed shows the failing stage) and Vercel configuration.',
 'monitor-check-failed':'An operating check failed. Inspect the database, provider and monitor services. This alert contains no customer data.',
 'test':'TEST ONLY: Jamloom operating alerts are connected. Simulated checks cover low/expired funding, failed songs, stale guardian and failed shutdown. No customer charge or GPU request was made.'
} as const;
export type OperationAlert=keyof typeof operationMessages;
export async function sendOperationAlert(code:OperationAlert,env:Record<string,string|undefined>=process.env,request:typeof fetch=fetch,now=Date.now()){
 const to=env.JAMLOOM_OPERATIONS_EMAIL,from=env.EMAIL_FROM,key=env.RESEND_API_KEY;
 if(!to||!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to)||!from||/[\r\n]/.test(from)||!key)throw Error('Operating alert transport is not configured');
 // Stable payload + provider idempotency deduplicates the two independent
 // monitors and retries. Persistent incidents repeat at most once per six hours.
 const payload={from,to:[to],subject:`Jamloom ${code==='test'?'TEST alert':'operations: '+code}`,text:operationMessages[code]+'\n\nService: https://www.jamloom.com\nOnly the approved share of verified settled proceeds may fund additional cycles. No unapproved card top-up or generation retry is authorized.'};
 const id=createHash('sha256').update(JSON.stringify(payload)+Math.floor(now/21600000)).digest('hex');
 const response=await request('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`jamloom-ops-${id}`},body:JSON.stringify(payload)});
 if(!response.ok)throw Error(`Operating alert delivery failed (${response.status})`);
 const result=await response.json();if(typeof result.id!=='string')throw Error('Operating alert receipt missing');
 return {code,emailID:result.id};
}
export type OperationSnapshot={now:number;expiresAt:number|null;remainingMicros:number;revenueMicros?:number;providerMicros?:number;providerAutoPay?:ProviderAutoPay;cycleMicros:number;guardianOK:boolean;shutdownFailed:boolean;providerMismatch:boolean;workers:number;liveFailures:number;overdueCleanup:number};
export function operationAlerts(s:OperationSnapshot):OperationAlert[]{
 const alerts:OperationAlert[]=[],expired=s.expiresAt!==null&&s.now>=s.expiresAt;
 if(expired||s.remainingMicros<s.cycleMicros)alerts.push('budget-unavailable');
 else{
  if(s.remainingMicros<3*s.cycleMicros)alerts.push('budget-low');
  if(s.expiresAt!==null&&s.expiresAt-s.now<=48*3600000)alerts.push('budget-expiring');
 }
 if(!expired&&!s.guardianOK)alerts.push('guardian-stale');
 if(s.shutdownFailed||s.providerMismatch||expired&&s.workers>0)alerts.push('shutdown-unconfirmed');
 if(s.liveFailures>0||s.overdueCleanup>0)alerts.push('generation-failed');
 if(s.providerAutoPay){if(!s.providerAutoPay.matchesApprovedPolicy)alerts.push('provider-autopay-mismatch');}
 else if(s.revenueMicros!==undefined&&s.providerMicros!==undefined&&providerReplenishmentPlan(s.revenueMicros,s.providerMicros,s.cycleMicros).suggestedMicros>0)alerts.push('provider-recharge-ready');
 return alerts;
}
export async function inspectOperations(pool:Pick<Pool,'query'>,env:Record<string,string|undefined>=process.env,request:typeof fetch=fetch,now=Date.now()){
 const endpoint=env.RUNPOD_ENDPOINT_ID,profile=env.JAMLOOM_CLOUD_COST_PROFILE,p=capacityPermit(env,profile);
 if(!endpoint||!profile||!p||!env.RUNPOD_API_KEY)throw Error('Operating capacity configuration missing');
 const [guardian,grant,cycles,jobs]=await Promise.all([
  pool.query('SELECT config_sha256,checked_at FROM cloud_capacity_guardians WHERE endpoint=$1',[endpoint]),
  pool.query('SELECT config_sha256,reserved_micros FROM cloud_capacity_permits WHERE id=$1',[p.id]),
  pool.query("SELECT count(*)::int AS failed FROM cloud_capacity_cycles WHERE endpoint=$1 AND state='stopping' AND expires_at<$2",[endpoint,now-120000]),
  pool.query("SELECT count(*) FILTER(WHERE j.state='failed' AND j.completed_at>now()-interval '6 hours')::int AS failures,count(*) FILTER(WHERE r.cleanup_at IS NULL AND r.deadline<now()-interval '5 minutes')::int AS overdue FROM dna_song_jobs j JOIN cloud_song_runs r ON r.id=j.id WHERE j.billing_live=true")
 ]);
 const headers={Authorization:`Bearer ${env.RUNPOD_API_KEY}`},options={headers,signal:AbortSignal.timeout(15000),redirect:'error' as const};
 const [control,health]=await Promise.all([request('https://api.runpod.io/v2/serverless/'+endpoint,options),request('https://api.runpod.ai/v2/'+endpoint+'/health',options)]);
 if(!control.ok||!health.ok)throw Error('Provider operating read failed');
 const c=await control.json(),h=await health.json(),g=guardian.rows[0],grantRow=grant.rows[0];
 const hash=capacityPermitHash(p,endpoint,profile,CLOUD_WORKER_IMAGE);
 const counts=Object.values(h.workers??{});if(!counts.length||!counts.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))throw Error('Invalid worker readback');
 const workers=(counts as number[]).reduce((sum,v)=>sum+v,0);
 let remaining=now+p.cycleSeconds*1000<=p.expiresAt?p.capMicros-Number(grantRow?.reserved_micros??0):0;
 let revenueMicros:number|undefined,providerMicros:number|undefined;
 if(p.revenueShareBps===2000){
  const providerBalance=await runpodBalanceMicros(env.RUNPOD_API_KEY,request);
  await pool.query(`INSERT INTO gpu_provider_funding(endpoint,balance_micros,checked_at) VALUES($1,$2,$3)
   ON CONFLICT(endpoint) DO UPDATE SET balance_micros=excluded.balance_micros,checked_at=excluded.checked_at`,[endpoint,providerBalance,now]);
  // Seed and revenue cannot be combined to fund a partial cycle.
  const revenue=await gpuRevenueBalance(pool);revenueMicros=revenue;providerMicros=providerBalance;
  remaining=Math.min(providerBalance,Math.floor(remaining/p.cycleMicros)*p.cycleMicros+Math.max(0,Math.floor(revenue/p.cycleMicros))*p.cycleMicros);
 }
 const providerAutoPay=await inspectProviderAutoPay(env,request);
 const snapshot:OperationSnapshot={now,expiresAt:p.revenueShareBps===2000?null:p.expiresAt,remainingMicros:remaining,...(revenueMicros===undefined?{}:{revenueMicros,providerMicros}),...(providerAutoPay?{providerAutoPay}:{}),cycleMicros:p.cycleMicros,
  guardianOK:!!g&&g.config_sha256===hash&&Number(g.checked_at)<=now&&now-Number(g.checked_at)<GUARDIAN_IDLE_FRESH_MS,
  shutdownFailed:Number(cycles.rows[0]?.failed)>0||!capacityWindowOpen(p,now)&&(c.workers?.min!==0||c.workers?.max!==0),
  providerMismatch:c.id!==endpoint||c.image!==CLOUD_WORKER_IMAGE||!!grantRow&&grantRow.config_sha256!==capacityPermitHash(seedPermit(p),endpoint,profile,CLOUD_WORKER_IMAGE),
  workers,liveFailures:Number(jobs.rows[0]?.failures??0),overdueCleanup:Number(jobs.rows[0]?.overdue??0)};
 return {snapshot,alerts:operationAlerts(snapshot)};
}
// The song-jobs cron sweeps the database every 30 min while the GPU is idle (every
// minute while active); 35 min tolerates one late run.
export const SONG_JOBS_STALE_MS=2100000;
export const songJobsStale=(okAt:number|undefined,now:number)=>okAt===undefined||!Number.isFinite(okAt)||now-okAt>SONG_JOBS_STALE_MS;
export async function recordOperationSuccess(pool:Pick<Pool,'query'>,name:string){
 await pool.query('INSERT INTO operation_heartbeats(name,ok_at) VALUES($1,now()) ON CONFLICT(name) DO UPDATE SET ok_at=excluded.ok_at',[name]);
}
export async function runOperations(pool:Pool,env:Record<string,string|undefined>=process.env){
 const alerts=new Set<OperationAlert>();let snapshot:OperationSnapshot|undefined,renewals;
 try{if(gpuRevenueEnabled(env)){const b=creditBilling(env);if(!b.live)throw Error('Revenue settlement requires live billing');await settleGpuProceeds(pool,b.stripe);}
  const result=await inspectOperations(pool,env);snapshot=result.snapshot;result.alerts.forEach(a=>alerts.add(a));}catch{alerts.add('monitor-check-failed');}
 try{const b=creditBilling(env);renewals={...await protectCreatorRenewals(b.stripe,pool,b.live,env),continuation:await resumeFundedCreatorRenewals(b.stripe,pool,b.live,env)};}catch{alerts.add('renewal-check-failed');}
 try{if((await pool.query("SELECT 1 FROM apple_finance_reports WHERE state='held' UNION ALL SELECT 1 FROM apple_finance_holds LIMIT 1")).rowCount)alerts.add('apple-finance-review');}catch{alerts.add('monitor-check-failed');}
 try{const r=await pool.query("SELECT extract(epoch FROM ok_at)*1000 AS ok FROM operation_heartbeats WHERE name='song-jobs'");
  if(songJobsStale(r.rows[0]?Number(r.rows[0].ok):undefined,Date.now()))alerts.add('song-jobs-failing');}catch{alerts.add('monitor-check-failed');}
 const deliveries=[];for(const code of alerts)deliveries.push(await sendOperationAlert(code,env));
 return {at:new Date().toISOString(),snapshot,renewals,alerts:[...alerts],deliveries};
}
