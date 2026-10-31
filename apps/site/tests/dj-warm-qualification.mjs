// Explicitly approved GPU + real private R2, isolated customer identities and PostgreSQL.
import '../scripts/env.ts';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat,statfs} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {DJSessions} from '../lib/dj-sessions.ts';
import {DJWarmWorker} from '../lib/dj-warm-worker.ts';
import {checkDJRenderer,runRemoteDJBatch} from '../lib/dj-remote-worker.ts';
import {VastProvider} from '../lib/vast-provider.ts';
import {DJRecordings} from '../lib/dj-recordings.ts';
import {djSessionStore} from '../lib/dj-session-store.ts';
import {djSessionRequest} from '../lib/dj-sessions-http.ts';
import {djRecordingRequest} from '../lib/dj-recordings-http.ts';
import {qualificationProcess} from './dj-qualification-process.mjs';
import {localAudioStore} from '../lib/audio-store.ts';
import {silenceSpeakers,countAudioSources} from './silent-audio.mjs';
import {djUIPreflight} from './dj-ui-preflight.mjs';
import {retainedRenderer} from './dj-retained-renderer.mjs';

assert.ok(process.argv.includes('--apply'),'Explicit approved qualification required');
async function privateFile(path){assert.ok(path);const s=await stat(path);assert.ok(s.size<8192&&(s.mode&0o077)===0);return readFile(path,'utf8');}
const endurance=process.argv.includes('--endurance'),localMetal=process.argv.includes('--local-metal');
assert.ok(!localMetal||(endurance&&process.env.JAMLOOM_LOCAL_DJ_QUALIFICATION==='true'&&!process.argv.includes('--hosted')));
const replay=process.argv.includes('--retained-rehearsal'),integrated=process.argv.includes('--integrated'),reliability=process.argv.includes('--reliability'),releaseCheck=process.argv.includes('--release-check');
const releaseRetry=process.argv.includes('--release-retry'),releaseSuffix=releaseRetry?'-retry':'';assert.ok(!releaseRetry||releaseCheck);
assert.ok(!endurance||(releaseCheck&&!releaseRetry&&!replay));
assert.ok(!releaseCheck||reliability);
assert.ok(!reliability||integrated);
assert.ok(!integrated||(!replay&&(process.argv.includes('--hosted')||localMetal)&&process.argv.includes('--beta')));
assert.ok(!replay||(process.argv.includes('--beta')&&!process.argv.includes('--hosted')&&!process.argv.includes('--finish')));
const permit=replay?{account:1,instance:1,label:'jamloom-retained-'+randomUUID(),permitSha256:randomUUID().replaceAll('-','').repeat(2),hourlyMicros:1000,budgetMicros:1000,startedAt:Date.now(),deadline:Date.now()+1200000}:JSON.parse(await privateFile(process.env.JAMLOOM_DJ_WARM_PERMIT)),token=replay?'f'.repeat(64):(await privateFile(process.env.JAMLOOM_DJ_RENDER_TOKEN_FILE)).trim();

