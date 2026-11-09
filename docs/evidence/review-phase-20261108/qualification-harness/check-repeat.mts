import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {database,read,save,delay,health,endpoint} from './deployed-common.mts';import {capacityProvider,CloudCapacity} from '../apps/site/lib/cloud-capacity';import {CLOUD_COST_PROFILE} from '../apps/site/lib/cloud-production-profile';import {Wallet} from '../apps/site/lib/wallet';
const success=await read('live-check-result.json');assert.equal(success.status,'PASS');assert.equal(success.idleShutdown,true);
const p=await read('permit.json'),pool=database(),account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/review-account-private.json',import.meta.url),'utf8'));const base='https://www.jamloom.com';let cookie='',started=false;
const cap=new CloudCapacity(pool,endpoint,CLOUD_COST_PROFILE,p,capacityProvider(process.env.RUNPOD_API_KEY!,endpoint));
async function api(path:string,body?:any){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json','x-jamloom-dna':'1',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});if(r.headers.getSetCookie().length)cookie=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert(r.ok,'Review repeat HTTP '+r.status);return r.json();}
try{
 const prior=(await pool.query('SELECT count(*)::int n FROM cloud_capacity_cycles WHERE permit_id=$1',[p.id])).rows[0].n;assert.equal(prior,1);const beforeTest=await new Wallet(pool,false).balance(account.id),beforeLive=await new Wallet(pool,true).balance(account.id);
 await api('/api/auth/sign-in/email',{email:account.email,password:account.password,rememberMe:false});assert.equal((await api('/api/account')).sandboxReview,true);
 await writeFile(new URL('repeat-prepare-claimed.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),calls:1,noGeneration:true}),{flag:'wx',mode:0o600});started=true;
 const r=await api('/api/improvise/song',{action:'prepare'});assert.equal(r.state,'preparing');assert.equal(r.creditsUsed,0);
 // Stop this explicit validation cycle immediately; its full reservation stays consumed.
 const stop=await cap.reconcile(false,true);assert(['off','stopping'].includes(stop.state));
 const until=Date.now()+130000;let empty=false;while(Date.now()<until){await cap.reconcile(false,true);const h=await health();if(h.jobs.inQueue+h.jobs.inProgress===0&&Object.values(h.workers).every(x=>x===0)){empty=true;break;}await delay(5000);}assert(empty);
 assert.deepEqual(await new Wallet(pool,false).balance(account.id),beforeTest);assert.deepEqual(await new Wallet(pool,true).balance(account.id),beforeLive);
 const reserved=Number((await pool.query('SELECT reserved_micros FROM cloud_capacity_permits WHERE id=$1',[p.id])).rows[0].reserved_micros);assert.equal(reserved,1500000);
 const report={status:'PASS',at:new Date().toISOString(),sameReviewerPreparedAgain:true,prepareCalls:1,generationSubmissions:0,creditsUsed:0,immediateOperatorStop:true,workers:[0,0],aggregateReservedMicros:reserved,remainingPermitMicros:p.capMicros-reserved,publicDailyLimitRetained:true};await save('repeat-prepare-result.json',report);console.log(JSON.stringify(report));
}finally{if(started)await cap.reconcile(false,true);try{await api('/api/auth/sign-out',{});}catch{}await pool.end();}
