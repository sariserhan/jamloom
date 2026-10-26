// Same retained originals through historical and current real mixers, captured before the muted speakers.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const recovery=process.argv.includes('--recovery-study');
const planner=process.argv.includes('--planner-study');
const modelStudy=process.argv.includes('--model-study');
const quality=process.argv.includes('--quality'),timing=process.argv.includes('--timing-revision');
const house=process.argv.includes('--house-study'),guided=process.argv.includes('--guided-set')||recovery;assert.ok([quality,house,guided,planner,modelStudy].filter(Boolean).length<=1);assert.ok(!timing||guided);
const root=resolve('../..'),folder=resolve(root,modelStudy?'renders/dj-model-mix-20261026':planner?'renders/dj-planner-mix-20261026':recovery?'renders/dj-recovery-mix-20261025':timing?'renders/dj-guided-mix-timing-20261025':guided?'renders/dj-guided-mix-20261025':house?'renders/dj-house-mix-20261025':quality?'renders/dj-quality-mix-20261025':'renders/dj-audible-comparison-20261025');
await mkdir(folder);
const source=resolve(root,'renders/ai-dj-hosted-20261025'),report=JSON.parse(await readFile(source+'/result.json','utf8'));
const session=report.customers.find(c=>c.visibility==='public').session;
let tracks=await Promise.all(report.tracks.filter(t=>t.session===session&&t.sequence<3).sort((a,b)=>a.sequence-b.sequence).map(async(row,index)=>{
 const bytes=await readFile(`${source}/${session}-${index}.wav`);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
 return {bytes,track:{id:String(index),title:`Original ${index+1}`,artist:'Jamloom original',url:'/audio/'+index,sha256:row.sha256,energy:4,style:'house',mood:'deep',vocal:false,credit:''}};
}));assert.equal(tracks.length,3);
if(house){
 const feedback=JSON.parse(await readFile(root+'/docs/evidence/dj-quality-20261025/owner-feedback.json','utf8'));
 const vocalRoot=root+'/renders/ai-dj-finish-20261024/gpu-launch-fix',previous=JSON.parse(await readFile(vocalRoot+'/result.json','utf8'));
 const vocal=previous.tracks.find(t=>t.receipt.vocal);assert.ok(vocal);
 const selected=[{path:root+'/renders/dj-style-samples-20261025-replacement/house.wav',hash:feedback.clips[0].source_sha256,title:'Accepted house 1'},
  {path:root+'/renders/dj-quality-20261025/house-0.wav',hash:feedback.clips[1].source_sha256,title:'Accepted house 2'},
  {path:`${vocalRoot}/${vocal.session}-${vocal.sequence}.wav`,hash:vocal.sha256,title:'Previously accepted vocal house',vocalCue:vocal.receipt.vocal}];
 assert.equal(feedback.clips[0].status,'PASS');assert.equal(feedback.clips[1].status,'PASS');
 tracks=await Promise.all(selected.map(async(row,index)=>{const bytes=await readFile(row.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.hash);return{bytes,track:{id:String(index),title:row.title,artist:'Jamloom original',url:'/audio/'+index,sha256:row.hash,energy:4,style:'house',mood:'deep',vocal:!!row.vocalCue,vocalCue:row.vocalCue,credit:''}};}));
}
if(guided){
 const source=root+(recovery?'/renders/dj-recovery-20261025-replacement':'/renders/dj-guided-set-20261025'),run=JSON.parse(await readFile(source+'/report.json','utf8'));
 assert.equal(run.status,'PASS technical');assert.equal(run.cleanup_confirmed,true);assert.equal(run.tracks.length,6);
 tracks=await Promise.all(run.tracks.map(async(row,index)=>{const bytes=await readFile(source+'/'+row.file),r=row.receipt;assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);return{bytes,track:{id:String(index),title:'Guided original '+(index+1),artist:'Jamloom original',url:'/audio/'+index,sha256:r.sha256,energy:r.request.energy,style:r.request.style,mood:r.request.mood,beat:r.request.beat,vocal:!!r.vocal,vocalCue:r.vocal??undefined,credit:''}};}));
 assert.equal(new Set(tracks.map(t=>t.track.sha256)).size,6);
}
if(planner){
 const source=root+'/renders/dj-planner-20261026',run=JSON.parse(await readFile(source+'/report.json','utf8'));
 const feedback=JSON.parse(await readFile(root+'/docs/evidence/dj-planner-20261026/owner-feedback.json','utf8'));
 const spoken=JSON.parse(await readFile(root+'/docs/evidence/dj-spoken-hooks-20261026/hooks.json','utf8')).tracks.find(t=>t.number===1);assert.ok(spoken);
 tracks=await Promise.all([1,7,3].map(async(sequence,index)=>{
  const row=run.tracks.find(t=>t.receipt.request.sequence===sequence),r=row.receipt;
  assert.ok(feedback.clips.find(t=>t.sequence===sequence)?.preferred_within_comparison);
  const hook=sequence===7?spoken:null;
  if(hook)assert.equal(hook.source_sha256,r.sha256);
  const bytes=await readFile(hook?root+'/renders/dj-spoken-hooks-20261026/'+hook.file:source+'/'+row.file),hash=hook?.sha256??r.sha256;
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  return{bytes,track:{id:String(index),title:hook?'Preferred house with new spoken hook':'Preferred planned '+r.request.style,artist:'Jamloom original',url:'/audio/'+index,sha256:hash,energy:r.request.energy,style:r.request.style,mood:r.request.mood,vocal:!!hook,vocalCue:hook?.cue,credit:''}};
 }));
 assert.equal(new Set(tracks.map(t=>t.track.sha256)).size,3);
}
if(modelStudy){
 const source=root+'/renders/dj-model-comparison-20261026',run=JSON.parse(await readFile(source+'/report.json','utf8'));
 assert.equal(run.status,'PASS technical');assert.equal(run.cleanup_confirmed,true);assert.equal(run.tracks.length,6);
 tracks=await Promise.all([0,3,4,1,2,5].map(async(sequence,index)=>{
  const row=run.tracks.find(t=>t.receipt.request.sequence===sequence),r=row.receipt,bytes=await readFile(source+'/'+row.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);
  return{bytes,track:{id:String(index),title:'Comparison clip '+(index+1),artist:'Jamloom original',url:'/audio/'+index,sha256:r.sha256,energy:r.request.energy,style:r.request.style,mood:r.request.mood,vocal:!r.model_comparison.parameters.instrumental,credit:''}};
 }));
 assert.equal(new Set(tracks.map(t=>t.track.sha256)).size,6);
}
const revisions=(house||guided||planner||modelStudy)?{after:'working-tree'}:{before:execFileSync('git',['rev-parse',quality?'f0fde92':'35bbee7'],{encoding:'utf8'}).trim(),after:quality?'working-tree':execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()},bundles={};
for(const [name,ref] of Object.entries(revisions)){
 const plugins=ref==='working-tree'?[]:[{name:'historical-source',setup(b){b.onLoad({filter:/\.(ts|js|json)$/},args=>{
  const path=relative(root,args.path);assert.ok(!path.startsWith('..')&&!path.includes('node_modules'));
  return {contents:execFileSync('git',['show',ref+':'+path],{cwd:root,encoding:'utf8'}),loader:extname(path).slice(1),resolveDir:resolve(args.path,'..')};
 });}}];
 const entry=await build({stdin:{contents:"import {AIDJPlayer} from './lib/ai-dj-player.ts';window.AIDJPlayer=AIDJPlayer;",resolveDir:process.cwd()},plugins,bundle:true,format:'esm',write:false});
 const worker=await build({entryPoints:['lib/ai-dj-analysis.worker.ts'],plugins,bundle:true,format:'esm',write:false});
 bundles[name]={entry:entry.outputFiles[0].contents,worker:worker.outputFiles[0].contents};
}
const server=createServer((req,res)=>{
 const parts=req.url.split('/'),name=parts[1],file=parts[2];
 if(parts[1]==='audio'&&/^[0-9]+$/.test(parts[2])&&Number(parts[2])<tracks.length){res.setHeader('Content-Type','audio/wav');res.end(tracks[Number(parts[2])].bytes);}
 else if(bundles[name]){
  res.setHeader('Content-Type',file?'text/javascript':'text/html');
  if(!file)res.end(`<title>Jamloom ${name}</title><button id="start">Start</button><script type="module" src="/${name}/player.js"></script>`);
  else if(file==='player.js')res.end(bundles[name].entry);
  else if(file==='ai-dj-analysis.worker.ts')res.end(bundles[name].worker);
  else res.writeHead(404).end();
 }else res.writeHead(404).end();
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch(),results=[];
try{await Promise.all(Object.keys(revisions).map(async name=>{
 const context=await browser.newContext();await context.addInitScript(silenceSpeakers);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/${name}`);await page.waitForFunction(()=>window.AIDJPlayer);
 await page.evaluate(({fixtures,finishLast})=>{
  let index=0;window.events=[];window.changes=[];
  window.player=new AIDJPlayer(s=>{
   for(const e of s.performance)if(!events.some(old=>old.at===e.at&&old.deck===e.deck&&old.action===e.action))events.push(e);
   if(changes.at(-1)?.tracks!==s.history.length){changes.push({tracks:s.history.length,elapsed:s.elapsed,plan:s.plan});if(finishLast&&s.history.length===fixtures.length&&s.status==='playing')player.finish(null);}
  },[],async()=>index<fixtures.length?{sequence:index,track:fixtures[index++]}:null);
  player.setMode('auto');const tap=player.context.createMediaStreamDestination();player.mixer.meter.connect(tap);window.chunks=[];window.recorder=new MediaRecorder(tap.stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};document.querySelector('#start').onclick=()=>player.start(async()=>{recorder.start();return true;});
 },{fixtures:tracks.map(t=>t.track),finishLast:guided||planner||modelStudy});
 await page.click('#start');await page.waitForFunction(count=>player.snapshot().history.length===count&&player.snapshot().status==='stopped',tracks.length,{timeout:(tracks.length+1)*65000});
 const result=await page.evaluate(async()=>{
  await new Promise(ok=>{recorder.onstop=ok;recorder.stop();});const blob=new Blob(chunks,{type:recorder.mimeType}),audio=await player.context.decodeAudioData(await blob.arrayBuffer());let peak=0,power=0;
  for(const v of audio.getChannelData(0)){peak=Math.max(peak,Math.abs(v));power+=v*v;}
  const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(blob);});
  return {history:player.snapshot().history,seconds:audio.duration,peak,rms:Math.sqrt(power/audio.length),data,events,changes,muted:__jamloomSilentOutput().every(o=>o.peak===0)};
 });
 assert.deepEqual(result.history,tracks.map(t=>t.track.id));assert.ok(result.seconds>tracks.length*30&&result.seconds<tracks.length*65);assert.ok(result.peak<1&&result.rms>.001);assert.ok(result.muted);assert.deepEqual(errors,[]);
 const bytes=Buffer.from(result.data.split(',')[1],'base64');delete result.data;await writeFile(`${folder}/${name}.webm`,bytes);
 results.push({name,revision:revisions[name],...result,sha256:createHash('sha256').update(bytes).digest('hex')});await context.close();console.log(name+' capture PASS');
}));
 assert.ok(results.find(r=>r.name==='after').events.some(e=>e.by==='AI'),'Current engine must perform real moves');
 if(house)assert.ok(results[0].events.some(e=>e.label==='Vocal loop · 2 repeats'),'Accepted vocal must repeat only after the normal playback guards pass');
 if(planner)assert.ok(results[0].events.some(e=>e.label==='Vocal echo'),'New spoken hook must pass normal playback guards');
 await writeFile(folder+'/report.json',JSON.stringify({status:'PASS technical',sourceTracks:tracks.map(t=>t.track.sha256),currentPlanSha256:createHash('sha256').update(await readFile('lib/ai-dj-plan.ts')).digest('hex'),newGeneration:false,learnedWeights:false,humanListening:'NOT RUN',results},null,2)+'\n');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
