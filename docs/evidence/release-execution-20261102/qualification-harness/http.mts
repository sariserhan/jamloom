import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {dir,read,save,delay,database} from './deployed-common.mts';
import {validateWav} from '../apps/site/lib/audio-validation';
import {emptyTaste} from '../apps/site/lib/taste';
import {songInput} from '../apps/site/lib/dna-song';
import {Wallet} from '../apps/site/lib/wallet';
if(process.argv.includes('--dry-run')){songInput({...emptyTaste,references:['Take Five — Dave Brubeck'],referenceMetadata:[{reference:'Take Five — Dave Brubeck',genre:'Jazz',source:'itunes'}],vocalLanguage:'de'});console.log(JSON.stringify({status:'PASS',mode:'dry-run',requests:2,credits:30,capMicros:207200,providerOperations:0}));process.exit(0);}
assert(process.argv.includes('--apply'));const permit=JSON.parse(await readFile(new URL('../docs/evidence/release-execution-20261102/hosted-plan.json',import.meta.url),'utf8'));assert.equal(permit.status,'APPROVED');assert.equal(permit.maxRequests,2);
const pool=database(),base='https://www.jamloom.com',account=JSON.parse(await readFile(new URL('../build-release-closure-20261031/review-account-private.json',import.meta.url),'utf8'));
const lease=await read('lease.json');let requestDeadline=lease.expiresAt;
const result:any={status:'RUNNING',startedAt:new Date().toISOString(),requests:[]};let cookies='';const cookieJar=new Map<string,string>();
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
async function raw(path:string,body?:any,method?:string){assert(Date.now()<requestDeadline,'HTTP deadline elapsed');const r=await fetch(base+path,{method:method??(body?'POST':'GET'),headers:{Origin:base,'Content-Type':'application/json','x-jamloom-dna':'1',...(cookies?{Cookie:cookies}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(Math.max(1,Math.min(60000,requestDeadline-Date.now())))});const set=r.headers.getSetCookie();for(const cookie of set){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookieJar.set(pair.slice(0,i),pair.slice(i+1));}cookies=[...cookieJar].map(([k,v])=>k+'='+v).join('; ');return r;}
async function api(path:string,body?:any,method?:string){const r=await raw(path,body,method);const j=await r.json();if(!r.ok)throw Error(path.split('?')[0]+' HTTP '+r.status+' '+(j.error??j.code??'Request failed'));return j;}
try{
 const signed=await api('/api/auth/sign-in/email',{email:account.email,password:account.password,rememberMe:false});assert.equal(signed.user.id,account.id);
 const a=await api('/api/account');assert.equal(a.sandboxReview,true);
 const current=await new Wallet(pool,false).balance(account.id);assert(current.available>=30);assert.equal(current.reserved,0);
 const spent=await pool.query('SELECT COALESCE(sum(d.cost_cap_micros),0)::int n FROM cloud_song_runs c JOIN dna_song_jobs d ON d.id=c.id WHERE d.owner_id=$1 AND NOT d.billing_live',[account.id]);result.operatorCapBaselineMicros=spent.rows[0].n;result.beforeTest=current;result.beforeLive=await new Wallet(pool,true).balance(account.id);
 for(const p of ['/api/taste/song','/api/improvise/song']){const g=await api(p);assert.equal(g.mode,'cloud');assert.equal(g.signedIn,true);assert.equal(g.available,false);assert(!g.active);}
 const preflight={...emptyTaste,references:['Take Five — Dave Brubeck'],referenceMetadata:[{reference:'Take Five — Dave Brubeck',genre:'Jazz',source:'itunes'}],vocalLanguage:'de'};songInput(preflight);await save('style-preflight.json',{status:'PASS',at:new Date().toISOString(),credits:30,costCapMicros:207200,generationSubmitted:false,available:false});console.log('Authenticated account verified; no quote or request before capacity is ready');
 await save('http-preparation-wait.json',{ready:true});
 let configured=false;while(Date.now()<lease.expiresAt-16*60000){
  try{await read('style-prepare-ready.json');configured=true;break;}catch{try{const stopped=await read('style-control-result.json');throw Error(stopped.error??'Controller stopped');}catch(e){if((e as any).code!=='ENOENT')throw e;}await delay(2000);}
 }
 assert(configured,'Preparation configuration deadline');
 await writeFile(new URL('prepare-claimed.json',dir),JSON.stringify({at:new Date().toISOString()}),{flag:'wx',mode:0o600});
 const prepared=await api('/api/taste/song',{action:'prepare'});assert.equal(prepared.creditsUsed,0);assert.equal(prepared.state,'preparing');
 assert.deepEqual(await new Wallet(pool,false).balance(account.id),current);
 await save('explicit-preparation.json',{status:'PASS',calls:1,creditsUsed:0,at:new Date().toISOString()});
 let ready:any;while(!ready){try{ready=await read('style-ready.json');}catch{try{const c=await read('style-control-result.json');throw Error('Capacity stopped: '+c.error);}catch(e){if((e as any).code!=='ENOENT')throw e;}await delay(3000);}}
 assert(ready.deadline-Date.now()>16*60000);requestDeadline=ready.preparationDeadline;let admitted=false;result.readiness=[];
 while(Date.now()<ready.preparationDeadline){const available=await api('/api/taste/song');assert.equal(available.signedIn,true);assert(!available.active);result.readiness.push({at:new Date().toISOString(),available:available.available===true,signedIn:true});await save('application-readiness.json',result.readiness);if(Date.now()<ready.preparationDeadline&&available.available===true){admitted=true;break;}await delay(5000);}
 assert(admitted,'Deployed application did not become ready within the remaining preparation window');assert(Date.now()<ready.preparationDeadline);assert(ready.deadline-Date.now()>15*60000);requestDeadline=ready.preparationDeadline;
 for(const product of ['music-dna','improvise'] as const){
  assert(Date.now()<ready.deadline-60000);const path=product==='music-dna'?'/api/taste/song':'/api/improvise/song';let profile:any;
  requestDeadline=product==='music-dna'?ready.preparationDeadline:ready.deadline-30000;
  assert(ready.deadline-Date.now()>(product==='music-dna'?15:6)*60000);
  assert.equal((await api(path)).available,true);
  const entry:any={product,id:randomUUID().replaceAll('-',''),startedAt:new Date().toISOString(),submitCalls:0};result.requests.push(entry);await save('style-http-state.json',result);
  if(product==='music-dna')profile=preflight;
  else{
   const audio=await readFile(new URL('../renders/neural-question-input-20261030/source-16k-mono.wav',import.meta.url));assert.equal(hash(audio),'fd7752a9aead13dcbb15c6313e4834820bfecbf68160196ac9ca59deff9d0ea1');
   const u=await api(path,{action:'upload',bytes:audio.length,sha256:hash(audio),consent:true});entry.sourceId=u.id;await save('style-http-state.json',result);
   const target=new URL(u.url);assert.equal(target.protocol,'https:');assert(target.hostname.endsWith('.r2.cloudflarestorage.com'));
   const put=await fetch(target,{method:'PUT',body:new Uint8Array(audio),headers:{'Content-Type':'audio/wav'},signal:AbortSignal.timeout(30000)});assert(put.ok,'Source upload HTTP '+put.status);
   profile={sourceId:u.id,phrase:'',voice:'male',genre:'drumandbass',consent:true};
  }
  const input={profile,visibility:'private',publicConsent:false},q=await api(path,{action:'quote',...input});assert.equal(q.credits,product==='music-dna'?20:10);assert.equal(q.costCapMicros,product==='music-dna'?138800:68400);entry.quote={credits:q.credits,costCapMicros:q.costCapMicros};
  assert(product!=='music-dna'||Date.now()<ready.preparationDeadline);assert(ready.deadline-Date.now()>(product==='music-dna'?15:6)*60000);await writeFile(new URL('request-claimed-'+product+'.json',dir),JSON.stringify({id:entry.id,at:new Date().toISOString()}),{flag:'wx',mode:0o600});entry.submitCalls=1;entry.submitIntentAt=new Date().toISOString();await save('style-http-state.json',result);
  const response=await api(path,{action:'submit',requestId:entry.id,token:q.token,...input});assert.equal(response.id,entry.id);requestDeadline=ready.deadline-30000;console.log(product+' submitted once');
  while(Date.now()<ready.deadline-30000){const j=await api(path+'?id='+entry.id);entry.state=j.state;await save('style-http-state.json',result);if(['completed','failed','cancelled'].includes(j.state))break;await delay(4000);}
  const row=(await pool.query('SELECT d.*,c.provider_id,c.provider_status,c.submitted_at,c.execution_ms,c.delay_ms,c.estimated_cost_micros,c.output_key,c.payload,c.cleanup_at FROM dna_song_jobs d JOIN cloud_song_runs c ON c.id=d.id WHERE d.id=$1',[entry.id])).rows[0];
  await save('deployed-'+product+'-private-row.json',row);assert.equal(row.owner_id,account.id);assert.equal(row.billing_live,false);assert.equal(row.visibility,'private');entry.state=row.state;entry.providerStatus=row.provider_status;entry.providerId=row.provider_id;entry.executionMs=row.execution_ms;entry.delayMs=row.delay_ms;entry.estimatedCostMicros=Number(row.estimated_cost_micros);entry.durationSeconds=row.payload.duration_seconds;
  assert.equal(row.state,'completed',product+' did not complete');assert(row.provider_id);assert.equal(row.provider_status,'COMPLETED');assert.equal(row.quoted_credits,q.credits);if(product==='music-dna'){assert(['matched','uncertain'].includes(row.song_plan.styleMatch));entry.styleMatch=row.song_plan.styleMatch;const delivered=await api(path+'?id='+entry.id);assert.equal(delivered.styleMatch,row.song_plan.styleMatch);}
  const reservation=(await pool.query('SELECT status,actual_cost_micros FROM generation_reservations WHERE id=$1',[row.reservation_id])).rows[0];assert.equal(reservation.status,'completed');entry.reservation=reservation;
  const redirect=await raw(path+'?id='+entry.id+'&file=audio&download=1');assert.equal(redirect.status,307);const location=new URL(redirect.headers.get('location')!);assert.equal(location.protocol,'https:');assert(location.hostname.endsWith('.r2.cloudflarestorage.com'));
  const download=await fetch(location,{signal:AbortSignal.timeout(Math.max(1,Math.min(60000,requestDeadline-Date.now())))});assert(download.ok);const audio=Buffer.from(await download.arrayBuffer());assert.equal(hash(audio),row.audio_sha256);assert.equal(validateWav(audio,Number(row.audio_bytes),row.audio_sha256,26880044),row.payload.duration_seconds*1000);await writeFile(new URL('deployed-'+product+'.wav',dir),audio,{mode:0o600});entry.audio={sha256:hash(audio),bytes:audio.length,validation:'PASS'};
  const forbidden=await fetch(base+path+'?id='+entry.id,{redirect:'manual',signal:AbortSignal.timeout(15000)});const privateBody=await forbidden.json();assert([401,403,404,503].includes(forbidden.status));assert.deepEqual(Object.keys(privateBody),['error']);assert(!forbidden.headers.get('location'));
  const forbiddenAudio=await fetch(base+path+'?id='+entry.id+'&file=audio',{redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(forbiddenAudio.status,404);entry.anonymousStatus=forbidden.status;entry.anonymousAudioStatus=forbiddenAudio.status;entry.privacy='PASS';console.log(product+' completed and private WAV verified');await save('style-http-state.json',result);
 }
 result.afterTest=await new Wallet(pool,false).balance(account.id);result.afterLive=await new Wallet(pool,true).balance(account.id);assert.deepEqual(result.afterLive,result.beforeLive);assert.equal(result.afterTest.reserved,0);
 const settlements=await pool.query("SELECT count(*)::int n,sum(quoted_credits)::int credits FROM dna_song_jobs WHERE id=ANY($1::text[]) AND state='completed' AND NOT billing_live",[result.requests.map((r:any)=>r.id)]);assert.equal(settlements.rows[0].n,2);assert.equal(settlements.rows[0].credits,30);assert.equal(result.afterTest.available,result.beforeTest.available-30);result.status='PASS';
}catch(e){requestDeadline=Math.min(lease.expiresAt+120000,Date.now()+30000);result.status='FAIL';result.error=(e as Error).message;console.log('HTTP qualification stopped:',result.error);
 for(const entry of result.requests){try{const row=(await pool.query('SELECT state,owner_id FROM dna_song_jobs WHERE id=$1',[entry.id])).rows[0];if(row&&row.owner_id===account.id&&!['completed','failed','cancelled'].includes(row.state)){await api((entry.product==='improvise'?'/api/improvise/song':'/api/taste/song')+'?id='+entry.id,undefined,'DELETE');}}catch{}}
}finally{result.finishedAt=new Date().toISOString();await save('style-http-result.json',result);await pool.end();console.log(JSON.stringify({status:result.status,requests:result.requests.map((r:any)=>({product:r.product,state:r.state})),error:result.error}));}
