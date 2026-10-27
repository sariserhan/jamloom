// Offline scheduling through the real player; only the candidate beat-count list differs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';import {createServer} from 'node:http';
import {build} from 'esbuild';import {chromium} from 'playwright';
const root=resolve('../..'),evidence=resolve(root,'docs/evidence/web-followup-20261027'),study=JSON.parse(await readFile(join(evidence,'dj-overlap-study.json'),'utf8'));
const folder=resolve(root,'renders/club-studies-20261024/overlap-options/review');await mkdir(folder,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'jamloom-overlap-render-')),files=new Map(),results=[];
const server=createServer((req,res)=>{const file=files.get(req.url);if(!file){res.writeHead(404);res.end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url.endsWith('.js')?'application/javascript':req.url.endsWith('.wav')?'audio/wav':'text/html');res.end(file);});
let browser;
try{
 for(const version of ['before','after']){
  const out=join(temp,version+'.js');await build({entryPoints:['lib/ai-dj-player.ts'],bundle:true,format:'esm',outfile:out,plugins:version==='before'?[]:[{name:'overlap-study',setup(b){b.onLoad({filter:/ai-dj-plan\.ts$/},async({path})=>{const code=await readFile(path,'utf8');assert.equal(code.split('[32,16,4]').length,2);return {contents:code.replace('[32,16,4]','[32,16,8,4]'),loader:'ts'};});}}]});files.set('/'+version+'.js',await readFile(out));
 }
 files.set('/',Buffer.from('<!doctype html><title>Offline mix check</title>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:['--mute-audio']});const page=await browser.newPage();await page.goto(origin);
 for(const [index,row] of study.rows.filter(r=>r.changed).entries()){
  const analyses=[study.analyses[row.session+':'+(row.sequence-1)],study.analyses[row.session+':'+row.sequence]];
  for(let i=0;i<2;i++){const bytes=await readFile(resolve(root,`renders/dj-release-check-20261026-retry/${row.session}-${row.sequence-1+i}.wav`));assert.equal(createHash('sha256').update(bytes).digest('hex'),analyses[i].sha256);files.set('/'+i+'.wav',bytes);}
  for(const version of ['before','after']){
   const result=await page.evaluate(async({analyses,row,version})=>{
    const Offline=window.OfflineAudioContext;window.AudioContext=function(){return new Offline(2,16*32000,32000);};
    const {AIDJPlayer}=await import('/'+version+'.js'),player=new AIDJPlayer(()=>{},[]),context=player.context;
    const buffers=await Promise.all([0,1].map(async i=>context.decodeAudioData(await(await fetch('/'+i+'.wav')).arrayBuffer())));
    player.decks=analyses.map((analysis,i)=>({analysis,buffer:buffers[i],bpm:analysis.bpm,wave:analysis.wave,start:Infinity,moves:99,track:{id:String(i),title:'Original '+i,artist:'Jamloom',style:'bass',vocal:false}}));
    player.state='playing';player.mode='auto';player.applyMaster();
    const end=row.before.at+row.before.fade-10+5;player.beginDeck(0,0,1,end-8);player.tick();
    const blend=player.blend;if(!blend||Math.abs(blend.end-8)>.01)throw Error('Unexpected transition boundary');
    const rendered=await context.startRendering();let peak=0;const bytes=new Uint8Array(rendered.length*4),view=new DataView(bytes.buffer);
    for(let i=0;i<rendered.length;i++)for(let channel=0;channel<2;channel++){const value=rendered.getChannelData(channel)[i];if(!Number.isFinite(value))throw Error('Invalid PCM');peak=Math.max(peak,Math.abs(value));view.setInt16(i*4+channel*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);}
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {data:btoa(binary),peak,blend};
   },{analyses,row,version});
   assert.ok(result.peak>.01&&result.peak<1);assert.ok(Math.abs(result.blend.fade-row[version].fade)<.001);
   const pcm=Buffer.from(result.data,'base64'),wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(32000,24);wav.writeUInt32LE(128000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
   const file=`${index+1}-${version}.wav`;await writeFile(join(folder,file),wav);results.push({pair:index+1,version,file,seconds:16,peak:result.peak,fade:result.blend.fade,sha256:createHash('sha256').update(wav).digest('hex')});
  }
 }
 await writeFile(join(folder,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Jamloom · Overlap options</title><style>body{font:18px system-ui;background:#101510;color:#eef3e9;max-width:800px;margin:32px auto;padding:20px}section{padding:20px;border:1px solid #65735d;border-radius:16px;margin:20px 0}audio{width:100%}h2{font-size:22px}</style><h1>Three DJ handoffs</h1><p>Same originals and mixer. After blends over eight beats instead of four. Each handoff ends at 8 seconds. This is a local experiment, not a new generated set.</p>${[1,2,3].map(i=>`<section><h2>Pair ${i}</h2>${['before','after'].map(v=>`<p>${v==='before'?'Before':'After'}</p><audio controls preload="none" aria-label="Pair ${i} ${v}" src="${i}-${v}.wav"></audio>`).join('')}</section>`).join('')}<script>document.addEventListener('play',event=>{for(const a of document.querySelectorAll('audio'))if(a!==event.target)a.pause()},true)</script></html>`);
 await writeFile(join(evidence,'dj-overlap-renders.json'),JSON.stringify({status:'PASS technical render',shippingEngine:'UNCHANGED',humanListening:'NOT RUN',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
