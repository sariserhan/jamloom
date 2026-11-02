import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {read,save,control,health,endpoint,database} from './deployed-common.mts';
import {Wallet} from '../apps/site/lib/wallet';
const c=await read('style-control-result.json'),h=await health(),e=await control('serverless/'+endpoint),out=await read('style-http-result.json');
assert.equal(c.cleanup,true);assert.deepEqual(e.workers,{min:0,max:0});assert.deepEqual(e.gpu,c.previousGpu);assert.equal(h.jobs.inQueue,0);assert.equal(h.jobs.inProgress,0);assert(Object.values(h.workers).every(v=>v===0));
const account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/review-account-private.json',import.meta.url),'utf8')),pool=database();
try{
 const pending=Number((await pool.query("SELECT count(*) n FROM dna_song_jobs WHERE state IN ('queued','running')")).rows[0].n);assert.equal(pending,0);
 const testBalance=await new Wallet(pool,false).balance(account.id),liveBalance=await new Wallet(pool,true).balance(account.id);assert.equal(testBalance.reserved,0);assert.deepEqual(liveBalance,out.beforeLive);
 const publicRoutes=[];
 for(const path of ['/music-dna','/improvise','/academy','/singing-academy','/api/taste/song','/api/improvise/song']){
  const r=await fetch('https://www.jamloom.com'+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);
  if(path.startsWith('/api/')){const b=await r.json();assert.equal(b.available,false);assert.equal(b.signedIn,false);publicRoutes.push({path,status:r.status,available:b.available,signedIn:b.signedIn});}else{await r.body?.cancel();publicRoutes.push({path,status:r.status});}
 }
 const report={status:'PASS',at:new Date().toISOString(),workerLimits:e.workers,previousHardwareRestored:true,health:h,pendingJobs:pending,testBalance,liveBalance,capturedTestCredits:out.beforeTest.available-testBalance.available,liveWalletUnchanged:true,publicRoutes};await save('final-verification.json',report);console.log(JSON.stringify(report));
}finally{await pool.end();}
