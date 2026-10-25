// Explicitly approved GPU + real private R2, isolated customer identities and PostgreSQL.
import '../scripts/env.ts';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {DJSessions} from '../lib/dj-sessions.ts';
import {DJWarmWorker} from '../lib/dj-warm-worker.ts';
import {runRemoteDJBatch} from '../lib/dj-remote-worker.ts';
import {VastProvider} from '../lib/vast-provider.ts';
import {DJRecordings} from '../lib/dj-recordings.ts';
import {djSessionStore} from '../lib/dj-session-store.ts';
import {djSessionRequest} from '../lib/dj-sessions-http.ts';
import {djRecordingRequest} from '../lib/dj-recordings-http.ts';
import {silenceSpeakers} from './silent-audio.mjs';

assert.ok(process.argv.includes('--apply'),'Explicit approved qualification required');
async function privateFile(path){assert.ok(path);const s=await stat(path);assert.ok(s.size<8192&&(s.mode&0o077)===0);return readFile(path,'utf8');}
const approval=JSON.parse(await readFile('../../docs/evidence/ai-dj-warm-20261024/authorization.json','utf8'));
assert.equal(approval.campaign,'jamloom-dj-qualification-20261024-sessions');assert.equal(approval.budget_usd,6);assert.equal(approval.instances_max,1);assert.equal(approval.max_elapsed_seconds,2400);assert.equal(approval.model_requests_max,8);assert.equal(approval.public_activation,false);assert.ok(approval.owner_statement);
const permit=JSON.parse(await privateFile(process.env.JAMLOOM_DJ_WARM_PERMIT)),token=(await privateFile(process.env.JAMLOOM_DJ_RENDER_TOKEN_FILE)).trim();
assert.equal(permit.label,approval.campaign);assert.equal(permit.budgetMicros,6000000);
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://127.0.0.1:5432/postgres');assert.equal(target.hostname,'127.0.0.1');
const id=()=>randomUUID().replaceAll('-',''),name='jamloom_dj_pipeline_'+id(),admin=createPool(target.toString());await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
const folder=resolve('../../renders/ai-dj-warm-20261024');await mkdir(folder,{recursive:true});
const objects=new Map(),store={local:true,put:async(k,b)=>objects.set(k,b),get:async k=>objects.get(k),remove:async k=>objects.delete(k),uploadURL:async()=>'',playbackURL:async()=>''};
const sessions=new DJSessions(pool,'isolated-warm-qualification-secret-12345',store,{costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000}),warm=new DJWarmWorker(sessions,new VastProvider(process.env.VASTAI_KEY??'')),recordings=new DJRecordings(pool,djSessionStore());
const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),5*60000),tracks=[],customers=[],errors=[];let worker,pulse,driver,browser;
try{
 await migrate(pool);worker=await warm.register(permit);
 await writeFile(resolve(folder,'worker-private.json'),JSON.stringify(worker),{mode:0o600,flag:'wx'});
 let checking=false;pulse=setInterval(async()=>{if(checking)return;checking=true;try{if(!await warm.heartbeat(worker,Math.ceil((Date.now()-permit.startedAt)*permit.hourlyMicros/3600000)))abort.abort();}catch{abort.abort();}finally{checking=false;}},3000);
 browser=await chromium.launch({args:['--disable-audio-output']});
 const origin='http://localhost:3000';
 for(const [visibility,credits] of [['public',100],['private',5]]){
  const owner='warm-test-'+id();customers.push({owner,visibility});
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:id(),credits,netMicros:credits*50000});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);const page=await context.newPage();customers.at(-1).page=page;page.setDefaultTimeout(240000);page.on('pageerror',e=>errors.push(e.message));
  for(const resource of ['sessions','recordings'])await page.route('**/api/ai-dj/'+resource+'**',async route=>{
   const r=route.request(),request=new Request(r.url(),{method:r.method(),headers:r.headers(),...(r.postDataBuffer()?{body:r.postDataBuffer()}:{})}),path=new URL(r.url()).pathname.split('/').slice(4).filter(Boolean);
   const response=await (resource==='sessions'?djSessionRequest(request,async()=>({owner,origin,sessions,enabled:true}),path):djRecordingRequest(request,async()=>({owner,origin,recordings}),path));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  await page.goto(origin+'/ai-dj/session');await page.getByLabel('Party or venue name',{exact:true}).fill('Warm '+visibility+' qualification');await page.getByRole('radio',{name:new RegExp(visibility==='public'?'Public':'Private')}).check();await page.getByRole('button',{name:'Check credits →'}).click();await page.getByRole('button',{name:'Continue to the deck →'}).click();
 }
 driver=(async()=>{while(!abort.signal.aborted&&tracks.length<6){const track=await runRemoteDJBatch(warm,worker,token,abort.signal);if(track){tracks.push(track);await writeFile(resolve(folder,'tracks.json'),JSON.stringify(tracks,null,2));}else await delay(200);}})().catch(e=>{errors.push(e.message);abort.abort();});
 await Promise.all(customers.map(async({page})=>{await page.getByRole('button',{name:'Start set',exact:true}).click();await page.getByText(/Recording (public|private) set/).waitFor();await page.getByLabel('Set energy').fill('5');}));
 await Promise.all(customers.map(async customer=>{
  const {page,owner,visibility}=customer;
  if(visibility==='public'){await page.waitForFunction(()=>document.querySelector('.deck-0 .aidj-readout h2')?.textContent.endsWith('· 3')&&document.querySelector('.deck-0 .aidj-deck-head span')?.textContent==='PLAYING');await page.waitForTimeout(36000);await page.getByRole('button',{name:'■ Stop',exact:true}).click();}
  await page.getByText('Your complete set is saved.',{exact:true}).waitFor();
  const record=(await recordings.list(owner)).find(r=>r.title==='Warm '+visibility+' qualification');assert.equal(record.state,'ready');assert.equal(record.visibility,visibility);
  const session=(await pool.query('SELECT s.* FROM dj_sessions s JOIN dj_recordings r ON r.session_id=s.id WHERE r.id=$1',[record.id])).rows[0];assert.equal(session.state,'ended');assert.equal(session.end_reason,visibility==='public'?'stop':'credits');
  assert.equal((await sessions.wallet.balance(owner)).reserved,0);assert.equal((await recordings.publicList()).sets.some(r=>r.id===record.id),visibility==='public');
  const audio=await fetch(await recordings.playback(owner,record.id));assert.equal(audio.status,200);await writeFile(resolve(folder,visibility+'-mixed.'+(record.mime==='audio/mp4'?'m4a':'webm')),Buffer.from(await audio.arrayBuffer()));
  await page.screenshot({path:resolve(folder,visibility+'-saved.png'),fullPage:true});assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(o=>o.peak===0)));
  customer.result={visibility,session:session.id,endReason:session.end_reason,recording:record.id};
 }));
 await driver;assert.equal(tracks.length,6);assert.equal(new Set(tracks.map(t=>t.sha256)).size,6);assert.deepEqual(errors,[]);
 const batches=(await pool.query("SELECT session_id,sequence,seed,render_settings,vocal,audio_sha256 FROM dj_session_batches WHERE state='completed' ORDER BY session_id,sequence")).rows;
 assert.equal(new Set(batches.map(b=>String(b.seed))).size,6);assert.ok(batches.some(b=>b.render_settings.energy===5));
 for(const b of batches){const audio=await sessions.audio(customers.find(c=>c.result.session===b.session_id).owner,b.session_id,b.sequence);await writeFile(resolve(folder,b.session_id+'-'+b.sequence+'.wav'),audio);}
 await writeFile(resolve(folder,'result.json'),JSON.stringify({status:'PASS technical',customers:customers.map(c=>c.result),tracks,batches:batches.map(b=>({...b,seed:Number(b.seed)})),vocals:batches.filter(b=>b.vocal).length,humanListening:'NOT RUN'},null,2));
}finally{
 abort.abort();clearTimeout(timeout);if(pulse)clearInterval(pulse);await browser?.close();if(driver)await driver;
 if(worker){await warm.stop(worker);for(let i=0;i<8;i++){const results=await warm.sweep();await writeFile(resolve(folder,'shutdown.json'),JSON.stringify(results));if(results.some(r=>r.status==='shutdown_confirmed'))break;await delay(2000);}}
 for(const {owner} of customers){await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',[owner]);await recordings.purgeOwner(owner);await sessions.purgeOwner(owner);}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();
}
