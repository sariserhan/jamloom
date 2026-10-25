import type {PoolClient} from 'pg';
import {integer,type CreditLot} from './economics';
export type DJAllowanceQuote={availableMicros:number;chargeMicros:number;maxCredits:number;minMicrosPer10kCredits:number;topUpMinutes:number};
export const djCharge=(cap:number,visibility:'public'|'private')=>integer(cap+(visibility==='private'?Math.ceil(cap/4):0),1,6250000);

// All mutations run under Wallet's owner row lock, including purchases, refunds and settlement.
export async function djAllowanceLots(db:PoolClient,owner:string,live:boolean){
 return (await db.query(`SELECT d.*,d.capacity_micros-coalesce(sum(a.micros) FILTER(WHERE a.state IN ('reserved','captured')),0) AS available
 FROM dj_allowance_lots d JOIN credit_lots l ON l.id=d.credit_lot_id LEFT JOIN dj_allowance_allocations a ON a.lot_id=d.id
 WHERE d.owner_id=$1 AND d.state='active' AND (l.provider IN ('stripe_live','apple_live'))=$2
 AND NOT EXISTS(SELECT 1 FROM purchase_holds h WHERE h.provider=l.provider AND h.receipt=l.receipt)
 GROUP BY d.id ORDER BY d.created_at,d.id`,[owner,live])).rows;
}
function funding(lots:CreditLot[],needed:number,margin:number){
 const result:{id:string;credits:number;capacity:number}[]=[];let left=BigInt(needed);
 for(const lot of lots){
  integer(lot.available,0,lot.credits);integer(Number(lot.net_micros),lot.credits);
  const unit=BigInt(Math.floor(Number(lot.net_micros)/lot.credits))*BigInt(10000-margin);
  const credits=Math.min(lot.available,Number((left*10000n+unit-1n)/unit)),capacity=Number(BigInt(credits)*unit/10000n);
  if(capacity>0){result.push({id:lot.id,credits,capacity});left-=BigInt(capacity);}if(left<=0n)break;
 }
 if(left>0n)throw Error('Insufficient credits for DJ allowance');
 return result;
}
export async function planDJAllowance(db:PoolClient,owner:string,live:boolean,lots:CreditLot[],cap:number,margin:number,visibility:'public'|'private'){
 const charge=djCharge(cap,visibility),bank=await djAllowanceLots(db,owner,live);
 const available=integer(bank.reduce((n,l)=>n+integer(Number(l.available)),0));
 const additions=funding(lots,Math.max(0,charge-available),margin),credits=additions.reduce((n,l)=>n+l.credits,0);
 let maximum;
 try{maximum=funding(lots,charge,margin);}catch(e){if(!(e instanceof Error&&e.message.startsWith('Insufficient credits')))throw e;maximum=funding(lots.map(l=>({...l,available:l.credits})),charge,margin);}
 const maxCredits=Math.max(credits,maximum.reduce((n,l)=>n+l.credits,0));
 const funded=additions.reduce((n,l)=>n+l.capacity,0);
 // Per 10,000 credits keeps fractional micro-unit rates representable using integer arithmetic.
 const rateLots=credits?additions:maximum,minMicrosPer10kCredits=Number(BigInt(rateLots.reduce((n,l)=>n+l.capacity,0))*10000n/BigInt(rateLots.reduce((n,l)=>n+l.credits,0)));
 return {bank,additions,credits,quote:{availableMicros:available,chargeMicros:charge,maxCredits,minMicrosPer10kCredits,topUpMinutes:funded/charge} satisfies DJAllowanceQuote};
}
export async function reserveDJAllowance(db:PoolClient,owner:string,reservation:string,charge:number,plan:Awaited<ReturnType<typeof planDJAllowance>>){
 const bank=[...plan.bank];
 for(const a of plan.additions){
  const lot=(await db.query('INSERT INTO dj_allowance_lots(owner_id,credit_lot_id,credits,capacity_micros) VALUES($1,$2,$3,$4) RETURNING id',[owner,a.id,a.credits,a.capacity])).rows[0];
  await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta,dj_allowance_lot_id) VALUES($1,$2,'dj_fund',$3,0,$4)",[owner,a.id,-a.credits,lot.id]);
  bank.push({id:lot.id,available:a.capacity});
 }
 let left=charge;
 for(const lot of bank){const take=Math.min(left,Number(lot.available));if(take){await db.query('INSERT INTO dj_allowance_allocations(reservation_id,lot_id,owner_id,micros) VALUES($1,$2,$3,$4)',[reservation,lot.id,owner,take]);left-=take;}if(!left)break;}
 if(left)throw Error('DJ allowance not funded');
}
export async function settleDJAllowance(db:PoolClient,owner:string,reservation:string,charge:number,completed:boolean,exempt:boolean){
 const allocations=(await db.query('SELECT * FROM dj_allowance_allocations WHERE reservation_id=$1 AND owner_id=$2',[reservation,owner])).rows;
 if(!exempt&&allocations.reduce((n,a)=>n+Number(a.micros),0)!==charge)throw Error('DJ allowance reservation mismatch');
 await db.query('UPDATE dj_allowance_allocations SET state=$2 WHERE reservation_id=$1',[reservation,completed?'captured':'released']);
 if(completed)return;
 // A completely unused top-up returns to its original credit lot; partially used value stays available for another set.
 for(const allocation of allocations){
  const lot=(await db.query(`SELECT d.*,EXISTS(SELECT 1 FROM purchase_holds h WHERE h.provider=l.provider AND h.receipt=l.receipt) AS held
   FROM dj_allowance_lots d JOIN credit_lots l ON l.id=d.credit_lot_id WHERE d.id=$1 AND d.state='active'
   AND NOT EXISTS(SELECT 1 FROM dj_allowance_allocations a WHERE a.lot_id=d.id AND a.state IN ('reserved','captured'))`,[allocation.lot_id])).rows[0];
  if(!lot)continue;
  if(!lot.held)await db.query("INSERT INTO wallet_ledger_entries(owner_id,lot_id,kind,available_delta,reserved_delta,dj_allowance_lot_id) VALUES($1,$2,'dj_return',$3,0,$4)",[owner,lot.credit_lot_id,lot.credits,lot.id]);
  await db.query('UPDATE dj_allowance_lots SET state=$2 WHERE id=$1',[lot.id,lot.held?'void':'returned']);
 }
}
