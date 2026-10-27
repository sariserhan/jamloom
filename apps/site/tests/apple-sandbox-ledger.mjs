// Real signed sandbox receipts, disposable local ledger. No production account or fake receipt grants.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {Wallet} from '../lib/wallet.ts';
import {appleVerifier,fulfillApple} from '../lib/apple-payments.ts';
import {grantAppleCourse,singingAppleProduct} from '../lib/apple-course.ts';

const [action,folder,receiptPath]=process.argv.slice(2);
assert(['prepare','verify','cleanup'].includes(action)&&folder,'prepare|verify|cleanup PRIVATE_DIRECTORY [JWS_FILE]');
const root=resolve(folder),statePath=join(root,'state.json'),admin=createPool('postgresql://127.0.0.1:5432/postgres');
const validName=name=>/^jamloom_apple_sandbox_[a-f0-9]{32}$/.test(name);
assert(!validName('production'));assert(!validName('jamloom_apple_sandbox_x;DROP DATABASE'));
let pool;
try {
 if(action==='prepare'){
  await mkdir(root,{mode:0o700});
  const state={database:'jamloom_apple_sandbox_'+randomUUID().replaceAll('-',''),owner:randomUUID(),other:randomUUID(),status:'PREPARED'};
  assert(validName(state.database));await admin.query(`CREATE DATABASE "${state.database}"`);
  try{
   pool=createPool('postgresql://127.0.0.1:5432/'+state.database);await migrate(pool);
   for(const owner of [state.owner,state.other])await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[owner,'Sandbox qualification',owner+'@example.test']);
   state.accountToken=await new Wallet(pool).accountToken(state.owner);
   await writeFile(statePath,JSON.stringify(state,null,2)+'\n',{flag:'wx',mode:0o600});
   console.log(JSON.stringify({prepared:true,appAccountToken:state.accountToken}));
  }catch(error){await pool?.end();pool=null;await admin.query(`DROP DATABASE "${state.database}" WITH (FORCE)`);throw error;}
 }else{
  const state=JSON.parse(await readFile(statePath,'utf8'));assert(validName(state.database));
  if(action==='cleanup'){
   await admin.query(`DROP DATABASE "${state.database}" WITH (FORCE)`);
   await writeFile(join(root,'cleanup.json'),JSON.stringify({status:'PASS',disposableDatabaseRemoved:true})+'\n',{mode:0o600});
  }else{
   assert(receiptPath);const jws=(await readFile(receiptPath,'utf8')).trim();assert(jws.length>100&&jws.length<40000);
   const verifier=appleVerifier({...process.env,APPLE_ENVIRONMENT:'sandbox',APPLE_BUNDLE_ID:'com.djayvo.app'});
   const transaction=await verifier.verifyAndDecodeTransaction(jws);
   assert.equal(transaction.environment,'Sandbox');assert.equal(transaction.bundleId,'com.djayvo.app');assert.equal(transaction.appAccountToken?.toLowerCase(),state.accountToken.toLowerCase());
   assert(['com.jamloom.credits.starter',singingAppleProduct].includes(transaction.productId));
   pool=createPool('postgresql://127.0.0.1:5432/'+state.database);const wallet=new Wallet(pool),course=transaction.productId===singingAppleProduct;
   const grant=owner=>course?grantAppleCourse(verifier,pool,owner,jws,'com.djayvo.app'):fulfillApple(verifier,wallet,owner,jws,'com.djayvo.app');
   await assert.rejects(grant(state.other));
   const first=await grant(state.owner);assert.equal(await grant(state.owner),first);
   if(course){const rows=await pool.query('SELECT product_key,amount_cents,sandbox,refund_hold FROM academy_purchases WHERE owner_id=$1',[state.owner]);assert.deepEqual(rows.rows,[{product_key:'singing-complete',amount_cents:3900,sandbox:true,refund_hold:false}]);}
   else assert.deepEqual(await wallet.balance(state.owner),{available:10,reserved:0});
   const report={status:'PASS signed sandbox verification and isolated ledger delivery',product:transaction.productId,transactionId:transaction.transactionId,receiptSha256:createHash('sha256').update(jws).digest('hex'),checks:['Apple certificate/signature and online checks','Sandbox environment','exact product and USD price','account binding and wrong-account rejection','idempotent replay'],limits:['Test account inserted in disposable local database','Receipt transferred unchanged from phone; native HTTP delivery and refund notifications not qualified']};
   await writeFile(join(root,course?'course.json':'starter.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
  }
 }
}finally{await pool?.end();await admin.end();}
