// Actual local rendering + test ledger + rolling browser audio. No paid compute or publication.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {createPool} from '../lib/database.ts';
import {migrate} from '../lib/migrations.ts';
import {DJSessions} from '../lib/dj-sessions.ts';
import {runLocalDJBatch} from '../lib/dj-local-worker.ts';
import {silenceSpeakers} from './silent-audio.mjs';
const id=()=>randomUUID().replaceAll('-','');
const base=resolve('../../renders/ai-dj-pipeline-20261024');await mkdir(base,{recursive:true});const folder=await mkdtemp(join(base,'run-'));
const target=new URL(process.env.JAMLOOM_TEST_DATABASE_URL||'postgresql://127.0.0.1:5432/postgres');assert.ok(['localhost','127.0.0.1'].includes(target.hostname));
const admin=createPool(target.toString()),name='jamloom_dj_pipeline_'+id();await admin.query(`CREATE DATABASE "${name}"`);target.pathname='/'+name;const pool=createPool(target.toString());
const objects=new Map(),store={local:true,put:async(k,b)=>objects.set(k,b),get:async k=>objects.get(k),remove:async k=>objects.delete(k),uploadURL:async()=>'',playbackURL:async()=>''};
const sessions=new DJSessions(pool,'local-pipeline-only-secret-12345678',store,{costCapMicros:50000,maxRuntimeMs:60000,hourlyMicros:600000,fixedCostMicros:40000});
const results=[],tracks=[],requests=[],browserResults=[];let server;
const begin=async(service=sessions)=>{const input={id:id(),title:'Local rolling worker check',visibility:'private',style:'house',energy:4};const q=await service.quote('test',input);await service.start('test',input,q.token);return input.id;};
const render=async(session,sequence,energy)=>{
 if(sequence)await sessions.next('test',session,sequence,energy);
 const result=await runLocalDJBatch(sessions,folder);assert.equal(result.state,'completed');results.push(result);
 const row=(await pool.query('SELECT * FROM dj_session_batches WHERE session_id=$1 AND sequence=$2',[session,sequence])).rows[0];
 const track={id:session+'-'+sequence,title:'Original engineering track '+(sequence+1),artist:'Jamloom procedural test',url:'/audio/'+sequence,sha256:row.audio_sha256,energy:4,mood:'deep',vocal:false,credit:''};
 tracks[sequence]={track,bytes:objects.get('masters/'+row.reservation_id+'.wav')};return {sequence,track};
};
try{
 await migrate(pool);await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES(\'test\',\'test\',\'pipeline@example.com\',true)');await sessions.wallet.grant('test',{provider:'stripe_test',receipt:id(),credits:100,netMicros:5000000});
 await assert.rejects(runLocalDJBatch(new DJSessions(pool,'x',store,sessions.budget,true),folder),/Disposable/);
 const session=await begin();
 const entry=await build({stdin:{contents:`import {AIDJPlayer} from './lib/ai-dj-player.ts';window.AIDJPlayer=AIDJPlayer;`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
 const worker=await build({entryPoints:['lib/ai-dj-analysis.worker.ts'],bundle:true,format:'esm',write:false});
 server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end('<button id="start">Start</button><script type="module" src="/player.js"></script>');}
  else if(url.pathname==='/player.js'||url.pathname==='/ai-dj-analysis.worker.ts'){res.setHeader('content-type','text/javascript');res.end(url.pathname==='/player.js'?entry.outputFiles[0].contents:worker.outputFiles[0].contents);}
  else if(url.pathname==='/next'){
   const sequence=Number(url.searchParams.get('sequence'));requests.push({sequence,energy:Number(url.searchParams.get('energy'))});
   if(sequence>=3){res.end('null');return;}
   if(sequence)await sessions.played('test',session,sequence-1);
   const value=await render(session,sequence,Number(url.searchParams.get('energy')));res.setHeader('content-type','application/json');res.end(JSON.stringify(value));
  }else if(url.pathname.startsWith('/audio/')){const bytes=tracks[Number(url.pathname.split('/').pop())]?.bytes;if(!bytes){res.writeHead(404).end();return;}res.setHeader('content-type','audio/wav');res.setHeader('content-length',bytes.length);res.end(bytes);}
  else res.writeHead(404).end();
 }catch(e){console.error('Local fixture request failed',String(e));res.writeHead(500).end(String(e));}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
 for(const kind of process.argv.includes('--chromium-only')?['chromium']:['chromium','webkit']){
  const browser=await ({chromium,webkit}[kind]).launch(kind==='chromium'?{args:['--disable-audio-output']}:{});
  try{
   const context=await browser.newContext();await context.addInitScript(silenceSpeakers);await context.addInitScript(fixtures=>window.fixtures=fixtures,tracks.map(t=>t.track));const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.AIDJPlayer);
   await page.evaluate(async useWorker=>{
    window.states=[];window.directions=[];window.starts=0;
    let sequence=0;
    window.player=new AIDJPlayer(s=>window.states.push({status:s.status,history:s.history,decks:s.decks.map(d=>d?.title??null)}),[],async(direction,signal)=>{
     const index=sequence++;window.directions.push(direction);
     if(useWorker){const r=await fetch('/next?sequence='+index+'&energy='+direction.energy,{signal});if(!r.ok)throw Error('Worker failed');return r.json();}
     return index<3?{sequence:index,track:{...window.fixtures[index]}}:null;
    });
    const p=window.player,create=p.context.createBufferSource.bind(p.context);p.context.createBufferSource=()=>{const node=create(),start=node.start.bind(node);node.start=(...args)=>{window.starts++;return start(...args);};return node;};
    const tap=p.context.createMediaStreamDestination();p.mixer.meter.connect(tap);window.chunks=[];window.recorder=new MediaRecorder(tap.stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    p.setMode('auto');document.querySelector('#start').onclick=()=>p.start(async()=>{recorder.start();return true;});
   },kind==='chromium');
   await page.click('#start');
   await page.waitForFunction(()=>player.snapshot().decks.filter(Boolean).length===2,{},{timeout:60000});
   const before=await page.evaluate(()=>({count:directions.length,tracks:player.snapshot().decks.map(d=>d.title)}));
   await page.evaluate(()=>{player.setDirection({energy:2});player.next();});
   await page.waitForFunction(()=>player.snapshot().history.length===2,{},{timeout:15000}).catch(async e=>{console.error(JSON.stringify(await page.evaluate(()=>({last:states.slice(-2),clock:player.context.currentTime,context:player.context.state}))),errors);throw e;});
   await page.waitForFunction(()=>player.snapshot().decks.filter(Boolean).length===2,{},{timeout:60000});
   assert.equal(before.count,2);assert.equal(await page.evaluate(()=>directions[2].energy),2);
   await page.evaluate(()=>player.next());await page.waitForFunction(()=>player.snapshot().history.length===3,{},{timeout:15000});
   const result=await page.evaluate(async()=>{
    player.stop();await new Promise(ok=>{recorder.onstop=ok;recorder.stop();});
    const blob=new Blob(chunks,{type:recorder.mimeType}),audio=await player.context.decodeAudioData(await blob.arrayBuffer());let peak=0,power=0;for(const v of audio.getChannelData(0)){peak=Math.max(peak,Math.abs(v));power+=v*v;}
    const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(blob);});
    return {history:player.snapshot().history,starts,seconds:audio.duration,peak,rms:Math.sqrt(power/audio.length),mime:blob.type,data,muted:__jamloomSilentOutput().every(o=>o.peak===0)};
   });
   assert.equal(new Set(result.history).size,3);assert.ok(result.seconds>4);assert.ok(result.rms>.001);assert.ok(result.peak<1);assert.ok(result.muted);assert.deepEqual(errors,[]);
   await writeFile(join(folder,kind+'-mixed.'+(result.mime.includes('mp4')?'m4a':'webm')),Buffer.from(result.data.split(',')[1],'base64'));delete result.data;
   // A result arriving during Pause remains prepared, even if the user changes direction.
   await page.evaluate(track=>{
    player.dispose();window.releasePaused=null;let sequence=0;
    window.paused=new AIDJPlayer(()=>{},[],async()=>sequence++===0?{sequence:0,track}:new Promise(ok=>window.releasePaused=ok));
    document.querySelector('#start').onclick=()=>paused.start();
   },tracks[0].track);
   await page.click('#start');await page.waitForFunction(()=>releasePaused);await page.evaluate(()=>paused.pause());
   await page.evaluate(track=>{paused.setDirection({energy:1});releasePaused({sequence:1,track});},tracks[1].track);
   await page.waitForFunction(()=>paused.snapshot().decks.filter(Boolean).length===2);assert.equal(await page.evaluate(()=>paused.snapshot().status),'paused');await page.evaluate(()=>paused.dispose());
   await page.evaluate(track=>{window.duplicateCalls=0;window.duplicate=new AIDJPlayer(()=>{},[],async()=>({sequence:duplicateCalls++,track}));document.querySelector('#start').onclick=()=>duplicate.start();},tracks[0].track);
   await page.click('#start');await page.waitForFunction(()=>duplicate.snapshot().message.includes('not ready'));assert.equal(await page.evaluate(()=>duplicate.snapshot().decks.filter(Boolean).length),1);await page.evaluate(()=>duplicate.setMode('auto'));assert.equal(await page.evaluate(()=>duplicateCalls),2);await page.evaluate(()=>duplicate.dispose());
   // A late source that ignores AbortSignal cannot restart Stop; duplicate/out-of-order receipts fail closed.
   await page.evaluate(async()=>{player.dispose();window.resolveLate=null;window.late=new AIDJPlayer(()=>{},[],()=>new Promise(ok=>window.resolveLate=ok));document.querySelector('#start').onclick=()=>late.start();});
   await page.click('#start');
   await page.waitForFunction(()=>resolveLate);await page.evaluate(()=>late.stop());await page.evaluate(track=>resolveLate({sequence:0,track}),tracks[0].track);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>late.snapshot().status),'stopped');assert.equal(await page.evaluate(()=>late.snapshot().decks.filter(Boolean).length),0);await page.evaluate(()=>late.dispose());
   for(const bad of ['sequence','hash']){
    await page.evaluate(async({track,bad})=>{window.bad=new AIDJPlayer(()=>{},[],async()=>({sequence:bad==='sequence'?1:0,track:{...track,sha256:bad==='hash'?'f'.repeat(64):track.sha256}}));document.querySelector('#start').onclick=()=>window.bad.start();},{track:tracks[0].track,bad});await page.click('#start');await page.waitForFunction(()=>bad.snapshot().status==='error');assert.equal(await page.evaluate(()=>bad.snapshot().status),'error');await page.evaluate(()=>bad.dispose());
   }
   browserResults.push({browser:kind,...result});
  }finally{await browser.close();}
 }
 await sessions.played('test',session,2);await sessions.stop('test',session);assert.equal((await sessions.status('test',session)).state,'ended');assert.equal((await sessions.wallet.balance('test')).reserved,0);assert.equal(new Set(results.map(r=>r.sha256)).size,3);assert.equal(JSON.parse(await readFile(join(results[2].folder,'result/receipt.json'),'utf8')).request.energy,2);
 // Stop during a real child run and a hard deadline both release holds only after child exit.
 for(const mode of ['cancel','deadline']){
  const controller=new AbortController();const service=mode==='deadline'?new DJSessions(pool,'local-pipeline-only-secret-12345678',store,{...sessions.budget,maxRuntimeMs:1}):sessions;
  await begin(service);
  const job=runLocalDJBatch(service,folder,controller.signal);let timer;if(mode==='cancel')timer=setTimeout(()=>controller.abort(),50);
  const result=await job;clearTimeout(timer);assert.equal(result.state,mode==='cancel'?'cancelled':'failed');assert.equal((await sessions.wallet.balance('test')).reserved,0);results.push(result);
 }
 const report={status:'PASS',scope:'Disposable test wallet, real procedural rendering and browser mixer; no GPU, public publication or musical qualification',folder,results,requests,browsers:browserResults,checks:['three distinct rendered tracks','two deck buffers','direction preserves paid prepared music','future direction passed to source','pause preserves arriving track','Stop rejects late results','duplicate sequence/hash rejected','one real mixed recording','local child cancellation and deadline','test wallet holds released'],webkit:process.argv.includes('--chromium-only')?'NOT RUN in this invocation':'PASS'};await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(server)await new Promise(ok=>server.close(ok));await pool.end();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
