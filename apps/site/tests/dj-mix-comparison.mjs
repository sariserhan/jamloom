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
const root=resolve('../..'),folder=resolve(root,'renders/dj-audible-comparison-20261025');
await mkdir(folder);
const source=resolve(root,'renders/ai-dj-hosted-20261025'),report=JSON.parse(await readFile(source+'/result.json','utf8'));
const session=report.customers.find(c=>c.visibility==='public').session;
const tracks=await Promise.all(report.tracks.filter(t=>t.session===session&&t.sequence<3).sort((a,b)=>a.sequence-b.sequence).map(async(row,index)=>{
 const bytes=await readFile(`${source}/${session}-${index}.wav`);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
 return {bytes,track:{id:String(index),title:`Original ${index+1}`,artist:'Jamloom original',url:'/audio/'+index,sha256:row.sha256,energy:4,style:'house',mood:'deep',vocal:false,credit:''}};
}));assert.equal(tracks.length,3);
const revisions={before:execFileSync('git',['rev-parse','35bbee7'],{encoding:'utf8'}).trim(),after:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()},bundles={};
for(const [name,ref] of Object.entries(revisions)){
 const plugins=[{name:'historical-source',setup(b){b.onLoad({filter:/\.(ts|js|json)$/},args=>{
  const path=relative(root,args.path);assert.ok(!path.startsWith('..')&&!path.includes('node_modules'));
  return {contents:execFileSync('git',['show',ref+':'+path],{cwd:root,encoding:'utf8'}),loader:extname(path).slice(1),resolveDir:resolve(args.path,'..')};
 });}}];
 const entry=await build({stdin:{contents:"import {AIDJPlayer} from './lib/ai-dj-player.ts';window.AIDJPlayer=AIDJPlayer;",resolveDir:process.cwd()},plugins,bundle:true,format:'esm',write:false});
 const worker=await build({entryPoints:['lib/ai-dj-analysis.worker.ts'],plugins,bundle:true,format:'esm',write:false});
 bundles[name]={entry:entry.outputFiles[0].contents,worker:worker.outputFiles[0].contents};
}
const server=createServer((req,res)=>{
 const parts=req.url.split('/'),name=parts[1],file=parts[2];
 if(parts[1]==='audio'&&/^[0-2]$/.test(parts[2])){res.setHeader('Content-Type','audio/wav');res.end(tracks[Number(parts[2])].bytes);}
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
 await page.evaluate(fixtures=>{
  let index=0;window.events=[];window.changes=[];
  window.player=new AIDJPlayer(s=>{
   for(const e of s.performance)if(!events.some(old=>old.at===e.at&&old.deck===e.deck&&old.action===e.action))events.push(e);
   if(changes.at(-1)?.tracks!==s.history.length)changes.push({tracks:s.history.length,elapsed:s.elapsed,plan:s.plan});
  },[],async()=>index<fixtures.length?{sequence:index,track:fixtures[index++]}:null);
  player.setMode('auto');const tap=player.context.createMediaStreamDestination();player.mixer.meter.connect(tap);window.chunks=[];window.recorder=new MediaRecorder(tap.stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};document.querySelector('#start').onclick=()=>player.start(async()=>{recorder.start();return true;});
 },tracks.map(t=>t.track));
 await page.click('#start');await page.waitForFunction(()=>player.snapshot().history.length===3&&player.snapshot().status==='stopped',null,{timeout:210000});
 const result=await page.evaluate(async()=>{
  await new Promise(ok=>{recorder.onstop=ok;recorder.stop();});const blob=new Blob(chunks,{type:recorder.mimeType}),audio=await player.context.decodeAudioData(await blob.arrayBuffer());let peak=0,power=0;
  for(const v of audio.getChannelData(0)){peak=Math.max(peak,Math.abs(v));power+=v*v;}
  const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(blob);});
  return {history:player.snapshot().history,seconds:audio.duration,peak,rms:Math.sqrt(power/audio.length),data,events,changes,muted:__jamloomSilentOutput().every(o=>o.peak===0)};
 });
 assert.deepEqual(result.history,['0','1','2']);assert.ok(result.seconds>100&&result.seconds<190);assert.ok(result.peak<1&&result.rms>.001);assert.ok(result.muted);assert.deepEqual(errors,[]);
 const bytes=Buffer.from(result.data.split(',')[1],'base64');delete result.data;await writeFile(`${folder}/${name}.webm`,bytes);
 results.push({name,revision:revisions[name],...result,sha256:createHash('sha256').update(bytes).digest('hex')});await context.close();console.log(name+' capture PASS');
}));
 assert.ok(results.find(r=>r.name==='after').events.some(e=>e.by==='AI'),'Current engine must perform real moves');
 await writeFile(folder+'/report.json',JSON.stringify({status:'PASS technical',sourceTracks:tracks.map(t=>t.track.sha256),newGeneration:false,learnedWeights:false,humanListening:'NOT RUN',results},null,2)+'\n');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
