import type {Pool} from 'pg';
import {Environment,Type,type SignedDataVerifier,type JWSTransactionDecodedPayload} from '@apple/app-store-server-library';
import {Wallet} from './wallet';
import {singingOffer} from '../../web/singing-offer.js';
import type {AppleEnvironment} from './apple-payments';

export const singingAppleProduct='com.jamloom.singing.complete';
function receipt(tx:JWSTransactionDecodedPayload,bundle:string,environment:AppleEnvironment){
 if(tx.bundleId!==bundle||tx.environment!==environment||tx.productId!==singingAppleProduct||tx.type!==Type.NON_CONSUMABLE||
    !tx.originalTransactionId||!/^\d{1,40}$/.test(tx.originalTransactionId))throw Error('Unsupported Apple course transaction');
 return `apple_${environment===Environment.PRODUCTION?'live':'sandbox'}:${tx.originalTransactionId}`;
}
export async function grantAppleCourse(verifier:Pick<SignedDataVerifier,'verifyAndDecodeTransaction'>,pool:Pool,owner:string,jws:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const tx=await verifier.verifyAndDecodeTransaction(jws),id=receipt(tx,bundle,environment);
 const token=await new Wallet(pool,environment===Environment.PRODUCTION).accountToken(owner);
 if(tx.appAccountToken?.toLowerCase()!==token.toLowerCase()||tx.inAppOwnershipType!=='PURCHASED'||tx.quantity!==1||
    tx.currency!=='USD'||tx.price!==singingOffer.priceCents*10||tx.offerType!==undefined||tx.revocationDate!==undefined||tx.revocationReason!==undefined)throw Error('Unverified Apple course purchase');
 const db=await pool.connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy:'+id]);
  await db.query(`INSERT INTO academy_purchases(receipt,owner_id,product_key,price_id,payment_intent,amount_cents,currency,sandbox,refund_hold)
   VALUES($1,$2,'singing-complete',$3,$1,$4,'usd',$5,EXISTS(SELECT 1 FROM academy_purchase_holds WHERE receipt=$1 AND refund_hold))
   ON CONFLICT(receipt) DO NOTHING`,[id,owner,singingAppleProduct,singingOffer.priceCents,environment!==Environment.PRODUCTION]);
  const row=(await db.query('SELECT * FROM academy_purchases WHERE receipt=$1',[id])).rows[0];
  if(row.owner_id!==owner||row.product_key!=='singing-complete'||row.price_id!==singingAppleProduct||row.sandbox!==(environment!==Environment.PRODUCTION))throw Error('Apple course receipt conflict');
  await db.query('COMMIT');return id;
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
// Refunds arriving before purchase delivery must also prevent a later replay from unlocking lessons.
export async function revokeAppleCourse(pool:Pool,tx:JWSTransactionDecodedPayload,bundle:string,environment:AppleEnvironment){
 const id=receipt(tx,bundle,environment);
 if(!Number.isSafeInteger(tx.revocationDate)||(tx.revocationDate??0)<=0)throw Error('Invalid course revocation');
 const db=await pool.connect();try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['academy:'+id]);
  await db.query('INSERT INTO academy_purchase_holds(receipt,refund_hold) VALUES($1,true) ON CONFLICT(receipt) DO UPDATE SET refund_hold=true,updated_at=now()',[id]);
  await db.query('UPDATE academy_purchases SET refund_hold=true WHERE receipt=$1',[id]);await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
