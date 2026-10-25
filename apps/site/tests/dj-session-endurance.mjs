// Real wall-clock generated-session engineering test; procedural originals, no GPU or live billing.
import '../scripts/env.ts';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {DJSessions} from '../lib/dj-sessions.ts';
import {DJRecordings} from '../lib/dj-recordings.ts';
import {djSessionStore} from '../lib/dj-session-store.ts';
import {runLocalDJBatch} from '../lib/dj-local-worker.ts';
import {djSessionRequest} from '../lib/dj-sessions-http.ts';
import {djRecordingRequest} from '../lib/dj-recordings-http.ts';
import {silenceSpeakers} from './silent-audio.mjs';
assert.ok(process.argv.includes('--apply'));
const seconds=Number(process.env.JAMLOOM_ENDURANCE_SECONDS??3605);assert.ok(Number.isSafeInteger(seconds)&&seconds>=120&&seconds<=7200);
const origin=process.env.JAMLOOM_ENDURANCE_ORIGIN??'http://localhost:3008';assert.ok(['http://localhost:3000','http://localhost:3008'].includes(origin));
const id=()=>randomUUID().replaceAll('-',''),name='jamloom_dj_pipeline_'+id(),owner='endurance-'+id(),folder=resolve('../../renders/ai-dj-finish-20261024/endurance-'+id());await mkdir(folder,{recursive:true});
const path=k=>{assert.match(k,/^masters\/[a-z0-9_-]+\.wav$/);return resolve(folder,k);};await mkdir(resolve(folder,'masters'));
const store={local:true,put:async(k,b)=>writeFile(path(k),b),get:async k=>readFile(path(k)),remove:async k=>rm(path(k),{force:true}),uploadURL:async()=>'',playbackURL:async()=>''};
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL??'postgresql://127.0.0.1:5432/postgres');assert.equal(target.hostname,'127.0.0.1');const admin=createPool(target.toString());await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
const sessions=new DJSessions(pool,'isolated-endurance-secret-1234567890',store,{costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000}),recordings=new DJRecordings(pool,djSessionStore()),abort=new AbortController(),jobs=[],errors=[],samples=[];
let current=Promise.resolve(),working=false,browser,sessionId,report={status:'RUNNING',folder,requestedSeconds:seconds,source:'Fresh procedural originals; no GPU or musical acceptance claim',samples};
const dispatch=()=>{if(working)return;working=true;current=runLocalDJBatch(sessions,folder,abort.signal).then(async job=>{if(!job)return;assert.ok(jobs.length<200);jobs.push({...job,folder:undefined});if(!abort.signal.aborted)assert.equal(job.state,'completed');if(job.folder)await rm(job.folder,{recursive:true});}).catch(e=>{errors.push(e.message);abort.abort();}).finally(()=>working=false);};
console.log(JSON.stringify({folder,database:name,seconds}));
try{
 await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:id(),credits:1000,netMicros:50000000});
 browser=await chromium.launch({args:['--disable-audio-output','--enable-precise-memory-info']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);
 await context.addInitScript(()=>{const Native=AudioContext;window.endurance={started:0,ended:0,meter:null};window.AudioContext=class extends Native{createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{window.endurance.started++;return start(...args);};source.addEventListener('ended',()=>window.endurance.ended++);return source;}createAnalyser(){const meter=super.createAnalyser();window.endurance.meter=meter;return meter;}};});
 const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 for(const resource of ['sessions','recordings'])await page.route('**/api/ai-dj/'+resource+'**',async route=>{
  const r=route.request(),request=new Request(r.url(),{method:r.method(),headers:r.headers(),...(r.postDataBuffer()?{body:r.postDataBuffer()}:{})}),parts=new URL(r.url()).pathname.split('/').slice(4).filter(Boolean);
  const response=await(resource==='sessions'?djSessionRequest(request,async()=>({owner,origin,sessions,enabled:true}),parts):djRecordingRequest(request,async()=>({owner,origin,recordings}),parts));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  if(resource==='sessions'&&r.method()==='POST'&&(parts[0]==='start'||parts[1]==='next'))dispatch();
 });
 await page.goto(origin+'/ai-dj/session');await page.getByLabel('Party or venue name',{exact:true}).fill('Continuous endurance');await page.getByRole('radio',{name:/Private/}).check();await page.getByRole('button',{name:'Check credits →'}).click();await page.getByRole('button',{name:'Continue to the deck →'}).click();await page.getByRole('button',{name:/^warm$/i}).filter({has:page.locator('span')}).click();await page.getByRole('button',{name:'Start set'}).click();await page.getByText('Recording private set',{exact:false}).waitFor();
 await page.waitForFunction(()=>{const m=window.endurance.meter;if(!m)return false;const pcm=new Float32Array(m.fftSize);m.getFloatTimeDomainData(pcm);return pcm.some(v=>Math.abs(v)>.001);},null,{timeout:10000});
 sessionId=(await pool.query('SELECT id FROM dj_sessions WHERE owner_id=$1',[owner])).rows[0].id;const began=Date.now();let direction=0;
 while(Date.now()-began<seconds*1000){
  assert.deepEqual(errors,[]);assert.equal(abort.signal.aborted,false);
  const state=await page.evaluate(()=>{const s=window.endurance,m=s.meter,pcm=new Float32Array(m.fftSize);m.getFloatTimeDomainData(pcm);return{started:s.started,ended:s.ended,rms:Math.sqrt(pcm.reduce((n,v)=>n+v*v,0)/pcm.length),heap:performance.memory?.usedJSHeapSize,stopped:document.body.innerText.includes('Prepared music finished. The set has stopped.')};});
  assert.equal(state.stopped,false);assert.ok(Number.isFinite(state.rms));assert.ok(state.started-state.ended>=1&&state.started-state.ended<=4);assert.ok(state.heap>0&&state.heap<512*1024**2);const rss=process.memoryUsage().rss;assert.ok(rss<768*1024**2);samples.push({elapsed:(Date.now()-began)/1000,...state,nodeRss:rss});
  const next=Math.floor((Date.now()-began)/60000);if(next>direction){direction=next;await page.getByLabel('Set energy').fill(String(2+next%4));await page.getByRole('button',{name:new RegExp('^'+['warm','bright','deep'][next%3]+'$','i')}).filter({has:page.locator('span')}).click();console.log(JSON.stringify({elapsed:next*60,tracks:jobs.length,heap:state.heap,nodeRss:rss}));await writeFile(resolve(folder,'progress.json'),JSON.stringify(samples.at(-1)));}
  await page.waitForTimeout(5000);
 }
 await page.getByRole('button',{name:'■ Stop',exact:true}).click();abort.abort();await current;await page.getByText('Your complete set is saved.',{exact:true}).waitFor({timeout:120000});
 const record=(await recordings.list(owner))[0];assert.equal(record.state,'ready');assert.equal(record.visibility,'private');assert.equal((await sessions.wallet.balance(owner)).reserved,0);assert.equal((await sessions.status(owner,sessionId)).endReason,'stop');assert.equal((await recordings.publicList()).sets.length,0);
 const response=await fetch(await recordings.playback(owner,record.id));assert.equal(response.status,200);await writeFile(resolve(folder,'complete-set.'+(record.mime==='audio/mp4'?'m4a':'webm')),Buffer.from(await response.arrayBuffer()));await page.screenshot({path:resolve(folder,'saved.png'),fullPage:true});assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(v=>v.peak===0)));
 const completed=jobs.filter(j=>j.state==='completed');report={...report,recordedSeconds:record.seconds,tracks:completed.length,jobs};assert.equal(new Set(completed.map(j=>j.sha256)).size,completed.length);assert.ok(completed.length>=Math.floor(seconds/60),'At least one fresh track per minute');assert.deepEqual(errors,[]);
 // This authored house fixture contains one-second rests; sparse RMS samples cannot distinguish them from dropouts.
 const scan=spawnSync('ffmpeg',['-nostdin','-hide_banner','-i',resolve(folder,'complete-set.'+(record.mime==='audio/mp4'?'m4a':'webm')),'-af','silencedetect=noise=-60dB:d=0.25','-f','null','-'],{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
 assert.equal(scan.status,0,'Decode the complete saved recording');const gaps=[...scan.stderr.matchAll(/silence_duration: ([\d.]+)/g)].map(m=>Number(m[1]));report.longestQuietSeconds=Math.max(0,...gaps);assert.ok(report.longestQuietSeconds<=1.25,'No silence beyond the authored fixture rests plus 250 ms tolerance');
 const batches=(await pool.query('SELECT sequence,seed,render_settings,audio_sha256 FROM dj_session_batches WHERE session_id=$1 ORDER BY sequence',[sessionId])).rows;assert.ok(batches.some(b=>b.render_settings.mood==='warm'));assert.ok(batches.some(b=>b.render_settings.mood==='bright'));
 report={...report,status:'PASS technical',actualSeconds:(Date.now()-began)/1000,recordedSeconds:record.seconds,tracks:completed.length,samples,batches:batches.map(b=>({...b,seed:Number(b.seed)})),errors,humanListening:'NOT RUN',hostedAuthentication:'Injected test context',sampledContinuity:'5-second screening, not sample-accurate glitch proof'};
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}finally{
 abort.abort();await browser?.close();await current;await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',[owner]);await recordings.purgeOwner(owner);await sessions.purgeOwner(owner);await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();report.cleanup='PASS: own R2 objects, user, database and source cache removed';report.errors=errors;report.jobs=jobs;await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,folder}));
}
