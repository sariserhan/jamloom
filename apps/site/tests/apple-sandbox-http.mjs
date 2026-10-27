// Actual signed sandbox receipts through Better Auth and the unchanged HTTP handler; disposable database only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {setTimeout as delay} from 'node:timers/promises';
import {hashPassword} from 'better-auth/crypto';
import {createPool} from '../lib/database.ts';import {Wallet} from '../lib/wallet.ts';
const root=resolve(process.argv[2]??'');assert(process.argv[2],'Private prepared sandbox folder required');
const state=JSON.parse(await readFile(join(root,'state.json'),'utf8'));
assert.match(state.database,/^jamloom_apple_sandbox_[a-f0-9]{32}$/);
const pool=createPool('postgresql://127.0.0.1:5432/'+state.database),scratch=await mkdtemp(join(tmpdir(),'jamloom-apple-http-'));
const base='http://127.0.0.1:4239',password=randomUUID()+randomUUID();let server;
try{
 for(const owner of [state.owner,state.other])await pool.query('INSERT INTO account(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,\'credential\',$2,$3,now())',[randomUUID(),owner,await hashPassword(password)]);
 const env={...process.env,JAMLOOM_QUALIFICATION_BUILD:'1',DATABASE_URL:'postgresql://127.0.0.1:5432/'+state.database,BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:randomUUID()+randomUUID(),JAMLOOM_COMING_SOON:'false',JAMLOOM_LOCAL_OUTBOX:join(scratch,'mail'),RESEND_API_KEY:'',APPLE_ENVIRONMENT:'sandbox',APPLE_BUNDLE_ID:'com.djayvo.app',CREDIT_BILLING_MODE:'test',VERCEL:''};
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4239'],{env,stdio:'ignore'});
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/api/site-status')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'Local server unavailable');
 const send=(path,body,cookie='',origin=base)=>fetch(base+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 async function login(owner){const r=await send('/api/auth/sign-in/email',{email:owner+'@example.test',password});assert.equal(r.status,200);const cookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert(cookie);return cookie;}
 const ownerCookie=await login(state.owner),otherCookie=await login(state.other),rows=[];
 const before=await new Wallet(pool).balance(state.owner);assert.deepEqual(before,{available:10,reserved:0});
 for(const [name,action] of [['starter','verify'],['course','verify-course']]){
  const signedTransaction=(await readFile(join(root,name+'.jws'),'utf8')).trim(),body={action,signedTransaction};
  assert.equal((await send('/api/payments/apple',body)).status,401);
  assert.equal((await send('/api/payments/apple',body,ownerCookie,'http://wrong.invalid')).status,403);
  assert.equal((await send('/api/payments/apple',body,otherCookie)).status,400);
  assert.equal((await send('/api/payments/apple',{action,signedTransaction:'forged'},ownerCookie)).status,400);
  const a=await send('/api/payments/apple',body,ownerCookie),b=await send('/api/payments/apple',body,ownerCookie);assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(await a.json(),await b.json());
  rows.push({product:name,status:'PASS',checks:['authenticated real HTTP delivery','duplicate delivery','wrong account','unsigned receipt','missing session','wrong origin']});
 }
 assert.deepEqual(await new Wallet(pool).balance(state.owner),before);
 assert.equal((await pool.query('SELECT count(*)::int n FROM credit_lots')).rows[0].n,1);
 assert.equal((await pool.query('SELECT count(*)::int n FROM academy_purchases')).rows[0].n,1);
 await send('/api/auth/sign-out',{},ownerCookie);await send('/api/auth/sign-out',{},otherCookie);
 await writeFile(join(root,'http.json'),JSON.stringify({status:'PASS',rows,duplicateGrants:0,productionWrites:false,limitations:['Node HTTP client, not the native phone transport','Real refund notification and deployed delivery not qualified']},null,2)+'\n',{mode:0o600});console.log('PASS authenticated sandbox HTTP verification; no duplicate grants');
}finally{
 if(server&&server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
 await pool.end();await rm(scratch,{recursive:true,force:true});
}
