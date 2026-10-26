// Existing original house audio demonstrates effects only; no fresh generation or reference sampling.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const root=resolve('../..'),folder=resolve(root,'renders/dj-vocal-effects-20261025'),evidence=resolve(root,'docs/evidence/dj-guided-set-20261025');
await mkdir(folder);await mkdir(evidence,{recursive:true});
const source=root+'/renders/ai-dj-finish-20261024/gpu-launch-fix',previous=JSON.parse(await readFile(source+'/result.json','utf8')),row=previous.tracks.find(t=>t.receipt.vocal);assert.ok(row);
const audio=await readFile(`${source}/${row.session}-${row.sequence}.wav`);assert.equal(createHash('sha256').update(audio).digest('hex'),row.sha256);
const bundle=await build({stdin:{contents:"import {PerformanceDeck} from './lib/ai-dj-performance';window.PerformanceDeck=PerformanceDeck;",resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{if(req.url==='/audio.wav'){res.setHeader('Content-Type','audio/wav');res.end(audio);}else if(req.url==='/deck.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}else res.end('<title>Jamloom vocal effects</title><script type="module" src="/deck.js"></script>');});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const results=[];
try{for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();try{
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.PerformanceDeck);
  const rendered=await page.evaluate(async cue=>{
   const raw=await(await fetch('/audio.wav')).arrayBuffer(),rows=[];
   for(const mode of ['dry','loop','echo','both']){
    const ctx=new OfflineAudioContext(2,12*48000,48000),buffer=await ctx.decodeAudioData(raw.slice(0)),input=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain();wet.gain.value=0;input.connect(dry);dry.connect(ctx.destination);wet.connect(ctx.destination);
    const delays=[1,2,3].map(i=>{const d=ctx.createDelay(2.4),tap=ctx.createGain();d.delayTime.value=.5*i;tap.gain.value=.2/i;input.connect(d);d.connect(tap);tap.connect(wet);return d;});
    const deck=new PerformanceDeck(ctx,buffer,cue.bpm,input,{dry,wet,delays});deck.play(0,cue.start-4);
    if(mode!=='dry'&&!deck.repeatPhrase(4,cue.start,cue.seconds,mode!=='echo',mode!=='loop'))throw Error('Vocal effect rejected');
    const output=await ctx.startRendering(),pcm=new Uint8Array(output.length*4),view=new DataView(pcm.buffer);let peak=0,power=0;
    for(let i=0;i<output.length;i++)for(let c=0;c<2;c++){const v=output.getChannelData(c)[i];if(!Number.isFinite(v))throw Error('Invalid audio');peak=Math.max(peak,Math.abs(v));power+=v*v;view.setInt16(i*4+c*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true);}
    let binary='';for(let i=0;i<pcm.length;i+=8192)binary+=String.fromCharCode(...pcm.subarray(i,i+8192));
    rows.push({mode,peak,rms:Math.sqrt(power/(output.length*2)),seconds:output.duration,event:deck.event,data:btoa(binary)});
   }return rows;
  },row.receipt.vocal);
  let baseline;
  for(const r of rendered){assert.ok(r.peak<1&&r.rms>.001);const pcm=Buffer.from(r.data,'base64');delete r.data;
   if(r.mode==='dry')baseline=pcm;else{assert.ok(!pcm.equals(baseline));assert.ok(pcm.subarray(0,3*48000*4).equals(baseline.subarray(0,3*48000*4)));assert.ok(r.event.label.includes(r.mode==='both'?'loop + echo':r.mode));}
   const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(48000,24);h.writeUInt32LE(192000,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
   const wav=Buffer.concat([h,pcm]),file=`${name}-${r.mode}.wav`;await writeFile(folder+'/'+file,wav);results.push({engine:name,...r,file,sha256:createHash('sha256').update(wav).digest('hex')});
  }
 }finally{await browser.close();}
}}finally{await new Promise(ok=>server.close(ok));}
await writeFile(evidence+'/vocal-effects.json',JSON.stringify({status:'PASS technical',source_sha256:row.sha256,cue:row.receipt.vocal,newGeneration:false,speakerOutput:'OfflineAudioContext only; no speakers',scope:'Deck mix echo and bounded phrase repeat on a previously accepted original house recording; not an isolated vocal stem',humanListening:'NOT RUN',results},null,2)+'\n');
console.log('PASS: dry, loop, echo and combined audio in Chromium/WebKit; preserved pre-effect audio; bounded output.');
