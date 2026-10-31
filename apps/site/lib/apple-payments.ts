import {CREATOR_PLAN,TOP_UP,LEGACY_CREDIT_MULTIPLIER} from './credit-catalog';
import { Environment,SignedDataVerifier,Type, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import {CREDIT_PACKS} from './economics';
import {Wallet} from './wallet';
import type {Pool} from 'pg';
import {singingAppleProduct,revokeAppleCourse} from './apple-course';
const products={
 [TOP_UP.appleProduct]:TOP_UP,
 'com.jamloom.credits.starter':{...CREDIT_PACKS.starter,credits:CREDIT_PACKS.starter.credits*LEGACY_CREDIT_MULTIPLIER},
 'com.jamloom.credits.creator':{...CREDIT_PACKS.creator,credits:CREDIT_PACKS.creator.credits*LEGACY_CREDIT_MULTIPLIER},
 'com.jamloom.credits.studio':{...CREDIT_PACKS.studio,credits:CREDIT_PACKS.studio.credits*LEGACY_CREDIT_MULTIPLIER},
};
export type AppleEnvironment = Environment.SANDBOX | Environment.PRODUCTION;
export function appleEnvironment(env:Record<string,string|undefined>=process.env):AppleEnvironment{
 if(!env.APPLE_ENVIRONMENT||env.APPLE_ENVIRONMENT==='sandbox')return Environment.SANDBOX;
 if(env.APPLE_ENVIRONMENT!=='production'||env.CREDIT_BILLING_MODE!=='live'||!Number.isSafeInteger(Number(env.APPLE_APP_ID))||Number(env.APPLE_APP_ID)<=0)throw new Error('Apple production verification not configured');
 return Environment.PRODUCTION;
}
export function appleVerifier(env:Record<string,string|undefined>=process.env){
 const environment=appleEnvironment(env),bundle=env.APPLE_BUNDLE_ID,roots=env.APPLE_ROOT_CERTIFICATES_BASE64;
 if(!bundle||!roots||roots.length>32000)throw new Error('Apple verification not configured');
 const certs=roots.split(',').map(s=>Buffer.from(s,'base64'));if(certs.length>4||certs.some(c=>c.length<100||c.length>8000))throw new Error('Invalid Apple root configuration');
 return new SignedDataVerifier(certs,true,environment,bundle,environment===Environment.PRODUCTION?Number(env.APPLE_APP_ID):undefined);
}
// This validator accepts only the output of Apple's independent JWS verifier.
export function applePurchase(transaction:JWSTransactionDecodedPayload,token:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const recurring=transaction.productId===CREATOR_PLAN.appleProduct;
 const pack=recurring?CREATOR_PLAN:products[transaction.productId as keyof typeof products];
 if(transaction.environment!==environment||transaction.bundleId!==bundle||transaction.type!==(recurring?Type.AUTO_RENEWABLE_SUBSCRIPTION:Type.CONSUMABLE)||
 transaction.quantity!==1||transaction.inAppOwnershipType!=='PURCHASED'||transaction.revocationDate!==undefined||transaction.revocationReason!==undefined||
 transaction.appAccountToken?.toLowerCase()!==token.toLowerCase()||!pack||!transaction.transactionId||
 transaction.currency!=='USD'||transaction.price!==pack.cents*10||transaction.offerType!==undefined)throw new Error('Unsupported Apple transaction');
 if(recurring&&(!transaction.originalTransactionId||!Number.isSafeInteger(transaction.purchaseDate)||!Number.isSafeInteger(transaction.expiresDate)||transaction.expiresDate!<=transaction.purchaseDate!||transaction.purchaseDate!>Date.now()+300000))throw Error('Invalid subscription period');
 // Apple's price is milliunits; reserve 60% for platform fees, tax and settlement uncertainty.
 return {provider:environment===Environment.PRODUCTION?'apple_live' as const:'apple_sandbox' as const,receipt:transaction.transactionId,credits:pack.credits,netMicros:Math.floor(pack.cents*10000*.4),...(recurring?{subscription:{id:transaction.originalTransactionId!,start:new Date(transaction.purchaseDate!),end:new Date(transaction.expiresDate!),status:transaction.expiresDate!>Date.now()?'active':'expired',cancelAtPeriodEnd:false,observedAt:transaction.signedDate??transaction.purchaseDate!}}:{})};
}
export async function fulfillApple(verifier:SignedDataVerifier,wallet:Wallet,owner:string,jws:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX){
 const transaction=await verifier.verifyAndDecodeTransaction(jws);
 const token=await wallet.accountToken(owner);
 return wallet.grant(owner,applePurchase(transaction,token,bundle,environment));
}

// Both notification and nested transaction must verify in the configured environment.
export async function reconcileAppleNotification(verifier:Pick<SignedDataVerifier,'verifyAndDecodeNotification'|'verifyAndDecodeTransaction'>,
 wallet:Pick<Wallet,'freezePurchase'>,signedPayload:string,bundle:string,environment:AppleEnvironment=Environment.SANDBOX,pool?:Pool){
 const notice=await verifier.verifyAndDecodeNotification(signedPayload);
 if(notice.version!=='2.0'||typeof notice.notificationUUID!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notice.notificationUUID)||typeof notice.notificationType!=='string'||!notice.notificationType||
    notice.data?.environment!==environment||notice.data.bundleId!==bundle)throw new Error('Invalid Apple notification');
 if(notice.data.signedTransactionInfo){
  const tx=await verifier.verifyAndDecodeTransaction(notice.data.signedTransactionInfo);
  if(tx.productId===CREATOR_PLAN.appleProduct){
   if(!pool||tx.environment!==environment||tx.bundleId!==bundle||tx.type!==Type.AUTO_RENEWABLE_SUBSCRIPTION||!tx.appAccountToken||!tx.originalTransactionId||!tx.transactionId)throw Error('Invalid subscription notification');
   const owner=(await pool.query('SELECT owner_id FROM credit_wallets WHERE app_account_token=$1',[tx.appAccountToken])).rows[0]?.owner_id;
   if(!owner)throw Error('Subscription account is not linked');
   if(['REFUND','REVOKE'].includes(notice.notificationType)){
    if(!Number.isSafeInteger(tx.revocationDate)||(tx.revocationDate??0)<=0)throw Error('Missing revocation');
    await wallet.freezePurchase(environment===Environment.PRODUCTION?'apple_live':'apple_sandbox',tx.transactionId);
   }else if(['SUBSCRIBED','DID_RENEW'].includes(notice.notificationType)){
    await new Wallet(pool,environment===Environment.PRODUCTION).grant(owner,applePurchase(tx,tx.appAccountToken,bundle,environment));
   }
   // Signed renewal information supplies cancellation intent; no credits for failed renewals or grace periods.
   const renewalVerifier=verifier as typeof verifier & Partial<Pick<SignedDataVerifier,'verifyAndDecodeRenewalInfo'>>;
   let cancelAtPeriodEnd=(await new Wallet(pool,environment===Environment.PRODUCTION).subscriptions(owner)).find(s=>s.subscription_id===tx.originalTransactionId&&s.provider===(environment===Environment.PRODUCTION?'apple_live':'apple_sandbox'))?.cancel_at_period_end??false;
   if(notice.data.signedRenewalInfo){
    if(!renewalVerifier.verifyAndDecodeRenewalInfo)throw Error('Renewal verification unavailable');
    const renewal=await renewalVerifier.verifyAndDecodeRenewalInfo(notice.data.signedRenewalInfo);
    if(renewal.originalTransactionId!==tx.originalTransactionId||renewal.environment!==environment)throw Error('Renewal mismatch');
    cancelAtPeriodEnd=renewal.autoRenewStatus===0;
   }
   if(notice.notificationType!=='REFUND_REVERSED'){
    await new Wallet(pool,environment===Environment.PRODUCTION).updateSubscription(owner,environment===Environment.PRODUCTION?'apple_live':'apple_sandbox',{
     id:tx.originalTransactionId,start:new Date(tx.purchaseDate!),end:new Date(tx.expiresDate!),cancelAtPeriodEnd,observedAt:notice.signedDate,
     status:['REFUND','REVOKE'].includes(notice.notificationType)?'revoked':notice.notificationType==='DID_FAIL_TO_RENEW'?'past_due':tx.expiresDate!>Date.now()?'active':'expired'});
   }
   return {id:notice.notificationUUID,type:notice.notificationType,manualReview:notice.notificationType==='REFUND_REVERSED'};
  }
 }
 if(notice.notificationType==='REFUND'||notice.notificationType==='REVOKE'){
  if(!notice.data.signedTransactionInfo)throw new Error('Missing refund transaction');
  const tx=await verifier.verifyAndDecodeTransaction(notice.data.signedTransactionInfo);
  if(tx.productId===singingAppleProduct){
   if(!pool)throw Error('Course storage unavailable');
   await revokeAppleCourse(pool,tx,bundle,environment);
   return {id:notice.notificationUUID,type:notice.notificationType,manualReview:false};
  }
  if(tx.environment!==environment||tx.bundleId!==bundle||tx.type!==Type.CONSUMABLE||
     !products[tx.productId as keyof typeof products]||!tx.transactionId||tx.transactionId.length>255||
     !Number.isSafeInteger(tx.revocationDate)||(tx.revocationDate??0)<=0)throw new Error('Invalid refund transaction');
  await wallet.freezePurchase(environment===Environment.PRODUCTION?'apple_live':'apple_sandbox',tx.transactionId);
 }
 // A refund reversal requires reviewed ledger reconciliation; never mint replacement credits here.
 return {id:notice.notificationUUID,type:notice.notificationType,manualReview:notice.notificationType==='REFUND_REVERSED'};
}
