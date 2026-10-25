// Retrieved GPU tracks through the real mixer; this does not exercise live GPU dispatch.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder=resolve('../../renders/club-studies-20261024/dj-qualification'),report=JSON.parse(await readFile(resolve(folder,'report.json'),'utf8'));
assert.equal(report.status,'PASS technical');assert.equal(report.tracks.length,3);
const tracks=await Promise.all(report.tracks.map(async(row,index)=>{
 assert.equal(row.file,`track-${index+1}.wav`);const bytes=await readFile(resolve(folder,row.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
 return {bytes,track:{id:String(index),title:`House ${index+1}`,artist:'Jamloom original',url:'/audio/'+index,sha256:row.sha256,energy:row.request.energy,mood:'deep',vocal:false,credit:''}};
}));
const entry=await build({stdin:{contents:"import {AIDJPlayer} from './lib/ai-dj-player.ts';window.AIDJPlayer=AIDJPlayer;",resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const worker=await build({entryPoints:['lib/ai-dj-analysis.worker.ts'],bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<title>Jamloom GPU playback qualification</title><button id="start">Start</button><script type="module" src="/player.js"></script>');}
 else if(req.url==='/player.js'||req.url==='/ai-dj-analysis.worker.ts'){res.setHeader('Content-Type','text/javascript');res.end(req.url==='/player.js'?entry.outputFiles[0].contents:worker.outputFiles[0].contents);}
 else if(/^\/audio\/[0-2]$/.test(req.url)){res.setHeader('Content-Type','audio/wav');res.end(tracks[Number(req.url.at(-1))].bytes);}
 else res.writeHead(404).end();
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({args:['--disable-audio-output']});
try{
 const context=await browser.newContext();await context.addInitScript(silenceSpeakers);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.AIDJPlayer);
 await page.evaluate(fixtures=>{
  let index=0;window.changes=[];window.plans=[];
  window.player=new AIDJPlayer(s=>{
   if(changes.at(-1)?.length!==s.history.length)changes.push({length:s.history.length,elapsed:s.elapsed,status:s.status});
   if(s.transitionIn!==null&&plans.at(-1)?.plan!==s.plan)plans.push({plan:s.plan,elapsed:s.elapsed,transitionIn:s.transitionIn});
  },[],async()=>index<fixtures.length?{sequence:index,track:fixtures[index++]}:null);
  player.setMode('auto');const tap=player.context.createMediaStreamDestination();player.mixer.meter.connect(tap);window.chunks=[];window.recorder=new MediaRecorder(tap.stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  document.querySelector('#start').onclick=()=>player.start(async()=>{recorder.start();return true;});
 },tracks.map(t=>t.track));
 await page.click('#start');await page.waitForFunction(()=>player.snapshot().history.length===3,null,{timeout:180000});
 await page.waitForFunction(()=>player.snapshot().status==='stopped',null,{timeout:90000});
 const result=await page.evaluate(async()=>{
  await new Promise(ok=>{recorder.onstop=ok;recorder.stop();});const blob=new Blob(chunks,{type:recorder.mimeType}),audio=await player.context.decodeAudioData(await blob.arrayBuffer());let peak=0,power=0;
  for(const v of audio.getChannelData(0)){peak=Math.max(peak,Math.abs(v));power+=v*v;}
  const data=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(blob);});
  return {history:player.snapshot().history,status:player.snapshot().status,seconds:audio.duration,channels:audio.numberOfChannels,peak,rms:Math.sqrt(power/audio.length),mime:blob.type,data,changes,plans,muted:__jamloomSilentOutput().every(o=>o.peak===0)};
 });
 assert.deepEqual(result.history,['0','1','2']);assert.equal(result.channels,2);assert.ok(result.seconds>120&&result.seconds<185);assert.ok(result.peak<1&&result.rms>.001);assert.ok(result.muted);assert.deepEqual(errors,[]);
 const bytes=Buffer.from(result.data.split(',')[1],'base64');delete result.data;await mkdir(resolve(folder,'review'),{recursive:true});await writeFile(resolve(folder,'review/mixed.webm'),bytes);
 await writeFile(resolve(folder,'playback.json'),JSON.stringify({status:'PASS technical',scope:'Retrieved GPU outputs; unattended real-time Chromium mixer and capture; no live GPU dispatch',physicalAudio:'NOT RUN; isolated browser output',humanListening:'NOT RUN',...result,sha256:createHash('sha256').update(bytes).digest('hex'),errors},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',seconds:result.seconds,tracks:result.history.length,plans:result.plans}));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