const hosted=process.argv.includes('--hosted'),standalone=hosted||localMetal;assert.ok(!hosted||process.argv.includes('--beta'));
const beta=process.argv.includes('--beta'),targetTracks=endurance?150:beta?20:6,campaign='jamloom-dj-qualification-20261024-sessions',finish=process.argv.includes('--finish');if(!replay&&!localMetal)assert.ok((endurance?['jamloom-dj-endurance-20261030']:integrated?[releaseCheck?'jamloom-dj-release-check-20261026'+releaseSuffix:reliability?'jamloom-dj-reliability-20261026':'jamloom-dj-integrated-20261026']:beta?[hosted?'jamloom-dj-qualification-20261025-hosted':'jamloom-dj-qualification-20261025-beta']:finish?[campaign+'-finish',campaign+'-finish-retry',campaign+'-finish-resume',campaign+'-finish-launch-fix']:[campaign,campaign+'-retry']).includes(permit.label));
if(!replay&&!localMetal){
const approval=JSON.parse(await readFile((endurance?'../../docs/evidence/nondeployment-completion-20261030/hosted-dj-plan.json':integrated?(releaseCheck?'../../docs/evidence/dj-release-check-20261026'+releaseSuffix+'/authorization.json':reliability?'../../docs/evidence/dj-reliability-20261026/authorization.json':'../../docs/evidence/dj-integrated-20261026/authorization.json'):beta?(hosted?'../../docs/evidence/ai-dj-hosted-20261025/authorization.json':'../../docs/evidence/ai-dj-beta-20261025/authorization.json'):finish?'../../docs/evidence/ai-dj-finish-20261024/'+(permit.label.endsWith('-launch-fix')?'launch-fix-authorization.json':permit.label.endsWith('-resume')?'resume-authorization.json':permit.label.endsWith('-retry')?'retry-authorization.json':'authorization.json'):'../../docs/evidence/ai-dj-warm-20261024/'+(permit.label===campaign?'authorization.json':'retry-authorization.json')),'utf8'));
assert.equal(approval.campaign,permit.label);assert.equal(approval.budget_usd,6);assert.equal(approval.instances_max,1);assert.equal(approval.max_elapsed_seconds,endurance?9000:2400);assert.equal(approval.model_requests_max,endurance?180:beta?24:8);assert.equal(approval.public_activation,false);assert.ok(approval.owner_statement);
if(integrated){assert.equal(approval.status,'AUTHORIZED');assert.equal(approval.owner_statement,endurance?approval.owner_statement:releaseRetry?'Approve one replacement within the original $6 cap':releaseCheck?'Approve the capped $6 release qualification':reliability?'Approve the capped $6 reliability qualification':'Approve the capped $6 integrated qualification');assert.equal(approval.stop_on_failure,true);assert.equal(approval.automatic_cleanup,true);assert.equal(approval.replacement_rental_authorized,false);for(const [path,hash] of Object.entries(approval.code_sha256)){assert.match(path,/^(scripts|apps\/site|build-dj-endurance-20261030)\/[a-zA-Z0-9_./-]+$/);assert(!path.split('/').includes('..'));assert.equal(createHash('sha256').update(await readFile(resolve('../..',path))).digest('hex'),hash,'Approved source changed');}}
assert.equal(permit.label,approval.campaign);assert.equal(permit.budgetMicros,6000000);
}
if(localMetal){
 const approval=JSON.parse(await readFile('../../docs/evidence/local-completion-20261030/local-endurance-plan.json','utf8'));
 assert.equal(approval.status,'AUTHORIZED_LOCAL');assert.equal(approval.paid_compute,false);assert.equal(approval.max_seconds,9000);assert.equal(approval.max_requests,180);
 assert.match(permit.label,/^jamloom-local-metal-[a-f0-9]{32}$/);assert.equal(permit.maxLifetimeSeconds,9000);assert.equal(permit.budgetMicros,6000000);
 for(const [path,hash] of Object.entries(approval.files))assert.equal(createHash('sha256').update(await readFile(resolve('../..',path))).digest('hex'),hash,'Reviewed local source changed');
 assert(process.env.NODE_OPTIONS?.includes('dj-local-provider.mjs'),'Explicit isolated provider required');
}
const preview=process.env.JAMLOOM_QUALIFICATION_ORIGIN??'http://localhost:3009';if(localMetal)assert.equal(preview,'http://localhost:3000','Local worklet must use the actual customer origin');await djUIPreflight(preview);
const retained=replay?await retainedRenderer(resolve('../..')):null;
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://127.0.0.1:5432/postgres');assert.equal(target.hostname,'127.0.0.1');
const id=()=>randomUUID().replaceAll('-',''),name='jamloom_dj_pipeline_'+id(),admin=createPool(target.toString());await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
const folder=resolve(localMetal?process.env.JAMLOOM_LOCAL_DJ_FOLDER:endurance?'../../renders/dj-endurance-20261030':replay?'../../renders/dj-two-listener-rehearsal-20261026-'+id():integrated?(releaseCheck?'../../renders/dj-release-check-20261026'+releaseSuffix:reliability?'../../renders/dj-reliability-20261026':'../../renders/dj-integrated-20261026'):beta?(hosted?'../../renders/ai-dj-hosted-20261025':'../../renders/ai-dj-beta-20261025'):finish?'../../renders/ai-dj-finish-20261024/'+(permit.label.endsWith('-launch-fix')?'gpu-launch-fix':permit.label.endsWith('-resume')?'gpu-resume':'gpu'):'../../renders/ai-dj-warm-20261024');await mkdir(folder,{recursive:true});
const objects=new Map(),store=standalone?localAudioStore(resolve(folder,'audio-cache')):{local:true,put:async(k,b)=>objects.set(k,b),get:async k=>objects.get(k),remove:async k=>objects.delete(k),uploadURL:async()=>'',playbackURL:async()=>''};
let retainedRental=true;
const provider=replay?{inventory:async()=>retainedRental?[{id:1,label:permit.label}]:[],destroy:async()=>{retainedRental=false;}}:new VastProvider(process.env.VASTAI_KEY??'');
const sessions=new DJSessions(pool,'isolated-warm-qualification-secret-12345',store,{costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000},false,true),warm=new DJWarmWorker(sessions,provider),recordings=new DJRecordings(pool,djSessionStore());
const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),(endurance?125:beta?18:5)*60000),tracks=[],customers=[],errors=[],samples=[],privacy=[],recordingURLs=[];let worker,pulse,sampling,driver,browser,processRecovery,capacityOwner;
const closeBrowser=async()=>{await Promise.allSettled(customers.filter(c=>c.page&&!c.page.isClosed()).map(c=>c.page.unrouteAll({behavior:'ignoreErrors'})));await browser?.close();};
console.log(JSON.stringify({folder,retainedRehearsal:replay}));
try{
 await migrate(pool);if(!replay)await checkDJRenderer(token);worker=await warm.register(permit);
 await writeFile(resolve(folder,'worker-private.json'),JSON.stringify(worker),{mode:0o600,flag:'wx'});
 let checking=false;if(!standalone)pulse=setInterval(async()=>{if(checking)return;checking=true;try{if(!await warm.heartbeat(worker,Math.ceil((Date.now()-permit.startedAt)*permit.hourlyMicros/3600000)))abort.abort();}catch{abort.abort();}finally{checking=false;}},3000);
 if(standalone){
  const env={...process.env,DATABASE_URL:target.href,BETTER_AUTH_URL:'http://127.0.0.1:3000',BETTER_AUTH_SECRET:'isolated-warm-qualification-secret-12345',JAMLOOM_LOCAL_OUTBOX:resolve(folder,'outbox'),JAMLOOM_LOCAL_AUDIO_DIR:resolve(folder,'audio-cache'),JAMLOOM_AI_DJ_BUDGET:JSON.stringify(sessions.budget),JAMLOOM_WATCHDOG_TARGET:target.host+target.pathname,JAMLOOM_DJ_WARM_IDENTITY:resolve(folder,'worker-private.json'),JAMLOOM_DJ_CRASH_RECEIPT:resolve(folder,'crash-receipt.json'),VERCEL:''};
  driver=qualificationProcess({env,folder,pool,signal:abort.signal,onTrack:async track=>{const row=(await pool.query('SELECT owner_id FROM dj_sessions WHERE id=$1',[track.session])).rows[0];await writeFile(resolve(folder,track.session+'-'+track.sequence+'.wav'),await sessions.audio(row.owner_id,track.session,track.sequence),{flag:'wx'});tracks.push(track);assert.ok(tracks.length<=targetTracks);await writeFile(resolve(folder,'tracks.json'),JSON.stringify(tracks,null,2));}}).then(proof=>{processRecovery=proof;}).catch(e=>{errors.push(e.message);abort.abort();});
 }
 browser=await chromium.launch({channel:'chrome',args:['--disable-audio-output','--enable-precise-memory-info']});
 const origin='http://localhost:3000';
 for(const [visibility,credits] of [['public',endurance?1000:100],['private',beta?25:8]]){
  const owner='warm-test-'+id();customers.push({owner,visibility});
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[owner,owner+'@example.com']);await sessions.wallet.grant(owner,{provider:'stripe_test',receipt:id(),credits,netMicros:credits*50000});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(silenceSpeakers);if(beta)await context.addInitScript(countAudioSources);const page=await context.newPage();customers.at(-1).page=page;page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  // Keep the actual browser/R2 origin approved while isolating current development assets.
  if(preview!==origin){await context.grantPermissions(['local-network-access'],{origin});await context.addInitScript(preview=>{const Native=WebSocket;window.WebSocket=class extends Native{constructor(url,protocols){const target=new URL(url,location.href);if(target.origin===location.origin.replace('http:','ws:')&&target.pathname==='/_next/hmr')target.port=new URL(preview).port;super(target.href,protocols);}};},preview);}
  if(preview!==origin)await page.route(origin+'/**',async route=>{const u=new URL(route.request().url());await route.fulfill({response:await route.fetch({url:preview+u.pathname+u.search})});});
  for(const resource of ['sessions','recordings'])await page.route('**/api/ai-dj/'+resource+'**',async route=>{
   const r=route.request(),request=new Request(r.url(),{method:r.method(),headers:r.headers(),...(r.postDataBuffer()?{body:r.postDataBuffer()}:{})}),path=new URL(r.url()).pathname.split('/').slice(4).filter(Boolean);
   const response=await (resource==='sessions'?djSessionRequest(request,async()=>({owner,origin,sessions,enabled:true}),path):djRecordingRequest(request,async()=>({owner,origin,recordings}),path));await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  console.log('Preparing '+visibility+' customer');await page.goto(origin+'/ai-dj/session');await page.getByLabel('Party or venue name',{exact:true}).fill('Warm '+visibility+' qualification');await page.getByRole('radio',{name:new RegExp(visibility==='public'?'Public':'Private')}).check();await page.getByRole('button',{name:'Check credits →'}).click();await page.getByRole('button',{name:'Continue to the deck →'}).click();if(finish||beta)await page.getByRole('button',{name:visibility==='public'?/^bright$/i:/^deep$/i}).click();console.log(visibility+' deck ready');
 }
 if(beta){let samplingNow=false;sampling=setInterval(async()=>{if(samplingNow)return;samplingNow=true;try{for(const {page,visibility} of customers){const state=await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize,activeSources:window.betaSources.active,sourceCounts:{...window.betaSources}}));assert.ok(state.heap>0&&state.heap<512*1024**2,'Browser heap bound: '+JSON.stringify({visibility,...state}));assert.ok(state.activeSources>=0&&state.activeSources<=4,'Source count bound: '+JSON.stringify({visibility,...state}));assert.equal(state.sourceCounts.unstartedEnds,0,'Untracked audio source ended');samples.push({at:Date.now(),visibility,...state,nodeRss:process.memoryUsage().rss});}assert.ok(process.memoryUsage().rss<1024**3,'Node RSS exceeds 1 GiB');await writeFile(resolve(folder,'progress.json'),JSON.stringify({tracks:tracks.length,samples:samples.slice(-2)}));}catch(e){errors.push(e.stack??e.message);await writeFile(resolve(folder,'sampling-failure.json'),JSON.stringify({errors,samples:samples.slice(-4)},null,2));abort.abort();await closeBrowser();}finally{samplingNow=false;}},5000);}
 let recoveredResponse=false;const transport=async(...args)=>{const response=await (retained?retained.fetch(...args):fetch(...args));if(beta&&!recoveredResponse&&response.ok&&String(args[0]).endsWith('/render')){await response.arrayBuffer();recoveredResponse=true;throw new TypeError('Qualification: lost completed response');}return response;};
 if(!standalone)driver=(async()=>{while(!abort.signal.aborted&&tracks.length<targetTracks){const track=await runRemoteDJBatch(warm,worker,token,abort.signal,transport);if(track){const row=(await pool.query('SELECT owner_id FROM dj_sessions WHERE id=$1',[track.session])).rows[0];await writeFile(resolve(folder,track.session+'-'+track.sequence+'.wav'),await sessions.audio(row.owner_id,track.session,track.sequence),{flag:'wx'});tracks.push(track);await writeFile(resolve(folder,'tracks.json'),JSON.stringify(tracks,null,2));}else await delay(200);}})().catch(e=>{errors.push(e.message);abort.abort();});
 await Promise.all(customers.map(async customer=>{const {page}=customer,started=Date.now();await page.getByRole('button',{name:'Start set'}).click();await page.getByText(/Recording (public|private) set/).waitFor({timeout:localMetal?70000:30000});customer.startupMs=Date.now()-started;await page.getByLabel('Set energy').fill('5');if(finish||beta)await page.getByRole('button',{name:/^warm$/i}).click();}));
 if(standalone){capacityOwner='capacity-test-'+id();await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$1,$2,true)',[capacityOwner,capacityOwner+'@example.test']);await sessions.wallet.grant(capacityOwner,{provider:'stripe_test',receipt:id(),credits:100,netMicros:5000000});const before=await sessions.wallet.balance(capacityOwner),input={id:id(),title:'Third listener denied',visibility:'public',style:'house',energy:4},quote=await sessions.quote(capacityOwner,input);await assert.rejects(sessions.start(capacityOwner,input,quote.token),/slots/);assert.deepEqual(await sessions.wallet.balance(capacityOwner),before);await writeFile(resolve(folder,'capacity.json'),JSON.stringify({status:'PASS',thirdListenerRejected:true,noCreditsReservedOrSpent:true}));}
 await Promise.all(customers.map(async customer=>{
  const {page,owner,visibility}=customer;
  if(visibility==='public'&&endurance){
   const began=Date.now();let direction=0;
   while(Date.now()-began<7200000){
    const disk=await statfs(folder);assert(disk.bavail*disk.bsize>=15*1024**3,'Disk reserve reached; stop the qualification');
    assert.equal(abort.signal.aborted,false);assert.deepEqual(errors,[]);
    assert.equal(await page.getByText('Your complete set is saved.',{exact:true}).count(),0,'Session ended before two hours');
    const minute=Math.floor((Date.now()-began)/60000);
    if(minute>direction){direction=minute;await page.getByLabel('Set energy').fill(String(2+minute%4));await page.getByRole('button',{name:new RegExp('^'+['warm','bright','deep'][minute%3]+'$','i')}).click();console.log(JSON.stringify({enduranceSeconds:Math.floor((Date.now()-began)/1000),tracks:tracks.length}));}
    await page.waitForTimeout(5000);
   }
   customer.actualPlaybackSeconds=(Date.now()-began)/1000;await page.getByRole('button',{name:'■ Stop',exact:true}).click();
  }
  else if(visibility==='public'){await page.waitForFunction(({deck,number})=>document.querySelector('.deck-'+deck+' .aidj-readout h2')?.textContent.endsWith('· '+number)&&document.querySelector('.deck-'+deck+' .aidj-deck-head span')?.textContent==='PLAYING',{deck:0,number:beta?9:3},{timeout:beta?15*60000:240000});if(beta)await page.waitForFunction(()=>document.querySelector('.deck-1 .aidj-readout h2')?.textContent.endsWith('· 10'),null,{timeout:45000});else await page.waitForTimeout(36000);await page.getByRole('button',{name:'■ Stop',exact:true}).click();}
  await page.getByText('Your complete set is saved.',{exact:true}).waitFor({timeout:beta?16*60000:240000});
  const record=(await recordings.list(owner)).find(r=>r.title==='Warm '+visibility+' qualification');assert.equal(record.state,'ready');assert.equal(record.visibility,visibility);
  const session=(await pool.query('SELECT s.* FROM dj_sessions s JOIN dj_recordings r ON r.session_id=s.id WHERE r.id=$1',[record.id])).rows[0];assert.equal(session.state,'ended');assert.equal(session.end_reason,visibility==='public'?'stop':'credits');
  assert.equal((await sessions.wallet.balance(owner)).reserved,0);assert.equal(Number((await pool.query("SELECT count(*) FROM dj_allowance_allocations WHERE owner_id=$1 AND state='reserved'",[owner])).rows[0].count),0);assert.equal((await recordings.publicList()).sets.some(r=>r.id===record.id),visibility==='public');
  await assert.rejects(recordings.playback('unrelated-listener',record.id),/not found/i);if(visibility==='private')await assert.rejects(recordings.publicPlayback(record.id),/not found/i);else assert.ok((await recordings.publicPlayback(record.id)).startsWith('https://'));
  const recordingURL=await recordings.playback(owner,record.id);recordingURLs.push(recordingURL);const audio=await fetch(recordingURL);assert.equal(audio.status,200);privacy.push({visibility,seconds:record.seconds,crossAccountDenied:true,anonymousPrivateDenied:visibility==='private',ownerR2Read:true});await writeFile(resolve(folder,visibility+'-mixed.'+(record.mime==='audio/mp4'?'m4a':'webm')),Buffer.from(await audio.arrayBuffer()));
  await page.screenshot({path:resolve(folder,visibility+'-saved.png'),fullPage:true});assert.ok(await page.evaluate(()=>__jamloomSilentOutput().every(o=>o.peak===0)));
  if(endurance&&visibility==='public')assert(record.seconds>=7190,'Complete two-hour recording required');
  customer.result={visibility,startupMs:customer.startupMs,actualPlaybackSeconds:customer.actualPlaybackSeconds,recordedSeconds:record.seconds,session:session.id,endReason:session.end_reason,recording:record.id,performance:await page.getByLabel('Performance history',{exact:true}).innerText()};
 }));
 if(standalone)abort.abort();await driver;if(beta)assert.equal(standalone?processRecovery?.status==='PASS':recoveredResponse,true);if(endurance)assert(tracks.length>=130&&tracks.length<=150);else assert.equal(tracks.length,targetTracks);assert.equal(new Set(tracks.map(t=>t.sha256)).size,tracks.length);assert.deepEqual(errors,[]);
 const batches=(await pool.query("SELECT session_id,sequence,seed,render_settings,vocal,audio_sha256 FROM dj_session_batches WHERE state='completed' ORDER BY session_id,sequence")).rows;
 assert.equal(new Set(batches.map(b=>String(b.seed))).size,tracks.length);if(beta)for(const c of customers){const count=batches.filter(b=>b.session_id===c.result.session).length;if(endurance&&c.visibility==='public')assert(count>=120&&count<=140);else assert.equal(count,10);}assert.ok(batches.some(b=>b.render_settings.energy===5));if(finish||beta){assert.ok(batches.some(b=>b.render_settings.mood==='bright'));assert.ok(batches.some(b=>b.render_settings.mood==='deep'));assert.ok(batches.some(b=>b.render_settings.mood==='warm'));}
 for(const b of batches){const audio=await sessions.audio(customers.find(c=>c.result.session===b.session_id).owner,b.session_id,b.sequence);await writeFile(resolve(folder,b.session_id+'-'+b.sequence+'.wav'),audio);}
 await writeFile(resolve(folder,'result.json'),JSON.stringify({status:'PASS technical',newGeneration:!replay,origin,preview,scope:localMetal?'Two-hour fresh local Metal customer set; real dispatcher recovery and R2, simulated rental inventory/cost/shutdown; hosted capacity NOT RUN':endurance?'Two-hour wall-clock fresh GPU customer set plus private credit exhaustion, capacity refusal and lost-response dispatcher recovery':replay?'Retained audio and synthetic provider receipts; real UI, session handlers, isolated billing and private R2':'Authorized fresh GPU qualification',retainedSources:retained?.proof,recoveredResponse:standalone?!!processRecovery:recoveredResponse,processRecovery,samples,billing:'Carryover DJ allowance with a bound top-up rate',customers:customers.map(c=>c.result),tracks,batches:batches.map(b=>({...b,seed:Number(b.seed)})),vocals:batches.filter(b=>b.vocal).length,humanListening:'NOT RUN'},null,2));
}catch(error){
 await writeFile(resolve(folder,'failure.json'),JSON.stringify({status:'FAIL',reason:String(error),errors,samples:samples.slice(-4)},null,2));
 console.error(error);for(const {page,visibility} of customers){if(page&&!page.isClosed()){console.error(visibility,(await page.locator('body').innerText()).slice(0,8000));await page.screenshot({path:resolve(folder,visibility+'-failure.png'),fullPage:true}).catch(()=>{});}}throw error;
}finally{
 abort.abort();clearTimeout(timeout);if(sampling)clearInterval(sampling);if(pulse)clearInterval(pulse);await closeBrowser();if(driver)await driver;
 if(worker){await warm.stop(worker);for(let i=0;i<8;i++){const results=await warm.sweep();await writeFile(resolve(folder,'shutdown.json'),JSON.stringify(results));if(results.some(r=>r.status==='shutdown_confirmed'))break;await delay(2000);}}
 for(const {owner} of customers){await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',[owner]);await recordings.purgeOwner(owner);await sessions.purgeOwner(owner);}
 if(capacityOwner){await pool.query('UPDATE "user" SET suspended=true WHERE id=$1',[capacityOwner]);await sessions.purgeOwner(capacityOwner);}
 await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();
 for(const url of recordingURLs){const response=await fetch(url,{headers:{Range:'bytes=0-0'}});await response.body?.cancel();assert.equal(response.status,404);}
 await writeFile(resolve(folder,'privacy.json'),JSON.stringify({status:privacy.length===2?'PASS':'PARTIAL',recordings:privacy,temporaryR2ObjectsAbsent:true}));
 await writeFile(resolve(folder,'cleanup.json'),JSON.stringify({testOwnersPurged:customers.length+Number(!!capacityOwner),recordingObjectsPurged:true,isolatedDatabaseDropped:true}));
}
