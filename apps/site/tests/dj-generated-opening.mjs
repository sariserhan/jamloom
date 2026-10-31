// Real retained neural audio and browser clock; no generation or remote writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {silenceSpeakers} from './silent-audio.mjs';
const folder='../../renders/dj-metal-endurance-20261030-worklet';
const rows=JSON.parse(await readFile(folder+'/tracks.json'));
const selected=[rows.find(r=>r.sequence===0),rows.find(r=>r.sequence===1)];
const tracks=await Promise.all(selected.map(async(r,i)=>({
 bytes:await readFile(`${folder}/${r.session}-${r.sequence}.wav`),
 track:{id:String(i),title:'Retained original '+i,artist:'Jamloom original',url:'/audio/'+i,
 sha256:r.sha256,energy:4,mood:'deep',style:'bass',vocal:false,credit:''}
})));
const entry=await build({stdin:{contents:"import {AIDJPlayer} from './lib/ai-dj-player.ts';window.AIDJPlayer=AIDJPlayer;",resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const worker=await build({entryPoints:['lib/ai-dj-analysis.worker.ts'],bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<button id="start">Start</button><script type="module" src="/player.js"></script>');}
 else if(req.url==='/player.js'||req.url==='/ai-dj-analysis.worker.ts'){res.setHeader('content-type','text/javascript');res.end((req.url==='/player.js'?entry:worker).outputFiles[0].contents);}
 else if(/^\/audio\/[01]$/.test(req.url)){const b=tracks[Number(req.url.slice(-1))].bytes;res.setHeader('content-type','audio/wav');res.setHeader('content-length',b.length);res.end(b);}
 else res.writeHead(404).end();
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(silenceSpeakers);
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.AIDJPlayer);
 await page.evaluate(tracks=>{
  let sequence=0;window.player=new AIDJPlayer(()=>{},[],async(_,signal)=>{
   const n=sequence++;if(n>=tracks.length)return null;
   if(n)await new Promise((ok,fail)=>{const t=setTimeout(ok,35000);signal.addEventListener('abort',()=>{clearTimeout(t);fail(Error('Cancelled'));},{once:true});});
   return {sequence:n,track:tracks[n]};
  });player.setMode('auto');document.querySelector('#start').onclick=()=>player.start();
 },tracks.map(t=>t.track));
 await page.click('#start');await page.waitForFunction(()=>player.snapshot().status==='playing');
 const opening=await page.evaluate(()=>player.snapshot());
 assert(opening.analysis.mixBounds.start>20,'Actual failure fixture must retain its late mix-in point');
 assert(opening.decks[0].position<1,'Generated set must preserve its audible intro');
 await page.waitForFunction(()=>player.snapshot().history.length===2,null,{timeout:65000});
 const result=await page.evaluate(()=>({status:player.snapshot().status,history:player.snapshot().history,elapsed:player.snapshot().elapsed,muted:__jamloomSilentOutput().every(x=>x.peak===0)}));
 assert.equal(result.status,'playing');assert(result.elapsed>35);assert(result.muted);assert.deepEqual(errors,[]);
 await page.evaluate(()=>player.dispose());
 const proof={...result,status:'PASS',playbackStatus:result.status,scope:'Retained real audio; 35-second successor delay; real browser playback and automatic handoff',openingPosition:opening.decks[0].position,mixStart:opening.analysis.mixBounds.start,humanListening:'NOT RUN'};
 await writeFile('../../docs/evidence/local-completion-20261030/generated-opening.json',JSON.stringify(proof,null,2));console.log(proof);
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
