import type {Pool,PoolClient} from 'pg';
import type Stripe from 'stripe';

export const GPU_REVENUE_SHARE_BPS=2000;
type Query=Pick<Pool,'query'>;
export type GpuProceeds={chargeID:string;balanceID:string;grossCents:number;feeCents:number;taxCents:number;settled:boolean};
export function gpuRevenueEnabled(env:Record<string,string|undefined>){
 const value=env.JAMLOOM_GPU_REVENUE_SHARE_BPS;
 if(value!==undefined&&value!==''&&value!=='2000')throw Error('Only the approved 20% GPU allocation is supported');
 return value==='2000';
}
export const lockGpuFunding=(db:PoolClient)=>db.query("SELECT pg_advisory_xact_lock(hashtextextended('jamloom-gpu-revenue',0))");
// Called inside the verified live purchase transaction, under its receipt lock.
export async function recordGpuProceeds(db:PoolClient,receipt:string,p:GpuProceeds){
 if(!/^ch_[a-zA-Z0-9]+$/.test(p.chargeID)||!/^txn_[a-zA-Z0-9]+$/.test(p.balanceID)||
  ![p.grossCents,p.feeCents,p.taxCents].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000)||p.grossCents===0||typeof p.settled!=='boolean')throw Error('Invalid GPU payment evidence');
 const net=Math.max(0,p.grossCents-p.feeCents-p.taxCents)*10000;
 await lockGpuFunding(db);
 await db.query(`INSERT INTO gpu_payment_proceeds(receipt,charge_id,balance_id,gross_cents,fee_cents,tax_cents,net_micros,allocation_micros,settled)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(receipt) DO NOTHING`,[receipt,p.chargeID,p.balanceID,p.grossCents,p.feeCents,p.taxCents,net,net/5,p.settled]);
 const r=(await db.query('SELECT * FROM gpu_payment_proceeds WHERE receipt=$1',[receipt])).rows[0];
 if(r.charge_id!==p.chargeID||r.balance_id!==p.balanceID||Number(r.gross_cents)!==p.grossCents||Number(r.fee_cents)!==p.feeCents||Number(r.tax_cents)!==p.taxCents)throw Error('GPU receipt conflict');
 // A delayed paid event cannot undo a refund/dispute, nor duplicate its funding.
 if(p.settled)await db.query('UPDATE gpu_payment_proceeds SET settled=true,checked_at=now() WHERE receipt=$1',[receipt]);
}
export async function revokeGpuProceeds(db:PoolClient,receipt:string){
 await lockGpuFunding(db);
 // Revoke the whole allocation for any refund/dispute. Excess after a partial
 // refund stays withheld until reconciliation; already spent money is not erased.
 await db.query('UPDATE gpu_payment_proceeds SET revoked=true,checked_at=now() WHERE receipt=$1',[receipt]);
}
export async function gpuRevenueBalance(db:Query){
 const r=(await db.query(`SELECT
  (COALESCE((SELECT sum(allocation_micros) FROM gpu_payment_proceeds WHERE settled AND NOT revoked),0)+
   COALESCE((SELECT sum(CASE WHEN net_usd_micros<0 THEN floor(net_usd_micros::numeric/5)
    WHEN state='settled' AND NOT EXISTS(SELECT 1 FROM apple_finance_holds) THEN floor(settled_usd_micros::numeric/5) ELSE 0 END)
    FROM apple_finance_reports),0))::text AS funded,
  COALESCE((SELECT sum(micros) FROM gpu_revenue_reservations),0)::text AS reserved`)).rows[0];
 const available=BigInt(r.funded)-BigInt(r.reserved);
 if(available>BigInt(Number.MAX_SAFE_INTEGER)||available<BigInt(Number.MIN_SAFE_INTEGER))throw Error('GPU funding exceeds supported range');
 return Number(available);
}
export async function providerFundingFresh(db:Query,endpoint:string,needed:number,now=Date.now()){
 const r=(await db.query('SELECT balance_micros,checked_at FROM gpu_provider_funding WHERE endpoint=$1',[endpoint])).rows[0];
 return !!r&&Number(r.checked_at)<=now&&now-Number(r.checked_at)<600000&&Number(r.balance_micros)>=needed;
}
export async function runpodBalanceMicros(key:string,request:typeof fetch=fetch){
 const response=await request('https://api.runpod.io/graphql',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({query:'query { myself { clientBalance underBalance } }'}),signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!response.ok)throw Error('GPU provider funding read failed');
 const result=await response.json(),r=result.data?.myself;
 if(result.errors?.length||!r||typeof r.clientBalance!=='number'||!Number.isFinite(r.clientBalance)||r.clientBalance<0||typeof r.underBalance!=='boolean')throw Error('GPU provider funding evidence missing');
 const micros=Math.floor(r.clientBalance*1000000);
 if(!Number.isSafeInteger(micros))throw Error('GPU provider funding exceeds supported range');
 return r.underBalance?0:micros;
}
// Settlement is re-read from Stripe; the payment event timestamp is not proof
// that funds are available. Bounded batches drain pending payments each sweep.
export async function settleGpuProceeds(pool:Pool,stripe:Stripe){
 const pending=(await pool.query('SELECT receipt FROM gpu_payment_proceeds WHERE NOT settled AND NOT revoked ORDER BY checked_at LIMIT 100')).rows;
 let settled=0,checked=0;const deadline=Date.now()+60000;
 for(const {receipt} of pending){
  if(Date.now()>=deadline)break;checked++;
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['stripe_live:'+receipt]);
   const r=(await db.query('SELECT * FROM gpu_payment_proceeds WHERE receipt=$1',[receipt])).rows[0];
   if(r.revoked||r.settled){await db.query('COMMIT');continue;}
   const charge=await stripe.charges.retrieve(r.charge_id,{expand:['balance_transaction']});
   if(!charge.livemode||charge.id!==r.charge_id||!charge.paid||!charge.captured||charge.currency!=='usd')throw Error('GPU payment verification failed');
   if(charge.refunded||charge.amount_refunded>0||charge.disputed){await revokeGpuProceeds(db,receipt);}
   else{
    const b=charge.balance_transaction;
    if(!b||typeof b==='string'||b.id!==r.balance_id||b.source!==charge.id||b.currency!=='usd'||b.amount!==Number(r.gross_cents)||b.fee!==Number(r.fee_cents)||b.net!==b.amount-b.fee||b.exchange_rate!==null||!['available','pending'].includes(b.status))throw Error('GPU settlement evidence changed');
    await recordGpuProceeds(db,receipt,{chargeID:charge.id,balanceID:b.id,grossCents:b.amount,feeCents:b.fee,taxCents:Number(r.tax_cents),settled:b.status==='available'});
    if(b.status==='available')settled++;
   }
   await db.query('UPDATE gpu_payment_proceeds SET checked_at=now() WHERE receipt=$1',[receipt]);
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 return {checked,settled};
}
