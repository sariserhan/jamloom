// Independent Apple signatures and a disposable ledger; no purchase/refund requests.
import './env';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {Environment} from '@apple/app-store-server-library';
import {appleVerifier,applePurchase,reconcileAppleNotification} from '../lib/apple-payments';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet} from '../lib/wallet';

const args=process.argv.slice(2),files:string[]=[];let historyFile='';
for(let i=0;i<args.length;i++){
 assert(args[i+1]);if(args[i]==='--receipt')files.push(args[++i]);else if(args[i]==='--history')historyFile=args[++i];else throw Error('Use --receipt PRIVATE_JWS --receipt PRIVATE_JWS --history PRIVATE_JSON');
}
assert(files.length===2&&historyFile);
const verifier=appleVerifier({...process.env,APPLE_ENVIRONMENT:'sandbox'}),bundle='com.djayvo.app';
const originals=await Promise.all(files.map(async path=>verifier.verifyAndDecodeTransaction((await readFile(path,'utf8')).trim())));
const token=originals[0].appAccountToken!;assert(token&&originals.every(tx=>tx.appAccountToken===token));
assert.deepEqual(originals.map(tx=>tx.productId).sort(),['com.jamloom.creator.monthly','com.jamloom.credits.topup150']);
const originalIds=new Set(originals.map(tx=>tx.transactionId));
const document=JSON.parse(await readFile(historyFile,'utf8'));assert.equal(document.history.hasMore,false,'Fetch every history page first');
const notices=[];
for(const item of document.history.notificationHistory??[]){
 const notice=await verifier.verifyAndDecodeNotification(item.signedPayload);
 assert.equal(notice.data?.environment,Environment.SANDBOX);assert.equal(notice.data?.bundleId,bundle);
 if(!notice.data?.signedTransactionInfo)continue;
 const tx=await verifier.verifyAndDecodeTransaction(notice.data.signedTransactionInfo);
 if(tx.appAccountToken!==token||!originals.some(t=>t.originalTransactionId===tx.originalTransactionId))continue;
 notices.push({item,notice,tx});
}
notices.sort((a,b)=>(a.notice.signedDate??0)-(b.notice.signedDate??0));
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1');
const admin=createPool(url.href),name='jamloom_apple_lifecycle_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
const pool=createPool(url.href),wallet=new Wallet(pool);let expected=450,refund=false,renewal=false;
const granted=new Set(originalIds),frozen=new Set<string>();
try{
 await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES(\'owner\',\'owner\',\'owner@apple-fixture.test\',true)');
 await wallet.accountToken('owner');await pool.query('UPDATE credit_wallets SET app_account_token=$1 WHERE owner_id=\'owner\'',[token]);
 for(const tx of originals)await wallet.grant('owner',applePurchase(tx,token,bundle));
 for(const {item,notice,tx}of notices){
  for(let n=0;n<2;n++)await reconcileAppleNotification(verifier,wallet,item.signedPayload,bundle,Environment.SANDBOX,pool);
  if(['SUBSCRIBED','DID_RENEW'].includes(notice.notificationType!)&&!granted.has(tx.transactionId)){
   const purchase=applePurchase(tx,token,bundle);expected+=purchase.credits;granted.add(tx.transactionId);
   if(notice.notificationType==='DID_RENEW')renewal=true;
  }
  if(['REFUND','REVOKE'].includes(notice.notificationType!)&&granted.has(tx.transactionId)&&!frozen.has(tx.transactionId!)){
   expected-=tx.productId==='com.jamloom.creator.monthly'?300:150;frozen.add(tx.transactionId!);refund=true;
  }
 }
 assert.deepEqual(await wallet.balance('owner'),{available:expected,reserved:0});
 assert.deepEqual(await new Wallet(pool,true).balance('owner'),{available:0,reserved:0});
 console.log(JSON.stringify({status:refund&&renewal?'PASS':'PARTIAL',realSignedRefund:refund?'PASS':'NOT RECEIVED',realSignedRenewal:renewal?'PASS':'NOT RECEIVED',duplicateHandling:'PASS for received events',liveWalletIsolation:'PASS',testCredits:expected,events:notices.map(({item,notice})=>({type:notice.notificationType,sha256:createHash('sha256').update(item.signedPayload).digest('hex'),sendAttempts:item.sendAttempts})),liveCharges:0}));
}finally{await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();console.log(JSON.stringify({cleanup:'PASS',databaseRemoved:true}));}
