import {stagingRequest} from './staging-request.mts';
import {read,save,database} from './deployed-common.mts';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const deployment=(await read('diagnostic-deployment-url.json')).deployment.url;
const base=deployment.startsWith('https://')?deployment:'https://'+deployment;
const locked=await fetch(base+'/api/account',{redirect:'manual',signal:AbortSignal.timeout(20000)});assert([401,403,302,307].includes(locked.status),'Staging must remain protected');
const account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/course-review-account-private.json',import.meta.url),'utf8'));
const signed=await stagingRequest('/api/auth/sign-in/email',{method:'POST',headers:{Origin:'https://www.jamloom.com','Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password,rememberMe:false})});
assert.equal(signed.status,200);assert.equal((await signed.json()).user.id,account.id);
const cookie=signed.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert(cookie);
const headers={Cookie:cookie,Origin:'https://www.jamloom.com','Content-Type':'application/json'};
const me=await stagingRequest('/api/account',{headers});assert.equal(me.status,200);assert.equal((await me.json()).sandboxReview,true);
const song=await stagingRequest('/api/improvise/song',{headers});assert.equal(song.status,200);const state=await song.json();assert.equal(state.available,false);assert.equal(state.signedIn,true);
const pool=database();try{assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,'jamloom_stage_20261108');assert.equal((await pool.query('SELECT count(*)::int n FROM cloud_capacity_cycles')).rows[0].n,0);}finally{await pool.end();}
const out=await stagingRequest('/api/auth/sign-out',{method:'POST',headers,body:'{}'});assert.equal(out.status,200);
const report={status:'PASS',at:new Date().toISOString(),deployment:base,protectionStatus:locked.status,authenticatedAccount:true,syntheticLedgerOnly:true,available:false,capacityCycles:0,generationSubmissions:0,publicAliasAssigned:false};await save('staging-preflight.json',report);console.log(JSON.stringify(report));
