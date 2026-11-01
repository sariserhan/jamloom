// Real Apple sandbox receipts, isolated loopback ledger only. Never log signed payloads.
import './env';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {hashPassword} from 'better-auth/crypto';
import {Environment} from '@apple/app-store-server-library';
import {appleVerifier,applePurchase,fulfillApple} from '../lib/apple-payments';
import {createPool} from '../lib/database';
import {migrate} from '../lib/migrations';
import {Wallet} from '../lib/wallet';

const args=process.argv.slice(2),receipts:string[]=[];let token='',http=false,notificationFile='';
for(let i=0;i<args.length;i++){
 if(args[i]==='--http'){http=true;continue;}
 assert(args[i+1],'Missing argument value');if(args[i]==='--receipt')receipts.push(args[++i]);else if(args[i]==='--account-token')token=args[++i];else if(args[i]==='--notification')notificationFile=args[++i];else throw Error('Use --account-token UUID --receipt PRIVATE_FILE [--receipt PRIVATE_FILE] [--http] [--notification PRIVATE_JSON]');
}
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token));assert(receipts.length>0&&receipts.length<=20);
const url=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'');assert.equal(url.hostname,'127.0.0.1','Disposable loopback database required');
const bundle='com.djayvo.app',sandbox=appleVerifier({...process.env,APPLE_ENVIRONMENT:'sandbox',APPLE_BUNDLE_ID:bundle});
const production=appleVerifier({...process.env,APPLE_ENVIRONMENT:'production',CREDIT_BILLING_MODE:'live',APPLE_BUNDLE_ID:bundle});
let notification='';
if(notificationFile){
 assert(http,'Notification verification requires --http');const bytes=await readFile(notificationFile);assert(bytes.length<=32768);notification=JSON.parse(bytes.toString()).signedPayload;assert(typeof notification==='string'&&notification.length>0);
 const notice=await sandbox.verifyAndDecodeNotification(notification);assert.equal(notice.notificationType,'TEST');assert.equal(notice.data?.environment,Environment.SANDBOX);assert.equal(notice.data?.bundleId,bundle);
 await assert.rejects(production.verifyAndDecodeNotification(notification));
}
const inputs=[];
for(const path of receipts){const bytes=await readFile(path);assert(bytes.length>0&&bytes.length<=32768);const jws=bytes.toString().trim(),tx=await sandbox.verifyAndDecodeTransaction(jws);const purchase=applePurchase(tx,token,bundle,Environment.SANDBOX);
 assert.equal(tx.environment,Environment.SANDBOX);assert(['com.jamloom.credits.topup150','com.jamloom.creator.monthly'].includes(tx.productId!));
 await assert.rejects(production.verifyAndDecodeTransaction(jws),'Sandbox receipt must never verify as production');
 const parts=jws.split('.');parts[1]=Buffer.from(JSON.stringify({...tx,quantity:99})).toString('base64url');await assert.rejects(sandbox.verifyAndDecodeTransaction(parts.join('.')));
 inputs.push({jws,tx,purchase,sha256:createHash('sha256').update(jws).digest('hex')});
}
const admin=createPool(url.href),name='jamloom_apple_receipts_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;const pool=createPool(url.href),wallet=new Wallet(pool);
let server:ChildProcess|undefined,scratch:string|undefined;
try{
 await migrate(pool);for(const owner of ['owner','other'])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@apple-fixture.test']);
 await wallet.accountToken('owner');await pool.query('UPDATE credit_wallets SET app_account_token=$1 WHERE owner_id=$2',[token,'owner']);
 if(http){
  const password=randomUUID()+randomUUID();
  for(const owner of ['owner','other'])await pool.query('INSERT INTO account(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',[randomUUID(),owner,await hashPassword(password)]);
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const address=reservation.address();assert(address&&typeof address==='object');const port=address.port;await new Promise<void>((resolve,reject)=>reservation.close(error=>error?reject(error):resolve()));
  const base='http://127.0.0.1:'+port;scratch=await mkdtemp(join(tmpdir(),'jamloom-apple-receipts-'));
  const env={...process.env,JAMLOOM_QUALIFICATION_BUILD:'1',DATABASE_URL:url.href,BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_COMING_SOON:'false',JAMLOOM_LOCAL_OUTBOX:join(scratch,'mail'),RESEND_API_KEY:'',APPLE_ENVIRONMENT:'sandbox',APPLE_BUNDLE_ID:bundle,CREDIT_BILLING_MODE:'test',JAMLOOM_CLOUD_SONGS_ENABLED:'false',JAMLOOM_AI_DJ_BETA_ENABLED:'false',VERCEL:''};
  async function startHTTP(production=false){
   server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...env,...(production?{APPLE_ENVIRONMENT:'production',CREDIT_BILLING_MODE:'live'}:{})},stdio:'ignore'});
   let ready=false;for(let n=0;n<100;n++){if(server.exitCode!==null)break;try{if((await fetch(base+'/api/site-status')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'Qualification build did not start');
  }
  await startHTTP();
  const send=(path:string,body:unknown,cookie='',origin=base)=>fetch(base+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
  for(const path of ['/api/payments/apple/notifications','/api/payments/apple/notifications/sandbox']){
   assert.equal((await send(path,{})).status,400);
   assert.equal((await send(path,{signedPayload:'forged'})).status,503);
   assert.equal((await send(path,{signedPayload:'x'.repeat(20000)})).status,413);
   if(notification)for(let n=0;n<2;n++){const r=await send(path,{signedPayload:notification});assert.equal(r.status,200);assert.deepEqual(await r.json(),{received:true,manualReview:false});}
  }
  if(notification)assert.deepEqual((await pool.query('SELECT provider,count(*)::int n FROM provider_webhook_events GROUP BY provider')).rows,[{provider:'apple_sandbox',n:1}]);
  async function login(owner:string){const r=await send('/api/auth/sign-in/email',{email:owner+'@apple-fixture.test',password});assert.equal(r.status,200);const cookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert(cookie);return cookie;}
  const ownerCookie=await login('owner'),otherCookie=await login('other');
  assert.deepEqual(await wallet.balance('owner'),{available:0,reserved:0});
  for(const {jws} of inputs){
   const body={action:'verify',signedTransaction:jws};
   assert.equal((await send('/api/payments/apple',body)).status,401);
   assert.equal((await send('/api/payments/apple',body,ownerCookie,'http://wrong.invalid')).status,403);
   assert.equal((await send('/api/payments/apple',body,otherCookie)).status,400);
   assert.equal((await send('/api/payments/apple',{action:'verify',signedTransaction:'forged'},ownerCookie)).status,400);
   const a=await send('/api/payments/apple',body,ownerCookie),b=await send('/api/payments/apple',body,ownerCookie);assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(await a.json(),await b.json());
  }
  await send('/api/auth/sign-out',{},ownerCookie);await send('/api/auth/sign-out',{},otherCookie);
  if(notification){
   assert(server);const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;server=undefined;
   await startHTTP(true);
   // Production defaults cannot redirect a verified sandbox event into the live ledger.
   assert.equal((await send('/api/payments/apple/notifications',{signedPayload:notification})).status,503);
   const response=await send('/api/payments/apple/notifications/sandbox',{signedPayload:notification});assert.equal(response.status,200);assert.deepEqual(await response.json(),{received:true,manualReview:false});
   assert.deepEqual((await pool.query('SELECT provider,count(*)::int n FROM provider_webhook_events GROUP BY provider')).rows,[{provider:'apple_sandbox',n:1}]);
  }
 }
 let expected=0;const ids=new Set<string>();
 for(const {jws,purchase} of inputs){await assert.rejects(fulfillApple(sandbox,wallet,'other',jws,bundle));const lot=await fulfillApple(sandbox,wallet,'owner',jws,bundle);assert.equal(await fulfillApple(sandbox,wallet,'owner',jws,bundle),lot);if(!ids.has(purchase.receipt)){expected+=purchase.credits;ids.add(purchase.receipt);}}
 assert.deepEqual(await wallet.balance('owner'),{available:expected,reserved:0});assert.deepEqual(await new Wallet(pool,true).balance('owner'),{available:0,reserved:0});
 assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,ids.size);
 console.log(JSON.stringify({status:'PASS',environment:'real Apple Sandbox + disposable local PostgreSQL',receipts:inputs.map(x=>({sha256:x.sha256,product:x.tx.productId,credits:x.purchase.credits,subscription:!!x.purchase.subscription})),uniqueGrants:ids.size,totalCredits:expected,duplicateDelivery:'PASS',wrongAccount:'PASS',productionIsolation:'PASS',forgedPayloadRejected:'PASS',authenticatedLocalHTTP:http?'PASS':'NOT RUN',providerSignedTestNotification:notification?'PASS local HTTP verification and deduplication':'NOT RUN',liveCharges:0,hostedDelivery:'NOT RUN',nativeHTTPTransport:'NOT RUN'}));
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();if(scratch)await rm(scratch,{recursive:true,force:true});console.log(JSON.stringify({cleanup:'PASS',databaseRemoved:true,localHTTPStopped:!!server}));
}
